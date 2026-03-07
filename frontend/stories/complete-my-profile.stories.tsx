import React, { Fragment, SVGProps, useEffect, useRef, useState } from "react"
import { cn, hookFormHasError, noop } from "@/utils/functions"
import {
  useCallbackRef,
  useControllableState,
  useUncontrolledState,
} from "@/utils/hooks"
import {
  AlertCircle,
  ArrowLeft,
  BarChartSquare02,
  Briefcase,
  Briefcase02,
  Building03,
  Check,
  ChevronDown,
  Clock,
  CreditCard02,
  Edit03,
  FaceId,
  Home03,
  Info,
  Mail01,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
  Search,
  SearchMd,
  Settings02,
  Star,
  ThumbsUp,
  Tool02,
  Trash,
  Trash03,
  User,
  UserCheck01,
  UserCircle,
  UserPlus01,
  UsersPlus,
  X,
  X2,
} from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { Meta } from "@storybook/react"
import Confetti from "react-confetti"
import CurrencyInput from "react-currency-input-field"
import { Controller, SubmitHandler, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import NextImage from "@/components/next-image"
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
  DatePicker,
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

const meta: Meta = {
  title: "Complete My Profile",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

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

export const Default = () => {
  return (
    <div className="bg-gray-50 flex min-h-screen">
      <div className="w-[224px] shrink-0 border-r border-gray-200 p-[15px]">
        <span className="text-xs font-medium leading-5 text-dark-blue-400">
          Work
        </span>

        <div className="mt-2">
          <ul className="space-y-1">
            <li>
              <button className="group py-2 px-3 focus-visible:outline-none flex items-center text-sm leading-6 font-semibold text-dark-blue-400 gap-x-3 hover:bg-gray-100 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500 rounded-[5px] w-full">
                <Home03 className="size-[18px] opacity-50 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                Home
              </button>
            </li>
            <li>
              <button className="group py-2 px-3 focus-visible:outline-none flex items-center text-sm leading-6 font-semibold text-dark-blue-400 gap-x-3 hover:bg-gray-100 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500 rounded-[5px] w-full">
                <Search className="size-[18px] opacity-50 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                Find Jobs
              </button>
            </li>
            <li>
              <button className="group py-2 px-3 focus-visible:outline-none flex items-center text-sm leading-6 font-semibold text-dark-blue-400 gap-x-3 hover:bg-gray-100 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500 rounded-[5px] w-full">
                <Briefcase className="size-[18px] opacity-50 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                My Projects
              </button>
            </li>
            <li>
              <button className="group py-2 px-3 focus-visible:outline-none flex items-center text-sm leading-6 font-semibold text-dark-blue-400 gap-x-3 hover:bg-gray-100 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500 rounded-[5px] w-full">
                <Plus className="size-[18px] opacity-50 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                Create a Project
              </button>
            </li>
            <li>
              <button className="group py-2 px-3 focus-visible:outline-none flex items-center text-sm leading-6 font-semibold text-dark-blue-400 gap-x-3 hover:bg-gray-100 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500 rounded-[5px] w-full">
                <BarChartSquare02 className="size-[18px] opacity-50 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                Stats & Trends
              </button>
            </li>
          </ul>
        </div>

        <div className="mt-10">
          <span className="text-xs font-medium leading-5 text-dark-blue-400">
            Account
          </span>

          <div className="mt-2">
            <ul className="space-y-1">
              <li>
                <button className="group py-2 px-3 focus-visible:outline-none flex items-center text-sm leading-6 font-semibold text-dark-blue-400 gap-x-3 hover:bg-gray-100 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500 rounded-[5px] w-full">
                  <UserCircle className="size-[18px] opacity-50 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                  Profile
                </button>
              </li>
              <li>
                <button className="group py-2 px-3 focus-visible:outline-none flex items-center text-sm leading-6 font-semibold text-dark-blue-400 gap-x-3 hover:bg-gray-100 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500 rounded-[5px] w-full">
                  <Mail01 className="size-[18px] opacity-50 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                  Inbox
                </button>
              </li>
              <li>
                <button className="group py-2 px-3 focus-visible:outline-none flex items-center text-sm leading-6 font-semibold text-dark-blue-400 gap-x-3 hover:bg-gray-100 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500 rounded-[5px] w-full">
                  <AlertCircle className="size-[18px] opacity-50 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                  Notification
                </button>
              </li>
              <li>
                <button className="group py-2 px-3 focus-visible:outline-none flex items-center text-sm leading-6 font-semibold text-dark-blue-400 gap-x-3 hover:bg-gray-100 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-500 rounded-[5px] w-full">
                  <Settings02 className="size-[18px] opacity-50 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                  Settings
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="min-h-screen flex gap-x-8 flex-auto p-8">
        <div className="flex-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-base leading-none font-bold text-dark-blue-400">
              Welcome, Christopher!
            </h1>
            <Button
              className="text-dark-blue-400 bg-white"
              variant="outlined"
              visual="gray"
            >
              <Plus className="size-[15px]" />
              Create Project
            </Button>
          </div>

          <div className="bg-white mt-5 border p-5 border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
            <h1 className="text-lg leading-none font-bold text-dark-blue-400">
              My Earnings
            </h1>
          </div>
        </div>
        <div className="shrink-0 w-[322px]">
          <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-base font-bold text-dark-blue-400 leading-none">
                @chrisdesign221
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

                <Button className="border-2 border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500 hover:text-white">
                  <UserCheck01 className="size-[15px]" />
                  Complete My Profile
                </Button>
              </div>
              <div className="mt-3">
                <span className="text-[13px] leading-none font-light text-dark-blue-400">
                  Users with completed profiles are 4 times more likely to get
                  hired for client projects.
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
        </div>
      </div>
    </div>
  )
}

const DIALOG_NAMES = [
  "ABOUT-ME",
  "PORTFOLIO",
  "SKILLS",
  "WORK-EXPERIENCE",
  "EDUCATION",
  "JOB_TITLE_RATE",
  "CONGRATULATIONS",
] as const

const content = {
  "ABOUT-ME": {
    icon: <User className="size-5" />,
    title: "About Me",
    desc: "Create a connection and let clients feel like they already know you",
  },
  PORTFOLIO: {
    icon: <Palette className="size-5" />,
    title: "Portfolio",
    desc: "Show the quality and style that clients are looking for",
  },
  SKILLS: {
    icon: <Tool02 className="size-5" />,
    title: "Skills",
    desc: "Highlight your strengths to stand out from the competition",
  },
  "WORK-EXPERIENCE": {
    icon: <Briefcase className="size-5" />,
    title: "Work Experience",
    desc: "Build credibility with proven industry experience",
  },
  EDUCATION: {
    icon: <Building03 className="size-5" />,
    title: "Education",
    desc: "Show your qualifications to give clients confidence",
  },
  JOB_TITLE_RATE: {
    icon: <User className="size-5" />,
    title: "Job Title & Rate",
    desc: "Message is received in Gmail",
  },
} as Record<
  Exclude<(typeof DIALOG_NAMES)[number], "CONGRATULATIONS">,
  { icon: React.ReactNode; title: string; desc: string }
>

export const StatusDialog = () => {
  const [dialogsState, setDialogsState] = useState(
    DIALOG_NAMES.reduce(
      (previous, current) => ({
        ...previous,
        [current]: {
          finished: false,
          opened: false,
        },
      }),
      {} as {
        [Property in (typeof DIALOG_NAMES)[number]]: {
          finished: boolean
          opened: boolean
        }
      }
    )
  )
  const next = () => {
    let openedDialogName: keyof typeof dialogsState | null = null
    for (const dialogName in dialogsState) {
      if (dialogsState[dialogName as keyof typeof dialogsState].opened) {
        openedDialogName = dialogName as keyof typeof dialogsState
        break
      }
    }

    if (openedDialogName) {
      const index = DIALOG_NAMES.indexOf(openedDialogName)
      const nextIndex = index + 1 < DIALOG_NAMES.length ? index + 1 : undefined
      if (nextIndex !== undefined) {
        const nextDialogName = DIALOG_NAMES[nextIndex]

        if (nextDialogName === "CONGRATULATIONS") {
          const uncompletedDialogIndex = DIALOG_NAMES.slice(0, -1).findIndex(
            (dialogName) => !dialogsState[dialogName].finished
          )
          const uncompletedDialogName = DIALOG_NAMES[uncompletedDialogIndex]

          setDialogsState((prev) => ({
            ...prev,
            [openedDialogName]: {
              ...prev[openedDialogName],
              opened: false,
            },
            ...(uncompletedDialogIndex === -1
              ? { [nextDialogName]: { ...prev[nextDialogName], opened: true } }
              : {
                  [uncompletedDialogName]: {
                    ...prev[uncompletedDialogName],
                    opened: true,
                  },
                }),
          }))
        } else {
          setDialogsState((prev) => ({
            ...prev,
            [openedDialogName]: {
              ...prev[openedDialogName],
              opened: false,
            },
            [nextDialogName]: { ...prev[nextDialogName], opened: true },
          }))
        }
      }
    }
  }
  const previous = () => {
    let openedDialogName: keyof typeof dialogsState | null = null
    for (const dialogName in dialogsState) {
      if (dialogsState[dialogName as keyof typeof dialogsState].opened) {
        openedDialogName = dialogName as keyof typeof dialogsState
        break
      }
    }

    if (openedDialogName) {
      const index = DIALOG_NAMES.indexOf(openedDialogName)
      const previousIndex = index - 1 >= 0 ? index - 1 : undefined
      if (previousIndex !== undefined) {
        const previousDialogName = DIALOG_NAMES[previousIndex]

        setDialogsState((prev) => ({
          ...prev,
          [openedDialogName]: { ...prev[openedDialogName], opened: false },
          [previousDialogName]: { ...prev[previousDialogName], opened: true },
        }))
      }
    }
  }
  return (
    <>
      <AboutMeDialog
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            "ABOUT-ME": { ...prev["ABOUT-ME"], finished },
          }))
        }
        opened={dialogsState["ABOUT-ME"].opened}
        onOpenedChange={(opened) =>
          setDialogsState((prev) => ({
            ...prev,
            "ABOUT-ME": { ...prev["ABOUT-ME"], opened },
          }))
        }
        next={next}
      />
      <Portfolio
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            PORTFOLIO: { ...prev["PORTFOLIO"], finished },
          }))
        }
        opened={dialogsState["PORTFOLIO"].opened}
        onOpenedChange={(opened) =>
          setDialogsState((prev) => ({
            ...prev,
            PORTFOLIO: { ...prev["PORTFOLIO"], opened },
          }))
        }
        next={next}
      />
      <SkillsDialog
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            SKILLS: { ...prev["SKILLS"], finished },
          }))
        }
        opened={dialogsState["SKILLS"].opened}
        onOpenedChange={(opened) =>
          setDialogsState((prev) => ({
            ...prev,
            SKILLS: { ...prev["SKILLS"], opened },
          }))
        }
        next={next}
        previous={previous}
      />
      <WorkExperienceDialog
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            "WORK-EXPERIENCE": { ...prev["WORK-EXPERIENCE"], finished },
          }))
        }
        opened={dialogsState["WORK-EXPERIENCE"].opened}
        onOpenedChange={(opened) =>
          setDialogsState((prev) => ({
            ...prev,
            "WORK-EXPERIENCE": { ...prev["WORK-EXPERIENCE"], opened },
          }))
        }
        next={next}
        previous={previous}
      />
      <EducationDialog
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            EDUCATION: { ...prev["EDUCATION"], finished },
          }))
        }
        opened={dialogsState["EDUCATION"].opened}
        onOpenedChange={(opened) =>
          setDialogsState((prev) => ({
            ...prev,
            EDUCATION: { ...prev["EDUCATION"], opened },
          }))
        }
        next={next}
        previous={previous}
      />
      <MoreInfoDialog
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            JOB_TITLE_RATE: { ...prev["JOB_TITLE_RATE"], finished },
          }))
        }
        opened={dialogsState["JOB_TITLE_RATE"].opened}
        onOpenedChange={(opened) =>
          setDialogsState((prev) => ({
            ...prev,
            JOB_TITLE_RATE: { ...prev["JOB_TITLE_RATE"], opened },
          }))
        }
        next={next}
        previous={previous}
      />
      <Congratulations
        opened={dialogsState["CONGRATULATIONS"].opened}
        onOpenedChange={(opened) =>
          setDialogsState((prev) => ({
            ...prev,
            CONGRATULATIONS: { ...prev["CONGRATULATIONS"], opened },
          }))
        }
      />

      <Dialog>
        <DialogTrigger asChild>
          <Button>Open status dialog</Button>
        </DialogTrigger>
        <DialogContent
          dialogOverlay={<DialogOverlay className="backdrop-blur-lg" />}
          variant="unanimated"
          className="shadow-[0px_20px_24px_-4px_rgba(16,24,40,.08)] max-w-[451px] bottom-5 right-5 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-5 data-[state=open]:slide-in-from-bottom-5"
        >
          <div className="border border-gray-200 overflow-hidden rounded-[10px]">
            <div className="p-6 bg-white border-gray-200 flex items-center gap-x-[18px] border-b">
              <div className="flex-auto space-y-2">
                <p className="text-sm leading-none text-dark-blue-400">
                  Boost your hiring potential, Chris!
                </p>
                <h2 className="text-lg font-semibold leading-none text-dark-blue-400">
                  Complete your profile to get hired by top clients.
                </h2>
              </div>
              <Badge visual="primary" size="lg">
                {(Object.keys(content) as (keyof typeof content)[]).reduce(
                  (previous, current) =>
                    dialogsState[current].finished ? previous - 1 : previous,
                  4
                )}{" "}
                steps left
              </Badge>
            </div>
            <div className="p-6 space-y-2.5 bg-gray-50">
              {(Object.keys(content) as (keyof typeof content)[]).map(
                (dialogName) => (
                  <Fragment key={dialogName}>
                    {dialogsState[dialogName].finished ? (
                      <article className="py-3 px-4 border bg-white flex items-center gap-x-3 rounded-lg border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                        <div className="size-10 shrink-0 border-2 border-success-500 rounded-full inline-flex items-center justify-center text-success-500">
                          {content[dialogName].icon}
                        </div>
                        <div className="flex items-center gap-x-3 flex-auto">
                          <div className="flex-auto">
                            <h1 className="text-base leading-6 font-semibold text-dark-blue-400">
                              {content[dialogName].title}
                            </h1>

                            <p className="text-xs leading-none text-gray-500">
                              {content[dialogName].desc}
                            </p>
                          </div>
                          <div className="size-[30px] rounded-full bg-success-500 text-white shrink-0 inline-flex items-center justify-center">
                            <Check className="size-[19px]" />
                          </div>
                        </div>
                      </article>
                    ) : (
                      <article className="py-3 px-4 border bg-white flex items-center gap-x-3 rounded-lg border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                        <div className="size-10 shrink-0 border-2 border-gray-300 rounded-full inline-flex items-center justify-center text-dark-blue-400">
                          {content[dialogName].icon}
                        </div>
                        <div className="flex items-center gap-x-3 flex-auto">
                          <div className="flex-auto">
                            <h1 className="text-base leading-6 font-semibold text-dark-blue-400">
                              {content[dialogName].title}
                            </h1>

                            <p className="text-xs leading-none text-gray-500">
                              {content[dialogName].desc}
                            </p>
                          </div>
                          <Button
                            type="button"
                            className="h-8 text-xs leading-5 text-primary-500 border-primary-500 rounded-full"
                            variant="outlined"
                            visual="gray"
                            onClick={() =>
                              setDialogsState((prev) => ({
                                ...prev,
                                [dialogName]: {
                                  ...prev[dialogName],
                                  opened: true,
                                },
                              }))
                            }
                          >
                            Finish This Step
                          </Button>
                        </div>
                      </article>
                    )}
                  </Fragment>
                )
              )}
            </div>
          </div>

          <div className="flex items-center justify-end mt-3">
            <DialogClose className="group text-gray-400 transition duration-300 hover:opacity-50 focus-visible:outline-none size-11 shrink-0 rounded-full bg-white border border-gray-300 hover:border-gray-500 hover:text-gray-950 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] inline-flex items-center justify-center">
              <X className="size-[25px] transition duration-300 group-hover:rotate-180" />
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

