import { apiFetch } from "../../src/lib/api"

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

// Updated ensureEncryptionKeysExist to include device logic
export async function ensureEncryptionKeysExist() {
  const token = localStorage.getItem("token")
  if (!token) {
    console.error("No JWT token in localStorage, cannot register device")
    return
  }

  const existingPrivatePem = localStorage.getItem("privateKey")
  const existingDeviceId = localStorage.getItem("deviceId")

  // If both a keypair AND a deviceId are already stored, we’re done.
  if (existingPrivatePem && existingDeviceId) {
    console.log("Keys & device already registered:", existingDeviceId)
    return
  }

  // 1) Generate a brand‑new RSA keypair

  const { publicKey, privateKey } = await generateKeyPair()
  const pubPem = await exportPublicKey(publicKey)
  const privPem = await exportPrivateKey(privateKey)

  // 2) Persist the private key locally so we can decrypt later
  localStorage.setItem("privateKey", privPem)

  // 3) Register this public key as a *new* device

  const res = await apiFetch("/api/devices", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicKey: pubPem }),
  })

  if (!res.ok) {
    console.error("Failed to register device", await res.text())
    return
  }
  const { deviceId } = await res.json()

  // 4) Persist your new deviceId so we don’t repeat this
  localStorage.setItem("deviceId", deviceId)
}

export async function ensureKeysAndDevice() {
  const jwt = localStorage.getItem("token")!
  if (!jwt) throw new Error("Missing auth token")

  const existingPrivPem = localStorage.getItem("privateKey")
  const existingDevId = localStorage.getItem("deviceId")

  // If we already have both, nothing to do
  if (existingPrivPem && existingDevId) {
    return
  }

  let privPem = existingPrivPem!
  let pubPem: string

  // 1) Make sure we have a keypair
  const existing = localStorage.getItem("privateKey")
  if (!existing) {
    const { publicKey, privateKey } = await generateKeyPair()
    pubPem = await exportPublicKey(publicKey)
    privPem = await exportPrivateKey(privateKey)

    // persist in browser
    localStorage.setItem("privateKey", privPem)

    // push into legacy user.publicKey if it was never set:
    //   GET current user to see if publicKey is missing
    const me = await apiFetch<{ publicKey: string | null }>(
      `/api/messaging/get-public-key`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    )
    if (!me.publicKey) {
      await apiFetch("/api/messaging/public-key", {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
        body: { publicKey: pubPem },
      })
    }
  }
}
