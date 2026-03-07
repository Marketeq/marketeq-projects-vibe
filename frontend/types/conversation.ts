// /src/types/conversation.ts
export interface GroupInfo {
  id: string
  name: string
  creatorId: string
}

export interface ConversationParticipant {
  conversationId: string
  userId: string
  joinedAt: string // ISO timestamp
}

export interface Message {
  id: string
  conversationId: string
  content: string // encrypted by default
  senderId: string
  ciphertext: string // encrypted payload
  isRead: boolean
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  isPinned?: boolean
}

export interface Conversation {
  id: string
  isGroup: boolean
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  participants: ConversationParticipant[]
  isStarred: boolean
  group?: GroupInfo // only if isGroup is true
  /**
   * Optional array of messages (if you eagerly load them)
   */
  messages?: Message[]

  /**
   * Convenience field you can attach on the client
   * for the “other” user’s display name
   */
  participantUsername?: string
}
