// src/crypto/storage.ts

/**
 * Persist the Base64‐encoded AES key for a conversation.
 */
export function saveKey(convId: string, rawKeyB64: string): void {
  localStorage.setItem(`convKey:${convId}`, rawKeyB64)
  console.debug(`Saved AES key for conversation ${convId}`)
}

/**
 * Load and decode the Base64 AES key for a conversation.
 * Throws if not found.
 */
export function loadKey(convId: string): Uint8Array {
  const rawKeyB64 = localStorage.getItem(`convKey:${convId}`)
  if (!rawKeyB64) {
    throw new Error(`No AES key cached for conversation ${convId}`)
  }
  return Uint8Array.from(atob(rawKeyB64), (c) => c.charCodeAt(0))
}
