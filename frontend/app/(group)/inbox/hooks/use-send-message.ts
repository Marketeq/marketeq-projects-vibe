"use client"

import { decryptWithPrivateKey, encryptAES } from "@/src/crypto/e2ee"
import { exportPrivateKey } from "@/src/crypto/keys"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import type { Message } from "@/types/message"

/// Backend returns the message directly
type SendResponse = Message

/**
 * Returns a `send` function that AES‐encrypts a plaintext
 * and POSTs it to your NestJS API.
 *
 * @param token your JWT for Authorization
 */
export function useSendMessage(
  token: string,
  privateKey: CryptoKey | null,
  isGroup: boolean = false
) {
  /**
   * Encrypts & sends a new message.
   * @param convId   the conversation UUID
   * @param plaintext the message body
   */
  return async function send(convId: string, plaintext: string, replyToMessageId?: string) {
    if (!convId || !token) {
      throw new Error("Missing conversation ID or auth token")
    }

    // If no private key or no AES key available, send as plaintext fallback
    let key: Uint8Array | null = null
    try {
      key = loadKey(convId)
    } catch {
      // no cached key
    }

    if (!key && privateKey) {
      try {
        const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
          `/api/messaging/conversations/${convId}/key?isGroup=${isGroup}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const wrapped = Uint8Array.from(atob(encryptedKey), (c) =>
          c.charCodeAt(0)
        )
        const rawBuffer = await crypto.subtle.decrypt(
          { name: "RSA-OAEP" },
          privateKey,
          wrapped
        )
        key = new Uint8Array(rawBuffer)
        const b64 = btoa(String.fromCharCode(...key))
        saveKey(convId, b64)
      } catch {
        // key exchange not available yet, fall through to plaintext
      }
    }

    // Encrypt or fail — never send plaintext
    if (!key) {
      throw new Error("Encryption key not available. Please wait and try again.")
    }

    const ciphertext = await encryptAES(plaintext, key)
    return apiFetch<SendResponse>(`/v1/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { threadId: convId, ciphertext, ...(replyToMessageId && { replyToMessageId }) },
    })
  }
}
