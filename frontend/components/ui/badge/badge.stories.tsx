import { ArrowRight2, ArrowUp1, Dot, Plus2, X2 } from "@blend-metrics/icons"
import { Meta, StoryObj } from "@storybook/react"
import { Avatar, AvatarFallback, AvatarImage, Badge } from "@/components/ui"

const meta: Meta = {
  title: "Badge",
  component: Badge,
  argTypes: {
    visual: {
      control: "select",
      options: [
        "gray",
        "purple",
        "error",
        "warning",
        "success",
        "sky",
        "primary",
        "indigo",
        "pink",
        "rose",
        "orange",
      ],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    variant: {
      control: "select",
      options: ["rounded", "circular"],
    },
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=2-25063&mode=design&t=r9TEGYqxlEOfyK72-4",
    },
  },
}

export default meta

type Story = StoryObj<typeof Badge>

export const Default: Story = {
  render: (args) => {
    return <Badge {...args}>Label</Badge>
  },
}

export const DotIconVariant: Story = {
  render: (args) => {
    return (
      <Badge {...args}>
        <Dot className="h-2 w-2" />
        Label
      </Badge>
    )
  },
}

export const ArrowRightIconVariant: Story = {
  render: (args) => {
    return (
      <Badge {...args}>
        Label
        <ArrowRight2 className="h-3 w-3" />
      </Badge>
    )
  },
}

export const ArrowUpIconVariant: Story = {
  render: (args) => {
    return (
      <Badge {...args}>
        <ArrowUp1 className="h-3 w-3" />
        Label
      </Badge>
    )
  },
}

export const XIconVariant: Story = {
  render: (args) => {
    return (
      <Badge {...args}>
        Label
        <button className="focus-visible:outline-none">
          <X2 className="h-3 w-3" />
        </button>
      </Badge>
    )
  },
}

export const PlusIconVariant: Story = {
  args: {
    variant: "circular",
  },
  render: (args) => {
    return (
      <Badge {...args}>
        <Plus2 className="h-3 w-3" />
      </Badge>
    )
  },
}

export const AvatarIconVariant: Story = {
  render: (args) => {
    return (
      <Badge {...args}>
        <Avatar className="h-4 w-4 hover:ring-0">
          <AvatarImage src="/woman.jpg" alt="Woman" />
          <AvatarFallback>W</AvatarFallback>
        </Avatar>
        Label
      </Badge>
    )
  },
}
