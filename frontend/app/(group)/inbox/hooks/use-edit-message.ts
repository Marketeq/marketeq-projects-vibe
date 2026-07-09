"use client"

import { encryptAES } from "@/src/crypto/e2ee"
import { loadKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import type { Message } from "@/types/message"

export function useEditMessage(_token?: string) {
  return async function edit(
    messageId: string,
    convId: string,
    plaintext: string
  ): Promise<Message> {
    if (!messageId || !convId) {
      throw new Error("Missing message ID or conversation ID")
    }

    const key = loadKey(convId)
    if (!key) {
      throw new Error(
        "Encryption key not available. Please wait and try again."
      )
    }

    const ciphertext = await encryptAES(plaintext, key)
    return apiFetch<Message>(`/v1/messages/${messageId}`, {
      method: "PATCH",
      body: { ciphertext },
    })
  }
}
