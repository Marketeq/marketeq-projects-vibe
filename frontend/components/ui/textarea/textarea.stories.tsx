import { Meta, StoryObj } from "@storybook/react"
import { ErrorMessage, HelperText, Label, Textarea } from "@/components/ui"

const meta: Meta = {
  title: "Textarea",
  component: Textarea,
  argTypes: {
    isInvalid: {
      control: "boolean",
    },
  },
  args: {
    isInvalid: false,
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=111-182902&mode=design&t=zpveUJ28A7ydAqXv-4",
    },
  },
}

export default meta

type Story = StoryObj<typeof Textarea>

export const Base: Story = {
  render: (args) => <Textarea {...args} />,
}

export const LabeledBase: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm">Description</Label>
      <Textarea {...args} />
    </div>
  ),
}

export const HelperTextBase: Story = {
  render: ({ isInvalid, ...args }) => (
    <div className="space-y-1.5">
      <Textarea isInvalid={isInvalid} {...args} />
      {isInvalid ? (
        <ErrorMessage size="sm">This is an error message.</ErrorMessage>
      ) : (
        <HelperText size="sm">This is a hint text to help user.</HelperText>
      )}
    </div>
  ),
}

export const LabeledHelperTextBase: Story = {
  render: ({ isInvalid, ...args }) => (
    <div className="space-y-1.5">
      <Label size="sm">Description</Label>
      <Textarea isInvalid={isInvalid} {...args} />
      {isInvalid ? (
        <ErrorMessage size="sm">This is an error message.</ErrorMessage>
      ) : (
        <HelperText size="sm">This is a hint text to help user.</HelperText>
      )}
    </div>
  ),
}
