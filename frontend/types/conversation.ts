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
  participantIds: string[]
  isStarred: boolean
  isPinned: boolean
  isArchived: boolean
  isSpam: boolean
  isMuted: boolean
  isTrashed: boolean
  markedUnread: boolean
  lastReadAt: string | null
  unreadCount?: number
  group?: GroupInfo // only if isGroup is true
  messages?: Message[]
  participantName?: string
  participantUsername?: string
  participantAvatarUrl?: string
  lastMessagePreview?: string
  isOfferNotificationThread?: boolean
}
