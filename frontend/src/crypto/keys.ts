import { type IDBPDatabase, openDB } from "idb"
import { apiFetch } from "../../src/lib/api"
import { getCurrentUser } from "../../utils/auth"
import { decryptWithKEK, deriveKEK, encryptWithKEK } from "./backup"

const DB_NAME = "marketeq-e2ee"
const DB_VERSION = 1
const STORE = "keys"

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB unavailable (non-browser environment)")
    )
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await getDb()
  await db.put(STORE, value, key)
}

async function idbGet(key: string): Promise<string | null> {
  const db = await getDb()
  const value = await db.get(STORE, key)
  return typeof value === "string" ? value : null
}

function privateKeyIdbKey(userId: string) {
  return `private-${userId}`
}

function publicKeyIdbKey(userId: string) {
  return `public-${userId}`
}

export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  )
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .replace(/\s/g, "")
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .replace(/\s/g, "")
}

export async function importPublicKey(pem: string): Promise<CryptoKey> {
  let b64 = pem.trim()
  if (b64.includes("-----BEGIN")) {
    b64 = b64
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\s+/g, "")
  }
  const binaryDer = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  )
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  let b64 = pem.trim()
  if (b64.includes("-----BEGIN")) {
    b64 = b64
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s+/g, "")
  }

  const binaryDer = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  )
}

export async function savePrivateKey(
  userId: string,
  key: CryptoKey
): Promise<void> {
  if (!userId) throw new Error("savePrivateKey requires userId")
  const pem = await exportPrivateKey(key)
  await idbSet(privateKeyIdbKey(userId), pem)
}

export async function savePublicKey(
  userId: string,
  key: CryptoKey
): Promise<void> {
  if (!userId) throw new Error("savePublicKey requires userId")
  const pem = await exportPublicKey(key)
  await idbSet(publicKeyIdbKey(userId), pem)
}

export async function loadPrivateKey(
  userId: string
): Promise<CryptoKey | null> {
  if (!userId) return null
  const pem = await idbGet(privateKeyIdbKey(userId))
  return pem ? await importPrivateKey(pem) : null
}

export async function loadPublicKey(userId: string): Promise<CryptoKey | null> {
  if (!userId) return null
  const pem = await idbGet(publicKeyIdbKey(userId))
  return pem ? await importPublicKey(pem) : null
}

async function savePrivateKeyPem(userId: string, pem: string): Promise<void> {
  await idbSet(privateKeyIdbKey(userId), pem)
}

async function savePublicKeyPem(userId: string, pem: string): Promise<void> {
  await idbSet(publicKeyIdbKey(userId), pem)
}

async function loadPrivateKeyPem(userId: string): Promise<string | null> {
  return await idbGet(privateKeyIdbKey(userId))
}

async function loadPublicKeyPem(userId: string): Promise<string | null> {
  return await idbGet(publicKeyIdbKey(userId))
}

/**
 * Ensures a usable RSA keypair exists for the current user in IndexedDB.
 *
 * Flow (per spec doc "Seamless Key Recovery"):
 *  1. If privateKey+publicKey already in IndexedDB → done (fast path, with
 *     best-effort server-sync of public-key and encrypted backup).
 *  2. Otherwise, try to restore from server:
 *     a. Derive KEK deterministically from userId + SYSTEM_SECRET.
 *     b. Download the encrypted private key blob from /user-keys/private-key.
 *     c. If found → decrypt with KEK → store in IndexedDB. Done.
 *  3. Otherwise (first-ever signup):
 *     a. Generate new RSA-4096 keypair.
 *     b. Encrypt private key with KEK → upload to /user-keys/private-key.
 *     c. Register device + push public key to messaging-service.
 */
