import React from "react"
import NextLink from "next/link"
import { useToggle } from "@/utils/hooks"
import {
  AlertCircle,
  Aperture,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  CheckCircleBroken,
  ChevronDown,
  ChevronRight,
  Clock,
  ClockRewind,
  Copy,
  Copy02,
  Database02,
  Dataflow02,
  Download,
  Download02,
  Edit03,
  Edit05,
  Folder,
  GitBranch01,
  Link,
  Link03,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Settings02,
  Star,
  Trash01,
  Trash02,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  X,
  Zap,
} from "@blend-metrics/icons"
import {
  Gmail1Brand,
  GoogleMeet2Brand,
  SlackBrand,
} from "@blend-metrics/icons/brands"
import { GridVertical2, GripVertical1 } from "@blend-metrics/icons/special"
import { Meta, StoryObj } from "@storybook/react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  DisclosureContent,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  IconButton,
  Label,
  PercentageInput,
  ScrollArea,
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import {
  ActionCardContent,
  ActionCardDescription,
  ActionCardIcon,
  ActionCardRoot,
  ActionCardTitle,
} from "./action-card"
import {
  Article,
  ArticleContent,
  ArticleDescription,
  ArticleIcon,
  ArticleTitle,
} from "./article"
import {
  VersionCardDescription,
  VersionCardFooter,
  VersionCardHeader,
  VersionCardRoot,
  VersionCardTitle,
} from "./version-card"

const meta: Meta = {
  title: "Card",
}

export default meta

export const ActionVariant = () => {
  return (
    <ActionCardRoot>
      <ActionCardIcon>
        <Gmail1Brand className="h-6 w-6" />
      </ActionCardIcon>
      <ActionCardContent>
        <ActionCardTitle>New Email</ActionCardTitle>
        <ActionCardDescription>
          Triggers when new email appears in mailbox
        </ActionCardDescription>
      </ActionCardContent>
    </ActionCardRoot>
  )
}

export const VersionVariant = () => {
  return (
    <VersionCardRoot className="group">
      <VersionCardHeader>
        <VersionCardTitle>New Team VersionCard</VersionCardTitle>

        <div className="flex items-center gap-x-3.5">
          <Favorite className="data-[state=off]:hidden data-[state=off]:group-hover:inline-flex data-[state=off]:group-active:group-hover:inline-flex" />
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <IconButton
                      visual="gray"
                      variant="ghost"
                      className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-transparent focus:bg-transparent"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </IconButton>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem>
                    <Edit03 className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ClockRewind className="h-4 w-4" /> Restore this Version
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link className="h-4 w-4" /> Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem visual="destructive">
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
                <TooltipContent
                  align="center"
                  className="font-semibold"
                  side="bottom"
                >
                  Options
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DropdownMenu>
        </div>
      </VersionCardHeader>

      <VersionCardDescription>Aug 15, 2022 at 11:48 AM</VersionCardDescription>

      <VersionCardFooter className="mt-2 flex items-center gap-x-2">
        <Avatar className="h-5 w-5">
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>

        <VersionCardDescription>
          Manually saved by Ronald Richards
        </VersionCardDescription>
      </VersionCardFooter>
    </VersionCardRoot>
  )
}

type ArticleStory = StoryObj<typeof Article>

export const ArticleConnectVariant = () => {
  const [isConnected, { on }] = useToggle()
  return (
    <Article variant="default">
      <ArticleIcon rounded="md" visual="flushed">
        <Gmail1Brand className="h-6 w-6" />
      </ArticleIcon>
      <ArticleTitle size="sm">Connect your Gmail account</ArticleTitle>
      <Button className="ml-auto" variant="outlined" onClick={on}>
        {isConnected ? (
          <Check className="h-[15px] w-[15px] text-success-500" />
        ) : (
          <Plus className="h-[15px] w-[15px] text-gray-500" />
        )}
        Connected
      </Button>
    </Article>
  )
}

export const ArticleOutlinedVariant: ArticleStory = {
  argTypes: {
    isDragging: {
      control: "boolean",
    },
    isSelected: {
      control: "boolean",
    },
    isGrabbed: {
      control: "boolean",
    },
    isOnCanvas: {
      control: "boolean",
    },
  },
  args: {
    isDragging: false,
    isSelected: false,
    isGrabbed: false,
    isOnCanvas: false,
  },
  render: (args) => (
    <Article variant="outlined" {...args}>
      <ArticleIcon>
        <Aperture className="h-5 w-5" />
      </ArticleIcon>
      <ArticleContent className="w-[calc(theme(width.full)-56px)]">
        <ArticleTitle>Add Event</ArticleTitle>
        <ArticleDescription>
          TypeError: A dynamic import callback was not specified.
        </ArticleDescription>
      </ArticleContent>
    </Article>
  ),
}

export const ArticleDestructiveVariant: ArticleStory = {
  argTypes: {
    isError: {
      control: "boolean",
    },
  },
  args: {
    isError: false,
  },
  render: (args) => (
    <Article className="group" variant="destructive" {...args}>
      <div className="flex items-center gap-x-3">
        <ArticleIcon visual="flushed">
          <Gmail1Brand className="h-[32.13px] w-[32.13px]" />
        </ArticleIcon>
        <ArticleContent>
          <ArticleTitle>Trigger</ArticleTitle>
          <ArticleDescription>Message is received in Gmail</ArticleDescription>
        </ArticleContent>
      </div>
      <Button
        variant="ghost"
        visual="gray"
        className="h-auto ml-auto hidden group-hover:inline-flex py-1 px-1.5 self-start text-gray-500"
      >
        <MoreHorizontal className="h-[15px] w-[15px]" />
      </Button>
    </Article>
  ),
}

