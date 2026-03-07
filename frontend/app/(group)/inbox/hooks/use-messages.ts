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
        // 1) load the raw AES key from localStorage
        const key = loadKey(convId)

        // 2) fetch the encrypted messages via apiFetch (handles base URL, JSON, errors)
        const data = await apiFetch<Message[]>(
          `/api/messaging/conversations/${convId}/messages`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        // 3) Decrypt each one and preserve its metadata
        const decrypted = await Promise.all(
          data.map(async (m) => ({
            ...m,
            content: await decryptAES(m.ciphertext, key),
          }))
        )

        setMessages(decrypted)
      } catch (err) {
        console.error("useMessages error:", err)
      }
    })()
  }, [convId, token])

  return messages
}
