export interface Message {
  id: string
  content: string // encrypted by default
  ciphertext: string // encrypted payload
  senderId: string
  conversationId: string
  isRead: boolean
  createdAt: string // it's Date on the backend, but usually comes as an ISO string to the frontend
  updatedAt: string
  isPinned?: boolean
  isDeleted?: boolean
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
