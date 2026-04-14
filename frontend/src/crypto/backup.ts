// src/crypto/backup.ts

/** Deterministically derive a CryptoKey from userId + system salt */
export async function deriveKEK(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const systemSecret = process.env.NEXT_PUBLIC_SYSTEM_SECRET
  if (!systemSecret) {
    throw new Error(
      "NEXT_PUBLIC_SYSTEM_SECRET is not set. KEK derivation requires a non-empty system secret."
    )
  }
  const keyMaterialRaw = encoder.encode(`${userId}:${systemSecret}`)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    keyMaterialRaw,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  )

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("message-encryption"),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )
}

/** Encrypt a private key PEM string with the KEK (AES-GCM) */
export async function encryptWithKEK(
  rawPrivateKey: string,
  kek: CryptoKey
): Promise<string> {
  const encoded = new TextEncoder().encode(rawPrivateKey)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    kek,
    encoded
  )
  return `${btoa(String.fromCharCode(...iv))}:${btoa(
    String.fromCharCode(...new Uint8Array(encrypted))
  )}`
}

/** Decrypt the AES‑GCM–wrapped private key PEM under that KEK */
export async function decryptWithKEK(
  encrypted: string,
  kek: CryptoKey
): Promise<string> {
  const [ivStr, dataStr] = encrypted.split(":")
  const iv = Uint8Array.from(atob(ivStr), (c) => c.charCodeAt(0))
  const data = Uint8Array.from(atob(dataStr), (c) => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    kek,
    data
  )
  return new TextDecoder().decode(decrypted)
}