export const PercentageVariant = () => {
  const [value, setValue] = React.useState<number>(0)

  return (
    <div className="group h-[92px] rounded-lg border-gray-200 border p-3 relative pl-[25px]">
      <button className="focus-visible:outline-none opacity-0 group-hover:opacity-100 duration-300 absolute left-2 inset-y-0 cursor-grab my-auto">
        <GridVertical2 className="text-gray-400" />
      </button>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold leading-6 text-gray-black">
          Path 1
        </span>

        <ButtonGroup className="inline-flex opacity-0 group-hover:opacity-100 duration-300 items-center gap-x-1">
          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <ArrowLeft className="h-3 w-3 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Move Left
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <ArrowRight className="h-3 w-3 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Move Right
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Copy className="h-3 w-3 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckItem>Copy</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Duplicate</DropdownMenuCheckItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <Trash02 className="h-3 w-3 text-error-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Delete Path
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ButtonGroup>
      </div>

      <div className="flex items-center gap-x-[17px]">
        <SliderRoot
          value={[value]}
          onValueChange={([value]) => setValue(value)}
          className="flex-grow"
        >
          <SliderTrack>
            <SliderRange />
          </SliderTrack>
          <SliderThumb />
        </SliderRoot>
        <div className="flex items-center gap-x-1.5">
          <PercentageInput
            className="w-[86px]"
            value={value}
            onValueChange={setValue}
          />
          <span className="text-sm leading-5 text-gray-700 font-medium">%</span>
        </div>
      </div>
    </div>
  )
}

export const PathDefault = () => {
  return (
    <article className="group relative py-3 flex items-center px-[25px] gap-x-1 h-[68px] rounded-lg border-2 border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,0.02)]">
      <button className="focus-visible:outline-none cursor-grab absolute left-1 inset-y-0 my-auto">
        <GripVertical1 className="group-hover:opacity-100 opacity-0 transition duration-300 text-gray-400" />
      </button>
      <div className="flex-grow">
        <h1 className="text-sm leading-6 font-semibold text-gray-black">
          Path1
        </h1>
        <p className="text-xs leading-5 text-primary-500">Add Condition</p>
      </div>

      <div className="flex items center">
        <ButtonGroup className="inline-flex opacity-0 group-hover:opacity-100 transition duration-300 items-center gap-x-1">
          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <ArrowLeft className="h-3 w-3 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Move Left
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <ArrowRight className="h-3 w-3 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Move Right
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Copy className="h-3 w-3 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckItem>Copy</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Duplicate</DropdownMenuCheckItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <Trash02 className="h-3 w-3 text-error-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Delete Path
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ButtonGroup>

        <button className="focus-visible:outline-none h-[18px] w-[18px]">
          <ChevronRight className="h-[18px] text-gray-400 w-[18px]" />
        </button>
      </div>
    </article>
  )
}

export const PathConditionVariant = () => {
  return (
    <article className="group relative py-3 flex items-center px-[25px] gap-x-1 h-[68px] rounded-lg border-2 border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,0.02)]">
      <button className="focus-visible:outline-none cursor-grab absolute left-1 inset-y-0 my-auto">
        <GripVertical1 className="group-hover:opacity-100 opacity-0 transition duration-300 text-gray-400" />
      </button>
      <div className="flex-grow">
        <h1 className="text-sm leading-6 font-semibold text-gray-black">
          Path1
        </h1>
        <div className="flex items-center gap-x-[3px]">
          <span className="text-xs text-gray-500 leading-5">If</span>
          <SlackBrand className="h-[15px] w-[15px]" />
          <span className="text-xs text-gray-500 leading-5">
            sender contains 123, +4
          </span>
        </div>
      </div>

      <div className="flex items center">
        <ButtonGroup className="inline-flex opacity-0 group-hover:opacity-100 transition duration-300 items-center gap-x-1">
          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <ArrowLeft className="h-3 w-3 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Move Left
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <ArrowRight className="h-3 w-3 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Move Right
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Copy className="h-3 w-3 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckItem>Copy</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Duplicate</DropdownMenuCheckItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <Trash02 className="h-3 w-3 text-error-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Delete Path
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ButtonGroup>

        <button className="focus-visible:outline-none h-[18px] w-[18px]">
          <ChevronRight className="h-[18px] text-gray-400 w-[18px]" />
        </button>
      </div>
    </article>
  )
}

export const PathDestructive = () => {
  return (
    <article className="group relative py-3 flex items-center px-[25px] gap-x-1 h-[68px] rounded-lg border-2 border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,0.02)]">
      <button className="focus-visible:outline-none cursor-grab absolute left-1 inset-y-0 my-auto">
        <GripVertical1 className="group-hover:opacity-100 opacity-0 transition duration-300 text-gray-400" />
      </button>
      <div className="flex-grow">
        <h1 className="text-sm leading-6 font-semibold text-gray-black">
          Path1
        </h1>
        <span className="text-xs leading-5 text-error-700">
          Incomplete Conditions
        </span>
      </div>

      <div className="flex items center">
        <ButtonGroup className="inline-flex opacity-0 transition duration-300 group-hover:opacity-100 items-center gap-x-1">
          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <ArrowLeft className="h-3 w-3 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Move Left
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <ArrowRight className="h-3 w-3 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Move Right
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Copy className="h-3 w-3 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckItem>Copy</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Duplicate</DropdownMenuCheckItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger className="focus:outline-none">
                <Trash02 className="h-3 w-3 text-error-500" />
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="top">
                Delete Path
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ButtonGroup>

        <button className="focus-visible:outline-none h-[18px] w-[18px]">
          <ChevronRight className="h-[18px] text-gray-400 w-[18px]" />
        </button>
      </div>
    </article>
  )
}

export const DestructiveVariant = () => {
  return (
    <div className="inline-flex gap-x-2 items-center">
      <AlertCircle className="h-6 flex-none w-6 text-error-500" />
      <Article destructive>
        <ArticleIcon variant="destructive">
          <Dataflow02 className="h-5 w-5" />
        </ArticleIcon>
        <ArticleContent>
          <ArticleTitle className="text-error-500">Split Path</ArticleTitle>
          <ArticleDescription className="text-error-500">
            Condition based split
          </ArticleDescription>
        </ArticleContent>
      </Article>
    </div>
  )
}

