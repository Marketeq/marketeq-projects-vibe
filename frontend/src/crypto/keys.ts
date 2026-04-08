import { apiFetch } from "../../src/lib/api"
import { getAccessToken } from "../../utils/auth"

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

// Ensures keypair exists, device is registered, and public key is pushed to messaging-service
export async function ensureEncryptionKeysExist() {
  const token = getAccessToken()
  if (!token) {
    console.error("No access token found, cannot register device")
    return
  }

  let pubPem: string

  const existingPrivatePem = localStorage.getItem("privateKey")
  const existingDeviceId = localStorage.getItem("deviceId")

  if (existingPrivatePem && existingDeviceId) {
    // Keys and device exist — just need to ensure messaging-service has the public key
    pubPem = localStorage.getItem("publicKey") || ""
    if (!pubPem) {
      // Re-derive public key from private key is not possible, so skip
      return
    }
  } else {
    // 1) Generate a brand-new RSA keypair
    const { publicKey, privateKey } = await generateKeyPair()
    pubPem = await exportPublicKey(publicKey)
    const privPem = await exportPrivateKey(privateKey)

    // 2) Persist keys locally
    localStorage.setItem("privateKey", privPem)
    localStorage.setItem("publicKey", pubPem)

    // 3) Register this public key as a new device
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
  }

  // 4) Always ensure messaging-service has the public key
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
