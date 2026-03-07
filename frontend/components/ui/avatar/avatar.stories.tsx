import { Meta, StoryObj } from "@storybook/react"
import {
  Avatar,
  AvatarFallback,
  AvatarFallbackIcon,
  AvatarImage,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Avatar",
  component: Avatar,
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "2xl"],
    },
    isOnline: {
      control: "boolean",
    },
    badgeClassName: {
      table: {
        disable: true,
      },
    },
  },
  args: {
    isOnline: true,
  },
}

export default meta

type Story = StoryObj<typeof Avatar>

export const Default: Story = {
  render: (args) => {
    return (
      <Avatar {...args}>
        <AvatarImage src="/man.jpg" alt="Man" />
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=397-201204&mode=design&t=0pofMbZEfin42GC7-4",
    },
  },
}

export const Fallback: Story = {
  render: (args) => {
    return (
      <Avatar className="hover:ring-0 active:ring-primary-100" {...args}>
        <AvatarImage src="/boy.jpg" alt="Boy" />
        <AvatarFallbackIcon />
      </Avatar>
    )
  },
  parameters: {
    ...Default.parameters,
  },
}

export const TooltipVariant: Story = {
  render: (args) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Avatar {...args}>
              <AvatarImage src="/man.jpg" alt="Man" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="text-xs font-semibold leading-[18px]">
            This is a tooltip
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=397-201120&mode=design&t=YLOI4d2ESB2QHIgZ-4",
    },
    layout: "centered",
  },
}

export const TooltipSideBottomVariant: Story = {
  render: (args) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Avatar {...args}>
              <AvatarImage src="/man.jpg" alt="Man" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="text-xs font-semibold leading-[18px]"
          >
            This is a tooltip
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=397-201124&mode=design&t=YLOI4d2ESB2QHIgZ-4",
    },
    layout: "centered",
  },
}

export const XsDetailed: Story = {
  argTypes: {
    size: {
      table: {
        disable: true,
      },
    },
  },
  render: (args) => {
    return (
      <div className="inline-flex items-center gap-x-2">
        <Avatar {...args}>
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-xs font-semibold leading-[15px] text-gray-700">
            Christopher Torres
          </span>
          <span className="text-[9px] leading-[14px] text-gray-500">
            chris@blendmetrics.com
          </span>
        </div>
      </div>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=329-201105&mode=design&t=yD9NNpLMSJVswdhY-4",
    },
  },
}

export const SmDetailed: Story = {
  args: {
    size: "sm",
  },
  argTypes: {
    ...XsDetailed.argTypes,
  },
  render: (args) => {
    return (
      <div className="inline-flex items-center gap-x-2.5">
        <Avatar {...args}>
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">
            Christopher Torres
          </span>
          <span className="text-xs leading-[18px] text-gray-500">
            chris@blendmetrics.com
          </span>
        </div>
      </div>
    )
  },
  parameters: {
    ...XsDetailed.parameters,
  },
}

export const MdDetailed: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    ...XsDetailed.argTypes,
  },
  render: (args) => {
    return (
      <div className="inline-flex items-center gap-x-3">
        <Avatar {...args}>
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">
            Christopher Torres
          </span>
          <span className="text-sm text-gray-500">chris@blendmetrics.com</span>
        </div>
      </div>
    )
  },
  parameters: {
    ...XsDetailed.parameters,
  },
}

export const LgDetailed: Story = {
  args: {
    size: "lg",
  },
  argTypes: {
    ...XsDetailed.argTypes,
  },
  render: (args) => {
    return (
      <div className="inline-flex items-center gap-x-3">
        <Avatar {...args}>
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-base font-semibold text-gray-700">
            Christopher Torres
          </span>
          <span className="text-base text-gray-500">
            chris@blendmetrics.com
          </span>
        </div>
      </div>
    )
  },
  parameters: {
    ...XsDetailed.parameters,
  },
}

export const XlDetailed: Story = {
  args: {
    size: "xl",
  },
  argTypes: {
    ...XsDetailed.argTypes,
  },
  render: (args) => {
    return (
      <div className="inline-flex items-center gap-x-3">
        <Avatar {...args}>
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-[18px] font-semibold leading-7 text-gray-700">
            Christopher Torres
          </span>
          <span className="text-[18px] leading-6 text-gray-500">
            chris@blendmetrics.com
          </span>
        </div>
      </div>
    )
  },
  parameters: {
    ...XsDetailed.parameters,
  },
}
