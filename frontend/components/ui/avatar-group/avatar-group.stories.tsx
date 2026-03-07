import { Plus } from "@blend-metrics/icons"
import { Meta, StoryObj } from "@storybook/react"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupButton,
  AvatarImage,
  AvatarRoot,
  ScrollArea,
  ScrollBar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "AvatarGroup",
  component: AvatarGroup,
  argTypes: {
    size: {
      table: {
        disable: true,
      },
    },
    excessClassName: {
      table: {
        disable: true,
      },
    },
    max: {
      table: {
        disable: true,
      },
    },
  },
  args: {
    excess: true,
  },
  parameters: {
    design: [
      {
        type: "figma",
        url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=397-201269&mode=design&t=YLOI4d2ESB2QHIgZ-4",
      },
      {
        type: "figma",
        url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=927-193595&mode=design&t=YLOI4d2ESB2QHIgZ-4",
      },
    ],
    layout: "centered",
  },
}

export default meta

type Story = StoryObj<typeof AvatarGroup>

export const Xs: Story = {
  render: (args) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AvatarGroup {...args}>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
            </AvatarGroup>
          </TooltipTrigger>
          <TooltipContent className="p-0" size="md">
            <ScrollArea
              className="h-[192px] p-3 pr-4"
              scrollBar={
                <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
              }
            >
              <div className="space-y-3 pr-5">
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
              </div>
            </ScrollArea>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
}

export const Sm: Story = {
  args: {
    size: "sm",
  },
  render: (args) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AvatarGroup {...args}>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
            </AvatarGroup>
          </TooltipTrigger>
          <TooltipContent className="p-0" size="md">
            <ScrollArea
              className="h-[192px] p-3 pr-4"
              scrollBar={
                <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
              }
            >
              <div className="space-y-3 pr-5">
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
              </div>
            </ScrollArea>
          </TooltipContent>
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
          <TooltipTrigger asChild>
            <AvatarGroup {...args}>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
            </AvatarGroup>
          </TooltipTrigger>

          <TooltipContent className="p-0" size="md">
            <ScrollArea
              className="h-[192px] p-3 pr-4"
              scrollBar={
                <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
              }
            >
              <div className="space-y-3 pr-5">
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
              </div>
            </ScrollArea>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
}

export const SideBottomXs: Story = {
  render: (args) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AvatarGroup {...args}>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
            </AvatarGroup>
          </TooltipTrigger>
          <TooltipContent className="p-0" size="md" side="bottom">
            <ScrollArea
              className="h-[192px] p-3 pr-4"
              scrollBar={
                <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
              }
            >
              <div className="space-y-3 pr-5">
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
              </div>
            </ScrollArea>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
}

export const SideBottomSm: Story = {
  args: {
    size: "sm",
  },
  render: (args) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AvatarGroup {...args}>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="sm"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
            </AvatarGroup>
          </TooltipTrigger>
          <TooltipContent className="p-0" size="md" side="bottom">
            <ScrollArea
              className="h-[192px] p-3 pr-4"
              scrollBar={
                <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
              }
            >
              <div className="space-y-3 pr-5">
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
              </div>
            </ScrollArea>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
}

export const SideBottomMd: Story = {
  args: {
    size: "md",
  },
  render: (args) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AvatarGroup {...args}>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <Avatar
                className="border-2 border-white hover:ring-0 active:ring-0"
                size="md"
              >
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
            </AvatarGroup>
          </TooltipTrigger>

          <TooltipContent className="p-0" size="md" side="bottom">
            <ScrollArea
              className="h-[192px] p-3 pr-4"
              scrollBar={
                <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
              }
            >
              <div className="space-y-3 pr-5">
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <Avatar className="hover:ring-0 active:ring-0">
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium leading-5">Woman</span>
                </div>
              </div>
            </ScrollArea>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
}

export const InviteXs: StoryObj = {
  render: (args) => {
    return (
      <AvatarRoot>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup {...args}>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md">
              <ScrollArea
                className="h-[192px] p-3 pr-4"
                scrollBar={
                  <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
                }
              >
                <div className="space-y-3 pr-5">
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                </div>
              </ScrollArea>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroupButton>
                <Plus className="h-4 w-4" />
              </AvatarGroupButton>
            </TooltipTrigger>
            <TooltipContent>Add User</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AvatarRoot>
    )
  },
}

export const InviteSm: StoryObj = {
  render: (args) => {
    return (
      <AvatarRoot>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup {...args}>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md">
              <ScrollArea
                className="h-[192px] p-3 pr-4"
                scrollBar={
                  <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
                }
              >
                <div className="space-y-3 pr-5">
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                </div>
              </ScrollArea>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroupButton size="sm">
                <Plus className="h-4 w-4" />
              </AvatarGroupButton>
            </TooltipTrigger>
            <TooltipContent>Add User</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AvatarRoot>
    )
  },
  args: {
    ...Sm.args,
  },
}

export const InviteMd: StoryObj = {
  render: (args) => {
    return (
      <AvatarRoot>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup {...args}>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md">
              <ScrollArea
                className="h-[192px] p-3 pr-4"
                scrollBar={
                  <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
                }
              >
                <div className="space-y-3 pr-5">
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                </div>
              </ScrollArea>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroupButton size="md">
                <Plus className="h-4 w-4" />
              </AvatarGroupButton>
            </TooltipTrigger>
            <TooltipContent>Add User</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AvatarRoot>
    )
  },
  args: {
    ...Md.args,
  },
}

export const InviteSideBottomXs: StoryObj = {
  render: (args) => {
    return (
      <AvatarRoot>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup {...args}>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md" side="bottom">
              <ScrollArea
                className="h-[192px] p-3 pr-4"
                scrollBar={
                  <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
                }
              >
                <div className="space-y-3 pr-5">
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                </div>
              </ScrollArea>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroupButton>
                <Plus className="h-4 w-4" />
              </AvatarGroupButton>
            </TooltipTrigger>
            <TooltipContent>Add User</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AvatarRoot>
    )
  },
}

export const InviteSideBottomSm: StoryObj = {
  render: (args) => {
    return (
      <AvatarRoot>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup {...args}>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md" side="bottom">
              <ScrollArea
                className="h-[192px] p-3 pr-4"
                scrollBar={
                  <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
                }
              >
                <div className="space-y-3 pr-5">
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                </div>
              </ScrollArea>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroupButton size="sm">
                <Plus className="h-4 w-4" />
              </AvatarGroupButton>
            </TooltipTrigger>
            <TooltipContent>Add User</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AvatarRoot>
    )
  },
  args: {
    ...Sm.args,
  },
}

export const InviteSideBottomMd: StoryObj = {
  render: (args) => {
    return (
      <AvatarRoot>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup {...args}>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0 active:ring-0"
                  size="md"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md" side="bottom">
              <ScrollArea
                className="h-[192px] p-3 pr-4"
                scrollBar={
                  <ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />
                }
              >
                <div className="space-y-3 pr-5">
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0 active:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                </div>
              </ScrollArea>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroupButton size="md">
                <Plus className="h-4 w-4" />
              </AvatarGroupButton>
            </TooltipTrigger>
            <TooltipContent>Add User</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AvatarRoot>
    )
  },
  args: {
    ...Md.args,
  },
}
