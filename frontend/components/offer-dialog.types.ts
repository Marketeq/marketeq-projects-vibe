export interface OfferDialogData {
  senderDisplayName: string
  senderUsername: string
  senderAvatarSrc?: string
  senderProfileHref?: string
  offerType: string
  receivedLabel: string
  offerTitle: string
  offerRate: string
  originalOfferRate?: string
  role: string
  duration: string
  schedule: string
  startDate: string
  expiresLabel: string
  message?: string
  statusDateLabel?: string
  statusReason?: string
}

export interface OfferHistoryItem {
  id: string
  actorName: string
  actorAvatarSrc?: string
  title: string
  timestampLabel: string
  rateLabel: string
  role?: string
  duration?: string
  schedule?: string
  startDate?: string
}
