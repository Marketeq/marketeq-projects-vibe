import { ArrowLeft, HelpCircle, MoreHorizontal, X1 } from "@blend-metrics/icons"
import { Meta, StoryObj } from "@storybook/react"
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Tooltip",
  component: TooltipContent,
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md"],
    },
    visual: {
      control: false,
    },
    side: {
      control: "select",
      options: ["top", "right", "bottom", "left"],
    },
    align: {
      control: "select",
      options: ["start", "center", "end"],
    },
  },
  args: {
    side: "top",
    align: "center",
  },
  parameters: {
    type: "figma",
    url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=178-200893&mode=design&t=gTVxpZUAC2dAusau-4",
    layout: "centered",
  },
}

export default meta

type Story = StoryObj<typeof TooltipContent>

export const Sm: Story = {
  render: (args) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-gray-500">
            <HelpCircle className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent {...args}>This is a tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
}

export const Md: Story = {
  args: {
    size: "md",
  },
  render: (args) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-gray-500">
            <HelpCircle className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent {...args}>
            <span className="font-semibold">This is a tooltip</span>
            <div className="mt-1">
              <span>
                Tooltips are used to describe or identify an element. In most
                scenarios, tooltips help the user understand the meaning,
                function or alt-text of an element.
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
}

export const WhiteSm: Story = {
  args: {
    visual: "white",
  },
  render: (args) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="text-gray-500">
          <HelpCircle className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent className="text-gray-700" {...args}>
          This is a tooltip
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const WhiteMd: Story = {
  args: {
    visual: "white",
    size: "md",
  },
  render: (args) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="text-gray-500">
          <HelpCircle className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent {...args}>
          <span className="font-semibold text-gray-700">This is a tooltip</span>
          <div className="mt-1 text-gray-500">
            <span>
              Tooltips are used to describe or identify an element. In most
              scenarios, tooltips help the user understand the meaning, function
              or alt-text of an element.
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const ArrowLeftIcon: Story = {
  render: (args) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="p-2.5 text-gray-500 hover:text-gray-black"
            variant="outlined"
            visual="gray"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent {...args} className="font-semibold">
          Back
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const MoreHorizontalIcon: Story = {
  render: (args) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="p-2.5 text-gray-500 hover:text-gray-black"
            variant="outlined"
            visual="gray"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent {...args} className="font-semibold">
          Options
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const X2Icon: Story = {
  render: (args) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="p-2.5 text-gray-500 hover:text-gray-black"
            variant="outlined"
            visual="gray"
          >
            <X1 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent {...args} className="font-semibold">
          Exit
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}
