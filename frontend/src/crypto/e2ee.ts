import { importPublicKey } from "./keys"

export async function encryptMessage(
  plainText: string,
  recipientPublicKey: CryptoKey
) {
  const encoded = new TextEncoder().encode(plainText)
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    encoded
  )
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

export async function decryptMessage(
  cipherText: string,
  privateKey: CryptoKey
) {
  const binary = Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0))
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    binary
  )
  return new TextDecoder().decode(decrypted)
}

///
// src/crypto/e2ee.ts

/**
 * Turn a PEM string into an ArrayBuffer,
 * stripping the header/footer and base64-decoding.
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // console.log('Converting PEM to ArrayBuffer:', pem);
  const b64 = pem
    .trim()
    .replace(/-----BEGIN [\w\s]+-----/, "")
    .replace(/-----END [\w\s]+-----/, "")
    .replace(/\s+/g, "")
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i)
  }
  return arr.buffer
}

/**
 * Unwrap (decrypt) the base64-wrapped AES conversation key
 * using your PEM-encoded RSA private key.
 */
export async function decryptWithPrivateKey(
  wrappedB64: string,
  privateKeyPem: string
): Promise<ArrayBuffer> {
  // 1) import the private key

  const keyData = pemToArrayBuffer(privateKeyPem)

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  )

  // 2) base64→ArrayBuffer
  const wrapped = Uint8Array.from(atob(wrappedB64), (c) => c.charCodeAt(0))

  // 3) decrypt

  let raw: ArrayBuffer
  try {
    raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, wrapped)
  } catch (err) {
    console.error("decryptWithPrivateKey error:", err)
    throw err
  }

  return raw
}

//AES helpers

// src/crypto/e2ee.ts

/**
 * AES-GCM encrypt: returns Base64 of [ iv || ciphertext || tag ]
 */
export async function encryptAES(
  plainText: string,
  keyBytes: Uint8Array
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plainText)

  const keyMaterial = Uint8Array.from(keyBytes).buffer

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  )

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded
  )

  // prepend IV and base64-encode
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.byteLength)
  return btoa(String.fromCharCode(...combined))
}

/**
 * AES-GCM decrypt: accepts Base64 of [ iv || ciphertext || tag ]
 */
export async function decryptAES(
  ciphertextB64: string,
  keyBytes: Uint8Array
): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ctAndTag = combined.slice(12)

  const keyMaterial = Uint8Array.from(keyBytes).buffer

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    ctAndTag
  )

  return new TextDecoder().decode(decrypted)
}

//below method can be used to encrypt an AES key with a public key (like adding participant to a group chat)
/**
 * Wrap (encrypt) an AES key with a user’s RSA public key.
 * Accepts raw AES key (Uint8Array or ArrayBuffer) and PEM-formatted or base64 public key string.
 * Returns base64 string of the encrypted key.
 */
export async function encryptWithPublicKey(
  aesKey: Uint8Array,
  publicKeyInput: string
): Promise<string> {
  let pem = publicKeyInput.trim()

  // Normalize to full PEM if needed
  if (!pem.includes("-----BEGIN")) {
    const body = pem.replace(/\s+/g, "")
    const lines = body.match(/.{1,64}/g)!.join("\n")
    pem = `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`
  }

  // Convert PEM to CryptoKey
  const publicKey = await importPublicKey(pem)

  // Encrypt using RSA-OAEP with SHA-256
  const keyMaterial = Uint8Array.from(aesKey).buffer
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    keyMaterial
  )

  // Return base64 encoded ciphertext
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}
