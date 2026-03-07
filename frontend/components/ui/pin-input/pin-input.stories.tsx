import { Meta, StoryObj } from "@storybook/react"
import {
  FourDigitPinInput,
  HelperText,
  Label,
  SixDigitPinInput,
} from "@/components/ui"

const meta: Meta = {
  title: "PinInput",
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=111-182959&mode=design&t=jbmMcUZb7UWd45mh-4",
    },
  },
}

export default meta

export const FourDigit: StoryObj = {
  render: (args) => <FourDigitPinInput {...args} />,
}

export const SixDigit: StoryObj = {
  render: (args) => <SixDigitPinInput {...args} />,
}

export const LabeledFourDigit: StoryObj = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm">Secure code</Label>
      <FourDigitPinInput {...args} />
    </div>
  ),
}

export const LabeledHelperTextFourDigit: StoryObj = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm">Secure code</Label>
      <FourDigitPinInput {...args} />
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextFourDigit: StoryObj = {
  render: (args) => (
    <div className="space-y-1.5">
      <FourDigitPinInput {...args} />
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const LabeledSixDigitPinInput: StoryObj = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm">Secure code</Label>
      <SixDigitPinInput {...args} />
    </div>
  ),
}

export const LabeledHelperTextSixDigitPinInput: StoryObj = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm">Secure code</Label>
      <SixDigitPinInput {...args} />
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextSixDigitPinInput: StoryObj = {
  render: (args) => (
    <div className="space-y-1.5">
      <SixDigitPinInput {...args} />
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}
