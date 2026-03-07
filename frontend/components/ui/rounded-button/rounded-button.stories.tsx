import { ChevronRight, Plus } from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import { RoundedButton } from "./rounded-button"

const meta: Meta = {
  title: "RoundedButton",
  parameters: {
    layout: "centered",
  },
}

export default meta

export const Primary = () => {
  return (
    <RoundedButton>
      <Plus className="h-5 w-5" />
    </RoundedButton>
  )
}

export const Secondary = () => {
  return (
    <RoundedButton size="sm" variant="secondary">
      <ChevronRight className="h-4 w-4" />
    </RoundedButton>
  )
}