export const ActionEmpty = () => {
  return (
    <article className="w-[317px] shadow-sm border rounded-lg border-primary-500 p-6 bg-white">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium flex-grow leading-6 text-gray-900">
          Select Action
        </h1>
        <button className="focus-visible:outline-none">
          <MoreHorizontal className="text-gray-400" />
        </button>
      </div>
      <p className="text-xs leading-[14.52px] mt-0.5 text-[#777777]">
        Then this action will be automated
      </p>

      <button className="h-[60px] bg-white w-full mt-6 flex items-center justify-center gap-x-3 text-lg font-semibold border focus-visible:outline-none text-gray-800 border-gray-300 shadow-xs px-4">
        <Plus className="h-6 w-6 text-[#777777]" />
        Add Action
      </button>
    </article>
  )
}

export const ActionSelected = () => {
  return (
    <article className="w-[317px] shadow-sm border rounded-lg border-primary-500 p-6 bg-white">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium flex-grow leading-6 text-gray-900">
          Action selected
        </h1>
        <button className="focus-visible:outline-none">
          <MoreHorizontal className="text-gray-400" />
        </button>
      </div>
      <p className="text-xs leading-[14.52px] mt-0.5 text-[#777777]">
        Then this action will be automated
      </p>

      <div className="border p-4 mt-6 border-gray-200 rounded-lg flex items-start bg-white gap-x-2.5">
        <GitBranch01 className="text-[#999999]" />

        <div className="flex flex-grow items-start">
          <div className="flex-grow">
            <h1 className="text-sm font-medium text-gray-700">Conditional</h1>
            <p className="text-[10px] leading-3 text-[#777777]">
              Splits the path based on Conditions
            </p>
          </div>

          <button className="focus-visible:outline-none h-5 w-5">
            <X className="h-5 w-5 text-[#777777]" />
          </button>
        </div>
      </div>
    </article>
  )
}

export const ActionConditionalAddVariant = () => {
  return (
    <div className="inline-flex flex-col items-center space-y-6">
      <article className="w-[317px] shadow-sm border rounded-lg border-primary-500 p-6 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-medium flex-grow leading-6 text-gray-900">
            Action selected
          </h1>
          <button className="focus-visible:outline-none">
            <MoreHorizontal className="text-gray-400" />
          </button>
        </div>
        <p className="text-xs leading-[14.52px] mt-0.5 text-[#777777]">
          Then this action will be automated
        </p>

        <div className="border p-4 mt-6 border-gray-200 rounded-lg flex items-start bg-white gap-x-2.5">
          <GitBranch01 className="text-[#999999]" />

          <div className="flex flex-grow items-start">
            <div className="flex-grow">
              <h1 className="text-sm font-medium text-gray-700">Conditional</h1>
              <p className="text-[10px] leading-3 text-[#777777]">
                Splits the path based on Conditions
              </p>
            </div>

            <button className="focus-visible:outline-none h-5 w-5">
              <X className="h-5 w-5 text-[#777777]" />
            </button>
          </div>
        </div>
      </article>

      <button className="h-[41px] focus-visible:outline-none mx-auto w-[41px] inline-flex bg-[#576190]/10 items-center justify-center rounded-full">
        <Plus className="text-[#23283C] h-5 w-5" />
      </button>
    </div>
  )
}

export const AvatarGroupDefaultVariant: StoryObj = {
  render: (args) => (
    <Card className="px-6 py-[17px]" {...args}>
      <div className="space-y-1">
        <div className="inline-flex items-center gap-x-2">
          <div className="text-sm font-medium text-gray-800">Administrator</div>
          <Badge>Default</Badge>
        </div>
        <div className="text-sm text-gray-500">
          Can manage the content they have created
        </div>
      </div>

      <div className="inline-flex items-center gap-x-8">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AvatarGroup size="sm" excess>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md">
              <ScrollArea className="h-[192px] p-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-x-2">
                    <Avatar>
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar>
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar>
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar>
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar>
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar>
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

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              className="h-8 px-1.5 py-1 text-gray-500"
              visual="gray"
              variant="ghost"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="min-w-[182px]">
            <DropdownMenuItem>
              <Edit03 className="h-4 w-4" />
              Option 1
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy02 className="h-4 w-4" />
              Option 2
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link03 className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Zap />
              Option 4
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit05 className="h-4 w-4" />
              Option 5
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Folder className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ClockRewind className="h-4 w-4" />
              Option 7
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download02 className="h-4 w-4" />
              Option 8
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem visual="destructive">
              <Trash01 className="h-4 w-4" />
              Delete item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  ),
}

export const NoAssignedUsersDefaultVariant: StoryObj = {
  render: (args) => (
    <Card className="px-6 py-5" {...args}>
      <div className="space-y-1">
        <div className="inline-flex items-center gap-x-2">
          <div className="text-sm font-medium text-gray-800">Administrator</div>
          <Badge>Default</Badge>
        </div>
        <div className="text-sm text-gray-500">
          Can manage the content they have created
        </div>
      </div>

      <div className="inline-flex items-center gap-x-[25px]">
        <span className="text-sm text-gray-500">No assigned users</span>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              className="h-8 px-1.5 py-1 text-gray-500"
              visual="gray"
              variant="ghost"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="min-w-[182px]">
            <DropdownMenuItem>
              <Edit03 className="h-4 w-4" />
              Option 1
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy02 className="h-4 w-4" />
              Option 2
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link03 className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Zap />
              Option 4
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit05 className="h-4 w-4" />
              Option 5
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Folder className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ClockRewind className="h-4 w-4" />
              Option 7
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download02 className="h-4 w-4" />
              Option 8
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem visual="destructive">
              <Trash01 className="h-4 w-4" />
              Delete item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  ),
}

