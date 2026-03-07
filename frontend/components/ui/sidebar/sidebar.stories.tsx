import React, { useState } from "react"
import Link from "next/link"
import { cn } from "@/utils/functions"
import { useToggle } from "@/utils/hooks"
import {
  Aperture,
  ArrowLeft,
  ArrowRight,
  BarChartSquare02,
  CheckCircle1,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock1,
  CoinStack,
  Copy,
  Dataflow01,
  Dataflow02,
  Edit05,
  Folder,
  HelpCircle,
  HomeLine,
  LayersThree01,
  LifeBuoy01,
  LogOut,
  MoreHorizontal,
  Plus,
  PlusCircle,
  SearchMd,
  Settings01,
  ShieldZap,
  Trash02,
  User,
  UserPlus,
  Users,
} from "@blend-metrics/icons"
import {
  Gmail1Brand,
  GoogleBrand,
  SlackBrand,
} from "@blend-metrics/icons/brands"
import {
  BlendMetrics,
  GridVertical2,
  GripVertical1,
} from "@blend-metrics/icons/special"
import { Meta } from "@storybook/react"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  ActionCardContent,
  ActionCardDescription,
  ActionCardIcon,
  ActionCardRoot,
  ActionCardTitle,
  Article,
  ArticleContent,
  ArticleDescription,
  ArticleIcon,
  ArticleTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  ButtonGroup,
  DisclosureContent,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  HelperText,
  IconButton,
  Label,
  Listbox,
  ListboxButton,
  ListboxContent,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
  PercentageInput,
  Progress,
  RadioGroup,
  RadioGroupItemSelector,
  RoundedButton,
  ScrollArea,
  ScrollBar,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
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
  VersionCardDescription,
  VersionCardFooter,
  VersionCardHeader,
  VersionCardRoot,
  VersionCardTitle,
} from "@/components/ui"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
} from "./sidebar"

const meta: Meta = {
  title: "Sidebar",
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=111-201942&mode=design&t=S0cZwByRHj52TFac-4",
    },
  },
}

export default meta

