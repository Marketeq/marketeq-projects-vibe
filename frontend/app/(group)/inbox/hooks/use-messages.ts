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
export function useMessages(convId: string, token: string, keyReady?: boolean) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMessages([])
    if (!convId || !token) {
      setLoading(false)
      return
    }
    setLoading(true)
    const ac = new AbortController()
    ;(async () => {
      try {
        const data = await apiFetch<Message[]>(
          `/v1/messages/thread/${convId}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            signal: ac.signal,
          }
        )
        if (ac.signal.aborted) return

        let key: Uint8Array | null = null
        try {
          key = loadKey(convId)
        } catch {
          // no AES key cached yet
        }

        const decrypted = await Promise.all(
          data.map(async (m) => {
            if (!m.ciphertext) return m
            if (!key) return { ...m, content: "🔒 Encrypted message" }
            try {
              return { ...m, content: await decryptAES(m.ciphertext, key) }
            } catch {
              return { ...m, content: "🔒 Encrypted message" }
            }
          })
        )

        if (ac.signal.aborted) return
        setMessages(decrypted)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("useMessages error:", err)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [convId, token, keyReady])

  return { messages, loading }
}
