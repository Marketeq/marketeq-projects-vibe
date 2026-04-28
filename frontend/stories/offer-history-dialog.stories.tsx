import type { Meta, StoryObj } from "@storybook/react"
import { OfferHistoryDialog } from "@/components/offer-history-dialog"

const items = [
  {
    id: "offer",
    actorName: "Laura",
    actorAvatarSrc: "/avatars/avatar-1.png",
    title: "Laura sent an offer",
    timestampLabel: "Last week at 3:14 PM",
    rateLabel: "$45/hr",
  },
  {
    id: "counter",
    actorName: "Andrew",
    actorAvatarSrc: "/avatars/avatar-2.png",
    title: "Andrew sent a counteroffer",
    timestampLabel: "Yesterday at 1:36 PM",
    rateLabel: "$75/hr",
    role: "UX Designer",
    duration: "4 Months",
    schedule: "Full Time over 30 hrs/week",
    startDate: "Feb 5th, 2025",
  },
  {
    id: "declined",
    actorName: "Laura",
    actorAvatarSrc: "/avatars/avatar-1.png",
    title: "Laura declined the counter offer",
    timestampLabel: "Yesterday at 3:30 PM",
    rateLabel: "$75/hr",
  },
  {
    id: "accepted",
    actorName: "Andrew",
    actorAvatarSrc: "/avatars/avatar-2.png",
    title: "Andrew accepted the offer",
    timestampLabel: "Today at 5:00 PM",
    rateLabel: "$45/hr",
  },
]

const meta: Meta<typeof OfferHistoryDialog> = {
  title: "Offer History Dialog",
  component: OfferHistoryDialog,
  args: {
    open: true,
    items,
    onOpenChange: () => {},
    onCtaClick: () => {},
  },
  parameters: {
    layout: "centered",
  },
}

export default meta

type Story = StoryObj<typeof OfferHistoryDialog>

export const Collapsed: Story = {}

export const Expanded: Story = {
  args: {
    defaultExpandedId: "counter",
  },
}
