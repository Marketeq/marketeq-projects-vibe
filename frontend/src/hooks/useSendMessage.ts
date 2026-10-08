// src/hooks/useSendMessage.ts
import { encryptAES } from "../crypto/e2ee"
import { loadKey } from "../crypto/indexedDb"

export function useSendMessage(_token?: string) {
  return async (convId: string, plaintext: string) => {
    const key = await loadKey(convId)
    if (!key) throw new Error("Encryption key not found")
    const ciphertext = await encryptAES(plaintext, key)
    const res = await fetch(`/api/messaging/${convId}/send`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ciphertext }),
    })
    if (!res.ok) throw new Error(`Send failed: ${res.status}`)
  }
}
