// src/hooks/useSendMessage.ts
import { encryptAES } from "../crypto/e2ee"
import { loadKey } from "../crypto/indexedDb"

export function useSendMessage(token: string) {
  return async (convId: string, plaintext: string) => {
    const key = await loadKey(convId)
    const ciphertext = await encryptAES(plaintext, key)
    await fetch(`/api/messaging/${convId}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ciphertext }),
    })
  }
}
