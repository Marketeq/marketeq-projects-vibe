import { Meta, StoryObj } from "@storybook/react"
import { CircularProgress, Progress } from "@/components/ui"

const meta: Meta = {
  title: "Progress",
  argTypes: {
    value: {
      control: { type: "number", min: 0, max: 100 },
    },
  },
  args: {
    value: 45,
  },
}

export default meta

export const CircularXs: StoryObj = {
  render: (args) => <CircularProgress {...args} />,
}

export const CircularSm: StoryObj = {
  render: (args) => (
    <CircularProgress
      className="text-2xl"
      size={160}
      strokeWidth={16}
      {...args}
    />
  ),
}

export const CircularMd: StoryObj = {
  render: (args) => (
    <CircularProgress
      className="text-[30px] leading-[38px]"
      size={200}
      strokeWidth={24}
      {...args}
    />
  ),
}

export const CircularLg: StoryObj = {
  render: (args) => (
    <CircularProgress
      className="text-4xl leading-[44px]"
      size={240}
      strokeWidth={32}
      {...args}
    />
  ),
}

export const CircularXl: StoryObj = {
  render: (args) => (
    <CircularProgress
      className="text-5xl leading-[60px]"
      size={280}
      strokeWidth={40}
      {...args}
    />
  ),
}

export const Linear: StoryObj = {
  argTypes: {
    bubble: {
      value: {
        control: { type: "boolean" },
      },
    },
  },
  args: {
    bubble: true,
  },
  render: (args) => <Progress {...args} />,
}
