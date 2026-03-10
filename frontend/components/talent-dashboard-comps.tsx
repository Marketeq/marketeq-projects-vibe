"use client"

import * as React from "react"
import { SVGProps } from "react"
import data from "@/public/mock/projects.json"
import { ONE_SECOND } from "@/utils/constants"
import { cn, getId, getIsEmpty, getIsNotEmpty } from "@/utils/functions"
import { useEditable } from "@ark-ui/react"
import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  BarChartSquare02,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck02,
  Home03,
  Mail01,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings02,
  Star,
  ThumbsUp,
  Trash01,
  Trash02,
  UserCircle,
  X,
} from "@blend-metrics/icons"
import { InstagramDefault } from "@blend-metrics/icons/social"
import { GridVertical2 } from "@blend-metrics/icons/special"
import { AnimatePresence, motion } from "framer-motion"
import { useMount, useTimeoutFn, useToggle } from "react-use"
import { Pagination } from "swiper/modules"
import { Swiper as SwiperRoot, SwiperSlide } from "swiper/react"
import { Swiper } from "swiper/types"
import { ReorderGroup, ReorderItem } from "@/components/ui/reorder"
import { Facebook, Linkedin, Logo, Logo3, XIcon } from "@/components/icons"
import { GridVertical6 } from "@/components/icons/grid-vertical-6"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import SecuritySettingsStepper from "@/components/security-settings"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  CircularProgress,
  EditableRootProvider,
  IconButton,
  Progress,
  ScrollArea,
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
  EditableArea,
  EditableInput,
  EditableLabel,
  EditablePreview,
  EditableRoot,
} from "@/components/ui"
import { useAuth } from "@/contexts/auth"


export const MoneyDollarCircleFill = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-[19px]", className)}
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1.30664 9.4996C1.30664 5.19583 4.79544 1.70703 9.09921 1.70703C13.403 1.70703 16.8918 5.19583 16.8918 9.4996C16.8918 13.8034 13.403 17.2922 9.09921 17.2922C4.79544 17.2922 1.30664 13.8034 1.30664 9.4996ZM9.28526 10.0659C10.2509 10.3035 10.5402 10.6185 10.5402 11.1503C10.5402 11.703 10.1684 12.1212 9.28526 12.1884V10.0659ZM8.70179 8.87328C7.87578 8.66645 7.5657 8.32065 7.5657 7.8505C7.5657 7.38035 7.95825 6.95208 8.70212 6.85922L8.70179 8.87328ZM9.28526 9.01257V6.85922C9.94633 6.94169 10.411 7.31866 10.4782 7.96966H11.5523C11.511 6.79753 10.5762 6.02282 9.28526 5.91924V5.0468H8.70179V5.91924C7.40043 6.01762 6.47117 6.78162 6.47117 7.93849C6.47117 8.98659 7.17867 9.57558 8.49009 9.88014L8.70179 9.93177V12.1832C7.87058 12.0955 7.47803 11.6513 7.38517 11.0471H6.31629C6.35201 12.2864 7.39037 13.0248 8.70179 13.1232V13.9904H9.28526V13.1232C10.6022 13.03 11.635 12.3124 11.635 11.0471C11.635 9.94735 10.8915 9.38953 9.53333 9.07458L9.28526 9.01257Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const CalendarBold = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-[19px]", className)}
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6.40579 2.30258C6.40579 2.15189 6.34592 2.00736 6.23936 1.9008C6.1328 1.79424 5.98828 1.73438 5.83758 1.73438C5.68688 1.73438 5.54236 1.79424 5.4358 1.9008C5.32924 2.00736 5.26937 2.15189 5.26937 2.30258V3.49961C4.17841 3.58673 3.46323 3.80038 2.93744 4.32692C2.4109 4.8527 2.19726 5.56865 2.10938 6.65885H17.1419C17.054 5.56789 16.8404 4.8527 16.3138 4.32692C15.788 3.80038 15.0721 3.58673 13.9819 3.49885V2.30258C13.9819 2.15189 13.922 2.00736 13.8155 1.9008C13.7089 1.79424 13.5644 1.73438 13.4137 1.73438C13.263 1.73438 13.1185 1.79424 13.0119 1.9008C12.9053 2.00736 12.8455 2.15189 12.8455 2.30258V3.44885C12.3417 3.439 11.7765 3.439 11.1409 3.439H8.11041C7.47478 3.439 6.9096 3.439 6.40579 3.44885V2.30258Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.05078 9.49955C2.05078 8.86391 2.05078 8.29873 2.06063 7.79492H17.1932C17.203 8.29873 17.203 8.86391 17.203 9.49955V11.0148C17.203 13.8717 17.203 15.3006 16.3151 16.1877C15.4272 17.0749 13.9991 17.0757 11.1421 17.0757H8.11167C5.25472 17.0757 3.82586 17.0757 2.9387 16.1877C2.05154 15.2998 2.05078 13.8717 2.05078 11.0148V9.49955ZM13.415 11.0148C13.6159 11.0148 13.8086 10.935 13.9507 10.7929C14.0927 10.6508 14.1726 10.4581 14.1726 10.2572C14.1726 10.0562 14.0927 9.86353 13.9507 9.72145C13.8086 9.57937 13.6159 9.49955 13.415 9.49955C13.214 9.49955 13.0213 9.57937 12.8792 9.72145C12.7372 9.86353 12.6573 10.0562 12.6573 10.2572C12.6573 10.4581 12.7372 10.6508 12.8792 10.7929C13.0213 10.935 13.214 11.0148 13.415 11.0148ZM13.415 14.0452C13.6159 14.0452 13.8086 13.9654 13.9507 13.8233C14.0927 13.6812 14.1726 13.4885 14.1726 13.2876C14.1726 13.0867 14.0927 12.894 13.9507 12.7519C13.8086 12.6098 13.6159 12.53 13.415 12.53C13.214 12.53 13.0213 12.6098 12.8792 12.7519C12.7372 12.894 12.6573 13.0867 12.6573 13.2876C12.6573 13.4885 12.7372 13.6812 12.8792 13.8233C13.0213 13.9654 13.214 14.0452 13.415 14.0452ZM10.3845 10.2572C10.3845 10.4581 10.3047 10.6508 10.1626 10.7929C10.0205 10.935 9.82783 11.0148 9.62689 11.0148C9.42596 11.0148 9.23326 10.935 9.09118 10.7929C8.9491 10.6508 8.86928 10.4581 8.86928 10.2572C8.86928 10.0562 8.9491 9.86353 9.09118 9.72145C9.23326 9.57937 9.42596 9.49955 9.62689 9.49955C9.82783 9.49955 10.0205 9.57937 10.1626 9.72145C10.3047 9.86353 10.3845 10.0562 10.3845 10.2572ZM10.3845 13.2876C10.3845 13.4885 10.3047 13.6812 10.1626 13.8233C10.0205 13.9654 9.82783 14.0452 9.62689 14.0452C9.42596 14.0452 9.23326 13.9654 9.09118 13.8233C8.9491 13.6812 8.86928 13.4885 8.86928 13.2876C8.86928 13.0867 8.9491 12.894 9.09118 12.7519C9.23326 12.6098 9.42596 12.53 9.62689 12.53C9.82783 12.53 10.0205 12.6098 10.1626 12.7519C10.3047 12.894 10.3845 13.0867 10.3845 13.2876ZM5.83884 11.0148C6.03977 11.0148 6.23247 10.935 6.37455 10.7929C6.51663 10.6508 6.59645 10.4581 6.59645 10.2572C6.59645 10.0562 6.51663 9.86353 6.37455 9.72145C6.23247 9.57937 6.03977 9.49955 5.83884 9.49955C5.63791 9.49955 5.44521 9.57937 5.30313 9.72145C5.16105 9.86353 5.08123 10.0562 5.08123 10.2572C5.08123 10.4581 5.16105 10.6508 5.30313 10.7929C5.44521 10.935 5.63791 11.0148 5.83884 11.0148ZM5.83884 14.0452C6.03977 14.0452 6.23247 13.9654 6.37455 13.8233C6.51663 13.6812 6.59645 13.4885 6.59645 13.2876C6.59645 13.0867 6.51663 12.894 6.37455 12.7519C6.23247 12.6098 6.03977 12.53 5.83884 12.53C5.63791 12.53 5.44521 12.6098 5.30313 12.7519C5.16105 12.894 5.08123 13.0867 5.08123 13.2876C5.08123 13.4885 5.16105 13.6812 5.30313 13.8233C5.44521 13.9654 5.63791 14.0452 5.83884 14.0452Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const WalletBold = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-[19px]", className)}
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.9922 6.65159C15.9493 6.64907 15.9036 6.64806 15.8551 6.64856H13.9421C12.3754 6.64856 11.0352 7.88196 11.0352 9.48961C11.0352 11.0973 12.3761 12.3306 13.9421 12.3306H15.8551C15.9036 12.3312 15.9495 12.3301 15.993 12.3276C16.315 12.3082 16.6189 12.1724 16.8482 11.9455C17.0775 11.7185 17.2165 11.416 17.2392 11.0942C17.2423 11.0488 17.2423 10.9995 17.2423 10.9541V8.02514C17.2423 7.97969 17.2423 7.93044 17.2392 7.88499C17.2165 7.5632 17.0775 7.26066 16.8482 7.03375C16.6189 6.80683 16.3142 6.67101 15.9922 6.65159ZM13.7747 10.2472C14.1777 10.2472 14.5043 9.90781 14.5043 9.48961C14.5043 9.0714 14.1777 8.732 13.7747 8.732C13.3709 8.732 13.0443 9.0714 13.0443 9.48961C13.0443 9.90781 13.3709 10.2472 13.7747 10.2472Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.852 13.4669C15.8782 13.4659 15.9043 13.471 15.9281 13.4819C15.9519 13.4928 15.9729 13.5092 15.9892 13.5297C16.0055 13.5503 16.0167 13.5743 16.022 13.6C16.0273 13.6257 16.0264 13.6522 16.0195 13.6775C15.8679 14.2169 15.6263 14.6776 15.2391 15.064C14.6717 15.6322 13.9527 15.8829 13.0648 16.0026C12.2011 16.1186 11.0988 16.1186 9.70628 16.1186H8.1062C6.71371 16.1186 5.61063 16.1186 4.74771 16.0026C3.85979 15.8829 3.14082 15.6314 2.57337 15.0647C2.00668 14.4973 1.75515 13.7783 1.63545 12.8904C1.51953 12.0267 1.51953 10.9244 1.51953 9.53188V9.44702C1.51953 8.05453 1.51953 6.95145 1.63545 6.08778C1.75515 5.19986 2.00668 4.48088 2.57337 3.91343C3.14082 3.34674 3.85979 3.09521 4.74771 2.97551C5.61139 2.86035 6.71371 2.86035 8.1062 2.86035H9.70628C11.0988 2.86035 12.2019 2.86035 13.0648 2.97627C13.9527 3.09597 14.6717 3.3475 15.2391 3.91419C15.6263 4.30209 15.8679 4.76196 16.0195 5.30138C16.0264 5.32666 16.0273 5.35321 16.022 5.37889C16.0167 5.40457 16.0055 5.42865 15.9892 5.44917C15.9729 5.46969 15.9519 5.48607 15.9281 5.49699C15.9043 5.5079 15.8782 5.51304 15.852 5.51199H13.9398C11.7905 5.51199 9.89644 7.20904 9.89644 9.48945C9.89644 11.7699 11.7905 13.4669 13.9398 13.4669H15.852ZM4.36057 5.8908C4.20988 5.8908 4.06535 5.95066 3.95879 6.05722C3.85223 6.16378 3.79237 6.30831 3.79237 6.45901C3.79237 6.6097 3.85223 6.75423 3.95879 6.86079C4.06535 6.96735 4.20988 7.02721 4.36057 7.02721H7.39102C7.54172 7.02721 7.68624 6.96735 7.7928 6.86079C7.89936 6.75423 7.95923 6.6097 7.95923 6.45901C7.95923 6.30831 7.89936 6.16378 7.7928 6.05722C7.68624 5.95066 7.54172 5.8908 7.39102 5.8908H4.36057Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const LeftSidebar = () => {
  return (
    <div className="w-[224px] shrink-0 bg-gray-50 min-[1024px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r space-y-6 border-gray-200 p-[15px]">
      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Work
        </span>

        <div className="flex flex-col gap-y-1">
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/talent-dashboard"
          >
            <Home03 className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Home
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/search"
          >
            <Search className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Find Jobs
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/publish-project"
          >
            <Briefcase className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            My Projects
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/publish-project"
          >
            <Plus className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Create a Project
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/"
          >
            <BarChartSquare02 className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Stats & Trends
          </NextLink>
        </div>
      </div>

      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Account
        </span>

        <div className="flex flex-col gap-y-1">
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/talent-profile"
          >
            <UserCircle className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Profile
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/inbox"
          >
            <Mail01 className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Inbox
            <Badge className="rounded-full ml-auto" size="md" visual="error">
              3
            </Badge>
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="#"
          >
            <AlertCircle className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Notifications
            <Badge className="rounded-full ml-auto" size="md" visual="error">
              2
            </Badge>
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="#"
          >
            <Settings02 className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Settings
          </NextLink>
        </div>
      </div>
    </div>
  )
}

