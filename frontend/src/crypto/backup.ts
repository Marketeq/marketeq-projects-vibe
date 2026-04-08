// src/crypto/backup.ts

/** Deterministically derive a CryptoKey from userId + system salt */
export async function deriveKEK(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const systemSecret = "" //import.meta.env.VITE_SYSTEM_SECRET;
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
