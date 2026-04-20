// src/utils/conversation.ts
import type { Conversation } from "@/types/conversation"

export function getOtherParticipantId(
  conv: Conversation,
  me: string
): string | undefined {
  return conv.participantIds?.find((id) => id !== me)
}
