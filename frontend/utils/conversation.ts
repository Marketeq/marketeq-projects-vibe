// src/utils/conversation.ts
import type { Conversation } from "@/types/conversation"

export function getOtherParticipantId(
  conv: Conversation,
  me: string
): string | undefined {
  return conv.participants.find((p) => p.userId !== me)?.userId
}
