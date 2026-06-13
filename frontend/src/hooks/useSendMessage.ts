// src/hooks/useSendMessage.ts
import { encryptAES } from "../crypto/e2ee"
import { loadKey } from "../crypto/indexedDb"

export function useSendMessage(_token?: string) {
  return async (convId: string, plaintext: string) => {
    const key = await loadKey(convId)
    const ciphertext = await encryptAES(plaintext, key)
    await fetch(`/api/messaging/${convId}/send`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ciphertext }),
    })
  }
}
