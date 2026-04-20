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
        // 1) Fetch all messages and filter pinned
        const data = await apiFetch<Message[]>(
          `/v1/messages/thread/${convId}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        const pinned = data.filter((m: any) => m.isPinned || m.pinned)

        // 2) Try to decrypt if key available, otherwise use content directly
        let key: Uint8Array | null = null
        try { key = loadKey(convId) } catch { /* no key cached */ }

        const decrypted = await Promise.all(
          pinned.map(async (m) => {
            const ct = (m as any).ciphertext
            if (!ct) return m // legacy plaintext row
            if (!key) return { ...m, content: "🔒 Encrypted message" }
            try {
              return { ...m, content: await decryptAES(ct, key) }
            } catch {
              return { ...m, content: "🔒 Encrypted message" }
            }
          })
        )

        setMessages(decrypted)
      } catch (err) {
        console.error("usePinnedMessages error:", err)
      }
    })()
  }, [convId, token])

  return messages
}
