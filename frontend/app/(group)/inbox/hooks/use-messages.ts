// src/hooks/useMessaging.ts
import { useEffect, useState } from "react"
import { decryptAES, decryptWithPrivateKey } from "@/src/crypto/e2ee"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import type { Message } from "@/types/message"

// src/hooks/useMessages.ts

/**
 * Hook that fetches ciphertexts for a conversation and returns
 * an array of decrypted plaintext messages.
 *
 * @param convId the conversation UUID
 * @param token  your JWT for Authorization
 */
export function useMessages(convId: string, token: string) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!convId || !token) return
    ;(async () => {
      try {
        // 1) fetch messages
        const data = await apiFetch<Message[]>(
          `/v1/messages/thread/${convId}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        // 2) try to decrypt, fall back to plaintext content if no key/ciphertext
        let key: Uint8Array | null = null
        try {
          key = loadKey(convId)
        } catch {
          // no AES key cached yet — will use plaintext content as fallback
        }

        const decrypted = await Promise.all(
          data.map(async (m) => {
            if (key && m.ciphertext) {
              try {
                return { ...m, content: await decryptAES(m.ciphertext, key) }
              } catch {
                return m
              }
            }
            return m
          })
        )

        setMessages(decrypted)
      } catch (err) {
        console.error("useMessages error:", err)
      }
    })()
  }, [convId, token])

  return messages
}
