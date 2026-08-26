import type { Meta, StoryObj } from "@storybook/react"
import { OfferFlowDialog } from "@/components/offer-flow-dialog"

const meta: Meta<typeof OfferFlowDialog> = {
  title: "Offer Flow Dialog",
  component: OfferFlowDialog,
  args: {
    open: true,
    data: {
      senderDisplayName: "Offer from",
      senderUsername: "@lauradesign21",
      senderProfileHref: "/talent-profile?username=lauradesign21",
      offerType: "Project",
      receivedLabel: "Feb 1, 2025",
      offerTitle: "The Ultimate Mobile App Experience",
      offerRate: "$45/hr",
      role: "UX Designer",
      duration: "4 Months",
      schedule: "Full Time over 30 hrs/week",
      startDate: "Feb 5th, 2025",
      expiresLabel: "Sep 19, 2025",
    },
    onOpenChange: () => {},
    onAccept: () => {},
    onCancelAccept: () => {},
    onCounterOffer: () => {},
    onDecline: () => {},
    onMessage: () => {},
    onViewJob: () => {},
  },
  parameters: {
    layout: "centered",
  },
}

export default meta

type Story = StoryObj<typeof OfferFlowDialog>

export const OfferDetails: Story = {
  args: {
    variant: "offer-details",
  },
}

export const OfferAccepted: Story = {
  args: {
    variant: "offer-accepted",
    data: {
      ...meta.args?.data!,
      statusDateLabel: "on Feb 3, 2025",
    },
  },
}

export const OfferDeclined: Story = {
  args: {
    variant: "offer-declined",
    data: {
      ...meta.args?.data!,
      statusDateLabel: "on Feb 3, 2025",
      statusReason: "The budget does not align.",
    },
  },
}

export const OfferWithdrawn: Story = {
  args: {
    variant: "offer-withdrawn",
    data: {
      ...meta.args?.data!,
      statusDateLabel: "on Feb 3, 2025",
    },
  },
}

export const OfferExpired: Story = {
  args: {
    variant: "offer-expired",
    data: {
      ...meta.args?.data!,
      statusDateLabel: "on Aug 2, 2025",
    },
  },
}

export const AcceptOfferEmpty: Story = {
  args: {
    variant: "accept-offer-empty",
  },
}

export const AcceptOfferReady: Story = {
  args: {
    variant: "accept-offer-ready",
    acceptanceMessage: "Excited to get started!",
    termsAccepted: true,
  },
}

export const DeclineOfferEmpty: Story = {
  args: {
    variant: "decline-offer-empty",
  },
}

export const DeclineOfferReady: Story = {
  args: {
    variant: "decline-offer-ready",
    declineMessage: "Too busy right now",
    selectedDeclineReason: "Too busy right now",
  },
}
