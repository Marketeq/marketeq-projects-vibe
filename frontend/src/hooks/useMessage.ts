// src/hooks/useMessages.ts
import { useEffect, useState } from "react"
import { decryptAES } from "../crypto/e2ee"
import { loadKey } from "../crypto/indexedDb"

export function useMessages(convId: string, _token?: string) {
  const [msgs, setMsgs] = useState<string[]>([])
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(
          `/api/messaging/conversations/${convId}/messages`,
          { credentials: "include" }
        )
        if (!res.ok) return
        const data = await res.json()
        const key = await loadKey(convId)
        if (!key) return
        const texts = await Promise.allSettled(
          data.map((m: any) => decryptAES(m.ciphertext, key))
        )
        setMsgs(
          texts.map((r) => (r.status === "fulfilled" ? r.value : "[unable to decrypt]"))
        )
      } catch {
        // network or parse failure — leave msgs empty
      }
    })()
  }, [convId])
  return msgs
}