export const Default = () => {
  return (
    <Sidebar className="h-screen">
      <SidebarHeader>
        <BlendMetrics className="h-[26px] w-[26px]" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarItem>
                  <HomeLine />
                </SidebarItem>
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="right">
                Home
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarItem>
                  <BarChartSquare02 />
                </SidebarItem>
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="right">
                Stats
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarItem>
                  <LayersThree01 />
                </SidebarItem>
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="right">
                Projects
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarItem>
                  <Users />
                </SidebarItem>
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="right">
                Users
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarGroup>

        <SidebarGroup>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarItem>
                  <LifeBuoy01 />
                </SidebarItem>
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="right">
                Support
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarItem>
                  <Settings01 />
                </SidebarItem>
              </TooltipTrigger>
              <TooltipContent className="font-semibold" side="right">
                Support
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar>
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[278px]">
              <DropdownMenuLabel className="font-normal" size="md">
                <div className="inline-flex items-center gap-x-3">
                  <Avatar size="md">
                    <AvatarImage src="/man.jpg" alt="Man" />
                    <AvatarFallback>M</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-700">
                      Christopher Torres
                    </span>
                    <span className="text-sm text-gray-500">
                      chris@blendmetrics.com
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem>
                <User className="h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings01 className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4" />
                Invite Team members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <CoinStack className="h-4 w-4" />
                Belling
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="h-4 w-4" />
                Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export const DividerSidebar = () => {
  return (
    <nav className="absolute inset-y-0 left-0 w-[224px] border-r border-gray-200">
      <ScrollArea className="h-[calc(theme(height.full)-69px)] overflow-y-auto px-[15px] pt-[15px]">
        <select className="w-full rounded-[5px] border-gray-300 text-sm leading-6 text-gray-black focus:border-primary-500 focus:ring-0">
          <option value="Select">Select</option>
        </select>

        <div className="mt-2 space-y-2 divide-y divide-gray-200">
          <div className="space-y-2">
            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>
          </div>

          <div className="pt-2">
            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>

            <Link
              className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
              href="/"
            >
              <span className="flex items-center gap-x-3">
                <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                  Item 1
                </span>
              </span>
              <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                172
              </span>
            </Link>
          </div>
        </div>
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 bg-white px-[15px] py-2">
        <div className="border-t border-gray-200 py-2">
          <Button
            className="w-full justify-start gap-x-[13.5px] px-3 hover:no-underline"
            visual="gray"
            variant="link"
          >
            <PlusCircle className="text-gray-400" />
            New Folder
          </Button>
        </div>
      </div>
    </nav>
  )
}

export const SidebarVariant = () => {
  return (
    <nav className="absolute inset-y-0 left-0 w-[224px] border-r border-gray-200">
      <ScrollArea className="h-[calc(theme(height.full)-69px)] overflow-y-auto px-[15px] pt-[15px]">
        <select className="w-full rounded-[5px] border-gray-300 text-sm leading-6 text-gray-black focus:border-primary-500 focus:ring-0">
          <option value="Select">Select</option>
        </select>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase leading-5 text-gray-500">
              Account
            </span>

            <div className="space-y-1">
              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase leading-5 text-gray-500">
              Account
            </span>

            <div className="space-y-1">
              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>

              <Link
                className="group flex items-center justify-between rounded-[5px] px-3 py-2 hover:bg-gray-100 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none disabled:opacity-50"
                href="/"
              >
                <span className="flex items-center gap-x-3">
                  <Folder className="h-[18px] w-[18px] text-gray-400 group-focus:text-primary-500" />
                  <span className="text-sm font-semibold leading-6 text-gray-500 group-focus:text-primary-500">
                    Item 1
                  </span>
                </span>
                <span className="text-[10px] font-bold leading-5 text-gray-400 group-focus:text-primary-500">
                  172
                </span>
              </Link>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 bg-white px-[15px] py-2">
        <div className="border-t border-gray-200 py-2">
          <Button
            className="w-full justify-start gap-x-[13.5px] px-3 hover:no-underline"
            visual="gray"
            variant="link"
          >
            <PlusCircle className="text-gray-400" />
            New Folder
          </Button>
        </div>
      </div>
    </nav>
  )
}

export const FilledLinksSidebar = () => {
  return (
    <nav className="z-20 h-screen w-[224px] overflow-y-auto border-r border-gray-200 bg-gray-50 p-[15px] pb-0 scrollbar-thin scrollbar-thumb-rounded-lg">
      <ul className="grid gap-2">
        <li>
          <Link
            className="flex h-10 cursor-pointer items-center gap-x-3 rounded-md px-3 py-2 text-sm font-semibold leading-6 text-gray-500 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none"
            href="#"
          >
            <ShieldZap />
            Dashboard
          </Link>
        </li>
        <li>
          <Link
            className="flex h-10 cursor-pointer items-center gap-x-3 rounded-md px-3 py-2 text-sm font-semibold leading-6 text-gray-500 focus:bg-primary-50 focus:text-primary-500 focus-visible:outline-none"
            href="#"
          >
            <ShieldZap />
            My Integrations
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export const ChooseSidebar = () => {
  const [query, setQuery] = React.useState("")
  const resetQuery = () => setQuery("")

  return (
    <div className="w-[386px] h-[683px] relative bg-white py-5 shadow-[0px_4px_30px_0px_rgba(0,0,0,0.05)]">
      <div className="px-5 pb-2 h-[76px] space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-medium text-gray-black leading-[19.36px]">
            Choose a Trigger Type
          </h1>
          <Button className="text-sm" variant="link">
            View All
          </Button>
        </div>
        <SearchField className="w-full">
          <SearchFieldInput
            className="pr-[46px]"
            onChange={(event) => setQuery(event.target.value)}
            value={query}
          />
          <SearchFieldButton>
            <SearchMd className="h-4 w-4" />
          </SearchFieldButton>
          {query && (
            <button
              className="focus-visible:outline-none whitespace-nowrap absolute text-sm font-semibold text-gray-500 top-1/2 -translate-y-1/2 right-2.5"
              onClick={resetQuery}
            >
              Clear
            </button>
          )}
        </SearchField>
      </div>

      <RoundedButton
        className="absolute -left-[16px] top-[72px]"
        size="sm"
        variant="secondary"
      >
        <ChevronRight className="h-4 w-4" />
      </RoundedButton>

      <ScrollArea
        className="h-[567px]"
        scrollBar={<ScrollBar className="w-4 px-1" />}
      >
        <div className="px-5 pt-5 space-y-2">
          <Article variant="outlined">
            <ArticleIcon>
              <Aperture className="h-5 w-5" />
            </ArticleIcon>
            <ArticleContent>
              <ArticleTitle>Add Event</ArticleTitle>
              <ArticleDescription>
                Choose this to start your workflow
              </ArticleDescription>
            </ArticleContent>
          </Article>
        </div>

        <div className="mt-5 px-5 pb-5">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-medium text-gray-black leading-[19.36px]">
              Popular Apps
            </h1>
            <Button className="text-sm" variant="link">
              View More
            </Button>
          </div>

          <div className="mt-2 space-y-2">
            <Article variant="outlined">
              <ArticleIcon visual="flushed">
                <SlackBrand className="h-[32.13px] w-[32.13px]" />
              </ArticleIcon>
              <ArticleContent>
                <ArticleTitle>Slack</ArticleTitle>
                <ArticleDescription>
                  Choose this to start your workflow
                </ArticleDescription>
              </ArticleContent>
            </Article>
            <Article variant="outlined">
              <ArticleIcon visual="flushed">
                <SlackBrand className="h-[32.13px] w-[32.13px]" />
              </ArticleIcon>
              <ArticleContent>
                <ArticleTitle>Slack</ArticleTitle>
                <ArticleDescription>
                  Choose this to start your workflow
                </ArticleDescription>
              </ArticleContent>
            </Article>
            <Article variant="outlined">
              <ArticleIcon visual="flushed">
                <SlackBrand className="h-[32.13px] w-[32.13px]" />
              </ArticleIcon>
              <ArticleContent>
                <ArticleTitle>Slack</ArticleTitle>
                <ArticleDescription>
                  Choose this to start your workflow
                </ArticleDescription>
              </ArticleContent>
            </Article>
            <Article variant="outlined">
              <ArticleIcon visual="flushed">
                <SlackBrand className="h-[32.13px] w-[32.13px]" />
              </ArticleIcon>
              <ArticleContent>
                <ArticleTitle>Slack</ArticleTitle>
                <ArticleDescription>
                  Choose this to start your workflow
                </ArticleDescription>
              </ArticleContent>
            </Article>
            <Article variant="outlined">
              <ArticleIcon visual="flushed">
                <SlackBrand className="h-[32.13px] w-[32.13px]" />
              </ArticleIcon>
              <ArticleContent>
                <ArticleTitle>Slack</ArticleTitle>
                <ArticleDescription>
                  Choose this to start your workflow
                </ArticleDescription>
              </ArticleContent>
            </Article>
            <Article variant="outlined">
              <ArticleIcon visual="flushed">
                <SlackBrand className="h-[32.13px] w-[32.13px]" />
              </ArticleIcon>
              <ArticleContent>
                <ArticleTitle>Slack</ArticleTitle>
                <ArticleDescription>
                  Choose this to start your workflow
                </ArticleDescription>
              </ArticleContent>
            </Article>
            <Article variant="outlined">
              <ArticleIcon visual="flushed">
                <SlackBrand className="h-[32.13px] w-[32.13px]" />
              </ArticleIcon>
              <ArticleContent>
                <ArticleTitle>Slack</ArticleTitle>
                <ArticleDescription>
                  Choose this to start your workflow
                </ArticleDescription>
              </ArticleContent>
            </Article>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export const ActionSidebar = () => {
  return (
    <div className="pt-5 border relative h-[712px] w-[386px] border-gray-200 bg-white">
      <div className="px-5 h-12 flex items-center gap-x-[15px]">
        <div className="h-12 w-12 border-[1.5px] rounded-lg border-gray-200 flex-none items-center inline-flex justify-center">
          <Clock1 className="h-6 w-6 text-primary-500" />
        </div>
        <div>
          <h1 className="text-base text-gray-900 font-medium">Action Name</h1>
          <p className="text-xs leading-[14.52px] text-gray-500">
            Trigger short description here
          </p>
        </div>
      </div>

      <RoundedButton
        className="absolute top-[72px] -left-[16px]"
        size="sm"
        variant="secondary"
      >
        <ChevronRight className="h-4 w-4" />
      </RoundedButton>

      <Tabs className="mt-5 border-t" defaultValue="All">
        <TabsList className="grid h-11 grid-cols-3">
          <TabsTrigger value="setup">
            Setup
            <CheckCircle1 className="h-4 w-4 text-success-500" />
          </TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>
        <TabsContent value="setup">
          <ScrollArea
            className="h-[580px]"
            scrollBar={<ScrollBar className="w-4 p-1" />}
          >
            <div className="p-5">
              <h2 className="text-sm font-medium text-gray-900">
                Which event will start the workflow?
              </h2>
              <RadioGroup className="gap-y-2 mt-3">
                <RadioGroupItemSelector value="option-1">
                  <Label asChild>
                    <span>Option 1</span>
                  </Label>
                  <HelperText>Short description here</HelperText>
                </RadioGroupItemSelector>
                <RadioGroupItemSelector value="option-2">
                  <Label asChild>
                    <span>Option 2</span>
                  </Label>
                  <HelperText>Short description here</HelperText>
                </RadioGroupItemSelector>
                <RadioGroupItemSelector value="option-3">
                  <Label asChild>
                    <span>Option 3</span>
                  </Label>
                  <HelperText>Short description here</HelperText>
                </RadioGroupItemSelector>
                <RadioGroupItemSelector value="option-4">
                  <Label asChild>
                    <span>Option 3</span>
                  </Label>
                  <HelperText>Short description here</HelperText>
                </RadioGroupItemSelector>
                <RadioGroupItemSelector value="option-5">
                  <Label asChild>
                    <span>Option 3</span>
                  </Label>
                  <HelperText>Short description here</HelperText>
                </RadioGroupItemSelector>
              </RadioGroup>

              <div className="mt-6 space-y-3">
                <h2 className="text-sm font-medium text-gray-900">
                  Connect your account
                </h2>

                <Article variant="default">
                  <ArticleIcon rounded="md" visual="flushed">
                    <SlackBrand className="h-6 w-6" />
                  </ArticleIcon>
                  <ArticleTitle size="sm">
                    Connect your Slack account
                  </ArticleTitle>
                  <Button variant="outlined">
                    <Plus className="h-[15px] w-[15px] text-gray-500" />
                    Connect
                  </Button>
                </Article>

                <p className="text-xs text-gray-500 leading-5">
                  <span className="font-medium underline">Gmail</span> is a
                  secure partner with Blend Metrics. Your credentials are
                  encrypted & can be removed at any time. You can manage all of
                  your connected accounts{" "}
                  <span className="font-medium underline">here.</span>
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="conditions">
          <ScrollArea
            className="h-[580px]"
            scrollBar={<ScrollBar className="w-4 p-1" />}
          >
            <div className="p-5">
              <span className="text-sm block font-medium text-gray-800">
                Only continue if:
              </span>
              <Button className="text-sm mt-3" variant="link">
                <Plus className="h-[15px] w-[15px]" />
                Add Condition
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="test">
          <ScrollArea
            className="h-[580px] p-5"
            scrollBar={<ScrollBar className="w-4 p-1" />}
          >
            <h1 className="text-sm font-medium text-gray-900">
              Test your trigger
            </h1>
            <p className="text-sm mt-2 text-gray-500">
              We&apos;ll find a recent email in your gmail account to confirm
              that the right account is connected and your trigger is set up
              correctly.
            </p>

            <div className="border flex justify-between items-center mt-5 rounded-lg h-[72px] border-gray-200 p-3 pr-[18px]">
              <div className="items-center inline-flex gap-x-2">
                <div className="border-gray-200 flex-none rounded-lg border-[1.5px] h-12 inline-flex items-center justify-center w-12">
                  <SlackBrand />
                </div>
                <ArrowRight className="h-[18px] flex-none text-gray-400 w-[18px]" />
                <div className="border-gray-200 flex-none rounded-lg border-[1.5px] h-12 inline-flex items-center justify-center w-12">
                  <GoogleBrand />
                </div>
              </div>

              <Button
                className="text-gray-700"
                variant="outlined"
                visual="gray"
              >
                Test Trigger
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const VersionHistory = () => {
  return (
    <div className="h-[733px] relative w-[349px] border-l border-gray-200 py-5 shadow-[0px_4px_30px_0px_rgba(0,0,0,0.05)]">
      <div className="h-[140px] space-y-3 pb-3 px-5">
        <div className="flex items-center gap-x-1">
          <h1 className="font-medium text-base leading-5 text-gray-900">
            Version History
          </h1>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant="ghost"
                  visual="gray"
                  className="h-auto text-gray-400 hover:text-gray-900 w-auto hover:bg-transparent focus:bg-transparent"
                >
                  <HelpCircle className="h-4 w-4" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent
                align="center"
                className="font-semibold"
                side="bottom"
              >
                Blend Metrics saves a version of your workflow every 30mins and
                allows you to manually save a version and store them in the
                version history library. Click on the version you want to
                access.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <p className="text-sm text-gray-500">
          You can view and restore previous versions of your workflows in Blend
          Metrics account.
        </p>

        <RoundedButton
          className="-left-4 absolute top-[72px]"
          size="sm"
          variant="secondary"
        >
          <ChevronRight className="h-4 w-4" />
        </RoundedButton>

        <Listbox defaultValue="All Versions">
          <ListboxButton />
          <ListboxOptions>
            <ListboxOption value="All Versions">All Versions</ListboxOption>
          </ListboxOptions>
        </Listbox>
      </div>

      <ScrollArea
        className="h-[553px]"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <VersionCardRoot className="group">
          <VersionCardHeader>
            <VersionCardTitle>New Team Version</VersionCardTitle>

            <div className="flex items-center gap-x-3.5">
              <Favorite className="data-[state=off]:hidden data-[state=off]:group-hover:inline-flex data-[state=off]:group-active:group-hover:inline-flex" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      visual="gray"
                      variant="ghost"
                      className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-transparent focus:bg-transparent"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent
                    align="center"
                    className="font-semibold"
                    side="bottom"
                  >
                    Options
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </VersionCardHeader>

          <VersionCardDescription>
            Aug 15, 2022 at 11:48 AM
          </VersionCardDescription>

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

        <VersionCardRoot className="group">
          <VersionCardHeader>
            <VersionCardTitle>New Team Version</VersionCardTitle>

            <div className="flex items-center gap-x-3.5">
              <Favorite className="data-[state=off]:hidden data-[state=off]:group-hover:inline-flex data-[state=off]:group-active:group-hover:inline-flex" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      visual="gray"
                      variant="ghost"
                      className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-transparent focus:bg-transparent"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent
                    align="center"
                    className="font-semibold"
                    side="bottom"
                  >
                    Options
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </VersionCardHeader>

          <VersionCardDescription>
            Aug 15, 2022 at 11:48 AM
          </VersionCardDescription>

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

        <VersionCardRoot className="group">
          <VersionCardHeader>
            <VersionCardTitle>New Team Version</VersionCardTitle>

            <div className="flex items-center gap-x-3.5">
              <Favorite className="data-[state=off]:hidden data-[state=off]:group-hover:inline-flex data-[state=off]:group-active:group-hover:inline-flex" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      visual="gray"
                      variant="ghost"
                      className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-transparent focus:bg-transparent"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent
                    align="center"
                    className="font-semibold"
                    side="bottom"
                  >
                    Options
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </VersionCardHeader>

          <VersionCardDescription>
            Aug 15, 2022 at 11:48 AM
          </VersionCardDescription>

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

        <VersionCardRoot className="group">
          <VersionCardHeader>
            <VersionCardTitle>New Team Version</VersionCardTitle>

            <div className="flex items-center gap-x-3.5">
              <Favorite className="data-[state=off]:hidden data-[state=off]:group-hover:inline-flex data-[state=off]:group-active:group-hover:inline-flex" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      visual="gray"
                      variant="ghost"
                      className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-transparent focus:bg-transparent"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent
                    align="center"
                    className="font-semibold"
                    side="bottom"
                  >
                    Options
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </VersionCardHeader>

          <VersionCardDescription>
            Aug 15, 2022 at 11:48 AM
          </VersionCardDescription>

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

        <VersionCardRoot className="group">
          <VersionCardHeader>
            <VersionCardTitle>New Team Version</VersionCardTitle>

            <div className="flex items-center gap-x-3.5">
              <Favorite className="data-[state=off]:hidden data-[state=off]:group-hover:inline-flex data-[state=off]:group-active:group-hover:inline-flex" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      visual="gray"
                      variant="ghost"
                      className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-transparent focus:bg-transparent"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent
                    align="center"
                    className="font-semibold"
                    side="bottom"
                  >
                    Options
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </VersionCardHeader>

          <VersionCardDescription>
            Aug 15, 2022 at 11:48 AM
          </VersionCardDescription>

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

        <VersionCardRoot className="group">
          <VersionCardHeader>
            <VersionCardTitle>New Team Version</VersionCardTitle>

            <div className="flex items-center gap-x-3.5">
              <Favorite className="data-[state=off]:hidden data-[state=off]:group-hover:inline-flex data-[state=off]:group-active:group-hover:inline-flex" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      visual="gray"
                      variant="ghost"
                      className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-transparent focus:bg-transparent"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent
                    align="center"
                    className="font-semibold"
                    side="bottom"
                  >
                    Options
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </VersionCardHeader>

          <VersionCardDescription>
            Aug 15, 2022 at 11:48 AM
          </VersionCardDescription>

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

        <VersionCardRoot className="group">
          <VersionCardHeader>
            <VersionCardTitle>New Team Version</VersionCardTitle>

            <div className="flex items-center gap-x-3.5">
              <Favorite className="data-[state=off]:hidden data-[state=off]:group-hover:inline-flex data-[state=off]:group-active:group-hover:inline-flex" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      visual="gray"
                      variant="ghost"
                      className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-transparent focus:bg-transparent"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent
                    align="center"
                    className="font-semibold"
                    side="bottom"
                  >
                    Options
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </VersionCardHeader>

          <VersionCardDescription>
            Aug 15, 2022 at 11:48 AM
          </VersionCardDescription>

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
      </ScrollArea>
    </div>
  )
}

export const CommandVariant = () => {
  const [query, setQuery] = React.useState("")

  const resetQuery = () => setQuery("")

  return (
    <div className="h-[683px] w-[386px] pt-5 bg-white border-r border-gray-200 shadow-[0px_4px_30px_0px_rgba(0,0,0,0.05)]">
      <div className="px-5 pb-5 border-b border-gray-200">
        <SearchField className="w-full">
          <SearchFieldInput
            className="pr-12"
            size="lg"
            onChange={(event) => setQuery(event.target.value)}
            value={query}
          />
          <SearchFieldButton
            className="peer-hover:text-gray-400 peer-focus:text-gray-400"
            size="lg"
          >
            <SearchMd className="h-5 w-5" />
          </SearchFieldButton>
          {query && (
            <button
              className="focus-visible:outline-none absolute top-1/2 -translate-y-1/2 right-3 text-sm font-semibold text-gray-500"
              onClick={resetQuery}
            >
              Clear
            </button>
          )}
        </SearchField>
      </div>

      <div className="h-[599px] py-3 pb-5">
        <div className="px-5 flex items-center justify-between">
          <span className="text-sm leading-6 text-gray-500">12 Results</span>
          <div className="flex items-center">
            <IconButton
              className="text-gray-500 hover:text-gray-900"
              variant="ghost"
              visual="gray"
            >
              <ChevronDown className="h-4 w-4" />
            </IconButton>
            <IconButton
              className="text-gray-500 hover:text-gray-900"
              variant="ghost"
              visual="gray"
            >
              <ChevronUp className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="pt-1 h-[calc(theme(height.full)-theme(height.9))]">
          <ScrollArea
            className="h-full"
            scrollBar={<ScrollBar className="w-2.5 p-1" />}
          >
            <div className="pt-4">
              <Accordion type="multiple" defaultValue={["item-1"]}>
                <AccordionItem value="item-1">
                  <div className="items-center flex px-5 justify-between">
                    <div className="flex items-center gap-x-1">
                      <AccordionTrigger className="text-gray-400 group">
                        <ChevronUp className="h-4 w-4 group-data-[state=open]:-rotate-180 transition group-data-[state=closed]:-rotate-0" />
                      </AccordionTrigger>
                      <span className="text-sm leading-7 font-semibold text-gray-700">
                        Triggers
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm leading-6">4</span>
                  </div>

                  <DisclosureContent className="pt-1">
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
                  </DisclosureContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

export const SlitPathVariant = () => {
  const [selected, setSelected] = useState<string>()
  const [value, setValue] = React.useState<number>(0)
  const [isOpen, { toggle }] = useToggle()

  return (
    <div className="h-screen relative w-[386px] border-l border-gray-200 bg-white shadow-[0px_4px_30px_0px_rgba(0,0,0,0.05)]">
      <div className="p-5">
        <div className="h-12 flex items-center gap-x-[15px]">
          <div className="h-12 w-12 rounded-lg inline-flex items-center justify-center flex-none border-[1.5px] border-gray-200">
            <Dataflow02 className="h-6 w-6 text-primary-500" />
          </div>
          <div>
            <h2 className="text-base font-medium text-gray-900">Split Path</h2>
            <p className="text-xs text-gray-500 leading-[14.52px]">
              Condition or percentage based split
            </p>
          </div>
        </div>
      </div>

      <RoundedButton
        size="sm"
        variant="secondary"
        className="absolute top-[72px] -left-4"
      >
        <ChevronRight className="h-4 w-4" />
      </RoundedButton>

      <Tabs className="h-[calc(theme(height.full)-88px)]" defaultValue="Setup">
        <TabsList
          className={cn(
            "grid h-11 border-t grid-cols-2",
            selected === "conditional-split" && "grid-cols-3"
          )}
        >
          <TabsTrigger value="Setup">Setup</TabsTrigger>
          {selected === "conditional-split" && (
            <TabsTrigger value="Conditions">Conditions</TabsTrigger>
          )}
          <TabsTrigger value="Test">Test</TabsTrigger>
        </TabsList>
        <TabsContent
          className="h-[calc(theme(height.full)-theme(height.11))] px-5 pt-5"
          value="Setup"
        >
          <RadioGroup
            className="gap-y-2"
            value={selected}
            onValueChange={setSelected}
          >
            <RadioGroupItemSelector value="conditional-split">
              <Label asChild>
                <span>Conditional Split</span>
              </Label>
              <HelperText>Conditional Split</HelperText>
            </RadioGroupItemSelector>
            <RadioGroupItemSelector value="percentage-based-split">
              <Label asChild>
                <span>Percentage based split</span>
              </Label>
              <HelperText>Percentage based split</HelperText>
            </RadioGroupItemSelector>
          </RadioGroup>

          {selected === "conditional-split" && (
            <>
              <div className="mt-6 pb-5 space-y-3">
                <h2 className="text-sm font-medium text-gray-900">Paths</h2>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-medium text-gray-900">
                    First Check
                  </h3>

                  <article className="group relative py-3 flex items-center px-[25px] gap-x-1 h-[68px] rounded-lg border-2 border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,0.02)]">
                    <button className="focus-visible:outline-none cursor-grab absolute left-1 inset-y-0 my-auto">
                      <GripVertical1 className="group-hover:opacity-100 opacity-0 transition duration-300 text-gray-400" />
                    </button>
                    <div className="flex-grow">
                      <h1 className="text-sm leading-6 font-semibold text-gray-black">
                        Path1
                      </h1>
                      <p className="text-xs leading-5 text-primary-500">
                        Add Condition
                      </p>
                    </div>

                    <div className="flex items center">
                      <ButtonGroup className="inline-flex opacity-0 group-hover:opacity-100 transition duration-300 items-center gap-x-1">
                        <TooltipProvider delayDuration={75}>
                          <Tooltip>
                            <TooltipTrigger className="focus:outline-none">
                              <ArrowLeft className="h-3 w-3 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent
                              className="font-semibold"
                              side="top"
                            >
                              Move Left
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={75}>
                          <Tooltip>
                            <TooltipTrigger className="focus:outline-none">
                              <ArrowRight className="h-3 w-3 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent
                              className="font-semibold"
                              side="top"
                            >
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
                            <DropdownMenuCheckItem>
                              Duplicate
                            </DropdownMenuCheckItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <TooltipProvider delayDuration={75}>
                          <Tooltip>
                            <TooltipTrigger className="focus:outline-none">
                              <Trash02 className="h-3 w-3 text-error-500" />
                            </TooltipTrigger>
                            <TooltipContent
                              className="font-semibold"
                              side="top"
                            >
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
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-medium text-gray-900">
                    Then Check
                  </h3>

                  <article className="group relative py-3 flex items-center px-[25px] gap-x-1 h-[68px] rounded-lg border-2 border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,0.02)]">
                    <button className="focus-visible:outline-none cursor-grab absolute left-1 inset-y-0 my-auto">
                      <GripVertical1 className="group-hover:opacity-100 opacity-0 transition duration-300 text-gray-400" />
                    </button>
                    <div className="flex-grow">
                      <h1 className="text-sm leading-6 font-semibold text-gray-black">
                        Path2
                      </h1>
                      <p className="text-xs leading-5 text-primary-500">
                        Add Condition
                      </p>
                    </div>

                    <div className="flex items center">
                      <ButtonGroup className="inline-flex opacity-0 group-hover:opacity-100 transition duration-300 items-center gap-x-1">
                        <TooltipProvider delayDuration={75}>
                          <Tooltip>
                            <TooltipTrigger className="focus:outline-none">
                              <ArrowLeft className="h-3 w-3 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent
                              className="font-semibold"
                              side="top"
                            >
                              Move Left
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={75}>
                          <Tooltip>
                            <TooltipTrigger className="focus:outline-none">
                              <ArrowRight className="h-3 w-3 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent
                              className="font-semibold"
                              side="top"
                            >
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
                            <DropdownMenuCheckItem>
                              Duplicate
                            </DropdownMenuCheckItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <TooltipProvider delayDuration={75}>
                          <Tooltip>
                            <TooltipTrigger className="focus:outline-none">
                              <Trash02 className="h-3 w-3 text-error-500" />
                            </TooltipTrigger>
                            <TooltipContent
                              className="font-semibold"
                              side="top"
                            >
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
                </div>

                <Button variant="ghost">
                  <Plus className="h-[15px] w-[15]" />
                  Add Path
                </Button>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="inline-flex items-center gap-x-2">
                  <span className="font-medium text-sm text-gray-700">
                    Single Endpoint
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="focus-visible:outline-none">
                        <HelpCircle className="flex-none text-gray-500 h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent
                        className="font-semibold"
                        side="bottom"
                        sideOffset={20}
                      >
                        Merge paths to a single endpoint
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Switch />
              </div>
            </>
          )}

          {selected === "percentage-based-split" && (
            <>
              <div className="mt-6 space-y-3">
                <div className="space-y-3">
                  <div className="items-center justify-between flex">
                    <span className="text-sm font-medium text-gray-900">
                      Paths
                    </span>
                    <Button variant="link" onClick={toggle}>
                      {isOpen ? "Switch to Auto" : "Switch to Manual"}
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="flex justify-between items-center">
                      <Progress
                        className="w-[260px]"
                        indicatorClassName="bg-success-500"
                        value={100}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        100%
                      </span>
                    </div>
                  )}
                </div>

                <div className="group h-[92px] rounded-lg border-gray-200 border p-3 relative pl-[25px]">
                  <button className="focus-visible:outline-none opacity-0 group-hover:opacity-100 duration-300 absolute left-2 inset-y-0 cursor-grab my-auto">
                    <GridVertical2 className="text-gray-400" />
                  </button>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold leading-6 text-gray-black">
                      Path 1
                    </span>

                    <ButtonGroup className="inline-flex opacity-0 transition group-hover:opacity-100 duration-300 items-center gap-x-1">
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
                          <DropdownMenuCheckItem>
                            Duplicate
                          </DropdownMenuCheckItem>
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
                      <span className="text-sm leading-5 text-gray-700 font-medium">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex mt-5 items-center justify-between">
                <Button variant="ghost">
                  <Plus className="h-[15px] w-[15px]" />
                  Add Path
                </Button>

                <Button
                  className="h-9 py-2 px-3.5 text-gray-800"
                  variant="link"
                >
                  Distribute Evenly
                </Button>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="inline-flex items-center gap-x-2">
                  <span className="font-medium text-sm text-gray-700">
                    Single Endpoint
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="focus-visible:outline-none">
                        <HelpCircle className="flex-none text-gray-500 h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent
                        className="font-semibold"
                        side="bottom"
                        sideOffset={20}
                      >
                        Merge paths to a single endpoint
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Switch />
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent
          className="h-[calc(theme(height.full)-theme(height.11))]"
          value="Conditions"
        >
          <div className="p-5">
            <Listbox>
              <ListboxLabel className="text-gray-700">
                Selected Path
              </ListboxLabel>
              <ListboxContent className="mt-1.5">
                <div className="items-center flex gap-x-2.5">
                  <ListboxButton className="flex-grow" />
                  <button className="focus-visible:outline-none">
                    <Edit05 className="h-[18px] w-[18px] text-gray-400" />
                  </button>
                </div>
                <ListboxOptions className="w-[calc(theme(width.full)-theme(width.6))]">
                  <ListboxOption value="Path 1">Path 1</ListboxOption>
                  <ListboxOption value="Path 2">Path 2</ListboxOption>
                </ListboxOptions>
              </ListboxContent>
            </Listbox>
          </div>
        </TabsContent>
        <TabsContent
          className="h-[calc(theme(height.full)-theme(height.11))]"
          value="Test"
        />
      </Tabs>
    </div>
  )
}
