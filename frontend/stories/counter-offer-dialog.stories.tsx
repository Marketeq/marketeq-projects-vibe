import type { Meta, StoryObj } from "@storybook/react"
import { CounterOfferDialog } from "@/components/counter-offer-dialog"

const meta: Meta<typeof CounterOfferDialog> = {
  title: "Counter Offer Dialog",
  component: CounterOfferDialog,
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
    onCancel: () => {},
    onReview: () => {},
  },
  parameters: {
    layout: "centered",
  },
}

export default meta

type Story = StoryObj<typeof CounterOfferDialog>

export const Default: Story = {
  args: {
    variant: "default",
  },
}

export const RateDropdownCustom: Story = {
  args: {
    variant: "rate-dropdown-custom",
  },
}

export const CustomRate: Story = {
  args: {
    variant: "custom-rate",
  },
}

export const DurationDropdownCustom: Story = {
  args: {
    variant: "duration-dropdown-custom",
  },
}

export const DurationDropdownSelected: Story = {
  args: {
    variant: "duration-dropdown-selected",
  },
}

export const RateDropdownSelected: Story = {
  args: {
    variant: "rate-dropdown-selected",
  },
}

export const CustomDuration: Story = {
  args: {
    variant: "custom-duration",
  },
}
