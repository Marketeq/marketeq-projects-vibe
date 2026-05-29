// src/hooks/useMessaging.ts
import { useCallback, useEffect, useRef, useState } from "react"
import { decryptAES } from "@/src/crypto/e2ee"
import { loadKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import type { Message } from "@/types/message"
import { UNDECRYPTABLE_PLACEHOLDER } from "../constants"

const PAGE_SIZE = 50

interface MessagesPageResponse {
  messages: Message[]
  hasMore: boolean
  nextCursor: string | null
}

async function decryptPage(
  convId: string,
  rows: Message[] | undefined | null
): Promise<Message[]> {
  if (!rows || rows.length === 0) return []
  let key: Uint8Array | null = null
  try {
    key = loadKey(convId)
  } catch {
    // no AES key cached yet
  }

  return Promise.all(
    rows.map(async (m) => {
      const decryptIfNeeded = async (cipher?: string | null) => {
        if (!cipher) return null
        if (!key) return UNDECRYPTABLE_PLACEHOLDER
        try {
          return await decryptAES(cipher, key)
        } catch {
          return UNDECRYPTABLE_PLACEHOLDER
        }
      }
      const [content, quotedContent] = await Promise.all([
        decryptIfNeeded(m.ciphertext),
        decryptIfNeeded(m.quotedCiphertext),
      ])
      return {
        ...m,
        content: content ?? m.content ?? "",
        quotedContent,
        // Backend column is `pinned`; frontend reads `isPinned`. Normalize.
        isPinned: (m as any).isPinned ?? (m as any).pinned ?? false,
      }
    })
  )
}

export function useMessages(
  convId: string,
  _token?: string,
  keyReady?: boolean
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<string | null>(null)
  const inFlightOlderRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMessages([])
    setHasMore(false)
    cursorRef.current = null
    inFlightOlderRef.current?.abort()
    inFlightOlderRef.current = null

    if (!convId) {
      setLoading(false)
      return
    }
    if (keyReady === false) {
      setLoading(false)
      return
    }
    setLoading(true)
    const ac = new AbortController()
    ;(async () => {
      try {
        const data = await apiFetch<MessagesPageResponse>(
          `/v1/messages/thread/${convId}?limit=${PAGE_SIZE}`,
          {
            method: "GET",
            signal: ac.signal,
          }
        )
        if (ac.signal.aborted) return

        const decrypted = await decryptPage(convId, data.messages)
        if (ac.signal.aborted) return

        setMessages(decrypted)
        setHasMore(data.hasMore)
        cursorRef.current = data.nextCursor
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("useMessages error:", err)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [convId, keyReady])

  const loadOlder = useCallback(async () => {
    if (!convId) return
    if (!cursorRef.current || !hasMore) return
    if (inFlightOlderRef.current) return
    const ac = new AbortController()
    inFlightOlderRef.current = ac
    setLoadingOlder(true)
    try {
      const data = await apiFetch<MessagesPageResponse>(
        `/v1/messages/thread/${convId}?limit=${PAGE_SIZE}&before=${cursorRef.current}`,
        {
          method: "GET",
          signal: ac.signal,
        }
      )
      if (ac.signal.aborted) return

      const decrypted = await decryptPage(convId, data.messages)
      if (ac.signal.aborted) return

      setMessages((prev) => [...decrypted, ...prev])
      setHasMore(data.hasMore)
      cursorRef.current = data.nextCursor
    } catch (err: any) {
      if (err?.name === "AbortError") return
      console.error("useMessages loadOlder error:", err)
    } finally {
      if (inFlightOlderRef.current === ac) inFlightOlderRef.current = null
      if (!ac.signal.aborted) setLoadingOlder(false)
    }
  }, [convId, hasMore])

  return { messages, loading, loadingOlder, hasMore, loadOlder }
}
