export interface Message {
  id: string
  content: string // decrypted display content
  ciphertext?: string | null // encrypted payload (nullable for wrapper-only forwards)
  senderId: string
  threadId: string
  conversationId?: string // legacy alias for threadId
  isRead?: boolean
  createdAt: string
  updatedAt: string
  pinned?: boolean
  isPinned?: boolean // legacy alias for pinned
  deleted?: boolean
  isDeleted?: boolean // legacy alias for deleted
  status?: string
  messageType?: string
  edited?: boolean
  starred?: boolean
  replyToMessageId?: string
  forwardedFromId?: string
  quotedCiphertext?: string | null
  quotedContent?: string | null
}

// Extended Message type to include file attachments
interface MessageWithAttachment extends Message {
  attachment?: {
    id: string
    fileUrl: string
    fileName: string
    fileType: string
    fileSize: number
  }
}
