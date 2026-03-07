import { Meta, StoryObj } from "@storybook/react"
import { Spinner, SpinnerPositioner } from "./spinner"

const meta: Meta = {
  title: "Spinner",
  argTypes: {
    value: {
      control: {
        type: "number",
        min: 0,
        max: 100,
      },
    },
    size: {
      control: {
        type: "number",
        min: 0,
      },
    },
    strokeWidth: {
      control: {
        type: "number",
        min: 0,
      },
    },
  },
  args: {
    value: 80,
    size: 58,
    strokeWidth: 8,
  },
  parameters: {
    layout: "centered",
  },
}

export default meta

type Story = StoryObj<typeof Spinner>

export const Default: Story = {
  render: (args) => <Spinner {...args} />,
}

export const Positioned: Story = {
  render: (args) => (
    <SpinnerPositioner>
      <Spinner {...args} />
    </SpinnerPositioner>
  ),
}