export const RightDrawer = ({ className, onCompleteProfile, profileProgress = 0 }: { className?: string; onCompleteProfile?: () => void; profileProgress?: number }) => {
  const { user } = useAuth()
  return (
    <div
      className={cn(
        "w-full md:w-[322px] shrink-0 border-l bg-white border-gray-200",
        className
      )}
    >
      <div className="divide-y divide-[#122A4B]/[.15]">
        <div className="p-5">
          <NextLink
            href="/talent-profile"
            className="text-base leading-[19.36px] font-bold text-dark-blue-400 hover:text-primary-500 hover:underline"
          >
            @{user?.username || `${user?.firstName || ""}${user?.lastName || ""}`.toLowerCase().replace(/\s+/g, "") || "my-profile"}
          </NextLink>
          <Button
            className="underline text-dark-blue-400 hover:text-primary-500"
            visual="gray"
            size="md"
            variant="link"
          >
            Add your job title
          </Button>

          <div className="mt-3 flex items-center gap-x-3">
            <div className="px-2 py-1 inline-flex items-center gap-x-1 rounded-[4px] text-xs leading-[14.52px] font-medium text-gray-500 bg-gray-200 shadow-[0px_0.75px_1.51px_0px_rgba(16,24,40,.05)]">
              <Star className="size-3" /> 0.0
            </div>

            <span className="size-xs leading-[14.52px] text-dark-blue-400">
              no reviews yet
            </span>
          </div>
        </div>

        <div className="p-5 flex flex-col items-start gap-y-3">
          <CircularProgress
            className="text-gray-700"
            strokeWidth={6}
            size={50}
            value={profileProgress}
          />

          <div className="gap-y-2 flex items-start flex-col">
            <button
              type="button"
              onClick={onCompleteProfile}
              className="underline text-[13px] font-medium text-dark-blue-400 hover:text-primary-500 text-left"
            >
              Complete Your Profile
            </button>

            <span className="text-[13px] leading-[15.73px] font-light">
              Talents with complete profiles are 4 times more likely to get
              hired for client projects.
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex gap-x-[5px] items-center">
            <ThumbsUp className="size-[15px] text-dark-blue-400" />
            <span className="text-[11px] leading-6 font-semibold text-dark-blue-400">
              0% Client Success
            </span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex gap-x-[5px] items-center">
            <MapPin className="size-[15px] text-dark-blue-400" />
            <NextLink
              href="#"
              className="text-[11px] leading-6 font-semibold text-dark-blue-400 underline hover:text-primary-500"
            >
              Add your location
            </NextLink>
          </div>
          <div className="flex gap-x-[5px] items-center">
            <Clock className="size-[15px] text-dark-blue-400" />
            <NextLink
              href="#"
              className="text-[11px] leading-6 font-semibold text-dark-blue-400 underline hover:text-primary-500"
            >
              Add your local time
            </NextLink>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 gap-x-[15px] gap-y-3">
          <div className="flex flex-col items-start gap-y-[5px]">
            <span className="inline-block text-sm leading-[16.94px] text-dark-blue-400">
              Hourly Rate
            </span>
            <Button
              className="text-[11px] leading-6 text-dark-blue-400 underline hover:text-primary-500"
              visual="gray"
              variant="link"
            >
              Edit
            </Button>
          </div>
          <div className="flex flex-col items-start gap-y-[5px]">
            <span className="inline-block text-sm leading-[16.94px] text-dark-blue-400">
              Availability
            </span>
            <Button
              className="text-[11px] leading-6 text-dark-blue-400 underline hover:text-primary-500"
              visual="gray"
              variant="link"
            >
              Edit
            </Button>
          </div>
          <div className="flex flex-col items-start gap-y-[5px]">
            <span className="inline-block text-sm leading-[16.94px] text-dark-blue-400">
              Member since
            </span>
            <span className="text-[11px] leading-6 text-dark-blue-400 font-semibold">
              Sep 2024
            </span>
          </div>
          <div className="flex flex-col items-start gap-y-[5px]">
            <span className="inline-block text-sm leading-[16.94px] text-dark-blue-400">
              Hourly Rate
            </span>
            <Button
              className="text-[11px] leading-6 text-dark-blue-400 underline hover:text-primary-500"
              visual="gray"
              variant="link"
            >
              Edit
            </Button>
          </div>
        </div>

        <Tasks />
      </div>
    </div>
  )
}

