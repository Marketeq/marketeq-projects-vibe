"use client"

import { decryptWithPrivateKey, encryptAES } from "@/src/crypto/e2ee"
import { exportPrivateKey } from "@/src/crypto/keys"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import { keyframes } from "framer-motion"
import type { Message } from "@/types/message"

/// Response type for the send endpoint
interface SendResponse {
  message: string
  data: Message
}

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
  return async function send(convId: string, plaintext: string) {
    if (!convId || !token) {
      throw new Error("Missing conversation ID or auth token")
    }
    if (!privateKey) {
      throw new Error("No private key available")
    }
    // 1) Attempt to load the AES key
    let key: Uint8Array
    try {
      key = await loadKey(convId)
    } catch {
      console.log("No key found, fetching from server…")
      // fetch + unwrap exactly as before
      const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
        `/api/messaging/conversations/${convId}/key?isGroup=${isGroup}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // 1b) base64→Uint8Array
      const wrapped = Uint8Array.from(atob(encryptedKey), (c) =>
        c.charCodeAt(0)
      )

      // 1c) RSA‑OAEP unwrap using your CryptoKey
      const rawBuffer = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        wrapped
      )
      key = new Uint8Array(rawBuffer)

      // 1d) cache it for next time
      const b64 = btoa(String.fromCharCode(...key))
      saveKey(convId, b64)
      //end test
    }

    // 2) encrypt the plaintext
    const ciphertext = await encryptAES(plaintext, key)

    // 3) POST to your send endpoint
    const payload = await apiFetch<SendResponse>(
      `/api/messaging/${convId}/send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { ciphertext },
      }
    )

    return payload
  }
}
