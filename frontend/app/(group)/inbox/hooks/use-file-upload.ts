"use client"

import { encryptAES } from "@/src/crypto/e2ee"
import { saveKey } from "@/src/crypto/indexedDb"
import { loadKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"

interface FileUploadResponse {
  message: {
    id: string
    conversationId: string
    senderId: string
    type: "file"
    ciphertext: string
    createdAt: string
    updatedAt: string
    isRead: boolean
    isPinned: boolean
    isDeleted: boolean
  }
  attachment: {
    id: string
    messageId: string
    conversationId: string
    senderId: string
    fileUrl: string
    fileName: string
    fileType: string
    fileSize: number
    createdAt: string
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3007"

export function useFileUpload(
  token: string,
  privateKey: CryptoKey | null,
  isGroup: boolean = false
) {
  return async function uploadFile(
    conversationId: string,
    file: File,
    textMessage?: string
  ): Promise<FileUploadResponse> {
    if (!conversationId || !token || !file) {
      throw new Error("Missing required parameters for file upload")
    }

    console.log("Starting file upload:", {
      conversationId,
      fileName: file.name,
      fileSize: file.size,
      hasTextMessage: !!textMessage,
    })

    // 1) Get or fetch the AES key (same logic as useSendMessage)
    let key: Uint8Array
    try {
      key = await loadKey(conversationId)
      console.log("Loaded existing AES key for file upload")
    } catch {
      console.log("No key found for file upload, fetching from server...")

      if (!privateKey) {
        throw new Error("No private key available for file upload")
      }

      const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
        `${API_BASE_URL}/api/messaging/conversations/${conversationId}/key?isGroup=${isGroup}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Decrypt the wrapped key
      const wrapped = Uint8Array.from(atob(encryptedKey), (c) =>
        c.charCodeAt(0)
      )
      const rawBuffer = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        wrapped
      )
      key = new Uint8Array(rawBuffer)

      // Cache it
      const b64 = btoa(String.fromCharCode(...key))
      saveKey(conversationId, b64)
    }

    // 2) Encrypt the text message if provided
    if (!textMessage) {
      textMessage = ""
    }
    let encryptedText = ""
    if (textMessage && textMessage.trim()) {
      encryptedText = await encryptAES(textMessage.trim(), key)
    }

    // 3) Create FormData
    const formData = new FormData()
    formData.append("file", file)
    formData.append("conversationId", conversationId)

    if (encryptedText) {
      formData.append("ciphertext", encryptedText) // Send encrypted text, not plain text
    }

    // Log FormData contents

    // for (const [key, value] of formData.entries()) {
    //   if (value instanceof File) {

    //   } else {
    //     console.log(`${key}:`, value)
    //   }
    // }

    try {
      const response = await fetch(`${API_BASE_URL}/api/messaging/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("File upload failed:", response.status, errorText)
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      console.log("File upload successful:", result)
      return result
    } catch (error) {
      console.error("File upload error:", error)
      throw error
    }
  }
}