export const AvatarIndividualVariant: StoryObj = {
  render: (args) => (
    <Card className="px-6 py-[17px]" {...args}>
      <div className="space-y-1">
        <div className="inline-flex items-center gap-x-2">
          <div className="text-sm font-medium text-gray-800">Analyst</div>
          <Badge visual="primary">Individual</Badge>
        </div>
        <div className="text-sm text-gray-500">
          Can create, update and delete content
        </div>
      </div>

      <div className="inline-flex items-center gap-x-[116px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AvatarGroup size="sm">
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent
              className="max-h-[192px] space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg"
              size="md"
            >
              <div className="flex items-center gap-x-2">
                <Avatar>
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium leading-5">Woman</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              className="h-8 px-1.5 py-1 text-gray-500"
              visual="gray"
              variant="ghost"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="min-w-[182px]">
            <DropdownMenuItem>
              <Edit03 className="h-4 w-4" />
              Option 1
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy02 className="h-4 w-4" />
              Option 2
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link03 className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Zap />
              Option 4
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit05 className="h-4 w-4" />
              Option 5
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Folder className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ClockRewind className="h-4 w-4" />
              Option 7
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download02 className="h-4 w-4" />
              Option 8
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem visual="destructive">
              <Trash01 className="h-4 w-4" />
              Delete item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  ),
}

export const NoAssignedUsersIndividualVariant: StoryObj = {
  render: (args) => (
    <Card className="px-6 py-5" {...args}>
      <div className="space-y-1">
        <div className="inline-flex items-center gap-x-2">
          <div className="text-sm font-medium text-gray-800">Editor</div>
          <Badge visual="primary">Default</Badge>
        </div>
        <div className="text-sm text-gray-500">
          Can create, update and delete content
        </div>
      </div>

      <div className="inline-flex items-center gap-x-[25px]">
        <span className="text-sm text-gray-500">No assigned users</span>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              className="h-8 px-1.5 py-1 text-gray-500"
              visual="gray"
              variant="ghost"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="min-w-[182px]">
            <DropdownMenuItem>
              <Edit03 className="h-4 w-4" />
              Option 1
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy02 className="h-4 w-4" />
              Option 2
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link03 className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Zap />
              Option 4
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit05 className="h-4 w-4" />
              Option 5
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Folder className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ClockRewind className="h-4 w-4" />
              Option 7
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download02 className="h-4 w-4" />
              Option 8
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem visual="destructive">
              <Trash01 className="h-4 w-4" />
              Delete item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  ),
}

export const AvatarGroupCustomVariant: StoryObj = {
  render: (args) => (
    <Card className="px-6 py-[17px]" {...args}>
      <div className="space-y-1">
        <div className="inline-flex items-center gap-x-2">
          <div className="text-sm font-medium text-gray-800">Editor</div>
          <Badge visual="primary">Custom</Badge>
        </div>
        <div className="text-sm text-gray-500">
          Can manage the content they have created
        </div>
      </div>

      <div className="inline-flex items-center gap-x-8">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AvatarGroup size="sm">
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <Avatar
                  className="border-2 border-white hover:ring-0"
                  size="sm"
                >
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md">
              <ScrollArea className="h-[192px] p-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0">
                      <AvatarImage src="/woman.jpg" alt="Woman" />
                      <AvatarFallback>W</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium leading-5">Woman</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Avatar className="hover:ring-0">
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

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              className="h-8 px-1.5 py-1 text-gray-500"
              visual="gray"
              variant="ghost"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="min-w-[182px]">
            <DropdownMenuItem>
              <Edit03 className="h-4 w-4" />
              Option 1
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy02 className="h-4 w-4" />
              Option 2
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link03 className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Zap />
              Option 4
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit05 className="h-4 w-4" />
              Option 5
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Folder className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ClockRewind className="h-4 w-4" />
              Option 7
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download02 className="h-4 w-4" />
              Option 8
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem visual="destructive">
              <Trash01 className="h-4 w-4" />
              Delete item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  ),
}

export const NoAssignedUsersCustomVariant: StoryObj = {
  render: (args) => (
    <Card className="px-6 py-5" {...args}>
      <div className="space-y-1">
        <div className="inline-flex items-center gap-x-2">
          <div className="text-sm font-medium text-gray-800">Administrator</div>
          <Badge visual="primary">Custom</Badge>
        </div>
        <div className="text-sm text-gray-500">
          Can manage the content they have created
        </div>
      </div>

      <div className="inline-flex items-center gap-x-[25px]">
        <span className="text-sm text-gray-500">No assigned users</span>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              className="h-8 px-1.5 py-1 text-gray-500"
              visual="gray"
              variant="ghost"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="min-w-[182px]">
            <DropdownMenuItem>
              <Edit03 className="h-4 w-4" />
              Option 1
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy02 className="h-4 w-4" />
              Option 2
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link03 className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4" />
              Option 3
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Zap />
              Option 4
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit05 className="h-4 w-4" />
              Option 5
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Folder className="h-4 w-4" />
              Option 6
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ClockRewind className="h-4 w-4" />
              Option 7
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download02 className="h-4 w-4" />
              Option 8
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem visual="destructive">
              <Trash01 className="h-4 w-4" />
              Delete item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  ),
}

export const AvatarDetailedDefaultVariant: StoryObj = {
  render: (args) => (
    <Card className="px-6 py-[18px]" {...args}>
      <div className="inline-flex items-center gap-x-3">
        <Avatar size="md">
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">Test Name</span>
          <span className="text-sm text-gray-500">test@gmail.com</span>
        </div>
      </div>

      <span className="text-sm font-medium text-gray-900">Administrator</span>

      <Badge>Default</Badge>

      <div className="flex flex-col gap-y-1">
        <span className="text-sm font-medium text-gray-900">
          Accepted Team Invite
        </span>
        <span className="text-sm text-gray-500">3 days ago</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            className="h-8 px-1.5 py-1 text-gray-500"
            visual="gray"
            variant="ghost"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-[182px]">
          <DropdownMenuItem>
            <Edit03 className="h-4 w-4" />
            Option 1
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy02 className="h-4 w-4" />
            Option 2
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link03 className="h-4 w-4" />
            Option 3
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UserPlus className="h-4 w-4" />
            Option 3
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Zap />
            Option 4
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit05 className="h-4 w-4" />
            Option 5
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Star className="h-4 w-4" />
            Option 6
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Folder className="h-4 w-4" />
            Option 6
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ClockRewind className="h-4 w-4" />
            Option 7
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download02 className="h-4 w-4" />
            Option 8
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem visual="destructive">
            <Trash01 className="h-4 w-4" />
            Delete item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  ),
}

