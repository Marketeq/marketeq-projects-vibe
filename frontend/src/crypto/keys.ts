import { apiFetch } from "../../src/lib/api"
import { getAccessToken } from "../../utils/auth"
import { deriveKEK, encryptWithKEK, decryptWithKEK } from "./backup"

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

// In keys.ts
export async function savePrivateKey(key: CryptoKey) {
  const pem = await exportPrivateKey(key)
  localStorage.setItem("privateKey", pem)
}

export async function savePublicKey(key: CryptoKey) {
  const pem = await exportPublicKey(key)
  localStorage.setItem("publicKey", pem)
}

export async function loadPrivateKey(): Promise<CryptoKey | null> {
  const pem = localStorage.getItem("privateKey")
  return pem ? await importPrivateKey(pem) : null
}

export async function loadPublicKey(): Promise<CryptoKey | null> {
  const pem = localStorage.getItem("publicKey")
  return pem ? await importPublicKey(pem) : null
}

/**
 * Ensures a usable RSA keypair exists in localStorage.
 *
 * Flow (per spec doc "Seamless Key Recovery"):
 *  1. If privateKey already in localStorage → done (fast path).
 *  2. Otherwise, try to restore from server:
 *     a. Derive KEK deterministically from userId + SYSTEM_SECRET.
 *     b. Download the encrypted private key blob from /user-keys/private-key.
 *     c. If found → decrypt with KEK → store in localStorage. Done.
 *  3. Otherwise (first-ever signup):
 *     a. Generate new RSA-4096 keypair.
 *     b. Encrypt private key with KEK → upload to /user-keys/private-key.
 *     c. Register device + push public key to messaging-service.
 */
export async function ensureEncryptionKeysExist(userId?: string) {
  const token = getAccessToken()
  if (!token) {
    console.error("No access token found, cannot set up encryption keys")
    return
  }

  // Fast path: already have keys locally
  const existingPrivatePem = localStorage.getItem("privateKey")
  const existingPublicPem = localStorage.getItem("publicKey")
  if (existingPrivatePem && existingPublicPem) {
    // Ensure messaging-service has the public key
    try {
      await apiFetch("/api/messaging/public-key", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { publicKey: existingPublicPem },
      })
    } catch { /* messaging-service may already have it */ }

    // Ensure server has the encrypted backup (one-time migration for existing users).
    // IMPORTANT: only migrate if the server's stored public key matches ours —
    // otherwise we could overwrite a valid backup with a stale/wrong keypair
    // and leave the user unable to unwrap any conversation keys.
    try {
      const { encryptedPrivateKey } = await apiFetch<{ encryptedPrivateKey: string | null }>(
        "/api/user-keys/private-key",
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!encryptedPrivateKey) {
        // Check server public key against ours before migrating
        let serverPub: string | null = null
        try {
          const res = await apiFetch<{ publicKey: string }>(
            "/api/messaging/get-public-key",
            { headers: { Authorization: `Bearer ${token}` } }
          )
          serverPub = res?.publicKey ?? null
        } catch { /* no server public key yet — safe to migrate */ }

        const normalize = (s: string) => s.replace(/\s+/g, "")
        const publicKeyMatches =
          !serverPub || normalize(serverPub) === normalize(existingPublicPem)

        if (!publicKeyMatches) {
          console.warn(
            "Local public key differs from server — refusing to migrate stale private key to server backup"
          )
        } else {
          // Parse userId for KEK derivation
          let uid: string | undefined
          try {
            uid = JSON.parse(atob(token.split(".")[1])).sub
          } catch { /* ignore */ }
          if (uid) {
            const kek = await deriveKEK(uid)
            const blob = await encryptWithKEK(existingPrivatePem, kek)
            await apiFetch("/api/user-keys/private-key", {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}` },
              body: { encryptedPrivateKey: blob, publicKey: existingPublicPem },
            })
            console.log("Migrated existing private key to server backup")
          }
        }
      }
    } catch { /* server backup is best-effort */ }

    return
  }

  // Need userId to derive KEK
  if (!userId) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      userId = payload.sub
    } catch {
      console.error("Cannot parse userId from token")
      return
    }
  }
  if (!userId) {
    console.error("No userId available for KEK derivation")
    return
  }

  // Derive KEK (deterministic: same userId + same SYSTEM_SECRET = same key everywhere)
  const kek = await deriveKEK(userId)

  // Try to restore from server backup
  try {
    const { encryptedPrivateKey } = await apiFetch<{ encryptedPrivateKey: string | null }>(
      "/api/user-keys/private-key",
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (encryptedPrivateKey) {
      // Decrypt and restore
      const privPem = await decryptWithKEK(encryptedPrivateKey, kek)
      localStorage.setItem("privateKey", privPem)

      // Validate private key imports cleanly (throws on malformed PEM)
      await importPrivateKey(privPem)
      // We can't derive public from private with WebCrypto, so fetch from server
      const { publicKey: serverPubKey } = await apiFetch<{ publicKey: string }>(
        "/api/messaging/get-public-key",
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (serverPubKey) {
        localStorage.setItem("publicKey", serverPubKey)
      }

      console.log("Restored encryption keys from server backup")
      return
    }
  } catch (err) {
    console.warn("Could not restore keys from server, will generate new ones", err)
  }

  // First-time setup: generate new keypair
  const { publicKey, privateKey } = await generateKeyPair()
  const pubPem = await exportPublicKey(publicKey)
  const privPem = await exportPrivateKey(privateKey)

  // Store locally
  localStorage.setItem("privateKey", privPem)
  localStorage.setItem("publicKey", pubPem)

  // Encrypt private key with KEK and upload to server for future recovery
  try {
    const encryptedBlob = await encryptWithKEK(privPem, kek)
    await apiFetch("/api/user-keys/private-key", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: { encryptedPrivateKey: encryptedBlob, publicKey: pubPem },
    })
    console.log("Backed up encrypted private key to server")
  } catch (err) {
    console.error("Failed to backup private key to server", err)
  }

  // Register device
  try {
    const deviceRes = await apiFetch<{ deviceId: string }>("/api/devices", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { publicKey: pubPem },
    })
    localStorage.setItem("deviceId", deviceRes.deviceId)
  } catch (err) {
    console.error("Failed to register device", err)
  }

  // Push public key to messaging-service
  try {
    await apiFetch("/api/messaging/public-key", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { publicKey: pubPem },
    })
  } catch (err) {
    console.error("Failed to store public key in messaging-service", err)
  }
}
