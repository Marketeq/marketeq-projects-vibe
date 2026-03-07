// src/hooks/useConversationKey.ts
import { useEffect, useState } from "react"
import { decryptWithPrivateKey } from "../crypto/e2ee"
// WebCrypto wrapper
import { saveKey } from "../crypto/indexedDb"

export function useConversationKey(
  convId: string,
  wrappedKeyB64: string,
  myPrivPem: string
) {
  const [key, setKey] = useState<Uint8Array>()
  useEffect(() => {
    ;(async () => {
      // unwrap on first load
      const rawBuf = await decryptWithPrivateKey(wrappedKeyB64, myPrivPem)
      const rawB64 = btoa(String.fromCharCode(...new Uint8Array(rawBuf)))
      await saveKey(convId, rawB64)
      setKey(new Uint8Array(rawBuf))
    })()
  }, [convId, wrappedKeyB64, myPrivPem])
  return key
}