export const AvatarFallbackDefaultVariant: StoryObj = {
  render: () => (
    <Card className="px-6 py-[18px]">
      <div className="inline-flex gap-x-3">
        <Avatar size="md">
          <AvatarImage src="/boy.jpg" alt="Boy" />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">Test Name</h3>
          <p className="text-sm text-gray-500">test@gmail.com</p>
        </div>
      </div>

      <span className="text-sm font-medium text-gray-900">Administrator</span>

      <Badge>Default</Badge>

      <span className="text-sm text-gray-500">Pending Invitation</span>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            className="h-8 px-1.5 py-1 text-gray-500"
            visual="gray"
            variant="ghost"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-[182px]">
          <DropdownMenuItem>
            <Edit03 className="h-4 w-4" />
            Option 1
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy02 className="h-4 w-4" />
            Option 2
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link03 className="h-4 w-4" />
            Option 3
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UserPlus className="h-4 w-4" />
            Option 3
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Zap />
            Option 4
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit05 className="h-4 w-4" />
            Option 5
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Star className="h-4 w-4" />
            Option 6
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Folder className="h-4 w-4" />
            Option 6
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ClockRewind className="h-4 w-4" />
            Option 7
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download02 className="h-4 w-4" />
            Option 8
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem visual="destructive">
            <Trash01 className="h-4 w-4" />
            Delete item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  ),
}

export const GoogleMeetConnected: StoryObj = {
  render: (args) => (
    <Card
      className="flex-col items-stretch gap-y-4 p-4 lg:flex-row lg:items-center lg:px-6 lg:py-5"
      {...args}
    >
      <div className="flex flex-auto items-center justify-between lg:contents">
        <div className="contents gap-x-3 lg:flex">
          <GoogleMeet2Brand className="h-8 w-8 flex-none" />
          <div className="hidden flex-col gap-y-0.5 lg:flex">
            <span className="text-sm font-semibold text-gray-800">
              Google Meet
            </span>
            <span className="text-xs leading-[18px] text-gray-500">
              account@gmail.com
            </span>
            <span className="text-sm text-gray-500">
              Users can record meetings and connect with team members.
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-x-2 lg:flex">
          <Badge size="md" visual="primary">
            3 Triggers
          </Badge>
          <Badge size="md" visual="primary">
            3 Triggers
          </Badge>
          <Badge size="md" visual="primary">
            3 Triggers
          </Badge>
        </div>

        <div className="flex items-center gap-x-6">
          <Button variant="outlined" visual="gray">
            <Check className="text-success-500" />
            Connected
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                className="h-8 px-1.5 py-1 text-gray-500"
                visual="gray"
                variant="ghost"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="min-w-[182px]">
              <DropdownMenuItem>
                <Edit03 className="h-4 w-4" />
                Option 1
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy02 className="h-4 w-4" />
                Option 2
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link03 className="h-4 w-4" />
                Option 3
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4" />
                Option 3
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Zap />
                Option 4
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit05 className="h-4 w-4" />
                Option 5
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star className="h-4 w-4" />
                Option 6
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Folder className="h-4 w-4" />
                Option 6
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ClockRewind className="h-4 w-4" />
                Option 7
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download02 className="h-4 w-4" />
                Option 8
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem visual="destructive">
                <Trash01 className="h-4 w-4" />
                Delete item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-y-0.5 lg:hidden">
        <span className="text-sm font-semibold text-gray-800">Google Meet</span>
        <span className="text-xs leading-[18px] text-gray-500">
          account@gmail.com
        </span>
        <span className="text-sm text-gray-500">
          Users can record meetings and connect with team members.
        </span>
      </div>

      <div className="flex items-center gap-x-2 lg:hidden">
        <Badge size="md" visual="primary">
          3 Triggers
        </Badge>
        <Badge size="md" visual="primary">
          3 Triggers
        </Badge>
        <Badge size="md" visual="primary">
          3 Triggers
        </Badge>
      </div>
    </Card>
  ),
}

export const GoogleMeetConnect: StoryObj = {
  render: (args) => (
    <Card
      className="flex-col items-stretch gap-y-4 p-4 lg:flex-row lg:items-center lg:px-6 lg:py-5"
      {...args}
    >
      <div className="flex flex-auto items-center justify-between lg:contents">
        <div className="contents gap-x-3 lg:flex">
          <GoogleMeet2Brand className="h-8 w-8 flex-none" />
          <div className="hidden flex-col gap-y-0.5 lg:flex">
            <span className="text-sm font-semibold text-gray-800">
              Google Meet
            </span>
            <span className="text-xs leading-[18px] text-gray-500">
              account@gmail.com
            </span>
            <span className="text-sm text-gray-500">
              Users can record meetings and connect with team members.
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-x-2 lg:flex">
          <Badge size="md" visual="primary">
            3 Triggers
          </Badge>
          <Badge size="md" visual="primary">
            3 Triggers
          </Badge>
          <Badge size="md" visual="primary">
            3 Triggers
          </Badge>
        </div>

        <div className="flex items-center gap-x-6">
          <Button variant="outlined" visual="gray">
            <Plus className="h-4 w-4 text-gray-500" />
            Connect
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                className="h-8 px-1.5 py-1 text-gray-500"
                visual="gray"
                variant="ghost"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[182px]">
              <DropdownMenuItem>
                <Edit03 className="h-4 w-4" />
                Option 1
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy02 className="h-4 w-4" />
                Option 2
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link03 className="h-4 w-4" />
                Option 3
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4" />
                Option 3
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Zap />
                Option 4
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit05 className="h-4 w-4" />
                Option 5
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star className="h-4 w-4" />
                Option 6
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Folder className="h-4 w-4" />
                Option 6
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ClockRewind className="h-4 w-4" />
                Option 7
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download02 className="h-4 w-4" />
                Option 8
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem visual="destructive">
                <Trash01 className="h-4 w-4" />
                Delete item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-y-0.5 lg:hidden">
        <span className="text-sm font-semibold text-gray-800">Google Meet</span>
        <span className="text-xs leading-[18px] text-gray-500">
          account@gmail.com
        </span>
        <span className="text-sm text-gray-500">
          Users can record meetings and connect with team members.
        </span>
      </div>

      <div className="flex items-center gap-x-2 lg:hidden">
        <Badge size="md" visual="primary">
          3 Triggers
        </Badge>
        <Badge size="md" visual="primary">
          3 Triggers
        </Badge>
        <Badge size="md" visual="primary">
          3 Triggers
        </Badge>
      </div>
    </Card>
  ),
}

