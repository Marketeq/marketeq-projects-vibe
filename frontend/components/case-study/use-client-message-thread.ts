"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/src/lib/api"
import { ensureEncryptionKeysExist, loadPrivateKey } from "@/src/crypto/keys"
import { getAccessToken, getCurrentUser } from "@/utils/auth"
import { useSendMessage } from "@/app/(group)/inbox/hooks/use-send-message"

/**
 * Composes the same messaging plumbing /inbox already uses (thread
 * get-or-create via POST /v1/threads, E2EE key bootstrap, encrypted send)
 * for a caller outside the inbox page — here, the case-study client
 * preview's "Let's collaborate" compose box. No new backend or crypto
 * logic: this only wires together inbox/page.tsx's own key-bootstrap
 * effect (line ~291-322) and left-sidebar.tsx's own thread-create call
 * (line ~772-779) for a second call site.
 */
export function useClientMessageThread(talentId: string | undefined) {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = getAccessToken() || ""
  const sendEncrypted = useSendMessage(token, privateKey, false)

  useEffect(() => {
    if (!token) return
    const uid = getCurrentUser()?.id
    if (!uid) return
    let cancelled = false
    ;(async () => {
      await ensureEncryptionKeysExist(uid)
      const key = await loadPrivateKey(uid)
      if (!cancelled) setPrivateKey(key)
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const send = useCallback(
    async (text: string) => {
      const myId = getCurrentUser()?.id
      if (!myId || !talentId || !text.trim()) return
      setSending(true)
      setError(null)
      try {
        const thread = await apiFetch<{ id: string }>("/v1/threads", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: { participantIds: [myId, talentId], isGroup: false },
        })
        await sendEncrypted(thread.id, text.trim())
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Couldn't send your message."
        )
        throw err
      } finally {
        setSending(false)
      }
    },
    [talentId, token, sendEncrypted]
  )

  return { send, sending, error, ready: Boolean(privateKey) }
}
