"use client"

import { decryptWithPrivateKey, encryptAES } from "@/src/crypto/e2ee"
import {
  ensureEncryptionKeysExist,
  loadPrivateKey,
  republishPublicKey,
} from "@/src/crypto/keys"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import { getCurrentUser } from "@/utils/auth"
import type { Message, MessageType } from "@/types/message"

/// Backend returns the message directly
type SendResponse = Message

/**
 * Returns a `send` function that AES‐encrypts a plaintext
 * and POSTs it to your NestJS API.
 *
 */
export function useSendMessage(
  _token: string,
  privateKey: CryptoKey | null,
  isGroup: boolean = false
) {
  /**
   * Encrypts & sends a new message.
   * @param convId   the conversation UUID
   * @param plaintext the message body (for GIFs, this is the Tenor URL)
   */
  return async function send(
    convId: string,
    plaintext: string,
    replyToMessageId?: string,
    messageType: MessageType = "text"
  ) {
    if (!convId) {
      throw new Error("Missing conversation ID")
    }

    // If no private key or no AES key available, send as plaintext fallback
    let key: Uint8Array | null = null
    try {
      key = loadKey(convId)
      if (key.byteLength !== 32) {
        localStorage.removeItem(`convKey:${convId}`)
        key = null
      }
    } catch {
      // no cached key
    }

    let activePrivateKey = privateKey
    if (!activePrivateKey) {
      const currentUserId = getCurrentUser()?.id
      if (currentUserId) {
        await ensureEncryptionKeysExist(currentUserId)
        activePrivateKey = await loadPrivateKey(currentUserId)
      }
    }

    const fetchAndUnwrapKey = async (rsaPrivateKey: CryptoKey) => {
      const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
        `/messaging/conversations/${convId}/key?isGroup=${isGroup}`
      )
      const wrapped = Uint8Array.from(atob(encryptedKey), (c) =>
        c.charCodeAt(0)
      )
      const rawBuffer = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        rsaPrivateKey,
        wrapped
      )
      const rawKey = new Uint8Array(rawBuffer)
      if (rawKey.byteLength !== 32) {
        throw new Error("Invalid conversation encryption key")
      }
      saveKey(convId, btoa(String.fromCharCode(...rawKey)))
      return rawKey
    }

    if (!key && activePrivateKey) {
      try {
        key = await fetchAndUnwrapKey(activePrivateKey)
      } catch {
        // A browser keypair may have been regenerated after this thread was
        // seeded. Re-publish the browser's current public key, discard only
        // this recoverable wrapped copy, and request a fresh wrapping.
        try {
          await republishPublicKey()
          await apiFetch(`/messaging/conversations/${convId}/key`, {
            method: "DELETE",
          })
          key = await fetchAndUnwrapKey(activePrivateKey)
        } catch {
          // Fall through to the explicit encryption error below.
        }
      }
    }

    // Encrypt or fail — never send plaintext
    if (!key) {
      throw new Error(
        "Encryption key not available. Please wait and try again."
      )
    }

    const ciphertext = await encryptAES(plaintext, key)
    return apiFetch<SendResponse>(`/v1/messages`, {
      method: "POST",
      body: {
        threadId: convId,
        ciphertext,
        ...(replyToMessageId && { replyToMessageId }),
        ...(messageType !== "text" && { messageType }),
      },
    })
  }
}
