import { Meta, StoryObj } from "@storybook/react"
import { TextInput } from "./text-input"

const meta: Meta = {
  title: "TextInput",
  argTypes: {
    maxLength: {
      control: {
        type: "number",
        min: 0,
      },
    },
  },
  args: {
    maxLength: 10,
  },
}

export default meta

type Story = StoryObj<typeof TextInput>

export const Default: Story = {
  render: (args) => <TextInput {...args} />,
}
