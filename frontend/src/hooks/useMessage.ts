// src/hooks/useMessages.ts
import { useEffect, useState } from "react"
import { decryptAES } from "../crypto/e2ee"
import { loadKey } from "../crypto/indexedDb"

export function useMessages(convId: string, token: string) {
  const [msgs, setMsgs] = useState<string[]>([])
  useEffect(() => {
    ;(async () => {
      const res = await fetch(
        `/api/messaging/conversations/${convId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const data = await res.json()
      const key = await loadKey(convId)
      const texts = await Promise.all(
        data.map((m: any) => decryptAES(m.ciphertext, key))
      )
      setMsgs(texts)
    })()
  }, [convId, token])
  return msgs
}