export const RightSidebar = ({ className, onCompleteProfile, profileProgress = 0 }: { className?: string; onCompleteProfile?: () => void; profileProgress?: number }) => {
  const { user } = useAuth()
  return (
    <div
      className={cn("w-[322px] shrink-0 min-[1440px]:block hidden", className)}
    >
      <div className="divide-y bg-white border rounded-lg border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] divide-[#122A4B]/[.15]">
        <div className="p-5">
          <NextLink
            href="/talent-profile"
            className="text-base leading-[19.36px] font-bold text-dark-blue-400 hover:text-primary-500 hover:underline block"
          >
            @{user?.username || `${user?.firstName || ""}${user?.lastName || ""}`.toLowerCase().replace(/\s+/g, "") || "my-profile"}
          </NextLink>
          <Button
            className="underline text-dark-blue-400 hover:text-primary-500"
            visual="gray"
            size="md"
            variant="link"
          >
            Add your job title
          </Button>

          <div className="mt-3 flex items-center gap-x-3">
            <div className="px-2 py-1 inline-flex items-center gap-x-1 rounded-[4px] text-xs leading-[14.52px] font-medium text-gray-500 bg-gray-200 shadow-[0px_0.75px_1.51px_0px_rgba(16,24,40,.05)]">
              <Star className="size-3" /> 0.0
            </div>

            <span className="size-xs leading-[14.52px] text-dark-blue-400">
              no reviews yet
            </span>
          </div>
        </div>

        <div className="p-5 flex flex-col items-start gap-y-3">
          <CircularProgress
            className="text-gray-700"
            strokeWidth={6}
            size={50}
            value={profileProgress}
          />

          <div className="gap-y-2 flex items-start flex-col">
            <button
              type="button"
              onClick={onCompleteProfile}
              className="underline text-[13px] font-medium text-dark-blue-400 hover:text-primary-500 text-left"
            >
              Complete Your Profile
            </button>

            <span className="text-[13px] leading-[15.73px] font-light">
              Talents with complete profiles are 4 times more likely to get
              hired for client projects.
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex gap-x-[5px] items-center">
            <ThumbsUp className="size-[15px]" />
            <span className="text-[11px] leading-6 font-semibold text-dark-blue-400">
              0% Client Success
            </span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex gap-x-[5px] items-center">
            <MapPin className="size-[15px]" />
            <NextLink
              href="#"
              className="text-[11px] leading-6 font-semibold text-dark-blue-400 underline hover:text-primary-500"
            >
              Add your location
            </NextLink>
          </div>
          <div className="flex gap-x-[5px] items-center">
            <Clock className="size-[15px]" />
            <NextLink
              href="#"
              className="text-[11px] leading-6 font-semibold text-dark-blue-400 underline hover:text-primary-500"
            >
              Add your local time
            </NextLink>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 gap-x-[15px] gap-y-3">
          <div className="flex flex-col items-start gap-y-[5px]">
            <span className="inline-block text-sm leading-[16.94px] text-dark-blue-400">
              Hourly Rate
            </span>
            <Button
              className="text-[11px] leading-6 text-dark-blue-400 underline hover:text-primary-500"
              visual="gray"
              variant="link"
            >
              Edit
            </Button>
          </div>
          <div className="flex flex-col items-start gap-y-[5px]">
            <span className="inline-block text-sm leading-[16.94px] text-dark-blue-400">
              Availability
            </span>
            <Button
              className="text-[11px] leading-6 text-dark-blue-400 underline hover:text-primary-500"
              visual="gray"
              variant="link"
            >
              Edit
            </Button>
          </div>
          <div className="flex flex-col items-start gap-y-[5px]">
            <span className="inline-block text-sm leading-[16.94px] text-dark-blue-400">
              Member since
            </span>
            <span className="text-[11px] leading-6 text-dark-blue-400 font-semibold">
              Sep 2024
            </span>
          </div>
          <div className="flex flex-col items-start gap-y-[5px]">
            <span className="inline-block text-sm leading-[16.94px] text-dark-blue-400">
              Hourly Rate
            </span>
            <Button
              className="text-[11px] leading-6 text-dark-blue-400 underline hover:text-primary-500"
              visual="gray"
              variant="link"
            >
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white mt-5 border rounded-lg border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
        <Tasks />
      </div>
    </div>
  )
}

export const Editable = ({
  onChange,
  defaultValue = "",
  placeholder,
}: {
  onChange?: (value: string) => void
  defaultValue?: string
  placeholder?: string
}) => {
  const editable = useEditable()
  useTimeoutFn(
    () => editable.edit(),

    // After the initial animation is played for the default state of 'To Do'
    300
  )

  const onValueCommit = ({ value }: { value: string }) => {
    onChange?.(value)
  }

  return (
    <EditableRootProvider value={editable}>
      <EditableRoot
        defaultValue={defaultValue}
        placeholder={placeholder}
        onValueCommit={onValueCommit}
      >
        <EditableLabel>{placeholder}</EditableLabel>
        <EditableArea>
          <EditableInput />
          <EditablePreview />
        </EditableArea>
      </EditableRoot>
    </EditableRootProvider>
  )
}

interface Task {
  id: string | number
  done: boolean
  value: string
}

const defaultTasks: Task[] = []

