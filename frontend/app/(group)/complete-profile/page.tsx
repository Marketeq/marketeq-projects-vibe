"use client"

import React, { Fragment, SVGProps, useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth"
import { UserAPI } from "@/service/http/user"
import { cn, hookFormHasError, noop } from "@/utils/functions"
import {
  useCallbackRef,
  useControllableState,
  useUncontrolledState,
} from "@/utils/hooks"
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Briefcase02,
  Building03,
  Check,
  ChevronRight,
  Clock,
  CreditCard02,
  Edit03,
  FaceId,
  Home03,
  Info,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
  Search,
  SearchMd,
  Star,
  ThumbsUp,
  Tool02,
  Trash03,
  User,
  UserCheck01,
  UserPlus01,
  UsersPlus,
  X,
  X2,
} from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import Confetti from "react-confetti"
import CurrencyInput from "react-currency-input-field"
import { Controller, SubmitHandler, useForm, useWatch } from "react-hook-form"
import { useToggle } from "react-use"
import { z } from "zod"
import NextImage from "@/components/next-image"
import {
  BecomeTopSeller,
  Carousel,
  CreateYourOwnProject,
  Footer,
  LeftSidebar,
  RecentProjects,
  RecommendedForYou,
  TakeCareersToNextLevel,
  Tasks,
  Welcome,
} from "@/components/talent-dashboard-comps"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  CircularProgress,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
  ErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Progress,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Textarea,
  inputVariants,
} from "@/components/ui"
import { StatusDialog } from "./status-dialog"

const Bulb = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M1.999 9a1 1 0 0 1 .117 1.993L1.999 11h-1a1 1 0 0 1-.117-1.993L.999 9zm8-9a1 1 0 0 1 .993.883l.007.117v1a1 1 0 0 1-1.993.117L8.999 2V1a1 1 0 0 1 1-1m9 9a1 1 0 0 1 .117 1.993l-.117.007h-1a1 1 0 0 1-.117-1.993L17.999 9zM2.892 2.893a1 1 0 0 1 1.32-.083l.094.083.7.7a1 1 0 0 1-1.32 1.497l-.094-.083-.7-.7a1 1 0 0 1 0-1.414m12.8 0a1 1 0 0 1 1.497 1.32l-.083.094-.7.7a1 1 0 0 1-1.497-1.32l.083-.094zM11.999 16a1 1 0 0 1 1 1 3 3 0 0 1-6 0 1 1 0 0 1 .883-.993L7.999 16zm-2-12a6 6 0 0 1 3.6 10.8 1 1 0 0 1-.471.192l-.13.008h-6a1 1 0 0 1-.6-.2A6 6 0 0 1 9.999 4"
      fill="currentColor"
    />
  </svg>
)

const ThinkCheck = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={20}
    height={17}
    viewBox="0 0 20 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.455.308a1 1 0 0 1 1.352.309l.99 1.51a1 1 0 0 1-.155 1.279l-.003.004-.014.013-.057.053-.225.215a84 84 0 0 0-3.62 3.736c-2.197 2.416-4.806 5.578-6.562 8.646-.49.856-1.687 1.04-2.397.3L.28 9.637A1 1 0 0 1 .33 8.2l1.96-1.768a1 1 0 0 1 1.27-.057l3.31 2.48c5.168-5.096 8.1-7.052 10.585-8.547"
      fill="currentColor"
    />
  </svg>
)

const RightSidebar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()
  return (
    <div className="shrink-0 w-[322px]">
      <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-base font-bold text-dark-blue-400 leading-none">
            @{user?.username}
          </h2>
          <Button
            className="text-dark-blue-400 underline text-[11px] leading-6"
            size="md"
            variant="link"
            visual="gray"
          >
            Add your job title
          </Button>

          <div className="mt-3 flex items-center gap-x-3">
            <div className="h-6 inline-flex items-center gap-x-1 rounded-[4px] py-1 px-2 text-sm font-medium leading-none text-primary-500 bg-primary-50">
              <Star className="text-primary-500 fill-primary-500 size-3" />
              0.0
            </div>

            <span className="text-dark-blue-400 text-xs leading-none">
              no reviews yet
            </span>
          </div>
        </div>
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <CircularProgress
              className="text-[10px] leading-[15.63px]"
              size={46}
              strokeWidth={4}
              value={10}
            />

            <Button
              className="border-2 border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500 hover:text-white"
              onClick={() => setIsOpen((prev) => !prev)}
            >
              <UserCheck01 className="size-[15px]" />
              Complete My Profile
            </Button>
            <StatusDialog open={isOpen} onOpenChange={setIsOpen} />
          </div>
          <div className="mt-3">
            <span className="text-[13px] leading-none font-light text-dark-blue-400">
              Users with completed profiles are 4 times more likely to get hired
              for client projects.
            </span>
          </div>
          <div className="mt-3">
            <Button
              className="underline text-[11px] leading-6"
              size="md"
              variant="link"
            >
              <FaceId className="size-[15px]" />
              Start Verification
            </Button>
          </div>
        </div>

        <div className="p-5 border-b flex items-center gap-x-3 border-gray-200">
          <ThumbsUp className="size-[15px]" />
          <span className="text-[11px] font-semibold leading-none text-dark-blue-400">
            98% Client Success
          </span>
        </div>
        <div className="p-5 border-b flex flex-col items-start gap-x-3 border-gray-200">
          <Button
            className="underline text-[11px] leading-6 text-dark-blue-400"
            size="md"
            variant="link"
          >
            <MapPin className="size-[15px]" />
            Start Verification
          </Button>
          <Button
            className="underline text-[11px] leading-6 text-dark-blue-400"
            size="md"
            variant="link"
          >
            <Clock className="size-[15px]" />
            Add your local time
          </Button>
        </div>
        <div className="p-5 grid gap-x-[15px] grid-cols-2 gap-y-3">
          <div className="space-y-[5px]">
            <h3 className="text-sm text-dark-blue-400 leading-none">
              Hourly Rate
            </h3>
            <Button
              className="underline text-[11px] leading-6 text-dark-blue-400"
              size="md"
              variant="link"
            >
              Edit
            </Button>
          </div>
          <div className="space-y-[5px]">
            <h3 className="text-sm text-dark-blue-400 leading-none">
              Availability
            </h3>
            <Button
              className="underline text-[11px] leading-6 text-dark-blue-400"
              size="md"
              variant="link"
            >
              Edit
            </Button>
          </div>
          <div className="space-y-[5px]">
            <h3 className="text-sm text-dark-blue-400 leading-none">
              Member since
            </h3>
            <span className="text-[11px] font-semibold leading-6 text-dark-blue-400">
              Sep 2024
            </span>
          </div>
          <div className="space-y-[5px]">
            <h3 className="text-sm text-dark-blue-400 leading-none">
              Work Experience
            </h3>
            <Button
              className="underline text-[11px] leading-6 text-dark-blue-400"
              size="md"
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

export default function CompleteProfilePage() {
  // Only render the profile completion steps UI
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg">
        <StatusDialog open={true} />
      </div>
    </div>
  )
}