export const DetailedAvatarFullAccess: StoryObj = {
  render: (args) => (
    <Card className="px-6 py-[18px]" {...args}>
      <div className="inline-flex items-center gap-x-3">
        <Avatar size="md">
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">Test Name</span>
          <span className="text-sm text-gray-500">test@gmail.com</span>
        </div>
      </div>

      <span className="text-sm font-medium text-gray-900">Administrator</span>

      <span className="text-sm font-medium text-gray-800">Full Access</span>

      <div className="flex flex-col gap-y-1">
        <span className="text-sm font-medium text-gray-900">
          Accepted Team Invite
        </span>
        <span className="text-sm text-gray-500">3 days ago</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            className="h-8 px-1.5 py-1 text-gray-500"
            visual="gray"
            variant="ghost"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-[182px]">
          <DropdownMenuItem>
            <Edit03 className="h-4 w-4" />
            Option 1
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy02 className="h-4 w-4" />
            Option 2
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link03 className="h-4 w-4" />
            Option 3
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UserPlus className="h-4 w-4" />
            Option 3
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Zap />
            Option 4
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit05 className="h-4 w-4" />
            Option 5
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Star className="h-4 w-4" />
            Option 6
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Folder className="h-4 w-4" />
            Option 6
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ClockRewind className="h-4 w-4" />
            Option 7
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download02 className="h-4 w-4" />
            Option 8
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem visual="destructive">
            <Trash01 className="h-4 w-4" />
            Delete item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  ),
}

