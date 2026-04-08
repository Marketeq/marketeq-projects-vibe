// src/hooks/usePinnedMessages.ts
import { useEffect, useState } from "react"
import { decryptAES } from "@/src/crypto/e2ee"
import { loadKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import type { Message } from "@/types/conversation"

export function usePinnedMessages(convId: string, token: string) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!convId || !token) return
    ;(async () => {
      try {
        const key = loadKey(convId)
        if (!key) {
          console.warn("No AES key for conversation", convId)
          return
        }

        // 1) Fetch only pinned messages
        const data = await apiFetch<Message[]>(
          `/api/messaging/conversations/${convId}/pinned`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        // 2) Decrypt them
        const decrypted = await Promise.all(
          data.map(async (m) => ({
            ...m,
            content: await decryptAES(m.ciphertext, key),
          }))
        )

        setMessages(decrypted)
      } catch (err) {
        console.error("usePinnedMessages error:", err)
      }
    })()
  }, [convId, token])

  return messages
}