export async function ensureEncryptionKeysExist(userId?: string) {
  const resolvedUserId = userId ?? getCurrentUser()?.id
  if (!resolvedUserId) {
    console.error("Cannot set up encryption keys without userId")
    return
  }
  userId = resolvedUserId

  // Fast path: IndexedDB already has the keys
  const existingPrivatePem = await loadPrivateKeyPem(userId)
  const existingPublicPem = await loadPublicKeyPem(userId)

  if (existingPrivatePem && existingPublicPem) {
    // Ensure messaging-service has the public key
    try {
      await apiFetch("/messaging/public-key", {
        method: "POST",
        body: { publicKey: existingPublicPem },
      })
    } catch {
      /* messaging-service may already have it */
    }

    // Ensure server has the encrypted backup (one-time migration for existing users).
    // IMPORTANT: only migrate if the server's stored public key matches ours —
    // otherwise we could overwrite a valid backup with a stale/wrong keypair
    // and leave the user unable to unwrap any conversation keys.
    try {
      const { encryptedPrivateKey } = await apiFetch<{
        encryptedPrivateKey: string | null
      }>("/user-keys/private-key")
      if (!encryptedPrivateKey) {
        let serverPub: string | null = null
        try {
          const res = await apiFetch<{ publicKey: string }>(
            "/messaging/get-public-key"
          )
          serverPub = res?.publicKey ?? null
        } catch {
          /* no server public key yet — safe to migrate */
        }

        const normalize = (s: string) => s.replace(/\s+/g, "")
        const publicKeyMatches =
          !serverPub || normalize(serverPub) === normalize(existingPublicPem)

        if (!publicKeyMatches) {
          console.warn(
            "Local public key differs from server — refusing to migrate stale private key to server backup"
          )
        } else {
          try {
            const kek = await deriveKEK(userId)
            const blob = await encryptWithKEK(existingPrivatePem, kek)
            await apiFetch("/user-keys/private-key", {
              method: "PUT",
              body: { encryptedPrivateKey: blob, publicKey: existingPublicPem },
            })
            console.log("Migrated existing private key to server backup")
          } catch (err) {
            console.warn(
              "Skipping private-key migration backup because KEK derivation is unavailable.",
              err
            )
          }
        }
      }
    } catch {
      /* server backup is best-effort */
    }

    return
  }

  // Derive KEK when configured. If missing, keep messaging available and skip backup.
  let kek: CryptoKey | null = null
  try {
    kek = await deriveKEK(userId)
  } catch (err) {
    console.warn(
      "KEK derivation unavailable. Private-key backup/restore will be skipped for this session.",
      err
    )
  }

  // Try to restore from server backup
  if (kek) {
    try {
      const { encryptedPrivateKey } = await apiFetch<{
        encryptedPrivateKey: string | null
      }>("/user-keys/private-key")

      if (encryptedPrivateKey) {
        const privPem = await decryptWithKEK(encryptedPrivateKey, kek)
        // Validate and store in IndexedDB
        await importPrivateKey(privPem)
        await savePrivateKeyPem(userId, privPem)

        // We can't derive public from private with WebCrypto, so fetch from server
        const { publicKey: serverPubKey } = await apiFetch<{
          publicKey: string
        }>("/messaging/get-public-key")
        if (serverPubKey) {
          await importPublicKey(serverPubKey)
          await savePublicKeyPem(userId, serverPubKey)
        }

        console.log("Restored encryption keys from server backup")
        return
      }
    } catch (err) {
      console.warn(
        "Could not restore keys from server, will generate new ones",
        err
      )
    }
  }

  // First-time setup: generate new keypair
  const { publicKey, privateKey } = await generateKeyPair()
  const pubPem = await exportPublicKey(publicKey)
  const privPem = await exportPrivateKey(privateKey)

  // Store locally
  await savePrivateKeyPem(userId, privPem)
  await savePublicKeyPem(userId, pubPem)

  // Encrypt private key with KEK and upload to server for future recovery
  if (kek) {
    try {
      const encryptedBlob = await encryptWithKEK(privPem, kek)
      await apiFetch("/user-keys/private-key", {
        method: "PUT",
        body: { encryptedPrivateKey: encryptedBlob, publicKey: pubPem },
      })
      console.log("Backed up encrypted private key to server")
    } catch (err) {
      console.error("Failed to backup private key to server", err)
    }
  }

  // Register device
  try {
    const deviceRes = await apiFetch<{ deviceId: string }>("/devices", {
      method: "POST",
      body: { publicKey: pubPem },
    })
    localStorage.setItem("deviceId", deviceRes.deviceId)
  } catch (err) {
    console.error("Failed to register device", err)
  }

  // Push public key to messaging-service
  try {
    await apiFetch("/messaging/public-key", {
      method: "POST",
      body: { publicKey: pubPem },
    })
  } catch (err) {
    console.error("Failed to store public key in messaging-service", err)
  }
}