export const AccordionPassed = () => {
  return (
    <Accordion type="single" collapsible className="space-y-6 p-5">
      <AccordionItem value="1">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-6 py-[18px] group-data-[state=closed]:rounded-b-lg group-data-[state=open]:rounded-b-none">
          <Checkbox size="md" />

          <div className="flex items-center gap-x-3">
            <div className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-success-100 text-success-500">
              <CheckCircleBroken className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-gray-black">Passed</span>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-800">
              Transform Sales Data
            </div>
            <div className="text-xs leading-[18px] text-gray-500">
              123456789
            </div>
          </div>

          <div className="flex items-center gap-x-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium text-gray-800">1 min ago</span>
          </div>

          <div className="flex items-center gap-x-2">
            <GoogleMeet2Brand className="h-8 w-8" />
            <span className="text-sm font-medium text-gray-800">
              Google Meet
            </span>
          </div>

          <div className="flex items-center gap-x-2">
            <Database02 className="text-gray-400 h-5 w-5" />
            <span className="text-sm font-medium text-gray-800">200kb</span>
          </div>

          <Avatar size="sm">
            <AvatarImage src="/woman.jpg" />
            <AvatarFallback>W</AvatarFallback>
          </Avatar>

          <AccordionTrigger>
            <ChevronDown className="h-5 w-5 text-gray-500 transition-transform group-data-[state=closed]/trigger:rotate-0 group-data-[state=open]/trigger:rotate-180" />
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <div className="rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-800">
              <span className="font-medium">Run Time:</span> 30 seconds
            </div>

            <div className="mt-1 text-sm text-gray-800">
              <span className="font-medium">Description</span> This task
              processes incoming data from the customer database
            </div>

            <div className="mt-3">
              <Button variant="outlined" visual="gray">
                Rerun Task
              </Button>
            </div>

            <div className="mt-4">
              <Tabs defaultValue="Input Data">
                <TabsList className="border-b-transparent px-0">
                  <TabsTrigger value="Input Data">Input Data</TabsTrigger>
                  <TabsTrigger value="Output Data">Output Data</TabsTrigger>
                </TabsList>
                <TabsContent className="mt-4" value="Input Data">
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">Download</span>{" "}
                    <span className="inline-flex items-center gap-x-1 text-primary-500">
                      customer_data.csv <Download className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">Data Source</span> Customer
                    Database
                  </div>
                </TabsContent>
                <TabsContent className="mt-4" value="Output Data">
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">Download</span>{" "}
                    <span className="inline-flex items-center gap-x-1 text-primary-500">
                      customer_data.csv <Download className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">Data Source</span> Customer
                    Database
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <Alert className="mt-4" variant="success">
            <CheckCircleBroken className="h-5 w-5 text-success-600" />
            <AlertTitle className="text-success-700">
              Test Successful
            </AlertTitle>
            <AlertDescription className="mt-1 text-gray-500">
              All required fields for each step have been filled out! All
              inputted data has also passed to the correct API endpoint(s) and
              is working as expected.
            </AlertDescription>

            <div className="mt-3">
              <Accordion type="single" collapsible>
                <AccordionItem value="1">
                  <AccordionTrigger className="flex items-center gap-x-2 text-sm font-semibold text-success-700">
                    View Data
                    <ChevronDown className="transition-transform h-4 w-4 group-data-[state=closed]/trigger:rotate-0 group-data-[state=open]/trigger:rotate-180" />
                  </AccordionTrigger>
                  <DisclosureContent />
                </AccordionItem>
              </Accordion>
            </div>
          </Alert>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export const AccordionError = () => {
  return (
    <Accordion type="single" collapsible className="space-y-6 p-5">
      <AccordionItem value="1">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-6 py-[18px] group-data-[state=closed]:rounded-b-lg group-data-[state=open]:rounded-b-none">
          <Checkbox size="md" />

          <div className="flex items-center gap-x-3">
            <div className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-error-100 text-error-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-black">
                Failed
              </span>
              <span className="text-xs leading-[18px] text-gray-500">
                Error 404
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-800">
              Transform Sales Data
            </div>
            <div className="text-xs leading-[18px] text-gray-500">
              123456789
            </div>
          </div>

          <div className="flex items-center gap-x-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium text-gray-800">1 min ago</span>
          </div>

          <div className="flex items-center gap-x-2">
            <GoogleMeet2Brand className="h-8 w-8" />
            <span className="text-sm font-medium text-gray-800">
              Google Meet
            </span>
          </div>

          <div className="flex items-center gap-x-2">
            <Database02 className="text-gray-400 h-5 w-5" />
            <span className="text-sm font-medium text-gray-800">200kb</span>
          </div>

          <Avatar size="sm">
            <AvatarImage src="/woman.jpg" />
            <AvatarFallback>W</AvatarFallback>
          </Avatar>

          <AccordionTrigger>
            <ChevronDown className="h-5 w-5 text-gray-500 transition-transform group-data-[state=closed]/trigger:rotate-0 group-data-[state=open]/trigger:rotate-180" />
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <div className="rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-800">
              <span className="font-medium">Run Time:</span> 30 seconds
            </div>

            <div className="mt-1 text-sm text-gray-800">
              <span className="font-medium">Description</span> This task
              processes incoming data from the customer database
            </div>

            <div className="mt-3">
              <Button variant="outlined" visual="gray">
                Rerun Task
              </Button>
            </div>

            <div className="mt-4">
              <Tabs defaultValue="Input Data">
                <TabsList className="border-b-transparent px-0">
                  <TabsTrigger value="Input Data">Input Data</TabsTrigger>
                  <TabsTrigger value="Output Data">Output Data</TabsTrigger>
                </TabsList>
                <TabsContent className="mt-4" value="Input Data">
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">Download</span>{" "}
                    <span className="inline-flex items-center gap-x-1 text-primary-500">
                      customer_data.csv <Download />
                    </span>
                  </div>
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">Data Source</span> Customer
                    Database
                  </div>
                </TabsContent>
                <TabsContent className="mt-4" value="Output Data">
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">Download</span>{" "}
                    <span className="inline-flex items-center gap-x-1 text-primary-500">
                      customer_data.csv <Download />
                    </span>
                  </div>
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">Data Source</span> Customer
                    Database
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <Alert className="mt-4" variant="error">
            <NextLink
              className="absolute right-4 top-4 inline-flex gap-x-2 text-sm font-semibold hover:underline"
              href="/"
            >
              Learn More <Link className="h-[15px] w-[15px]" />
            </NextLink>
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error 404</AlertTitle>
            <AlertDescription>
              Failed to transform data - Invalid JSON format (can be available
              in a hover screen)
            </AlertDescription>

            <div className="mt-3 text-sm text-gray-700">
              Dorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero et velit interdum, ac aliquet odio mattis. Class
              aptent taciti sociosqu ad litora torquent per conubia nostra, per
              inceptos himenaeos.Dorem ipsum dolor sit amet, consectetur
              adipiscing elit. Nunc vulputate libero et velit interdum, ac
              aliquet odio mattis. Class aptent taciti sociosqu ad litora
              torquent per conubia nostra, per inceptos himenaeos.Dorem ipsum
              dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero
              et velit interdum, ac aliquet odio mattis. Class aptent taciti
              sociosqu ad litora torquent per conubia nostra, per inceptos
              himenaeos.Dorem ipsum dolor sit amet, consectetur adipiscing elit.
              Nunc vulputate libero et velit interdum, ac aliquet odio mattis.
              Class aptent taciti sociosqu ad litora torquent per conubia
              nostra, per.
            </div>

            <div className="mt-4 flex items-center gap-x-4">
              <Button visual="error">Fix Error</Button>
              <Button variant="link" visual="error">
                <PlayCircle className="h=4 w-4" />
                Show me how
              </Button>
            </div>
          </Alert>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export const CompletedTasks: StoryObj = {
  render: (args) => (
    <Card className="px-6 py-[18px]" {...args}>
      <div className="inline-flex items-center gap-x-3">
        <Avatar size="md">
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">Test Name</span>
          <span className="text-sm text-gray-500">test@gmail.com</span>
        </div>
      </div>

      <Badge size="sm" visual="success">
        Active
      </Badge>

      <span className="text-sm font-medium text-gray-800">
        7 tasks completed this month
      </span>

      <div className="flex gap-x-2">
        <Database02 className="text-gray-400 h-5 w-5" />
        <span className="text-sm text-gray-700">50kb</span>
      </div>

      <div className="text-sm text-gray-500">
        Last Active{" "}
        <span className="font-medium text-gray-800">30 min ago</span>
      </div>

      <AlertCircle className="h-5 w-5 text-error-500" />

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            className="h-8 px-1.5 py-1 text-gray-500"
            visual="gray"
            variant="ghost"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-[182px]">
          <DropdownMenuItem>
            <Edit03 className="h-4 w-4" />
            Option 1
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy02 className="h-4 w-4" />
            Option 2
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link03 className="h-4 w-4" />
            Option 3
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UserPlus className="h-4 w-4" />
            Option 3
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Zap />
            Option 4
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit05 className="h-4 w-4" />
            Option 5
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Star className="h-4 w-4" />
            Option 6
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Folder className="h-4 w-4" />
            Option 6
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ClockRewind className="h-4 w-4" />
            Option 7
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download02 className="h-4 w-4" />
            Option 8
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem visual="destructive">
            <Trash01 className="h-4 w-4" />
            Delete item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  ),
}

export const SuccessRate = () => {
  return (
    <div className="max-w-[233.25px] rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:ring-1 hover:ring-gray-300">
      <div className="flex items-center gap-x-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-primary-500">
          <TrendingUp className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm leading-4 text-gray-500">Success Rate</span>
      </div>

      <div className="mt-3 text-[18px] font-semibold leading-[21.78px] text-gray-800">
        90%
      </div>
    </div>
  )
}

export const TasksCompleted = () => {
  return (
    <div className="max-w-[233.25px] rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:ring-1 hover:ring-gray-300">
      <div className="flex items-center gap-x-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success-50 text-success-500">
          <CheckCircleBroken className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm leading-4 text-gray-500">Tasks Completed</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[18px] font-semibold leading-[21.78px] text-gray-800">
          20.8k
        </span>
        <NextLink
          href="/"
          className="text-sm font-semibold text-gray-500 hover:underline"
        >
          View All
        </NextLink>
      </div>
    </div>
  )
}

export const TasksFailed = () => {
  return (
    <div className="max-w-[233.25px] rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:ring-1 hover:ring-gray-300">
      <div className="flex items-center gap-x-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-50 text-error-500">
          <AlertCircle className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm leading-4 text-gray-500">Tasks Failed</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[18px] font-semibold leading-[21.78px] text-gray-800">
          10.3k
        </span>
        <NextLink
          href="/"
          className="text-sm font-semibold text-gray-500 hover:underline"
        >
          View All
        </NextLink>
      </div>
    </div>
  )
}

export const AdministrativeCard = () => {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem
        className="border border-gray-200 hover:ring-1 data-[state=open]:hover:ring-0 bg-white data-[state=open]:hover:border-gray-200 hover:ring-gray-300 hover:border-gray-300 rounded-lg"
        value="item-1"
      >
        <AccordionTrigger asChild>
          <div className="flex justify-between w-full items-center p-3">
            <div className="flex items-center gap-x-3">
              <div className="h-11 w-11 rounded-lg border-[1.5px] inline-flex items-center justify-center border-gray-200 flex-none">
                <Settings02 className="h-5 text-primary-500 w-5" />
              </div>
              <span className="text-sm leading-[16.94px] text-gray-900 font-medium">
                Administrative
              </span>
            </div>

            <button className="h-8 w-8 rounded-[5px] focus-visible:outline-none inline-flex items-center justify-center">
              <ChevronDown className="h-5 w-5 flex-none text-gray-500 transition duration-300 group-data-[state=open]/trigger:-rotate-180" />
            </button>
          </div>
        </AccordionTrigger>
        <DisclosureContent className="overflow-x-auto">
          {/* head */}
          <div className="grid grid-cols-8">
            <div className="col-span-3 px-6 h-[78px] whitespace-nowrap border-t flex items-center gap-x-2 border-gray-200">
              <Checkbox size="md" />
              <span className="text-sm leading-5 font-medium text-gray-700">
                Select All
              </span>
            </div>

            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col gap-y-2 items-center justify-center border-gray-200">
              <span className="text-sm leading-[18px] font-medium text-gray-700">
                Save
              </span>
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col gap-y-2 items-center justify-center border-gray-200">
              <span className="text-sm leading-[18px] font-medium text-gray-700">
                Read
              </span>
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col gap-y-2 items-center justify-center border-gray-200">
              <span className="text-sm leading-[18px] font-medium text-gray-700">
                Write
              </span>
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col gap-y-2 items-center justify-center border-gray-200">
              <span className="text-sm leading-[18px] font-medium text-gray-700">
                Delete
              </span>
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col gap-y-2 items-center justify-center border-gray-200">
              <span className="text-sm leading-[18px] font-medium text-gray-700">
                Delete
              </span>
              <Checkbox size="md" />
            </div>
          </div>
          {/* body */}
          <div className="grid grid-cols-8 last:rounded-lg bg-gray-50">
            <div className="col-span-3 px-6 h-[78px] whitespace-nowrap border-t flex items-center gap-x-2 border-gray-200">
              <Checkbox size="md" />
              <span className="text-sm leading-5 font-medium text-gray-700">
                Feature Name
              </span>
            </div>

            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
          </div>
          <div className="grid grid-cols-8 last:rounded-lg">
            <div className="col-span-3 px-6 h-[78px] whitespace-nowrap border-t flex items-center gap-x-2 border-gray-200">
              <Checkbox size="md" />
              <span className="text-sm leading-5 font-medium text-gray-700">
                Feature Name
              </span>
            </div>

            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
          </div>
          <div className="grid grid-cols-8 last:rounded-lg bg-gray-50">
            <div className="col-span-3 px-6 h-[78px] whitespace-nowrap border-t flex items-center gap-x-2 border-gray-200">
              <Checkbox size="md" />
              <span className="text-sm leading-5 font-medium text-gray-700">
                Feature Name
              </span>
            </div>

            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
          </div>
          <div className="grid grid-cols-8">
            <div className="col-span-3 px-6 h-[78px] whitespace-nowrap border-t flex items-center gap-x-2 border-gray-200">
              <Checkbox size="md" />
              <span className="text-sm leading-5 font-medium text-gray-700">
                Feature Name
              </span>
            </div>

            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
          </div>
          <div className="grid grid-cols-8 last:rounded-lg bg-gray-50">
            <div className="col-span-3 px-6 h-[78px] whitespace-nowrap border-t flex items-center gap-x-2 border-gray-200">
              <Checkbox size="md" />
              <span className="text-sm leading-5 font-medium text-gray-700">
                Feature Name
              </span>
            </div>

            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
          </div>
          <div className="grid grid-cols-8 last:rounded-lg">
            <div className="col-span-3 px-6 h-[78px] whitespace-nowrap border-t flex items-center gap-x-2 border-gray-200">
              <Checkbox size="md" />
              <span className="text-sm leading-5 font-medium text-gray-700">
                Feature Name
              </span>
            </div>

            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
          </div>
          <div className="grid grid-cols-8 last:rounded-lg bg-gray-50">
            <div className="col-span-3 px-6 h-[78px] whitespace-nowrap border-t flex items-center gap-x-2 border-gray-200">
              <Checkbox size="md" />
              <span className="text-sm leading-5 font-medium text-gray-700">
                Feature Name
              </span>
            </div>

            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
            <div className="h-[78px] px-6 border-t whitespace-nowrap flex flex-col items-center justify-center border-gray-200">
              <Checkbox size="md" />
            </div>
          </div>
        </DisclosureContent>
      </AccordionItem>
    </Accordion>
  )
}