export const Tasks = () => {
  const [tasks, setTasks] = React.useState<Task[]>(defaultTasks)
  const [shouldClearAll, toggleShouldClearAll] = useToggle(false)

  React.useEffect(() => {
    if (shouldClearAll) {
      const timeoutId = setTimeout(() => {
        setTasks((prev) => prev.filter((task) => !task.done))
        toggleShouldClearAll(false)
      }, ONE_SECOND * 6)

      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [shouldClearAll, toggleShouldClearAll])

  const addTask = () => {
    setTasks((prev) => [...prev, { id: getId(), value: "", done: false }])
  }

  const onDoneChange = ({ id, done }: { id: Task["id"]; done: boolean }) => {
    setTasks((prev) =>
      prev.reduce(
        (previousValue, currentValue) =>
          currentValue.id === id
            ? [...previousValue, { ...currentValue, done }]
            : [...previousValue, currentValue],
        [] as Task[]
      )
    )
  }

  const onEditableChange = ({
    value,
    id,
  }: {
    value: string
    id: Task["id"]
  }) => {
    setTasks((prev) =>
      prev.reduce(
        (previousValue, currentValue) =>
          currentValue.id === id
            ? [...previousValue, { ...currentValue, value }]
            : [...previousValue, currentValue],
        [] as Task[]
      )
    )
  }
  const onRemove = (id: Task["id"]) => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  const undoneTasks = tasks.filter((task) => !task.done)

  const completedTasks = tasks.filter((task) => task.done)

  return (
    <>
      <AnimatePresence mode="wait">
        {getIsEmpty(tasks) ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-5 flex flex-col items-start gap-y-5">
              <FileCheck02 className="size-[49.9px] *:stroke-1 text-primary-100" />
              <div className="space-y-3">
                <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
                  Start building your to-do list
                </h1>
                <p className="text-sm leading-[16.94px] font-light text-dark-blue-400">
                  Here’s where your tasks will show up once you create them.
                </p>
              </div>
              <Button
                className="text-sm leading-6"
                visual="gray"
                variant="outlined"
                onClick={addTask}
              >
                <Plus className="size-[15px]" /> Add a Task
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="p-5 space-y-6">
            <div className="flex items-center gap-x-2">
              <span className="text-sm leading-[16.94px] inline-block font-bold text-dark-blue-400">
                To Do
              </span>

              <Badge
                visual="primary"
                className="rounded-full text-[10px] leading-[18px] font-bold size-[22px] p-0"
              >
                {undoneTasks.length}
              </Badge>
            </div>

            {getIsNotEmpty(undoneTasks) && (
              <ReorderGroup
                className="space-y-2"
                values={tasks}
                onReorder={setTasks}
                axis="y"
                as="ul"
              >
                {undoneTasks.map((task) => (
                  <ReorderItem
                    value={task}
                    key={task.id}
                    as="li"
                    className="group relative flex items-start gap-x-[11px]"
                  >
                    {({ dragControls }) => (
                      <>
                        <button
                          className="focus-visible:outline-none text-gray-950/50 hover:text-gray-950 mt-[6px]"
                          onPointerDown={(event) => dragControls.start(event)}
                        >
                          <GridVertical6 className="size-3.5" />
                        </button>

                        <div className="flex flex-auto items-start gap-x-5">
                          <Checkbox
                            className="mt-[5px]"
                            variant="circular"
                            checked={task.done}
                            onCheckedChange={() =>
                              onDoneChange({ id: task.id, done: true })
                            }
                          />
                          <Editable
                            defaultValue={task.value}
                            onChange={(value) =>
                              onEditableChange({ value, id: task.id })
                            }
                            placeholder="Task"
                          />

                          <button
                            className="group-hover:opacity-100 opacity-0 absolute right-0 top-[2.5px] focus-visible:outline-none text-error-500/50 hover:text-error-500"
                            onClick={() => onRemove(task.id)}
                          >
                            <Trash01 className="size-[15px]" />
                          </button>
                        </div>
                      </>
                    )}
                  </ReorderItem>
                ))}
              </ReorderGroup>
            )}

            <Button
              variant="outlined"
              className="text-dark-blue-400"
              onClick={addTask}
            >
              <Plus className="size-[15px]" /> Add Task
            </Button>
          </div>
        )}

        {getIsNotEmpty(completedTasks) && (
          <motion.div
            className="p-5 pt-8 space-y-6"
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-x-2">
                <span className="text-sm leading-[16.94px] inline-block font-bold text-dark-blue-400">
                  Completed
                </span>

                <Badge
                  visual="primary"
                  className="rounded-full text-[10px] leading-[18px] font-bold size-[22px] p-0"
                >
                  {shouldClearAll ? 0 : completedTasks.length}
                </Badge>
              </div>

              <Button
                variant="link"
                visual="gray"
                onClick={toggleShouldClearAll}
              >
                {shouldClearAll ? "Undo" : "Clear All"}
              </Button>
            </div>

            {!shouldClearAll && (
              <ul className="space-y-2">
                {completedTasks.map((task) => (
                  <li
                    className="group relative flex items-center gap-x-5"
                    key={task.id}
                  >
                    <Checkbox
                      variant="circular"
                      checked={task.done}
                      onCheckedChange={() =>
                        onDoneChange({ id: task.id, done: false })
                      }
                    />
                    <span className="text-sm font-medium leading-5  text-dark-blue-400">
                      {task.value}
                    </span>

                    <button
                      className="group-hover:opacity-100 opacity-0 absolute right-0 top-[2.5px] focus-visible:outline-none text-error-500/50 hover:text-error-500"
                      onClick={() => onRemove(task.id)}
                    >
                      <Trash01 className="size-[15px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const BankLine = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-6", className)}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_14031_153424)">
        <path
          d="M8.13568 1.74833L13.5992 4.80148C13.7596 4.88155 13.8945 5.00474 13.9887 5.15723C14.083 5.30972 14.1328 5.48546 14.1327 5.66472V6.5903C14.1327 7.03381 13.7727 7.39376 13.3292 7.39376H12.8472V12.5359H13.4899C13.6604 12.5359 13.8239 12.6036 13.9444 12.7242C14.065 12.8447 14.1327 13.0082 14.1327 13.1787C14.1327 13.3491 14.065 13.5126 13.9444 13.6332C13.8239 13.7537 13.6604 13.8214 13.4899 13.8214H1.92011C1.74964 13.8214 1.58615 13.7537 1.46561 13.6332C1.34506 13.5126 1.27734 13.3491 1.27734 13.1787C1.27734 13.0082 1.34506 12.8447 1.46561 12.7242C1.58615 12.6036 1.74964 12.5359 1.92011 12.5359H2.56288V7.39376H2.0808C1.63729 7.39376 1.27734 7.03381 1.27734 6.5903V5.66472C1.27734 5.32919 1.45089 5.02066 1.73114 4.84583L7.27372 1.74833C7.40763 1.68135 7.5553 1.64648 7.70502 1.64648C7.85474 1.64648 8.00177 1.68135 8.13568 1.74833ZM11.5616 7.39376H3.84841V12.5359H5.77672V8.6793H7.06225V12.5359H8.34779V8.6793H9.63332V12.5359H11.5616V7.39376ZM7.70502 2.97023L2.56288 5.86269V6.10822H12.8472V5.86269L7.70502 2.97023ZM7.70502 4.17992C7.87549 4.17992 8.03898 4.24764 8.15953 4.36818C8.28007 4.48873 8.34779 4.65222 8.34779 4.82269C8.34779 4.99316 8.28007 5.15665 8.15953 5.27719C8.03898 5.39774 7.87549 5.46546 7.70502 5.46546C7.53455 5.46546 7.37106 5.39774 7.25052 5.27719C7.12997 5.15665 7.06225 4.99316 7.06225 4.82269C7.06225 4.65222 7.12997 4.48873 7.25052 4.36818C7.37106 4.24764 7.53455 4.17992 7.70502 4.17992Z"
          fill="#22376B"
        />
      </g>
      <defs>
        <clipPath id="clip0_14031_153424">
          <rect
            width={15.4264}
            height={15.4264}
            fill="white"
            transform="translate(0 0.321289)"
          />
        </clipPath>
      </defs>
    </svg>
  )
}

export const PresentationChart01 = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-[50px]", className)}
    viewBox="0 0 50 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M24.9498 33.2664V43.6622M24.9498 33.2664L37.4248 43.6622M24.9498 33.2664L12.4749 43.6622M43.6623 6.2373V23.2864C43.6623 26.7798 43.6623 28.5264 42.9825 29.8607C42.3844 31.0344 41.4302 31.9886 40.2566 32.5866C38.9223 33.2664 37.1756 33.2664 33.6823 33.2664H16.2173C12.724 33.2664 10.9774 33.2664 9.64309 32.5866C8.46944 31.9886 7.51522 31.0344 6.91721 29.8607C6.23737 28.5264 6.23737 26.7798 6.23737 23.2864V6.2373M16.6332 18.7123V24.9498M24.9498 14.554V24.9498M33.2665 22.8706V24.9498M45.7415 6.2373H4.1582"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const Edit04 = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-[50px]", className)}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M43.6632 37.4251L41.5838 39.6998C40.481 40.9058 38.9854 41.5834 37.426 41.5834C35.8666 41.5834 34.371 40.9058 33.2682 39.6998C32.1638 38.4961 30.6684 37.8202 29.1094 37.8202C27.5505 37.8202 26.0551 38.4961 24.9507 39.6998M6.23828 41.5834H9.71993C10.737 41.5834 11.2456 41.5834 11.7241 41.4685C12.1484 41.3666 12.5541 41.1986 12.9261 40.9706C13.3458 40.7134 13.7053 40.3538 14.4245 39.6347L40.5445 13.5147C42.267 11.7922 42.267 8.99961 40.5445 7.27718C38.8221 5.55474 36.0295 5.55474 34.307 7.27718L8.187 33.3972C7.46781 34.1164 7.10821 34.4759 6.85105 34.8956C6.62306 35.2676 6.45504 35.6733 6.35318 36.0976C6.23828 36.5761 6.23828 37.0847 6.23828 38.1018V41.5834Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const Monitor02 = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-[50px]", className)}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15.7429 43.6622C18.5182 42.3312 21.6439 41.5831 24.9498 41.5831C28.2558 41.5831 31.3815 42.3312 34.1568 43.6622M14.1382 35.3456H35.7615C39.2548 35.3456 41.0015 35.3456 42.3357 34.6657C43.5094 34.0677 44.4636 33.1135 45.0616 31.9399C45.7415 30.6056 45.7415 28.8589 45.7415 25.3656V16.2173C45.7415 12.724 45.7415 10.9773 45.0616 9.64303C44.4636 8.46937 43.5094 7.51516 42.3357 6.91715C41.0015 6.2373 39.2548 6.2373 35.7615 6.2373H14.1382C10.6449 6.2373 8.8982 6.2373 7.56393 6.91715C6.39027 7.51516 5.43606 8.46937 4.83805 9.64303C4.1582 10.9773 4.1582 12.724 4.1582 16.2173V25.3656C4.1582 28.8589 4.1582 30.6056 4.83805 31.9399C5.43606 33.1135 6.39027 34.0677 7.56393 34.6657C8.8982 35.3456 10.6449 35.3456 14.1382 35.3456Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const StarsBFill = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-[25px]", className)}
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M22.4693 15.5077C22.4663 15.7295 22.3944 15.9449 22.2636 16.124C22.1329 16.3032 21.9496 16.4373 21.7393 16.5077L19.8593 17.1277C19.2665 17.3309 18.7314 17.6739 18.2993 18.1277C17.8489 18.5666 17.5066 19.104 17.2993 19.6977L16.6493 21.5677C16.5753 21.774 16.4433 21.9545 16.2693 22.0877C16.0848 22.2174 15.8649 22.2872 15.6393 22.2877C15.4161 22.2921 15.1979 22.2217 15.0193 22.0877C14.8369 21.9564 14.7004 21.771 14.6293 21.5577L13.9993 19.6777C13.8043 19.0867 13.474 18.5494 13.0348 18.1084C12.5956 17.6675 12.0596 17.3351 11.4693 17.1377L9.58932 16.5177C9.37788 16.4432 9.19339 16.3074 9.05932 16.1277C8.95929 15.9916 8.89325 15.8335 8.8667 15.6667C8.84015 15.4998 8.85387 15.329 8.9067 15.1686C8.95954 15.0081 9.04997 14.8626 9.17045 14.7442C9.29093 14.6257 9.43797 14.5378 9.59932 14.4877L11.4693 13.8677C12.0662 13.6734 12.6089 13.3413 13.0537 12.8983C13.4984 12.4553 13.8326 11.9138 14.0293 11.3177L14.6493 9.45773C14.7099 9.25002 14.8362 9.06756 15.0093 8.93773C15.1813 8.79508 15.396 8.71411 15.6193 8.70773C15.8469 8.69299 16.0728 8.7565 16.2593 8.88773C16.4511 9.00947 16.5957 9.19287 16.6693 9.40773L17.2993 11.3077C17.4937 11.9046 17.8258 12.4473 18.2688 12.8921C18.7118 13.3368 19.2532 13.671 19.8493 13.8677L21.7193 14.5177C21.9298 14.5836 22.1126 14.7172 22.2393 14.8977C22.3759 15.0732 22.4561 15.2858 22.4693 15.5077ZM12.5993 8.55673C12.5964 8.76174 12.5306 8.9609 12.4108 9.12725C12.2909 9.2936 12.1229 9.4191 11.9293 9.48673L10.5893 9.92673C10.2111 10.0601 9.86883 10.2791 9.58932 10.5667C9.30443 10.8485 9.08582 11.19 8.94932 11.5667L8.47932 12.9067C8.41492 13.0936 8.2966 13.2571 8.13932 13.3767C7.96906 13.4961 7.7672 13.5622 7.55932 13.5667C7.3531 13.5631 7.15305 13.4959 6.98656 13.3741C6.82007 13.2524 6.69529 13.0821 6.62932 12.8867L6.18932 11.5467C6.05597 11.1685 5.83692 10.8262 5.54932 10.5467C5.2676 10.2618 4.92601 10.0432 4.54932 9.90673L3.19932 9.45673C3.00359 9.39375 2.8346 9.267 2.71932 9.09673C2.59467 8.93299 2.52784 8.73252 2.52932 8.52673C2.53067 8.31833 2.5971 8.11554 2.71932 7.94673C2.84427 7.7862 3.01521 7.66759 3.20932 7.60673L4.54932 7.15673C4.92601 7.02024 5.2676 6.80162 5.54932 6.51673C5.83932 6.23973 6.05832 5.89673 6.18932 5.51673L6.63932 4.19673C6.69925 4.00753 6.81413 3.84044 6.96932 3.71673C7.12907 3.59058 7.3258 3.52032 7.52932 3.51673C7.73553 3.49939 7.94117 3.55612 8.10932 3.67673C8.28143 3.79046 8.41416 3.95462 8.48932 4.14673L8.93932 5.51673C9.07432 5.89473 9.29332 6.23673 9.57932 6.51673C9.86104 6.80162 10.2026 7.02024 10.5793 7.15673L11.9293 7.62673C12.1176 7.69703 12.2802 7.8224 12.3962 7.9865C12.5121 8.15061 12.5759 8.34583 12.5793 8.54673L12.5993 8.55673Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const Welcome = ({ onToggle }: { onToggle: () => void }) => {
  const { user } = useAuth()
  return (
    <>
      <div className="md:contents flex flex-col gap-y-5">
        <div className="flex items-end justify-between">
          <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
            Welcome, {user?.firstName}
          </h1>

          <div className="contents md:flex min-[768px]:flex-row-reverse min-[1024px]:flex-row items-center gap-x-3">
            <Button
              className="min-[1440px]:hidden inline-flex"
              variant="light"
              onClick={onToggle}
            >
              My Profile
            </Button>

            <Button
              className="bg-white text-dark-blue-400 xs:max-md:hidden"
              variant="outlined"
              visual="gray"
            >
              <Plus className="size-[15px]" />
              Create a Project
            </Button>
          </div>
        </div>

        <Button
          className="bg-white text-dark-blue-400 md:hidden"
          variant="outlined"
          visual="gray"
        >
          <Plus className="size-[15px]" />
          Create a Project
        </Button>
      </div>

      <div className="mt-3 md:mt-5">
        <div className="rounded-lg p-5 bg-white border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
          <h1 className="text-lg leading-[21.78px] font-bold text-dark-blue-400">
            My Earnings
          </h1>

          <div className="divide-y-[.76px] md:divide-y-0 md:divide-x-[0.76px] flex md:flex-row flex-col mt-5 divide-gray-200">
            <div className="flex-auto md:flex xs:max-md:py-5">
              <div className="space-y-[17.41px]">
                <div className="flex gap-x-[6.75px]">
                  <MoneyDollarCircleFill className="flex-none text-dark-blue-400" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Lifetime Earnings
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-x-0.5">
                    <span className="text-xl leading-6 text-dark-blue-400/50">
                      $
                    </span>
                    <h1 className="text-2xl leading-[29.05px] font-semibold text-dark-blue-400">
                      66,777
                      <span className="text-sm leading-[16.94px] text-dark-blue-400">
                        .00
                      </span>
                    </h1>
                  </div>

                  <p className="text-[11px] leading-[13.31px] text-dark-blue-400">
                    Earnings since Jun 24, 2021
                  </p>
                </div>

                <h3 className="text-[13px] leading-[15.73px] text-dark-blue-400">
                  <span className="font-semibold">572</span> Total Hours
                </h3>
              </div>
            </div>

            <div className="flex-auto md:flex md:justify-center xs:max-md:py-5">
              <div className="space-y-[17.41px]">
                <div className="flex gap-x-[6.75px] ">
                  <CalendarBold className="flex-none text-dark-blue-400" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Earnings This Month
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-x-0.5">
                    <span className="text-xl leading-6 text-dark-blue-400/50">
                      $
                    </span>
                    <h1 className="text-2xl leading-[29.05px] font-semibold text-dark-blue-400">
                      4,566
                      <span className="text-sm leading-[16.94px] text-dark-blue-400">
                        .00
                      </span>
                    </h1>
                  </div>

                  <p className="text-[11px] leading-[13.31px] text-dark-blue-400">
                    Earnings in August
                  </p>
                </div>

                <h3 className="text-[13px] leading-[15.73px] flex items-center gap-x-1 text-dark-blue-400">
                  <ArrowUp className="size-[14.39px] shrink-0 text-success-500" />
                  <span>
                    <span className="text-success-500">12.8%</span> from last
                    month
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex-auto md:flex md:justify-end xs:max-md:pt-5">
              <div className="space-y-[14.68px]">
                <div className="flex items-center justify-between">
                  <div className="flex gap-x-[6.75px] ">
                    <WalletBold className="flex-none text-dark-blue-400" />
                    <span className="text-sm leading-[16.94px] text-dark-blue-400">
                      Next Payout
                    </span>
                  </div>

                  <Button
                    className="text-dark-blue-400 text-[10px] leading-5 underline hover:text-primary-500"
                    variant="link"
                  >
                    See all payouts
                  </Button>
                </div>

                <div className="flex items-center md:gap-x-[25px] min-[1024px]:gap-x-[30px] min-[1440px]:gap-x-[37px] xl:gap-x-[57px] 2xl:gap-x-[75px] justify-between">
                  <div className="space-y-2.5">
                    <div className="flex gap-x-1 items-center">
                      <div className="flex items-center gap-x-0.5">
                        <span className="text-xl leading-6 text-dark-blue-400/50">
                          $
                        </span>
                        <h1 className="text-2xl leading-[29.05px] font-semibold text-dark-blue-400">
                          800
                          <span className="text-sm leading-[16.94px] text-dark-blue-400">
                            .00
                          </span>
                        </h1>
                      </div>

                      <Badge visual="primary">Processing</Badge>
                    </div>

                    <p className="text-[11px] leading-[13.31px] text-dark-blue-400">
                      Tuesday, Aug 20, 2024
                    </p>
                  </div>

                  <Button
                    className="bg-white h-7 px-2.5 text-[10px] leading-5 text-dark-blue-400"
                    variant="outlined"
                    visual="gray"
                  >
                    Edit Schedule
                  </Button>
                </div>

                <div className="flex items-center md:gap-x-[25px] min-[1024px]:gap-x-[30px] min-[1440px]:gap-x-[37px] xl:gap-x-[57px] 2xl:gap-x-[75px] justify-between">
                  <div className="flex items-center gap-x-1.5">
                    <BankLine className="text-dark-blue-400" />
                    <h3 className="text-[13px] inline-flex items-center gap-x-2 leading-[15.73px] text-dark-blue-400">
                      Chase Bank
                      <span className="text-[13px] leading-[15.73px] font-semibold">
                        ...4553
                      </span>
                    </h3>
                  </div>

                  <Button
                    className="text-dark-blue-400 text-[10px] leading-5 underline hover:text-primary-500"
                    variant="link"
                  >
                    Manage bank info
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

interface Project {
  projectName: string
  team: { image: string; alternativeText: string }[]
  status: string
  nextMilestone: string
}

export const TableRow = ({
  projectName,
  nextMilestone,
  status,
  team,
}: Project) => {
  return (
    <tr className="first:pt-3 last:pb-3">
      <td className="px-6 py-3.5 text-sm leading-5 font-semibold text-dark-blue-400 inline-block truncate">
        {projectName}
      </td>
      <td className="px-6 py-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup excess size="sm" max={3}>
                {team.map((member, index) => (
                  <Avatar
                    key={index}
                    className="border-2 border-white hover:ring-0 active:ring-0"
                    size="sm"
                  >
                    <AvatarImage
                      src={member.image}
                      alt={member.alternativeText}
                    />
                    <AvatarFallback>
                      {member.alternativeText.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md">
              <ScrollArea viewportClassName="max-h-[192px]" className="p-3">
                <div className="space-y-3">
                  {team.map((member, index) => (
                    <div className="flex items-center gap-x-2" key={index}>
                      <Avatar className="hover:ring-0">
                        <AvatarImage
                          src={member.image}
                          alt={member.alternativeText}
                        />
                        <AvatarFallback>
                          {member.alternativeText.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium leading-5">
                        {member.alternativeText}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>
      <td className="px-6 py-[13px] items-center">
        {status === "In Progress" ? (
          <Badge visual="success">{status}</Badge>
        ) : (
          <Badge visual="gray">{status}</Badge>
        )}
      </td>
      <td className="pl-6 pr-8 py-3.5">
        <div className="gap-x-14 flex items-center justify-between">
          <span className="text-sm whitespace-nowrap leading-5 text-gray-500">
            {nextMilestone}
          </span>
          <Button
            className="h-auto px-1.5 py-1 text-dark-blue-400"
            visual="gray"
            variant="ghost"
          >
            <MoreHorizontal className="size-[15px]" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export const Table = () => {
  return (
    <table className="table-auto border-collapse w-full">
      <thead>
        <tr>
          <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
            Project Name
          </th>
          <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
            Team
          </th>
          <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
            Status
          </th>
          <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
            Next Milestone
          </th>
        </tr>
      </thead>

      <tbody>
        {data.projects.map((project, index) => (
          <TableRow {...project} key={index} />
        ))}
      </tbody>
    </table>
  )
}

export const RecentProjects = () => {
  return (
    <div className="border bg-white border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="flex justify-between items-start pt-5 px-6">
        <h1 className="text-lg leading-[21.78px] font-bold text-dark-blue-400">
          Recent Projects
        </h1>

        <Button
          className="text-dark-blue-400 xs:max-md:hidden"
          variant="link"
          visual="gray"
        >
          View All Projects <ArrowRight className="size-3.5" />
        </Button>
      </div>

      <Tabs className="mt-1" defaultValue="All Projects">
        <TabsList className="px-6 w-full justify-start">
          <TabsTrigger className="pb-[11px]" value="All Projects">
            All Projects
          </TabsTrigger>
          <TabsTrigger className="pb-[11px]" value="Created by Me">
            Created by Me
          </TabsTrigger>
        </TabsList>
        <TabsContent className="overflow-x-hidden" value="All Projects">
          <div className="overflow-x-auto scrollbar-none">
            <Table />
          </div>
          <div className="h-[49px] flex items-center md:hidden justify-center border-t border-gray-200">
            <Button className="text-dark-blue-400" variant="link">
              View All Projects <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </TabsContent>
        <TabsContent className="overflow-x-hidden" value="Created by Me">
          <div className="overflow-x-auto scrollbar-none">
            <Table />
          </div>
          <div className="h-[49px] flex items-center md:hidden justify-center border-t border-gray-200">
            <Button className="text-dark-blue-400" variant="link">
              View All Projects <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const CreateYourOwnProject = () => {
  return (
    <div className="bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] border rounded-lg border-gray-200 p-5 flex flex-col-reverse md:grid md:grid-cols-2 gap-5 min-[1024px]:gap-x-[100px]">
      <div>
        <div className="space-y-6">
          <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
            Step 1/5
          </h1>

          <Progress value={20} />

          <div>
            <h3 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
              Create Your Own Projects
            </h3>
            <p className="text-sm leading-[16.94px] mt-3 text-dark-blue-400">
              Turn your skills into profitable projects. Stand out by offering
              unique services that clients can purchase directly from you.
            </p>
          </div>
        </div>

        <div className="mt-5 min-[1024px]:mt-[49px] flex flex-col items-start gap-y-3">
          <div className="flex items-center gap-x-3">
            <Button
              className="text-dark-blue-400"
              size="sm"
              variant="outlined"
              visual="gray"
            >
              <Plus className="size-[15px]" /> Create a Project
            </Button>
            <Button
              className="text-dark-blue-400"
              size="sm"
              variant="ghost"
              visual="gray"
            >
              Skip
            </Button>
          </div>
          <Button
            className="opacity-50 hover:opacity-100"
            visual="gray"
            size="sm"
            variant="ghost"
          >
            <Clock className="size-[15px]" /> Takes 5 min
          </Button>
        </div>
      </div>

      <div className="bg-[#122A4B]/[.04] rounded-lg xs:max-md:h-[140px]"></div>
    </div>
  )
}

export const RecommendedForYouCard = () => {
  return (
    <article className="relative rounded-lg p-5 border border-[#122A4B]/[.15] shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <button className="focus-visible:outline-none absolute top-3 right-3 text-dark-blue-400/50 hover:text-dark-blue-400">
        <X className="size-[18px]" />
      </button>
      <div className="pt-[18px] pb-[54px]">
        <div className="flex items-center justify-center">
          <AvatarGroup size="md" max={3} excess>
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
        </div>

        <h1 className="text-sm leading-[16.94px] line-clamp-1 text-center text-dark-blue-400 mt-2.5 font-semibold">
          Full E-commerce Website Setup for your store
        </h1>
        <p className="text-sm leading-[16.94px] mt-1 text-center text-gray-500">
          5 people are working on this project
        </p>
      </div>

      <Button
        visual="gray"
        variant="outlined"
        className="w-full text-dark-blue-400"
      >
        <Send className="size-[15px]" /> Request to Join
      </Button>
    </article>
  )
}

export const RecommendedForYou = () => {
  const [carousel, setCarousel] = React.useState<Swiper>()
  return (
    <div className="mt-3 md:mt-5">
      <div className="p-5 border bg-white border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-lg leading-[21.78px] font-bold text-dark-blue-400">
              Recommended for you
            </h1>
            <p className="text-sm leading-[16.94px] font-light text-dark-blue-400">
              Improve your recommendations by{" "}
              <NextLink
                className="focus-visible:outline-none underline hover:text-primary-500"
                href="/complete-profile"
              >
                adding skills
              </NextLink>{" "}
              to your profile.
            </p>
          </div>

          <Button variant="outlined" visual="gray">
            View All
          </Button>
        </div>

        <Tabs defaultValue="Projects">
          <TabsList className="mt-3 border-b-transparent px-0">
            <TabsTrigger value="Projects">Projects</TabsTrigger>
            <TabsTrigger value="People">People</TabsTrigger>
          </TabsList>
          <TabsContent value="Projects">
            <div className="mt-3 relative isolate">
              <SwiperRoot
                slidesPerView="auto"
                spaceBetween={12}
                onInit={setCarousel}
                className="avatar-carousel"
              >
                <SwiperSlide>
                  <RecommendedForYouCard />
                </SwiperSlide>
                <SwiperSlide>
                  <RecommendedForYouCard />
                </SwiperSlide>
                <SwiperSlide>
                  <RecommendedForYouCard />
                </SwiperSlide>
                <SwiperSlide>
                  <RecommendedForYouCard />
                </SwiperSlide>
                <SwiperSlide>
                  <RecommendedForYouCard />
                </SwiperSlide>
              </SwiperRoot>

              {carousel?.allowSlideNext && (
                <button
                  className="focus-visible:outline-none bg-white absolute z-10 text-gray-500 shrink-0 rounded-full size-[50px] inline-flex items-center justify-center border-gray-300 -right-2.5 -translate-y-1/2 border shadow-[0px_20px_24px_-4px_rgba(16,24,40,.08)] top-1/2"
                  onClick={() => carousel?.slideNext()}
                >
                  <ChevronRight className="size-[18px]" />
                </button>
              )}

              {carousel?.allowSlidePrev && (
                <button
                  className="focus-visible:outline-none bg-white absolute z-10 text-gray-500 shrink-0 rounded-full size-[50px] inline-flex items-center justify-center border-gray-300 -left-2.5 -translate-y-1/2 border shadow-[0px_20px_24px_-4px_rgba(16,24,40,.08)] top-1/2"
                  onClick={() => carousel?.slidePrev()}
                >
                  <ChevronLeft className="size-[18px]" />
                </button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export const BecomeTopSeller = () => {
  return (
    <div className="mt-3 md:mt-5 p-5 bg-white rounded-lg border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <h1 className="text-lg leading-[21.78px] font-bold text-dark-blue-400">
        Become a top seller on Marketeq in just a few steps
      </h1>
      <p className="text-sm mt-2 leading-[16.94px] font-light text-dark-blue-400">
        Unlock your full potential on Marketeq by optimizing your profile,
        promoting your work, and sharpening your skills.
      </p>

      <div className="mt-5 grid md:grid-cols-3 gap-[30px] md:gap-5 min-[1024px]:gap-8">
        <article>
          <Edit04 className="text-primary-200" />
          <div className="mt-5">
            <h1 className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
              Optimize your profile to stand out
            </h1>
            <p className="text-sm leading-[16.94px] mt-2 font-light text-dark-blue-400">
              Fill out all sections and add samples showcasing your best work.
            </p>
          </div>
          <div className="mt-5">
            <Button
              className="text-dark-blue-400"
              variant="outlined"
              visual="gray"
            >
              Enhance Your Profile
            </Button>
          </div>
        </article>
        <article>
          <PresentationChart01 className="text-primary-200" />
          <div className="mt-5">
            <h1 className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
              Create and promote your own projects
            </h1>
            <p className="text-sm leading-[16.94px] mt-2 font-light text-dark-blue-400">
              Take control of your Marketeq journey by starting your own
              projects.
            </p>
          </div>
          <div className="mt-5">
            <Button
              className="text-dark-blue-400"
              variant="outlined"
              visual="gray"
            >
              Create a Project Now
            </Button>
          </div>
        </article>
        <article>
          <Monitor02 className="text-primary-200" />
          <div className="mt-5">
            <h1 className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
              Level up with Marketeq University
            </h1>
            <p className="text-sm mt-2 leading-[16.94px] font-light text-dark-blue-400">
              Enroll in relevant courses to enhance your expertise and stay
              competitive.
            </p>
          </div>
          <div className="mt-5">
            <Button
              className="text-dark-blue-400"
              variant="outlined"
              visual="gray"
            >
              Explore Courses
            </Button>
          </div>
        </article>
      </div>
    </div>
  )
}

export const Carousel = () => {
  return (
    <div className="border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] bg-white rounded-lg">
      <SwiperRoot
        pagination={{
          clickable: true,
        }}
        modules={[Pagination]}
      >
        <SwiperSlide>
          <div className="p-5 pb-[50px] grid md:grid-cols-2 gap-5 md:gap-x-[50px]">
            <div>
              <h1 className="text-lg leading-[21.78px] font-bold text-dark-blue-400">
                “Marketeq University provided me with the tools and confidence I
                needed to build and sustain my engineering career.”
              </h1>

              <div className="mt-5">
                <div className="flex items-center gap-x-[3px]">
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                </div>

                <div className="mt-2">
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Olivia Kyle, Entrepreneurial Consultant
                  </span>
                </div>

                <Button
                  className="mt-5 text-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  Start this course
                </Button>
              </div>
            </div>

            <div className="md:py-[37px]">
              <div className="flex gap-x-5">
                <Avatar size="2xl">
                  <AvatarImage src="/woman.jpg" alt="Woman" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-x-1">
                    <h1 className="text-base leading-[19.36px] font-semibold text-dark-blue-400">
                      Dylan Meringue
                    </h1>
                    <span className="text-sm leading-[16.94px] font-light">
                      Instructor
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-[15.73px] font-light text-dark-blue-400">
                    Specializes in helping freelancers start and sustain their
                    businesses. Strengths include strategic planning and
                    business development.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-x-6">
                <span className="text-sm leading-[16.94px] text-dark-blue-400">
                  Worked with:
                </span>
                <NextImage
                  src="/google.png"
                  alt="Google"
                  height={18}
                  width={51.72}
                  style={{
                    height: 18,
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
                <NextImage
                  src="/spotify.png"
                  alt="Spotify"
                  height={18}
                  width={58.53}
                  style={{
                    height: 18,
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          </div>
        </SwiperSlide>
        <SwiperSlide>
          <div className="p-5 pb-[50px] grid md:grid-cols-2 rounded-lg gap-5 md:gap-x-[50px]">
            <div>
              <h1 className="text-lg leading-[21.78px] font-bold text-dark-blue-400">
                “Marketeq University provided me with the tools and confidence I
                needed to build and sustain my engineering career.”
              </h1>

              <div className="mt-5">
                <div className="flex items-center gap-x-[3px]">
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                  <Star className="size-4 text-warning-500 fill-warning-500" />
                </div>

                <div className="mt-2">
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Olivia Kyle, Entrepreneurial Consultant
                  </span>
                </div>

                <Button
                  className="mt-5 text-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  Start this course
                </Button>
              </div>
            </div>

            <div className="md:py-[37px]">
              <div className="flex gap-x-5">
                <Avatar size="2xl">
                  <AvatarImage src="/man.jpg" alt="Man" />
                  <AvatarFallback>W</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-x-1">
                    <h1 className="text-base leading-[19.36px] font-semibold text-dark-blue-400">
                      Dylan Meringue
                    </h1>
                    <span className="text-sm leading-[16.94px] font-light">
                      Instructor
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-[15.73px] font-light text-dark-blue-400">
                    Specializes in helping freelancers start and sustain their
                    businesses. Strengths include strategic planning and
                    business development.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-x-6">
                <span className="text-sm leading-[16.94px] text-dark-blue-400">
                  Worked with:
                </span>
                <NextImage
                  src="/google.png"
                  alt="Google"
                  height={18}
                  width={51.72}
                  style={{
                    height: 18,
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
                <NextImage
                  src="/spotify.png"
                  alt="Spotify"
                  height={18}
                  width={58.53}
                  style={{
                    height: 18,
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          </div>
        </SwiperSlide>
      </SwiperRoot>
    </div>
  )
}

export const TakeCareersToNextLevel = () => {
  return (
    <div className="mt-3 md:mt-5 p-5 md:p-[50px] rounded-lg border bg-white border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="max-w-[561px] mx-auto">
        <h1 className="text-[22px] text-center leading-[26.63px] text-dark-blue-400 font-bold">
          Take your careers to the next level
        </h1>
        <p className="text-base text-center leading-[19.36px] mt-2 text-dark-blue-400">
          Upgrade your account to Premium or Agency and unlock exclusive
          features to grow your business faster and more efficiently.
        </p>
      </div>

      <div className="mt-5 md:mt-[50px] grid md:grid-cols-2 gap-5 items-end">
        <article className="rounded-xl border border-gray-200">
          <div className="bg-primary-25 border-b rounded-t-xl py-1 border-gray-200 flex justify-center items-center gap-x-2.5">
            <StarsBFill className="size-6 text-primary-500" />
            <span className="text-[17px] font-medium leading-[20.57px] text-dark-blue-400">
              Recommended for you
            </span>
          </div>
          <div className="p-5">
            <h1 className="text-2xl font-semibold leading-[29.05px] text-dark-blue-400">
              Premium
            </h1>
            <p className="text-sm leading-[16.94px] mt-5 text-dark-blue-400">
              Recommended for solo talents looking to scale
            </p>

            <h1 className="text-[32px] mt-5 leading-[38.73px] font-bold text-dark-blue-400">
              $15{" "}
              <span className="text-[17px] leading-[20.57px] font-normal">
                / month
              </span>
            </h1>

            <div className="mt-5">
              <h3 className="text-[17px] leading-[20.57px] font-semibold text-dark-blue-400">
                Why we recommend it for you
              </h3>
              <ul className="flex flex-col mt-3 gap-y-2">
                <li className="flex items-center gap-x-2.5">
                  <Check className="size-5 text-primary-500" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Get new jobs 2x faster
                  </span>
                </li>
                <li className="flex items-center gap-x-2.5">
                  <Check className="size-5 text-primary-500" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Increase visibility by 30%
                  </span>
                </li>
                <li className="flex items-center gap-x-2.5">
                  <Check className="size-5 text-primary-500" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Access to exclusive jobs
                  </span>
                </li>
                <li className="flex items-center gap-x-2.5">
                  <Check className="size-5 text-primary-500" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Track advanced analytics
                  </span>
                </li>
              </ul>

              <Button
                className="mt-5 text-dark-blue-400"
                visual="gray"
                variant="outlined"
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200">
          <div className="p-5">
            <h1 className="text-2xl font-semibold leading-[29.05px] text-dark-blue-400">
              Agency
            </h1>
            <p className="text-sm leading-[16.94px] mt-5 text-dark-blue-400">
              Ideal for talents who want to build a team
            </p>

            <h1 className="text-[32px] mt-5 leading-[38.73px] font-bold text-dark-blue-400">
              $20{" "}
              <span className="text-[17px] leading-[20.57px] font-normal">
                / month
              </span>
            </h1>

            <div className="mt-5">
              <h3 className="text-[17px] leading-[20.57px] font-semibold text-dark-blue-400">
                Benefits
              </h3>
              <ul className="flex flex-col mt-3 gap-y-2">
                <li className="flex items-center gap-x-2.5">
                  <Check className="size-5 text-primary-500" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Build your own team
                  </span>
                </li>
                <li className="flex items-center gap-x-2.5">
                  <Check className="size-5 text-primary-500" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Collaborate with team members
                  </span>
                </li>
                <li className="flex items-center gap-x-2.5">
                  <Check className="size-5 text-primary-500" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Take on more clients
                  </span>
                </li>
                <li className="flex items-center gap-x-2.5">
                  <Check className="size-5 text-primary-500" />
                  <span className="text-sm leading-[16.94px] text-dark-blue-400">
                    Access in-depth metrics
                  </span>
                </li>
              </ul>

              <Button
                className="mt-5 text-dark-blue-400"
                visual="gray"
                variant="outlined"
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

export const Footer = () => {
  return (
    <div className="px-5 xs:max-md:pt-5 md:px-6 pb-5 flex flex-col md:flex-row items-center gap-5 md:justify-between">
      <div className="flex md:flex-row flex-col items-center gap-5 md:gap-x-[57px]">
        <NextLink className="focus-visible:outline-none" href="/">
          <Logo3 className="shrink-0 w-[120px] h-[17.63px]" />
        </NextLink>
        <span className="text-[13px] leading-[15.73px] font-light text-dark-blue-400">
          © 2011 - 2025 Marketeq Digital Inc. All Rights Reserved.
        </span>
      </div>

      <div className="flex items-center gap-x-[16.6px]">
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <Facebook className="fill-dark-blue-400 size-4" />
        </IconButton>
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <XIcon className="text-dark-blue-400 size-4" />
        </IconButton>
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <InstagramDefault className="text-dark-blue-400 size-4" />
        </IconButton>
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <Linkedin className="text-dark-blue-400 size-4" />
        </IconButton>
      </div>
    </div>
  )
}