const moreInfoFormSchema = z.object({
  jobTitle: z.string().min(1, "Please enter at least 1 character(s)"),
  saveAsDefault: z.boolean(),
  clientRate: z.number({ message: "Please enter an amount" }),
  earning: z.number({ message: "Please enter an amount" }),
  fee: z.number({ message: "Please enter an amount" }),
})

type MoreInfoFormValues = z.infer<typeof moreInfoFormSchema>

const moreInfoFormDefaultValues: Partial<MoreInfoFormValues> = {
  jobTitle: "",
  saveAsDefault: false,
}

export const MoreInfoDialog = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
}) => {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState<"default" | "preview" | "action">(
    "default"
  )
  const [editingIndex, setEditingIndex] = useState<number>()
  const [workExperiences, setWorkExperiences] = useUncontrolledState<
    MoreInfoFormValues[] | undefined
  >({
    onChange: (value) => {
      onFinished?.(Boolean(value?.length))
    },
    defaultValue: undefined,
  })
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    register,
    reset,
    watch,
    setValue,
  } = useForm<MoreInfoFormValues>({
    resolver: zodResolver(moreInfoFormSchema),
    defaultValues: moreInfoFormDefaultValues,
  })
  const onSubmit: SubmitHandler<MoreInfoFormValues> = (values) => {
    if (editingIndex !== undefined) {
      setWorkExperiences(
        workExperiences?.map((workExperience, index) =>
          index === editingIndex ? values : workExperience
        )
      )
      setEditingIndex(undefined)
    } else {
      setWorkExperiences((prev) => (prev ? [...prev, values] : [values]))
    }
    reset()
    setState("preview")
  }

  const submitTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const [clientRate, earning] = watch(["clientRate", "earning"])

    function calculatePercentage({
      percentage,
      value,
    }: {
      value: number
      percentage: number
    }) {
      return (value * percentage) / 100
    }

    earning != null
      ? setValue(
          "fee",
          calculatePercentage({
            value: earning,
            percentage: 20,
          })
        )
      : clientRate != null
        ? setValue(
            "fee",
            calculatePercentage({
              value: clientRate,
              percentage: 20,
            })
          )
        : noop()
  }, [watch, setValue])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]",
          state === "action" && "grid-cols-5"
        )}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={cn(
            "transition-all duration-300",
            state === "action" && "col-span-3"
          )}
        >
          <div className="border-x border-t rounded-t-[10px] pt-[30px] border-gray-200 bg-gray-50">
            <div className="px-[30px]">
              {state !== "action" ? (
                <div className="flex items-start justify-between">
                  <div className="max-w-[157px] flex-auto flex items-center gap-x-3">
                    <span className="text-sm font-medium text-dark-blue-400">
                      40%
                    </span>
                    <div className="max-w-[115px] flex-auto">
                      <Progress value={20} />
                    </div>
                  </div>

                  {state === "preview" && (
                    <Button
                      onClick={() => {
                        setState("action")
                        reset()
                      }}
                      className="bg-white"
                      variant="outlined"
                      visual="gray"
                      type="button"
                    >
                      <Plus className="size-[15px]" />
                      Add Job Title
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="text-dark-blue-400"
                  onClick={() => setIsOpen(true)}
                  size="md"
                  visual="gray"
                  variant="link"
                  type="button"
                >
                  <ArrowLeft className="size-[15px]" />
                  Back
                </Button>
              )}
            </div>

            <div className="px-[30px] mt-6 pb-6">
              <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                Job Title & Rate
              </h1>
              <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                Tell us what you do and set your hourly rates
              </p>
            </div>

            <ScrollArea
              scrollBar={<ScrollBar className="w-4 p-1" />}
              className="h-[400px] px-[26px]"
            >
              <div className="pb-[30px] px-1">
                <div className="mt-6">
                  {state === "default" && (
                    <Button
                      onClick={() => setState("action")}
                      className="bg-white"
                      variant="outlined"
                      visual="gray"
                      type="button"
                    >
                      <Plus className="size-[15px]" />
                      Add Job Title
                    </Button>
                  )}

                  {state === "preview" && (
                    <div className="space-y-3">
                      {workExperiences?.map((workExperience, index) => (
                        <article
                          key={index}
                          className="p-6 rounded-lg flex items-center bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                        >
                          <div className="flex-auto">
                            <h1 className="text-base leading-none font-bold text-dark-blue-400">
                              {workExperience.jobTitle}
                            </h1>

                            <div className="mt-1 flex items-center gap-x-3">
                              <div className="flex items-center flex-none gap-x-2">
                                <span className="text-xs leading-none font-light text-dark-blue-400">
                                  Client rate {workExperience.clientRate}/hr
                                </span>
                                <span className="inline-block size-1 bg-gray-300 rounded-full" />
                                <span className="text-xs leading-none font-light text-dark-blue-400">
                                  Your earnings {workExperience.earning}/hr
                                </span>
                              </div>

                              {workExperience.saveAsDefault && (
                                <Badge visual="primary">Default</Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-x-1">
                            <IconButton
                              visual="gray"
                              variant="ghost"
                              type="button"
                              className="text-gray-400 rounded-full"
                              onClick={() => {
                                reset(workExperience)
                                setEditingIndex(index)
                                setState("action")
                              }}
                            >
                              <Edit03 className="size-[15px]" />
                            </IconButton>
                            <IconButton
                              visual="gray"
                              variant="ghost"
                              type="button"
                              className="text-gray-400 rounded-full hover:text-error-500 hover:bg-error-50"
                            >
                              <Trash03 className="size-[15px]" />
                            </IconButton>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {state === "action" && (
                    <>
                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="job-title-1">
                          Job Title 1
                        </Label>

                        <Input
                          id="job-title-1"
                          placeholder="e.g. Software Engineer"
                          {...register("jobTitle")}
                          isInvalid={hookFormHasError({
                            errors,
                            name: "jobTitle",
                          })}
                        />

                        <HookFormErrorMessage
                          errors={errors}
                          name="jobTitle"
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="mt-3 flex items-center gap-x-3">
                        <Controller
                          control={control}
                          name="saveAsDefault"
                          render={({ field: { onChange, value } }) => (
                            <Checkbox
                              id="save-as-default"
                              checked={value}
                              onCheckedChange={onChange}
                            />
                          )}
                        />
                        <Label
                          className="text-dark-blue-400"
                          htmlFor="save-as-default"
                          size="sm"
                        >
                          Save as default job title
                        </Label>
                      </div>

                      <div className="space-y-6 mt-6">
                        <div className="flex items-center gap-x-5">
                          <div className="flex-auto space-y-[5px]">
                            <h2 className="text-sm leading-none text-dark-blue-400">
                              Client Rate
                            </h2>

                            <p className="text-xs leading-none text-dark-blue-400 font-light">
                              This is what clients will see
                            </p>
                          </div>

                          <div className="max-w-[292px] flex-auto">
                            <div className="flex items-center gap-x-2">
                              <Label htmlFor="client-rate" className="sr-only">
                                Client Rate
                              </Label>
                              <InputGroup>
                                <InputLeftAddon className="inline-flex items-center gap-x-1">
                                  USD
                                  <Info className="size-4" />
                                </InputLeftAddon>

                                <Controller
                                  control={control}
                                  name="clientRate"
                                  render={({ field: { value, onChange } }) => (
                                    <CurrencyInput
                                      id="client-rate"
                                      className={cn(
                                        inputVariants({
                                          className: "text-right",
                                          variant: hookFormHasError({
                                            errors,
                                            name: "clientRate",
                                          })
                                            ? "error"
                                            : undefined,
                                        })
                                      )}
                                      value={value ?? undefined}
                                      intlConfig={{
                                        locale: "en-US",
                                        currency: "USD",
                                      }}
                                      onValueChange={(value, name, values) =>
                                        onChange(values?.float)
                                      }
                                      placeholder="$78"
                                      decimalsLimit={0}
                                    />
                                  )}
                                />
                              </InputGroup>

                              <span className="inline-block text-base text-gray-500">
                                /hr
                              </span>
                            </div>

                            <HookFormErrorMessage
                              errors={errors}
                              name="clientRate"
                              render={({ message }) => (
                                <ErrorMessage className="mt-1.5" size="sm">
                                  {message}
                                </ErrorMessage>
                              )}
                            />
                          </div>
                        </div>

                        <Alert>
                          <AlertIcon>
                            <AlertCircle className="h-5 w-5" />
                          </AlertIcon>
                          <AlertContent className="flex items-start gap-x-5">
                            <div className="flex-auto">
                              <AlertTitle className="text-gray-600">
                                Marketeq Service Fee (20%)
                              </AlertTitle>
                              <AlertDescription>
                                Lorem ipsum dolor sit amet consectetur
                                adipisicing elit.
                              </AlertDescription>
                            </div>

                            <div>
                              <div className="inline-flex items-center gap-x-2">
                                <Label htmlFor="fee" className="sr-only">
                                  Fee
                                </Label>
                                <Controller
                                  control={control}
                                  name="fee"
                                  render={({ field: { value, onChange } }) => (
                                    <CurrencyInput
                                      id="fee"
                                      className={cn(
                                        inputVariants({
                                          className:
                                            "text-right [field-sizing:content] pointer-events-none opacity-50",
                                        })
                                      )}
                                      value={value ?? undefined}
                                      intlConfig={{
                                        locale: "en-US",
                                        currency: "USD",
                                      }}
                                      onValueChange={(value, name, values) =>
                                        onChange(values?.float)
                                      }
                                      placeholder="$13"
                                      decimalsLimit={0}
                                    />
                                  )}
                                />

                                <span className="inline-block text-base text-gray-500">
                                  /hr
                                </span>
                              </div>
                            </div>
                          </AlertContent>
                        </Alert>

                        <div className="flex items-center gap-x-5">
                          <div className="flex-auto space-y-[5px]">
                            <h2 className="text-sm leading-none text-dark-blue-400">
                              Your Earnings
                            </h2>

                            <p className="text-xs leading-none text-dark-blue-400 font-light">
                              Estimated take-home pay after fees
                            </p>
                          </div>

                          <div className="max-w-[292px] flex-auto">
                            <div className="flex items-center gap-x-2">
                              <Label htmlFor="your-earning" className="sr-only">
                                Your Earning
                              </Label>
                              <InputGroup>
                                <InputLeftAddon className="inline-flex items-center gap-x-1">
                                  USD
                                  <Info className="size-4" />
                                </InputLeftAddon>

                                <Controller
                                  control={control}
                                  name="earning"
                                  render={({ field: { value, onChange } }) => (
                                    <CurrencyInput
                                      id="your-earning"
                                      className={cn(
                                        inputVariants({
                                          className: "text-right",
                                          variant: hookFormHasError({
                                            errors,
                                            name: "earning",
                                          })
                                            ? "error"
                                            : undefined,
                                        })
                                      )}
                                      value={value ?? undefined}
                                      intlConfig={{
                                        locale: "en-US",
                                        currency: "USD",
                                      }}
                                      onValueChange={(value, name, values) =>
                                        onChange(values?.float)
                                      }
                                      placeholder="$65"
                                      decimalsLimit={0}
                                    />
                                  )}
                                />
                              </InputGroup>

                              <span className="inline-block text-base text-gray-500">
                                /hr
                              </span>
                            </div>
                            <HookFormErrorMessage
                              errors={errors}
                              name="earning"
                              render={({ message }) => (
                                <ErrorMessage className="mt-1.5" size="sm">
                                  {message}
                                </ErrorMessage>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="border rounded-b-[10px] flex items-center justify-between border-gray-200 bg-white py-4 px-6">
            {state !== "action" ? (
              <>
                <Button
                  className="bg-white"
                  size="md"
                  variant="outlined"
                  visual="gray"
                  type="button"
                  onClick={previous}
                >
                  Back
                </Button>
                <div className="flex items-center gap-x-3">
                  <Button
                    onClick={next}
                    size="md"
                    variant="ghost"
                    visual="gray"
                    type="button"
                  >
                    Skip
                  </Button>
                  <Button
                    size="md"
                    type="button"
                    disabled={!Boolean(workExperiences?.length)}
                    onClick={next}
                  >
                    Save & Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsOpen(true)}
                  variant="link"
                  visual="gray"
                  type="button"
                >
                  <X className="size-[15px]" /> Cancel
                </Button>
                <Button ref={submitTriggerRef}>Save</Button>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogContent className="max-w-[409px] p-0">
                    <div className="p-6">
                      <DialogTitle className="text-dark-blue-400">
                        Save Job Title & Rate?
                      </DialogTitle>
                      <DialogDescription className="text-dark-blue-400 mt-2">
                        Do you want to save your information?
                      </DialogDescription>
                    </div>

                    <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                      <DialogClose
                        onClick={() => {
                          Boolean(workExperiences?.length)
                            ? setState("preview")
                            : setState("default")
                          reset()
                        }}
                        asChild
                      >
                        <Button variant="link" visual="gray">
                          <X className="size-[15px]" /> Discard Changes
                        </Button>
                      </DialogClose>

                      <DialogClose
                        onClick={() => {
                          isValid
                            ? submitTriggerRef.current?.click()
                            : setIsOpen(false)
                        }}
                        asChild
                      >
                        <Button variant="outlined" visual="gray">
                          Yes, Save
                        </Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </form>
        <div
          className={cn(
            "p-[50px] relative transition-all duration-300",
            state === "action" &&
              "col-span-2 [--title-font-size:22px] [--body-font-size:14px]"
          )}
        >
          <DialogClose asChild>
            <IconButton
              className="absolute text-gray-500 right-0 top-0"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <h1 className="text-[length:var(--title-font-size,28px)] leading-none font-bold text-dark-blue-400">
            Your Journey, Your Impact!
          </h1>
          <p className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 mt-2.5">
            Your work experience is more than just a timeline. It&apos;s the
            proof of your expertise and the value you bring to the table.
          </p>

          <div className="mt-[49px]">
            <ul className="mt-4 space-y-[15px]">
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 leading-none">
                  Highlighting your strengths means the right clients can find
                  you faster.
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 leading-none">
                  What makes you passionate about what you do?
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 leading-none">
                  What’s that one thing that’ll make someone remember you?
                </span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const aboutMeFormSchema = z.object({
  aboutMe: z.string().min(1, "Please enter at least 1 character(s)"),
})

type AboutMeFormValues = z.infer<typeof aboutMeFormSchema>

export const AboutMeDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
}) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
  } = useForm<AboutMeFormValues>({
    resolver: zodResolver(aboutMeFormSchema),
    defaultValues: {
      aboutMe: "",
    },
  })
  const onSubmit: SubmitHandler<AboutMeFormValues> = () => {
    next?.()
  }

  const aboutMe = useWatch({ control, name: "aboutMe" })

  useEffect(() => {
    onFinished(Boolean(aboutMe.length))
  }, [aboutMe, onFinished])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-x border-t p-[30px] rounded-t-[10px] border-gray-200 bg-gray-50">
            <div className="flex items-center gap-x-3">
              <span className="text-sm font-medium text-dark-blue-400">
                40%
              </span>
              <div className="max-w-[115px] flex-auto">
                <Progress value={20} />
              </div>
            </div>

            <div className="mt-6">
              <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                About Me
              </h1>
              <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                Create a connection and let clients feel like they already know
                you!
              </p>
            </div>

            <div className="mt-6 space-y-1.5">
              <Textarea
                className="h-[345px]"
                placeholder="Enter your bio here..."
                {...register("aboutMe")}
                isInvalid={hookFormHasError({ errors, name: "aboutMe" })}
              />
              <HookFormErrorMessage
                name="aboutMe"
                errors={errors}
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>
          </div>
          <div className="border rounded-b-[10px] flex items-center gap-x-3 justify-end border-gray-200 bg-white py-4 px-6">
            <Button
              type="button"
              size="md"
              variant="ghost"
              visual="gray"
              onClick={next}
            >
              Skip
            </Button>
            <Button size="md" disabled={!isValid}>
              Save & Continue
            </Button>
          </div>
        </form>
        <div className="p-[50px] relative">
          <DialogClose asChild>
            <IconButton
              className="absolute text-gray-500 right-0 top-0"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
            This is your moment to shine!
          </h1>
          <p className="text-base text-dark-blue-400 mt-2.5">
            A killer “About Me” attracts top-tier clients and builds trust in
            just a few words.
          </p>

          <div className="mt-[49px]">
            <h1 className="text-lg leading-none font-bold text-dark-blue-400">
              Tips to get you started
            </h1>
            <ul className="mt-4 space-y-[15px]">
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-base text-dark-blue-400 leading-none">
                  What’s your biggest professional flex?
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-base text-dark-blue-400 leading-none">
                  What makes you passionate about what you do?
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-base text-dark-blue-400 leading-none">
                  What’s that one thing that’ll make someone remember you?
                </span>
              </li>
            </ul>
            <h1 className="text-lg mt-10 leading-none font-bold text-dark-blue-400">
              Checklist for a winning Bio
            </h1>
            <ul className="mt-4 space-y-[15px]">
              <li className="flex items-center gap-x-5">
                <ThinkCheck className="shrink-0 text-success-500" />
                <span className="text-base text-dark-blue-400">
                  Highlight your strengths AND your personality.
                </span>
              </li>
              <li className="flex items-center gap-x-5">
                <ThinkCheck className="shrink-0 text-success-500" />
                <span className="text-base text-dark-blue-400">
                  Avoid clichés and just be YOU.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const skillsFormSchema = z.object({
  skills: z
    .array(z.object({ id: z.number(), name: z.string() }))
    .min(1, "Please select at least 1 skill(s)")
    .max(50, "You have reached the maximum limit of 50 skills"),
})

type SkillsFormValues = z.infer<typeof skillsFormSchema>

export const SkillsDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
  previous,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
}) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [users] = React.useState([
    { id: 1, name: "Wade Cooper" },
    { id: 2, name: "Arlene Mccoy" },
    { id: 3, name: "Devon Webb" },
    { id: 4, name: "Tom Cook" },
    { id: 5, name: "Tanya Fox" },
    { id: 6, name: "Hellen Schmidt" },
    { id: 7, name: "Chris Torres" },
    { id: 8, name: "Max" },
    { id: 9, name: "David" },
    { id: 10, name: "Logan" },
    { id: 11, name: "Andrew" },
  ])

  const [query, setQuery] = React.useState("")

  const filteredPeople =
    query === ""
      ? users
      : users.filter((user) =>
          user.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    trigger,
    setValue,
  } = useForm<SkillsFormValues>({
    resolver: zodResolver(skillsFormSchema),
  })
  const onSubmit: SubmitHandler<SkillsFormValues> = () => {
    next?.()
  }

  const skills = useWatch({ control, name: "skills" })

  useEffect(() => {
    onFinished(Boolean(skills?.length))
  }, [skills, onFinished])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-x min-h-[567px] border-t rounded-t-[10px] p-[30px] border-gray-200 bg-gray-50">
            <div className="flex items-center gap-x-3">
              <span className="text-sm font-medium text-dark-blue-400">
                40%
              </span>
              <div className="max-w-[115px] flex-auto">
                <Progress value={20} />
              </div>
            </div>

            <div className="mt-6">
              <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                Skills
              </h1>
              <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                Share your expertise and make your profile unforgettable!
              </p>
            </div>

            <div className="mt-6">
              <Controller
                name="skills"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Combobox
                    className="w-full"
                    value={value}
                    onChange={onChange}
                    multiple
                  >
                    <ComboboxTrigger>
                      <ComboboxInput
                        size="lg"
                        displayValue={(user: { id: number; name: string }) =>
                          user.name
                        }
                        placeholder="Search for skills"
                        onChange={(event) => setQuery(event.target.value)}
                        invalid={hookFormHasError({ errors, name: "skills" })}
                      />
                      <ComboboxButton size="lg">
                        <SearchMd className="h-5 w-5" />
                      </ComboboxButton>
                    </ComboboxTrigger>
                    <ScaleOutIn afterLeave={() => setQuery("")}>
                      <ComboboxOptions>
                        <ScrollArea viewportClassName="max-h-[304px]">
                          {filteredPeople.map((user) => (
                            <ComboboxOption key={user.id} value={user}>
                              {user.name}
                            </ComboboxOption>
                          ))}
                        </ScrollArea>
                      </ComboboxOptions>
                    </ScaleOutIn>
                  </Combobox>
                )}
              />

              <HookFormErrorMessage
                name="skills"
                errors={errors}
                render={({ message }) => (
                  <ErrorMessage className="mt-1.5" size="sm">
                    {message}
                  </ErrorMessage>
                )}
              />

              <div className="mt-3 flex gap-3 flex-wrap">
                {skills?.map((skill) => (
                  <Badge key={skill.id} visual="primary">
                    {skill.name}
                    <button
                      className="focus-visible:outline-none"
                      onClick={() => {
                        setValue(
                          "skills",
                          skills.filter((s) => s.id !== skill.id)
                        )
                        trigger()
                      }}
                    >
                      <X2 className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="border rounded-b-[10px] flex items-center justify-between border-gray-200 bg-white py-4 px-6">
            <Button
              className="bg-white"
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              onClick={previous}
            >
              Back
            </Button>
            <div className="flex items-center gap-x-3">
              <Button
                type="button"
                size="md"
                variant="ghost"
                visual="gray"
                onClick={next}
              >
                Skip
              </Button>
              <Button size="md" disabled={!isValid}>
                Save & Continue
              </Button>
            </div>
          </div>
        </form>
        <div className="p-[50px] relative">
          <DialogClose asChild>
            <IconButton
              className="absolute text-gray-500 right-0 top-0"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
            Showcase Your Superpowers!
          </h1>
          <p className="text-base text-dark-blue-400 mt-2.5">
            Whether it&apos;s your technical know-how or unique expertise, this
            is your moment to shine.
          </p>

          <div className="mt-[49px]">
            <ul className="mt-4 space-y-[15px]">
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-base text-dark-blue-400 leading-none">
                  Highlighting your strengths means the right clients can find
                  you faster.
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-base text-dark-blue-400 leading-none">
                  What makes you passionate about what you do?
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-base text-dark-blue-400 leading-none">
                  What’s that one thing that’ll make someone remember you?
                </span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const workExperienceFormSchema = z
  .object({
    employer: z.string().min(1, "Please enter at least 1 character(s)"),
    jobTitle: z.string().min(1, "Please enter at least 1 character(s)"),
    startDate: z.object({
      month: z
        .number()
        .min(1)
        .max(12)
        .refine((value) => Boolean(value), {
          message: "Please select a month",
        }),
      year: z
        .number()
        .gte(new Date().getFullYear() - 100)
        .lte(new Date().getFullYear())
        .refine((value) => Boolean(value), {
          message: "Please select a year",
        }),
    }),
    endDate: z.object({
      month: z.number().min(1).max(12).optional(),
      year: z
        .number()
        .gte(new Date().getFullYear() - 100)
        .lte(new Date().getFullYear())
        .optional(),
    }),
    currentlyWorkHere: z.boolean(),
    jobDescription: z.string().min(1, "Please enter at least 1 character(s)"),
  })
  .merge(skillsFormSchema)
  .refine(
    (data) =>
      data.currentlyWorkHere
        ? true
        : z
            .object({
              month: z.number().min(1).max(12),
            })
            .safeParse(data.endDate).success,
    {
      message: "Please select a month",
      path: ["endDate.month"],
    }
  )
  .refine(
    (data) =>
      data.currentlyWorkHere
        ? true
        : z
            .object({
              year: z
                .number()
                .gte(new Date().getFullYear() - 100)
                .lte(new Date().getFullYear()),
            })
            .safeParse(data.endDate).success,
    {
      message: "Please select a year",
      path: ["endDate.year"],
    }
  )

type WorkExperienceFormValues = z.infer<typeof workExperienceFormSchema>

const months = [
  { name: "January", value: 1 },
  { name: "February", value: 2 },
  { name: "March", value: 3 },
  { name: "April", value: 4 },
  { name: "May", value: 5 },
  { name: "June", value: 6 },
  { name: "July", value: 7 },
  { name: "August", value: 8 },
  { name: "September", value: 9 },
  { name: "October", value: 10 },
  { name: "November", value: 11 },
  { name: "December", value: 12 },
]

export const WorkExperienceDialog = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
}) => {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [skills] = React.useState([
    { id: 1, name: "Wade Cooper" },
    { id: 2, name: "Arlene Mccoy" },
    { id: 3, name: "Devon Webb" },
    { id: 4, name: "Tom Cook" },
    { id: 5, name: "Tanya Fox" },
    { id: 6, name: "Hellen Schmidt" },
    { id: 7, name: "Chris Torres" },
    { id: 8, name: "Max" },
    { id: 9, name: "David" },
    { id: 10, name: "Logan" },
    { id: 11, name: "Andrew" },
  ])

  const [query, setQuery] = React.useState("")

  const filteredSkills =
    query === ""
      ? skills
      : skills.filter((skill) =>
          skill.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  const [state, setState] = useState<"default" | "preview" | "action">(
    "default"
  )
  const [editingIndex, setEditingIndex] = useState<number>()
  const [workExperiences, setWorkExperiences] = useUncontrolledState<
    WorkExperienceFormValues[] | undefined
  >({
    onChange: (value) => {
      onFinished?.(Boolean(value?.length))
    },
    defaultValue: undefined,
  })
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    trigger,
    setValue,
    register,
    reset,
  } = useForm<WorkExperienceFormValues>({
    resolver: zodResolver(workExperienceFormSchema),
    defaultValues: {
      currentlyWorkHere: false,
      jobDescription: "",
      jobTitle: "",
      employer: "",
    },
  })
  const onSubmit: SubmitHandler<WorkExperienceFormValues> = (values) => {
    if (editingIndex !== undefined) {
      setWorkExperiences(
        workExperiences?.map((workExperience, index) =>
          index === editingIndex ? values : workExperience
        )
      )
      setEditingIndex(undefined)
    } else {
      setWorkExperiences((prev) => (prev ? [...prev, values] : [values]))
    }
    reset()
    setState("preview")
  }

  const skillsField = useWatch({ control, name: "skills" })
  const currentlyWorkHereField = useWatch({
    control,
    name: "currentlyWorkHere",
  })
  const submitTriggerRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]",
          state === "action" && "grid-cols-5"
        )}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={cn(
            "transition-all duration-300",
            state === "action" && "col-span-3"
          )}
        >
          <div className="border-x border-t rounded-t-[10px] pt-[30px] border-gray-200 bg-gray-50">
            <div className="px-[30px]">
              {state !== "action" ? (
                <div className="flex items-start justify-between">
                  <div className="max-w-[157px] flex-auto flex items-center gap-x-3">
                    <span className="text-sm font-medium text-dark-blue-400">
                      40%
                    </span>
                    <div className="max-w-[115px] flex-auto">
                      <Progress value={20} />
                    </div>
                  </div>

                  {state === "preview" && (
                    <Button
                      onClick={() => {
                        setState("action")
                        reset()
                      }}
                      className="bg-white"
                      variant="outlined"
                      visual="gray"
                      type="button"
                    >
                      <Plus className="size-[15px]" />
                      Add Education
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="text-dark-blue-400"
                  onClick={() => setIsOpen(true)}
                  size="md"
                  visual="gray"
                  variant="link"
                  type="button"
                >
                  <ArrowLeft className="size-[15px]" />
                  Back
                </Button>
              )}
            </div>

            <div className="px-[30px] mt-6 pb-6">
              <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                Work Experience
              </h1>
              <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                Tell us where you&apos;ve worked before!
              </p>
            </div>

            <ScrollArea
              scrollBar={<ScrollBar className="w-4 p-1" />}
              className="h-[400px] px-[26px]"
            >
              <div className="pb-[30px] px-1">
                <div className="mt-6">
                  {state === "default" && (
                    <Button
                      onClick={() => setState("action")}
                      className="bg-white"
                      variant="outlined"
                      visual="gray"
                      type="button"
                    >
                      <Plus className="size-[15px]" />
                      Add Work Experience
                    </Button>
                  )}

                  {state === "preview" && (
                    <div className="space-y-3">
                      {workExperiences?.map((workExperience, index) => (
                        <WorkExperienceCard
                          onRemove={() =>
                            setWorkExperiences(
                              (prev) => prev?.filter((_, i) => i !== index)
                            )
                          }
                          onEdit={() => {
                            reset(workExperience)
                            setState("action")
                            setEditingIndex(index)
                          }}
                          {...workExperience}
                          key={index}
                        />
                      ))}
                    </div>
                  )}

                  {state === "action" && (
                    <>
                      <div className="grid gap-4 grid-cols-2">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="employer"
                            className="text-dark-blue-400"
                            size="sm"
                          >
                            Employer
                          </Label>
                          <Input
                            id="employer"
                            placeholder="Acme Inc."
                            {...register("employer")}
                            isInvalid={hookFormHasError({
                              errors,
                              name: "employer",
                            })}
                          />
                          <HookFormErrorMessage
                            name="employer"
                            errors={errors}
                            render={({ message }) => (
                              <ErrorMessage size="sm">{message}</ErrorMessage>
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="job-title"
                            className="text-dark-blue-400"
                            size="sm"
                          >
                            Job Title
                          </Label>
                          <Input
                            id="job-title"
                            placeholder="CEO"
                            {...register("jobTitle")}
                            isInvalid={hookFormHasError({
                              errors,
                              name: "jobTitle",
                            })}
                          />
                          <HookFormErrorMessage
                            name="jobTitle"
                            errors={errors}
                            render={({ message }) => (
                              <ErrorMessage size="sm">{message}</ErrorMessage>
                            )}
                          />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label
                            htmlFor="start-date"
                            className="text-dark-blue-400"
                            size="sm"
                          >
                            Start Date
                          </Label>
                          <div className="grid grid-cols-2 gap-x-4">
                            <div className="space-y-1.5">
                              <Controller
                                control={control}
                                name="startDate.month"
                                render={({ field: { value, onChange } }) => (
                                  <Listbox value={value} onChange={onChange}>
                                    <ListboxButton
                                      placeholder="Month"
                                      displayValue={(value: number) => value}
                                      isInvalid={hookFormHasError({
                                        errors,
                                        name: "startDate.month",
                                      })}
                                    />
                                    <ListboxOptions>
                                      <ScrollArea
                                        viewportClassName="max-h-[304px]"
                                        scrollBar={
                                          <ScrollBar className="w-4 p-1" />
                                        }
                                      >
                                        {months
                                          .map((month) => month.value)
                                          .map((m) => (
                                            <ListboxOption key={m} value={m}>
                                              {m}
                                            </ListboxOption>
                                          ))}
                                      </ScrollArea>
                                    </ListboxOptions>
                                  </Listbox>
                                )}
                              />
                              <HookFormErrorMessage
                                name="startDate.month"
                                errors={errors}
                                render={({ message }) => (
                                  <ErrorMessage size="sm">
                                    {message}
                                  </ErrorMessage>
                                )}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Controller
                                control={control}
                                name="startDate.year"
                                render={({ field: { value, onChange } }) => (
                                  <Listbox value={value} onChange={onChange}>
                                    <ListboxButton
                                      placeholder="Year"
                                      displayValue={(value: number) => value}
                                      isInvalid={hookFormHasError({
                                        errors,
                                        name: "startDate.year",
                                      })}
                                    />
                                    <ListboxOptions>
                                      <ScrollArea
                                        viewportClassName="max-h-[304px]"
                                        scrollBar={
                                          <ScrollBar className="w-4 p-1" />
                                        }
                                      >
                                        {[
                                          2020, 2021, 2022, 2023, 2024, 2025,
                                        ].map((month) => (
                                          <ListboxOption
                                            key={month}
                                            value={month}
                                          >
                                            {month}
                                          </ListboxOption>
                                        ))}
                                      </ScrollArea>
                                    </ListboxOptions>
                                  </Listbox>
                                )}
                              />

                              <HookFormErrorMessage
                                name="startDate.year"
                                errors={errors}
                                render={({ message }) => (
                                  <ErrorMessage size="sm">
                                    {message}
                                  </ErrorMessage>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "space-y-1.5 col-span-2",
                            currentlyWorkHereField &&
                              "pointer-events-none opacity-50"
                          )}
                        >
                          <Label
                            htmlFor="end-date"
                            className="text-dark-blue-400"
                            size="sm"
                          >
                            End Date
                          </Label>
                          <div className="grid grid-cols-2 gap-x-4">
                            <div className="space-y-1.5">
                              <Controller
                                control={control}
                                name="endDate.month"
                                render={({ field: { value, onChange } }) => (
                                  <Listbox value={value} onChange={onChange}>
                                    <ListboxButton
                                      placeholder="Month"
                                      displayValue={(value: number) => value}
                                      isInvalid={hookFormHasError({
                                        errors,
                                        name: "endDate.year",
                                      })}
                                    />
                                    <ListboxOptions>
                                      <ScrollArea
                                        viewportClassName="max-h-[304px]"
                                        scrollBar={
                                          <ScrollBar className="w-4 p-1" />
                                        }
                                      >
                                        {months
                                          .map((month) => month.value)
                                          .map((m) => (
                                            <ListboxOption key={m} value={m}>
                                              {m}
                                            </ListboxOption>
                                          ))}
                                      </ScrollArea>
                                    </ListboxOptions>
                                  </Listbox>
                                )}
                              />
                              <HookFormErrorMessage
                                name="endDate.month"
                                errors={errors}
                                render={({ message }) => (
                                  <ErrorMessage size="sm">
                                    {message}
                                  </ErrorMessage>
                                )}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Controller
                                control={control}
                                name="endDate.year"
                                render={({ field: { value, onChange } }) => (
                                  <Listbox value={value} onChange={onChange}>
                                    <ListboxButton
                                      placeholder="Year"
                                      displayValue={(value: number) => value}
                                      isInvalid={hookFormHasError({
                                        errors,
                                        name: "endDate.year",
                                      })}
                                    />
                                    <ListboxOptions>
                                      <ScrollArea
                                        viewportClassName="max-h-[304px]"
                                        scrollBar={
                                          <ScrollBar className="w-4 p-1" />
                                        }
                                      >
                                        {[
                                          2020, 2021, 2022, 2023, 2024, 2025,
                                        ].map((month) => (
                                          <ListboxOption
                                            key={month}
                                            value={month}
                                          >
                                            {month}
                                          </ListboxOption>
                                        ))}
                                      </ScrollArea>
                                    </ListboxOptions>
                                  </Listbox>
                                )}
                              />
                              <HookFormErrorMessage
                                name="endDate.year"
                                errors={errors}
                                render={({ message }) => (
                                  <ErrorMessage size="sm">
                                    {message}
                                  </ErrorMessage>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center gap-x-3">
                          <Controller
                            control={control}
                            name="currentlyWorkHere"
                            render={({
                              field: { value, onChange, ...field },
                            }) => (
                              <Checkbox
                                id="work-here"
                                checked={value}
                                onCheckedChange={onChange}
                                {...field}
                              />
                            )}
                          />
                          <Label
                            htmlFor="work-here"
                            className="text-dark-blue-400"
                            size="sm"
                          >
                            I currently work here
                          </Label>
                        </div>
                      </div>

                      <div className="mt-[30px]">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="job-description"
                            className="text-dark-blue-400"
                            size="sm"
                          >
                            Job Description
                          </Label>
                          <Textarea
                            id="job-description"
                            placeholder="Tell us a little about the company you worked with..."
                            {...register("jobDescription")}
                            isInvalid={hookFormHasError({
                              errors,
                              name: "jobDescription",
                            })}
                          />
                          <HookFormErrorMessage
                            name="jobDescription"
                            errors={errors}
                            render={({ message }) => (
                              <ErrorMessage size="sm">{message}</ErrorMessage>
                            )}
                          />
                        </div>
                      </div>

                      <Controller
                        name="skills"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <Combobox
                            className="w-full mt-[30px]"
                            value={value}
                            onChange={onChange}
                            multiple
                          >
                            <ComboboxTrigger>
                              <ComboboxInput
                                size="lg"
                                displayValue={(user: {
                                  id: number
                                  name: string
                                }) => user.name}
                                placeholder="Search for skills"
                                onChange={(event) =>
                                  setQuery(event.target.value)
                                }
                                invalid={hookFormHasError({
                                  errors,
                                  name: "skills",
                                })}
                              />
                              <ComboboxButton size="lg">
                                <SearchMd className="h-5 w-5" />
                              </ComboboxButton>
                            </ComboboxTrigger>
                            <ScaleOutIn afterLeave={() => setQuery("")}>
                              <ComboboxOptions>
                                <ScrollArea viewportClassName="max-h-[304px]">
                                  {filteredSkills.map((skill) => (
                                    <ComboboxOption
                                      key={skill.id}
                                      value={skill}
                                    >
                                      {skill.name}
                                    </ComboboxOption>
                                  ))}
                                </ScrollArea>
                              </ComboboxOptions>
                            </ScaleOutIn>
                          </Combobox>
                        )}
                      />

                      <HookFormErrorMessage
                        name="skills"
                        errors={errors}
                        render={({ message }) => (
                          <ErrorMessage className="mt-1.5" size="sm">
                            {message}
                          </ErrorMessage>
                        )}
                      />

                      <div className="mt-3 flex gap-3 flex-wrap">
                        {skillsField?.map((skill) => (
                          <Badge key={skill.id} visual="primary">
                            {skill.name}
                            <button
                              className="focus-visible:outline-none"
                              onClick={() => {
                                setValue(
                                  "skills",
                                  skillsField.filter((s) => s.id !== skill.id)
                                )
                                trigger("skills")
                              }}
                            >
                              <X2 className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="border rounded-b-[10px] flex items-center justify-between border-gray-200 bg-white py-4 px-6">
            {state !== "action" ? (
              <>
                <Button
                  className="bg-white"
                  size="md"
                  variant="outlined"
                  visual="gray"
                  type="button"
                  onClick={previous}
                >
                  Back
                </Button>
                <div className="flex items-center gap-x-3">
                  <Button
                    onClick={next}
                    size="md"
                    variant="ghost"
                    visual="gray"
                    type="button"
                  >
                    Skip
                  </Button>
                  <Button
                    size="md"
                    type="button"
                    disabled={!Boolean(workExperiences?.length)}
                    onClick={next}
                  >
                    Save & Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsOpen(true)}
                  variant="link"
                  visual="gray"
                  type="button"
                >
                  <X className="size-[15px]" /> Cancel
                </Button>
                <Button ref={submitTriggerRef}>Save </Button>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogContent className="max-w-[409px] p-0">
                    <div className="p-6">
                      <DialogTitle className="text-dark-blue-400">
                        Save Work Experience?
                      </DialogTitle>
                      <DialogDescription className="text-dark-blue-400 mt-2">
                        Do you want to save your information?
                      </DialogDescription>
                    </div>

                    <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                      <DialogClose
                        onClick={() => {
                          Boolean(workExperiences?.length)
                            ? setState("preview")
                            : setState("default")
                          reset()
                        }}
                        asChild
                      >
                        <Button variant="link" visual="gray">
                          <X className="size-[15px]" /> Discard Changes
                        </Button>
                      </DialogClose>

                      <DialogClose
                        onClick={() => {
                          isValid
                            ? submitTriggerRef.current?.click()
                            : setIsOpen(false)
                        }}
                        asChild
                      >
                        <Button variant="outlined" visual="gray">
                          Yes, Save
                        </Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </form>
        <div
          className={cn(
            "p-[50px] relative transition-all duration-300",
            state === "action" &&
              "col-span-2 [--title-font-size:22px] [--body-font-size:14px]"
          )}
        >
          <DialogClose asChild>
            <IconButton
              className="absolute text-gray-500 right-0 top-0"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <h1 className="text-[length:var(--title-font-size,28px)] leading-none font-bold text-dark-blue-400">
            Your Journey, Your Impact!
          </h1>
          <p className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 mt-2.5">
            Your work experience is more than just a timeline. It&apos;s the
            proof of your expertise and the value you bring to the table.
          </p>

          <div className="mt-[49px]">
            <ul className="mt-4 space-y-[15px]">
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 leading-none">
                  Highlighting your strengths means the right clients can find
                  you faster.
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 leading-none">
                  What makes you passionate about what you do?
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 leading-none">
                  What’s that one thing that’ll make someone remember you?
                </span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const educationFormSchema = z
  .object({
    schoolOrUniversity: z
      .string()
      .min(1, "Please enter at least 1 character(s)"),
    degree: z.string().min(1, "Please enter at least 1 character(s)"),
    major: z.string().min(1, "Please enter at least 1 character(s)"),
    startDate: z.object({
      month: z
        .number()
        .min(1)
        .max(12)
        .refine((value) => Boolean(value), {
          message: "Please select a month",
        }),
      year: z
        .number()
        .gte(new Date().getFullYear() - 100)
        .lte(new Date().getFullYear())
        .refine((value) => Boolean(value), {
          message: "Please select a year",
        }),
    }),
    endDate: z.object({
      month: z.number().min(1).max(12).optional(),
      year: z
        .number()
        .gte(new Date().getFullYear() - 100)
        .lte(new Date().getFullYear())
        .optional(),
    }),
    currentlyAttending: z.boolean(),
  })
  .refine(
    (data) =>
      data.currentlyAttending
        ? true
        : z
            .object({
              month: z.number().min(1).max(12),
            })
            .safeParse(data.endDate).success,
    {
      message: "Please select a month",
      path: ["endDate.month"],
    }
  )
  .refine(
    (data) =>
      data.currentlyAttending
        ? true
        : z
            .object({
              year: z
                .number()
                .gte(new Date().getFullYear() - 100)
                .lte(new Date().getFullYear()),
            })
            .safeParse(data.endDate).success,
    {
      message: "Please select a year",
      path: ["endDate.year"],
    }
  )

type EducationFormValues = z.infer<typeof educationFormSchema>

export const EducationDialog = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
}) => {
  const submitTriggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    register,
    reset,
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: {
      currentlyAttending: false,
      degree: "",
      major: "",
      schoolOrUniversity: "",
    },
  })
  const [state, setState] = useState<"default" | "preview" | "action">(
    "default"
  )
  const [editingIndex, setEditingIndex] = useState<number>()
  const [educationQualifications, setEducationQualifications] =
    useUncontrolledState<EducationFormValues[] | undefined>({
      defaultValue: undefined,
      onChange: (value) => onFinished?.(Boolean(value?.length)),
    })

  const onSubmit: SubmitHandler<EducationFormValues> = (values) => {
    if (editingIndex !== undefined) {
      setEducationQualifications(
        educationQualifications?.map((qualification, index) =>
          index === editingIndex ? values : qualification
        )
      )
      setEditingIndex(undefined)
    } else {
      setEducationQualifications((prev) =>
        prev ? [...prev, values] : [values]
      )
    }
    reset()
    setState("preview")
  }

  const currentlyAttending = useWatch({ control, name: "currentlyAttending" })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]",
          state === "action" && "grid-cols-5"
        )}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={cn(
            "transition-all duration-300",
            state === "action" && "col-span-3"
          )}
        >
          <ScrollArea
            scrollBar={<ScrollBar className="w-4 p-1" />}
            className="h-[571px]"
          >
            <div className="border-x min-h-full border-t rounded-t-[10px] p-[30px] border-gray-200 bg-gray-50">
              {state !== "action" ? (
                <div className="flex items-start justify-between">
                  <div className="max-w-[157px] flex-auto flex items-center gap-x-3">
                    <span className="text-sm font-medium text-dark-blue-400">
                      40%
                    </span>
                    <div className="max-w-[115px] flex-auto">
                      <Progress value={20} />
                    </div>
                  </div>

                  {state === "preview" && (
                    <Button
                      onClick={() => {
                        setState("action")
                        reset()
                      }}
                      className="bg-white"
                      variant="outlined"
                      visual="gray"
                      type="button"
                    >
                      <Plus className="size-[15px]" />
                      Add Education
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="text-dark-blue-400"
                  onClick={() => setIsOpen(true)}
                  size="md"
                  visual="gray"
                  variant="link"
                  type="button"
                >
                  <ArrowLeft className="size-[15px]" />
                  Back
                </Button>
              )}

              <div className="mt-6">
                <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                  Education
                </h1>
                <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                  Show your qualifications to give clients confidence.
                </p>
              </div>

              <div className="mt-6">
                {state === "default" && (
                  <Button
                    onClick={() => setState("action")}
                    className="bg-white"
                    variant="outlined"
                    visual="gray"
                    type="button"
                  >
                    <Plus className="size-[15px]" />
                    Add Education
                  </Button>
                )}

                {state === "preview" && (
                  <div className="space-y-3">
                    {educationQualifications?.map((qualification, index) => (
                      <EducationCard
                        onRemove={() =>
                          setEducationQualifications(
                            (prev) => prev?.filter((_, i) => i !== index)
                          )
                        }
                        onEdit={() => {
                          reset(qualification)
                          setState("action")
                          setEditingIndex(index)
                        }}
                        {...qualification}
                        key={index}
                      />
                    ))}
                  </div>
                )}

                {state === "action" && (
                  <>
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-1.5 col-span-2">
                        <Label
                          htmlFor="school-or-university"
                          className="text-dark-blue-400"
                          size="sm"
                        >
                          School or University
                        </Label>
                        <Input
                          id="school-or-university"
                          placeholder="Harvard University"
                          {...register("schoolOrUniversity")}
                          isInvalid={hookFormHasError({
                            errors,
                            name: "schoolOrUniversity",
                          })}
                        />
                        <HookFormErrorMessage
                          name="schoolOrUniversity"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="degree"
                          className="text-dark-blue-400"
                          size="sm"
                        >
                          Degree
                        </Label>

                        <Controller
                          control={control}
                          name="degree"
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value} onChange={onChange}>
                              <ListboxButton
                                placeholder="Select Degree"
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "degree",
                                })}
                              />
                              <ListboxOptions>
                                {[
                                  "Option 1",
                                  "Option 2",
                                  "Option 3",
                                  "Option 4",
                                  "Option 5",
                                ].map((month) => (
                                  <ListboxOption key={month} value={month}>
                                    {month}
                                  </ListboxOption>
                                ))}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                        <HookFormErrorMessage
                          name="schoolOrUniversity"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="major"
                          className="text-dark-blue-400"
                          size="sm"
                        >
                          Major
                        </Label>
                        <Input
                          id="major"
                          placeholder="Engineering"
                          {...register("major")}
                          isInvalid={hookFormHasError({
                            errors,
                            name: "major",
                          })}
                        />
                        <HookFormErrorMessage
                          name="major"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label
                          htmlFor="start-date"
                          className="text-dark-blue-400"
                          size="sm"
                        >
                          Start Date
                        </Label>
                        <div className="grid grid-cols-2 gap-x-4">
                          <div className="space-y-1.5">
                            <Controller
                              name="startDate.month"
                              control={control}
                              render={({ field: { value, onChange } }) => (
                                <Listbox value={value} onChange={onChange}>
                                  <ListboxButton
                                    displayValue={(value: number) => `${value}`}
                                    placeholder="Month"
                                    isInvalid={hookFormHasError({
                                      errors,
                                      name: "startDate.month",
                                    })}
                                  />
                                  <ListboxOptions>
                                    {months
                                      .map((month) => month.value)
                                      .map((m) => (
                                        <ListboxOption key={m} value={m}>
                                          {m}
                                        </ListboxOption>
                                      ))}
                                  </ListboxOptions>
                                </Listbox>
                              )}
                            />
                            <HookFormErrorMessage
                              name="startDate.month"
                              errors={errors}
                              render={({ message }) => (
                                <ErrorMessage size="sm">{message}</ErrorMessage>
                              )}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Controller
                              name="startDate.year"
                              control={control}
                              render={({ field: { value, onChange } }) => (
                                <Listbox value={value} onChange={onChange}>
                                  <ListboxButton
                                    displayValue={(value: number) => `${value}`}
                                    placeholder="Year"
                                    isInvalid={hookFormHasError({
                                      errors,
                                      name: "startDate.year",
                                    })}
                                  />
                                  <ListboxOptions>
                                    {[
                                      2020, 2021, 2022, 2023, 2024, 2025, 2026,
                                      2027,
                                    ].map((month) => (
                                      <ListboxOption key={month} value={month}>
                                        {month}
                                      </ListboxOption>
                                    ))}
                                  </ListboxOptions>
                                </Listbox>
                              )}
                            />

                            <HookFormErrorMessage
                              name="startDate.year"
                              errors={errors}
                              render={({ message }) => (
                                <ErrorMessage size="sm">{message}</ErrorMessage>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "space-y-1.5 col-span-2",
                          currentlyAttending && "pointer-events-none opacity-50"
                        )}
                      >
                        <Label
                          htmlFor="end-date"
                          className="text-dark-blue-400"
                          size="sm"
                        >
                          End Date
                        </Label>
                        <div className="grid grid-cols-2 gap-x-4">
                          <div className="space-y-1.5">
                            <Controller
                              name="endDate.month"
                              control={control}
                              render={({ field: { value, onChange } }) => (
                                <Listbox value={value} onChange={onChange}>
                                  <ListboxButton
                                    displayValue={(value: number) => `${value}`}
                                    placeholder="Month"
                                    isInvalid={hookFormHasError({
                                      errors,
                                      name: "endDate.month",
                                    })}
                                  />
                                  <ListboxOptions>
                                    {months
                                      .map((month) => month.value)
                                      .map((m) => (
                                        <ListboxOption key={m} value={m}>
                                          {m}
                                        </ListboxOption>
                                      ))}
                                  </ListboxOptions>
                                </Listbox>
                              )}
                            />
                            <HookFormErrorMessage
                              name="endDate.month"
                              errors={errors}
                              render={({ message }) => (
                                <ErrorMessage size="sm">{message}</ErrorMessage>
                              )}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Controller
                              name="endDate.year"
                              control={control}
                              render={({ field: { value, onChange } }) => (
                                <Listbox value={value} onChange={onChange}>
                                  <ListboxButton
                                    displayValue={(value: number) => `${value}`}
                                    placeholder="Year"
                                    isInvalid={hookFormHasError({
                                      errors,
                                      name: "endDate.year",
                                    })}
                                  />
                                  <ListboxOptions>
                                    {[
                                      2020, 2021, 2022, 2023, 2024, 2025, 2026,
                                      2027,
                                    ].map((month) => (
                                      <ListboxOption key={month} value={month}>
                                        {month}
                                      </ListboxOption>
                                    ))}
                                  </ListboxOptions>
                                </Listbox>
                              )}
                            />
                            <HookFormErrorMessage
                              name="endDate.year"
                              errors={errors}
                              render={({ message }) => (
                                <ErrorMessage size="sm">{message}</ErrorMessage>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center gap-x-3">
                        <Controller
                          name="currentlyAttending"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <Checkbox
                              checked={value}
                              onCheckedChange={onChange}
                              id="currently-attending"
                            />
                          )}
                        />
                        <Label
                          htmlFor="currently-attending"
                          className="text-dark-blue-400"
                          size="sm"
                        >
                          I’m currently attending
                        </Label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="border rounded-b-[10px] flex items-center justify-between border-gray-200 bg-white py-4 px-6">
            {state !== "action" ? (
              <>
                <Button
                  className="bg-white"
                  size="md"
                  variant="outlined"
                  visual="gray"
                  type="button"
                  onClick={previous}
                >
                  Back
                </Button>
                <div className="flex items-center gap-x-3">
                  <Button
                    onClick={next}
                    size="md"
                    variant="ghost"
                    visual="gray"
                    type="button"
                  >
                    Skip
                  </Button>
                  <Button
                    size="md"
                    disabled={!Boolean(educationQualifications?.length)}
                    onClick={next}
                  >
                    Save & Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    Boolean(educationQualifications?.length)
                      ? setState("preview")
                      : setState("default")
                    reset()
                  }}
                  variant="link"
                  visual="gray"
                  type="button"
                >
                  <X className="size-[15px]" /> Cancel
                </Button>

                <Button ref={submitTriggerRef}> Save </Button>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogContent className="max-w-[409px] p-0">
                    <div className="p-6">
                      <DialogTitle className="text-dark-blue-400">
                        Save Education?
                      </DialogTitle>
                      <DialogDescription className="text-dark-blue-400 mt-2">
                        Do you want to save your information?
                      </DialogDescription>
                    </div>

                    <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                      <DialogClose
                        onClick={() => {
                          Boolean(educationQualifications?.length)
                            ? setState("preview")
                            : setState("default")
                          reset()
                        }}
                        asChild
                      >
                        <Button variant="link" visual="gray">
                          <X className="size-[15px]" /> Discard Changes
                        </Button>
                      </DialogClose>

                      <DialogClose
                        onClick={() => {
                          isValid
                            ? submitTriggerRef.current?.click()
                            : setIsOpen(false)
                        }}
                        asChild
                      >
                        <Button variant="outlined" visual="gray">
                          Yes, Save
                        </Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </form>
        <div
          className={cn(
            "p-[50px] relative transition-all duration-300",
            state === "action" &&
              "col-span-2 [--title-font-size:22px] [--body-font-size:14px]"
          )}
        >
          <DialogClose asChild>
            <IconButton
              className="absolute text-gray-500 right-0 top-0"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <h1 className="text-[length:var(--title-font-size,28px)] leading-none font-bold text-dark-blue-400">
            Showcase your studies
          </h1>
          <p className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 mt-2.5">
            Your work experience is more than just a timeline. It&apos;s the
            proof of your expertise and the value you bring to the table.
          </p>

          <div className="mt-[49px]">
            <ul className="mt-4 space-y-[15px]">
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 leading-none">
                  Highlighting your strengths means the right clients can find
                  you faster.
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 leading-none">
                  What makes you passionate about what you do?
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-[length:var(--body-font-size,theme(fontSize.base))] text-dark-blue-400 leading-none">
                  What’s that one thing that’ll make someone remember you?
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-[67px]">
            <p className="text-sm leading-none text-dark-blue-400">
              “I value freelancers who have a complete education section. It
              shows dedication and makes me feel secure in their qualifications.
              It’s not just about skills; it’s about the foundation behind
              them.”
            </p>

            <div className="mt-5">
              <div className="inline-flex items-start gap-x-3">
                <Avatar size="lg">
                  <AvatarImage src="/man.jpg" alt="Man" />
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-dark-blue-400">
                    Christopher Torres
                  </span>
                  <span className="text-base font-light text-dark-blue-400">
                    Head of Digital Marketing
                  </span>
                  <span className="text-sm font-light text-dark-blue-400">
                    - Sprout Social
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const Portfolio = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
}) => {
  const [open, setOpen] = useControllableState({
    value: opened,
    onChange: onOpenedChange,
    defaultValue: false,
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]">
        <form>
          <div className="border-x min-h-[567px] border-t rounded-t-[10px] p-[30px] border-gray-200 bg-gray-50">
            <div className="flex items-center gap-x-3">
              <span className="text-sm font-medium text-dark-blue-400">
                40%
              </span>
              <div className="max-w-[115px] flex-auto">
                <Progress value={20} />
              </div>
            </div>

            <div className="mt-6">
              <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                Portfolio
              </h1>
              <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                Show the quality and style that clients are looking for.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <article className="h-[150px] bg-white gap-y-3 flex items-center flex-col border border-gray-300 p-6 rounded-[5px]">
                <div className="size-[52px] rounded-full text-white shrink-0 border-[12px] border-gray-200 bg-gray-400 inline-flex items-center justify-center">
                  <Plus className="size-[21px]" />
                </div>

                <h3 className="text-center text-sm font-semibold text-gray-400">
                  Add a project
                </h3>
              </article>
            </div>
          </div>
          <div className="border rounded-b-[10px] flex items-center justify-between border-gray-200 bg-white py-4 px-6">
            <Button
              className="bg-white"
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              onClick={previous}
            >
              Back
            </Button>
            <div className="flex items-center gap-x-3">
              <Button
                type="button"
                size="md"
                variant="ghost"
                visual="gray"
                onClick={next}
              >
                Skip
              </Button>
              <Button size="md">Save & Continue</Button>
            </div>
          </div>
        </form>
        <div className="p-[50px] relative">
          <DialogClose asChild>
            <IconButton
              className="absolute text-gray-500 right-0 top-0"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
            Show Off Your Best Work!
          </h1>
          <p className="text-base text-dark-blue-400 mt-2.5">
            Your portfolio isn’t just a section, it’s the proof that you’re the
            real deal. It’s where talent meets results and leaves clients
            saying, ‘I need this!
          </p>

          <div className="mt-[49px]">
            <ul className="mt-4 space-y-[15px]">
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-base text-dark-blue-400 leading-none">
                  Highlighting your strengths means the right clients can find
                  you faster.
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-base text-dark-blue-400 leading-none">
                  What makes you passionate about what you do?
                </span>
              </li>
              <li className="flex items-start gap-x-5">
                <Bulb className="shrink-0 text-warning-300" />
                <span className="text-base text-dark-blue-400 leading-none">
                  What’s that one thing that’ll make someone remember you?
                </span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const Shield = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={116}
    height={139}
    viewBox="0 0 116 139"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M57.75 0 .25 25.273v37.909c0 35.066 24.533 67.857 57.5 75.818 32.967-7.961 57.5-40.752 57.5-75.818v-37.91zm19.678 94.773L57.75 83.084 38.136 94.773l5.175-22.114-17.314-14.785 22.872-1.958 8.881-20.85 8.88 20.787 22.873 1.958L72.189 72.66z"
      fill="#12B76A"
    />
  </svg>
)

export const Congratulations = ({
  opened,
  onOpenedChange,
}: {
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
}) => {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]">
        <div>
          <div className="relative overflow-hidden border-x border rounded-[10px] p-[30px] border-gray-200 bg-gray-50">
            <div className="absolute top-0 inset-x-0">
              <Confetti
                gravity={0.625}
                width={513}
                height={639}
                recycle={false}
                numberOfPieces={800}
              />
            </div>

            <div className="isolate mt-[30px] flex flex-col gap-y-[30px] max-w-[392.5px] mx-auto">
              <Shield className="shrink-0 self-center" />

              <div className="space-y-9">
                <h1 className="text-[28px] text-center leading-none font-semibold text-dark-blue-400">
                  Congratulations!
                </h1>
                <h1 className="text-[28px] text-center leading-none font-semibold text-dark-blue-400">
                  Your Profile Is Ready to Attract Top Clients.
                </h1>
              </div>

              <div className="mt-[25px]">
                <p className="text-base text-center leading-none text-gray-600">
                  With your profile fully set, you&apos;re primed for top-tier
                  projects. Clients will soon be reaching out to tap into your
                  skills!
                </p>
              </div>

              <div className="mt-[165px]">
                <div className="flex items-center justify-center gap-x-3">
                  <span className="text-base leading-6 text-gray-600">
                    Need Help?{" "}
                  </span>
                  <Button variant="link" size="lg">
                    View FAQs
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-[50px] relative">
          <DialogClose asChild>
            <IconButton
              className="absolute text-gray-500 right-0 top-0"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
            What would you like to do next?
          </h1>
          <p className="text-base text-dark-blue-400 mt-2.5">
            Choose your next move and get started
          </p>

          <div className="mt-[30px]">
            <ul className="space-y-[19px]">
              <li className="flex items-center gap-x-[15px] border border-gray-300 p-[15px] rounded-lg bg-white">
                <CreditCard02 className="shrink-0 size-8 text-dark-blue-400" />
                <span className="text-lg font-semibold leading-none text-dark-blue-400">
                  Set up payments
                </span>
              </li>
              <li className="flex items-center gap-x-[15px] border border-gray-300 p-[15px] rounded-lg bg-white">
                <Search className="shrink-0 size-8 text-dark-blue-400" />
                <span className="text-lg font-semibold leading-none text-dark-blue-400">
                  Find open projects
                </span>
              </li>
              <li className="flex items-center gap-x-[15px] border border-gray-300 p-[15px] rounded-lg bg-white">
                <UsersPlus className="shrink-0 size-8 text-dark-blue-400" />
                <span className="text-lg font-semibold leading-none text-dark-blue-400">
                  Join a team
                </span>
              </li>
              <li className="flex items-center gap-x-[15px] border border-gray-300 p-[15px] rounded-lg bg-white">
                <Briefcase02 className="shrink-0 size-8 text-dark-blue-400" />
                <span className="text-lg font-semibold leading-none text-dark-blue-400">
                  Create a new project
                </span>
              </li>
              <li className="flex items-center gap-x-[15px] border border-gray-300 p-[15px] rounded-lg bg-white">
                <RefreshCw className="shrink-0 size-8 text-dark-blue-400" />
                <span className="text-lg font-semibold leading-none text-dark-blue-400">
                  Start a new service
                </span>
              </li>
              <li className="flex items-center gap-x-[15px] border border-gray-300 p-[15px] rounded-lg bg-white">
                <UserPlus01 className="shrink-0 size-8 text-dark-blue-400" />
                <span className="text-lg font-semibold leading-none text-dark-blue-400">
                  Set up my account
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-[30px] flex items-center justify-center">
            <Button
              size="xl"
              className="text-dark-blue-400"
              visual="gray"
              variant="link"
            >
              <Home03 className="size-[18px]" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const SaveWorkEducation = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[409px] p-0">
        <div className="p-6">
          <DialogTitle className="text-dark-blue-400">
            Save Work Experience?
          </DialogTitle>
          <DialogDescription className="text-dark-blue-400 mt-2">
            Do you want to save your information?
          </DialogDescription>
        </div>

        <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
          <Button variant="link" visual="gray">
            <X className="size-[15px]" /> Discard Changes
          </Button>

          <Button variant="outlined" visual="gray">
            Yes, Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const DeleteWorkExperience = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[409px] p-0">
        <div className="p-6">
          <DialogTitle className="text-dark-blue-400">
            Delete Work Experience
          </DialogTitle>
          <DialogDescription className="text-dark-blue-400 mt-2">
            Your “Senior UX / UI Designer” job will be removed. This cannot be
            undone.
          </DialogDescription>
        </div>

        <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
          <Button variant="link" visual="gray">
            <X className="size-[15px]" /> Cancel
          </Button>

          <Button variant="outlined" visual="gray">
            Yes, Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const SaveEducationQualification = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[409px] p-0">
        <div className="p-6">
          <DialogTitle className="text-dark-blue-400">
            Save Education?
          </DialogTitle>
          <DialogDescription className="text-dark-blue-400 mt-2">
            Do you want to save your information?
          </DialogDescription>
        </div>

        <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
          <Button variant="link" visual="gray">
            <X className="size-[15px]" /> Discard Changes
          </Button>

          <Button variant="outlined" visual="gray">
            Yes, Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const DeleteEducation = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[409px] p-0">
        <div className="p-6">
          <DialogTitle className="text-dark-blue-400">
            Delete Education?
          </DialogTitle>
          <DialogDescription className="text-dark-blue-400 mt-2">
            Your “University of Florida” education will be removed. This cannot
            be undone.
          </DialogDescription>
        </div>

        <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
          <Button variant="link" visual="gray">
            <X className="size-[15px]" /> Cancel
          </Button>

          <Button variant="outlined" visual="gray">
            Yes, Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface WorkExperienceCardProps extends WorkExperienceFormValues {
  onRemove: () => void
  onEdit: () => void
}

export const WorkExperienceCard = ({
  currentlyWorkHere,
  employer,
  endDate,
  jobDescription,
  jobTitle,
  skills,
  startDate,
  onEdit,
  onRemove,
}: WorkExperienceCardProps) => {
  return (
    <article className="p-5 rounded-lg flex items-start gap-x-6 bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
      <div className="border size-[55px] shrink-0 inline-flex items-center justify-center rounded-lg border-gray-200 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
        <div className="relative size-[45px] shrink-0">
          <NextImage
            className="object-cover"
            src="/android-01.png"
            alt="Android"
            sizes="10vw"
            fill
          />
        </div>
      </div>
      <div className="flex-auto">
        <div className="flex items-start justify-between">
          <h1 className="text-base leading-none font-bold text-dark-blue-400">
            {jobTitle}
          </h1>

          <div className="inline-flex items-center gap-x-2">
            <IconButton
              className="text-gray-400"
              size="md"
              visual="gray"
              variant="ghost"
              onClick={onEdit}
            >
              <Edit03 className="size-[15px]" />
            </IconButton>

            <Dialog>
              <DialogTrigger asChild>
                <IconButton
                  className="text-gray-400"
                  size="md"
                  visual="gray"
                  variant="ghost"
                >
                  <Trash03 className="size-[15px]" />
                </IconButton>
              </DialogTrigger>
              <DialogContent className="max-w-[409px] p-0">
                <div className="p-6">
                  <DialogTitle className="text-dark-blue-400">
                    Delete Work Experience
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    Your “Senior UX / UI Designer” job will be removed. This
                    cannot be undone.
                  </DialogDescription>
                </div>

                <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                  <DialogClose asChild>
                    <Button variant="link" visual="gray">
                      <X className="size-[15px]" /> Cancel
                    </Button>
                  </DialogClose>

                  <DialogClose onClick={onRemove} asChild>
                    <Button variant="outlined" visual="gray">
                      Yes, Delete
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="mt-1.5">
          <span className="text-[13px] leading-none text-dark-blue-400">
            {employer}
          </span>
        </div>
        <div className="mt-1.5 items-center flex gap-x-1.5">
          <span className="text-[12px] leading-none text-dark-blue-400">
            {months.find((month) => month.value === startDate.month)?.name}{" "}
            {startDate.year} -{" "}
            {currentlyWorkHere ? (
              "Present"
            ) : (
              <>
                {months.find((month) => month.value === endDate.month)?.name}{" "}
                {endDate.year}
              </>
            )}
          </span>
          <span className="inline-block shrink-0 size-1 rounded-full bg-gray-300" />
          <span className="text-[12px] leading-none font-semibold text-dark-blue-400">
            5 yrs 2 mos
          </span>
        </div>

        <div className="mt-3">
          <span className="text-sm inline-block leading-none text-dark-blue-400 line-clamp-2">
            {jobDescription}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-x-2">
          {skills?.map((skill) => (
            <Badge key={skill.id} visual="gray">
              {skill.name}
            </Badge>
          ))}
        </div>
      </div>
    </article>
  )
}

interface EducationCardProps extends EducationFormValues {
  onRemove: () => void
  onEdit: () => void
}

export const EducationCard = ({
  currentlyAttending,
  degree,
  endDate,
  major,
  schoolOrUniversity,
  startDate,
  onEdit,
  onRemove,
}: EducationCardProps) => {
  return (
    <article className="p-5 rounded-lg flex items-start gap-x-6 bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
      <div className="border size-[55px] shrink-0 inline-flex items-center justify-center rounded-lg border-gray-200 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
        <div className="relative size-[45px] shrink-0">
          <NextImage
            className="object-cover"
            src="/cambridge.png"
            alt="Android"
            sizes="10vw"
            fill
          />
        </div>
      </div>
      <div className="flex-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-base leading-none font-bold text-dark-blue-400">
              {schoolOrUniversity}
            </h1>

            <div className="mt-1.5 items-center flex gap-x-1.5">
              <span className="text-[12px] leading-none text-dark-blue-400">
                {degree}
              </span>
              <span className="inline-block shrink-0 size-1 rounded-full bg-gray-300" />
              <span className="text-[12px] leading-none font-semibold text-dark-blue-400">
                {major}
              </span>
            </div>

            <div className="mt-1.5">
              <span className="text-[12px] leading-none text-dark-blue-400">
                {months.find((month) => month.value === startDate.month)?.name}{" "}
                {startDate.year} -{" "}
                {currentlyAttending ? (
                  "Present"
                ) : (
                  <>
                    {
                      months.find((month) => month.value === endDate.month)
                        ?.name
                    }{" "}
                    {endDate.year}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-x-2">
            <IconButton
              className="text-gray-400"
              size="md"
              visual="gray"
              variant="ghost"
              type="button"
              onClick={onEdit}
            >
              <Edit03 className="size-[15px]" />
            </IconButton>

            <Dialog>
              <DialogTrigger asChild>
                <IconButton
                  className="text-gray-400"
                  size="md"
                  visual="gray"
                  variant="ghost"
                  type="button"
                >
                  <Trash03 className="size-[15px]" />
                </IconButton>
              </DialogTrigger>
              <DialogContent className="max-w-[409px] p-0">
                <div className="p-6">
                  <DialogTitle className="text-dark-blue-400">
                    Delete Education?
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    Your “University of Florida” education will be removed. This
                    cannot be undone.
                  </DialogDescription>
                </div>

                <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                  <DialogClose>
                    <Button variant="link" visual="gray">
                      <X className="size-[15px]" /> Cancel
                    </Button>
                  </DialogClose>

                  <DialogClose onClick={onRemove} asChild>
                    <Button variant="outlined" visual="gray">
                      Yes, Delete
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </article>
  )
}
