"use client"

import React, {
  Fragment,
  SVGProps,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import {
  EducationPayload,
  ExperiencePayload,
  UserAPI,
} from "@/service/http/user"
import { getPublicApiUrl } from "@/lib/runtime-urls"
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
import {
  Controller,
  DefaultValues,
  SubmitHandler,
  useForm,
  useWatch,
} from "react-hook-form"
import { useToggle } from "react-use"
import { z } from "zod"
import { UserProfile } from "@/types/user"
import NextImage from "@/components/next-image"
import { getCompanyBrandFromName } from "@/src/lib/certification-brand"
import {
  BecomeTopSeller,
  Carousel,
  CreateYourOwnProject,
  Footer,
  LeftSidebar,
  RecentListings,
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

const CaseStudyBuilder = dynamic(
  () => import("@/components/case-study-builder"),
  { ssr: false }
)

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
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(() => searchParams.get("open") === "1")
  const [profileProgress, setProfileProgress] = useState(0)
  const displayUsername =
    user?.username ||
    `${user?.firstName || ""}${user?.lastName || ""}`
      .toLowerCase()
      .replace(/\s+/g, "") ||
    "my-profile"
  return (
    <div className="shrink-0 w-[322px]">
      <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-base font-bold text-dark-blue-400 leading-none">
            @{displayUsername}
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
              value={profileProgress}
            />

            <Button
              className="border-2 border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500 hover:text-white"
              onClick={() => setIsOpen((prev) => !prev)}
            >
              <UserCheck01 className="size-[15px]" />
              Complete My Profile
            </Button>
            <StatusDialog
              open={isOpen}
              onOpenChange={setIsOpen}
              onProgressChange={setProfileProgress}
            />
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

export default function TalentDashboardPage() {
  return (
    <Suspense>
      <TalentDashboard />
    </Suspense>
  )
}

function TalentDashboard() {
  const [isOpen, toggleIsOpen] = useToggle(false)

  return (
    <>
      <div className="flex bg-gray-50">
        <LeftSidebar />
        <div className="flex-auto p-6 gap-x-8 flex justify-center min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-8 xl:pr-[50px] xl:pl-[248px] 2xl:pr-[150px] 2xl:pl-[348px] overflow-hidden">
          <div className="max-w-[1042px] space-y-3 md:space-y-5 min-w-0">
            <Welcome onToggle={toggleIsOpen} />

            <RecentListings />

            <CreateYourOwnProject />

            <RecommendedForYou />

            <BecomeTopSeller />

            <Carousel />

            <TakeCareersToNextLevel />

            <Footer />
          </div>

          <RightSidebar />
        </div>

        <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
          <DialogContent
            variant="unanimated"
            className="w-full md:w-[322px] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2 inset-x-0 md:left-auto md:right-0 inset-y-0"
          >
            <button
              className="size-[28px] -left-3.5 absolute z-10 top-[104px] text-gray-500 focus-visible:outline-none rounded-full bg-white hidden md:inline-flex border border-gray-300 items-center justify-center shrink-0"
              onClick={toggleIsOpen}
            >
              <ChevronRight className="size-3" />
            </button>

            <div className="pl-3.5 p-1 sticky top-0 h-12 flex md:hidden items-center justify-between">
              <h1 className="text-sm leading-5 font-semibold text-dark-blue-400">
                My Profile
              </h1>

              <DialogTrigger asChild>
                <IconButton
                  className="opacity-50 hover:opacity-100"
                  size="md"
                  variant="ghost"
                  visual="gray"
                >
                  <X className="size-[18px]" />
                </IconButton>
              </DialogTrigger>
            </div>

            <ScrollArea
              className="w-full h-[calc(theme(size.full)-theme(size.12))]"
              scrollBar={<ScrollBar className="w-4 p-1" />}
            ></ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

export const DIALOG_NAMES = [
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
    icon: <CreditCard02 className="size-5" />,
    title: "Job Title & Rate",
    desc: "Set your rate and job title to attract the right clients",
  },
} as Record<
  Exclude<(typeof DIALOG_NAMES)[number], "CONGRATULATIONS">,
  { icon: React.ReactNode; title: string; desc: string }
>

const STORAGE_KEY = "marketeq-profile-completion"

type DialogsStateType = {
  [Property in (typeof DIALOG_NAMES)[number]]: {
    finished: boolean
    opened: boolean
  }
}

const defaultDialogsState = (): DialogsStateType =>
  DIALOG_NAMES.reduce(
    (previous, current) => ({
      ...previous,
      [current]: { finished: false, opened: false },
    }),
    {} as DialogsStateType
  )

export const StatusDialog = ({
  onOpenChange,
  open,
  onProgressChange,
  initialStep,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onProgressChange?: (percent: number) => void
  initialStep?: (typeof DIALOG_NAMES)[number] | null
}) => {
  const { user } = useAuth()
  const [dialogsState, setDialogsState] =
    useState<DialogsStateType>(defaultDialogsState)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState(false)

  // Load from localStorage on mount (client-side only — localStorage unavailable during SSR)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setDialogsState(
          DIALOG_NAMES.reduce(
            (acc, name) => ({
              ...acc,
              [name]: {
                finished: parsed[name]?.finished ?? false,
                opened: parsed[name]?.opened ?? false,
              },
            }),
            {} as DialogsStateType
          )
        )
      }
    } catch {}
  }, [])

  const persistInitialized = useRef(false)
  useEffect(() => {
    if (!persistInitialized.current) {
      persistInitialized.current = true
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dialogsState))
    } catch {}
  }, [dialogsState])

  const loadProfile = React.useCallback(() => {
    if (!user?.id) {
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    setProfileError(false)
    UserAPI.getProfile(user.id)
      .then((res) => {
        const p = res?.data
        if (!p) return
        setProfile(p)
        setDialogsState((prev) => ({
          ...prev,
          "ABOUT-ME": {
            ...prev["ABOUT-ME"],
            finished: Boolean(p.bio || p.overview),
          },
          SKILLS: {
            ...prev["SKILLS"],
            finished: Boolean(p.skills?.length),
          },
          "WORK-EXPERIENCE": {
            ...prev["WORK-EXPERIENCE"],
            finished: Boolean(p.experience?.length),
          },
          EDUCATION: {
            ...prev["EDUCATION"],
            finished: Boolean(p.education?.length),
          },
          JOB_TITLE_RATE: {
            ...prev["JOB_TITLE_RATE"],
            finished: Boolean(p.rateMin || p.rateMax),
          },
        }))
      })
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false))
  }, [user?.id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Open a specific step dialog when initialStep is provided
  const isDirectStep = Boolean(initialStep)
  useEffect(() => {
    if (initialStep && DIALOG_NAMES.includes(initialStep)) {
      setDialogsState((prev) => ({
        ...prev,
        [initialStep]: { ...prev[initialStep], opened: true },
      }))
    }
  }, [initialStep])

  // When opened directly to a step, closing that step should close the whole dialog
  const closeAll = React.useCallback(() => {
    setDialogsState(defaultDialogsState())
    onOpenChange?.(false)
  }, [onOpenChange])

  const advancingRef = useRef(false)
  const next = () => {
    if (advancingRef.current) return
    advancingRef.current = true
    setTimeout(() => { advancingRef.current = false }, 300)
    // If opened directly to a single step, skip to next incomplete step (or close if all done)
    if (isDirectStep) {
      let openedDialogName: keyof typeof dialogsState | null = null
      for (const dialogName in dialogsState) {
        if (dialogsState[dialogName as keyof typeof dialogsState].opened) {
          openedDialogName = dialogName as keyof typeof dialogsState
          break
        }
      }
      if (!openedDialogName) {
        closeAll()
        return
      }

      // Find next incomplete step (excluding CONGRATULATIONS)
      const stepsToCheck = DIALOG_NAMES.filter((n) => n !== "CONGRATULATIONS")
      const nextIncomplete = stepsToCheck.find(
        (name) => name !== openedDialogName && !dialogsState[name].finished
      )

      if (nextIncomplete) {
        setDialogsState((prev) => ({
          ...prev,
          [openedDialogName]: { ...prev[openedDialogName], opened: false },
          [nextIncomplete]: { ...prev[nextIncomplete], opened: true },
        }))
      } else {
        // All steps complete — close
        closeAll()
      }
      return
    }
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

  const [isOpen, setIsOpen] = useControllableState({
    value: open,
    onChange: onOpenChange,
    defaultValue: false,
  })

  const totalSteps = Object.keys(content).length
  const completedSteps = (
    Object.keys(content) as (keyof typeof content)[]
  ).filter((k) => dialogsState[k].finished).length
  const progressPercent = Math.round((completedSteps / totalSteps) * 100)

  useEffect(() => {
    onProgressChange?.(progressPercent)
  }, [progressPercent, onProgressChange])

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
        onOpenedChange={(opened) => {
          if (!opened && isDirectStep) {
            closeAll()
            return
          }
          setDialogsState((prev) => ({
            ...prev,
            "ABOUT-ME": { ...prev["ABOUT-ME"], opened },
          }))
        }}
        next={next}
        userId={user?.id ?? ""}
        progressPercent={progressPercent}
        profile={profile}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={loadProfile}
      />
      <Portfolio
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            PORTFOLIO: { ...prev["PORTFOLIO"], finished },
          }))
        }
        opened={dialogsState["PORTFOLIO"].opened}
        onOpenedChange={(opened) => {
          if (!opened && isDirectStep) {
            closeAll()
            return
          }
          setDialogsState((prev) => ({
            ...prev,
            PORTFOLIO: { ...prev["PORTFOLIO"], opened },
          }))
        }}
        next={next}
        previous={previous}
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={loadProfile}
      />
      <SkillsDialog
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            SKILLS: { ...prev["SKILLS"], finished },
          }))
        }
        opened={dialogsState["SKILLS"].opened}
        onOpenedChange={(opened) => {
          if (!opened && isDirectStep) {
            closeAll()
            return
          }
          setDialogsState((prev) => ({
            ...prev,
            SKILLS: { ...prev["SKILLS"], opened },
          }))
        }}
        next={next}
        previous={previous}
        userId={user?.id ?? ""}
        progressPercent={progressPercent}
        profile={profile}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={loadProfile}
      />
      <WorkExperienceDialog
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            "WORK-EXPERIENCE": { ...prev["WORK-EXPERIENCE"], finished },
          }))
        }
        opened={dialogsState["WORK-EXPERIENCE"].opened}
        onOpenedChange={(opened) => {
          if (!opened && isDirectStep) {
            closeAll()
            return
          }
          setDialogsState((prev) => ({
            ...prev,
            "WORK-EXPERIENCE": { ...prev["WORK-EXPERIENCE"], opened },
          }))
        }}
        next={next}
        previous={previous}
        userId={user?.id ?? ""}
        progressPercent={progressPercent}
        profile={profile}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={loadProfile}
      />
      <EducationDialog
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            EDUCATION: { ...prev["EDUCATION"], finished },
          }))
        }
        opened={dialogsState["EDUCATION"].opened}
        onOpenedChange={(opened) => {
          if (!opened && isDirectStep) {
            closeAll()
            return
          }
          setDialogsState((prev) => ({
            ...prev,
            EDUCATION: { ...prev["EDUCATION"], opened },
          }))
        }}
        next={next}
        previous={previous}
        userId={user?.id ?? ""}
        profile={profile}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={loadProfile}
      />
      <MoreInfoDialog
        onFinished={(finished) =>
          setDialogsState((prev) => ({
            ...prev,
            JOB_TITLE_RATE: { ...prev["JOB_TITLE_RATE"], finished },
          }))
        }
        opened={dialogsState["JOB_TITLE_RATE"].opened}
        onOpenedChange={(opened) => {
          if (!opened && isDirectStep) {
            closeAll()
            return
          }
          setDialogsState((prev) => ({
            ...prev,
            JOB_TITLE_RATE: { ...prev["JOB_TITLE_RATE"], opened },
          }))
        }}
        next={next}
        previous={previous}
        userId={user?.id ?? ""}
        progressPercent={progressPercent}
        profile={profile}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={loadProfile}
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

      <Dialog open={isOpen && !isDirectStep && !Object.values(dialogsState).some((s) => s.opened)} onOpenChange={setIsOpen}>
        <DialogContent
          dialogOverlay={<DialogOverlay className="bg-gray-700/50" />}
          variant="unanimated"
          className="shadow-[0px_20px_24px_-4px_rgba(16,24,40,.08)] max-w-[451px] bottom-5 right-5 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-5 data-[state=open]:slide-in-from-bottom-5"
        >
          <div className="border border-gray-200 overflow-hidden rounded-[10px]">
            <div className="p-6 bg-white border-gray-200 flex items-center gap-x-[18px] border-b">
              <div className="flex-auto space-y-2">
                <p className="text-sm leading-none text-dark-blue-400">
                  Boost your hiring potential
                  {user?.firstName ? `, ${user.firstName}` : ""}!
                </p>
                <h2 className="text-lg font-semibold leading-none text-dark-blue-400">
                  Complete your profile to get hired by top clients.
                </h2>
              </div>
              {(() => {
                const remaining = (
                  Object.keys(content) as (keyof typeof content)[]
                ).reduce(
                  (prev, cur) => (dialogsState[cur].finished ? prev - 1 : prev),
                  Object.keys(content).length
                )
                return remaining === 0 ? (
                  <Badge visual="success" size="lg">
                    All done! 🎉
                  </Badge>
                ) : (
                  <Badge visual="primary" size="lg">
                    {remaining} step{remaining !== 1 ? "s" : ""} left
                  </Badge>
                )
              })()}
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
                          <Button
                            type="button"
                            className="h-8 text-xs leading-5 text-success-500 border-success-500 rounded-full"
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
                            <Check className="size-3" />
                            Edit
                          </Button>
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

function formatJobTitle(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2") // split camelCase/PascalCase
    .replace(/[^a-zA-Z\s]/g, "") // strip numbers, hyphens, underscores, special chars
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

// Capitalize the first letter of each word, preserving numbers, punctuation and
// existing casing (so "3M", "AT&T", "eBay" stay intact). A word that already
// contains an uppercase letter is left alone — otherwise deliberate brand casing
// like "eBay"/"iPhone" would be flattened to "EBay"/"IPhone".
function capitalizeCompanyName(value?: string): string {
  return (value ?? "").replace(/(^|\s)(\S+)/g, (_m, lead, word) =>
    /[A-Z]/.test(word)
      ? lead + word
      : lead + word.charAt(0).toUpperCase() + word.slice(1)
  )
}

// Real elapsed duration between two {month(1-12), year} points, LinkedIn-style
// ("5 yrs 2 mos", "1 yr", "3 mos"). Inclusive of both endpoints.
function formatExperienceDuration(
  start?: { month?: number; year?: number },
  end?: { month?: number; year?: number },
  currentlyWorkHere?: boolean
): string {
  if (!start?.month || !start?.year) return ""
  const now = new Date()
  const endYear = currentlyWorkHere ? now.getFullYear() : end?.year
  const endMonth = currentlyWorkHere ? now.getMonth() + 1 : end?.month
  if (!endYear || !endMonth) return ""
  let totalMonths = (endYear - start.year) * 12 + (endMonth - start.month) + 1
  if (totalMonths < 1) totalMonths = 1
  const yrs = Math.floor(totalMonths / 12)
  const mos = totalMonths % 12
  const parts: string[] = []
  if (yrs > 0) parts.push(`${yrs} yr${yrs > 1 ? "s" : ""}`)
  if (mos > 0) parts.push(`${mos} mo${mos > 1 ? "s" : ""}`)
  return parts.join(" ")
}

const moreInfoFormSchema = z
  .object({
    jobTitle: z.string().min(1, "Please enter at least 1 character(s)"),
    saveAsDefault: z.boolean(),
    clientRate: z
      .number()
      .max(1000, "Rate cannot exceed $1,000/hr")
      .optional(),
    earning: z
      .number()
      .max(1000, "Rate cannot exceed $1,000/hr")
      .optional(),
    fee: z.number().optional(),
  })
  .refine((data) => (data.clientRate ?? 0) > 0 || (data.earning ?? 0) > 0, {
    message: "Please enter a rate",
    path: ["clientRate"],
  })

type MoreInfoFormValues = z.infer<typeof moreInfoFormSchema>

const moreInfoFormDefaultValues: Partial<MoreInfoFormValues> = {
  jobTitle: "",
  saveAsDefault: false,
  clientRate: 0,
  earning: 0,
  fee: 0,
}

const MoreInfoDialog = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
  userId,
  progressPercent,
  profile,
  profileLoading,
  profileError,
  onReloadProfile,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  userId: string
  progressPercent?: number
  profile?: UserProfile | null
  profileLoading?: boolean
  profileError?: boolean
  onReloadProfile?: () => void
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
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
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
    formState: { errors, isValid, isDirty },
    register,
    reset,
    setValue,
  } = useForm<MoreInfoFormValues>({
    resolver: zodResolver(moreInfoFormSchema),
    defaultValues: moreInfoFormDefaultValues,
  })

  // Pre-fill from saved profile data
  useEffect(() => {
    if (profile && !profileLoaded) {
      const existing = (profile as any)?.jobTitles as
        | Array<{
            jobTitle?: string
            clientRate?: number
            earning?: number
            fee?: number
            saveAsDefault?: boolean
          }>
        | null
        | undefined
      if (existing?.length) {
        setProfileLoaded(true)
        setWorkExperiences(
          existing.map((e) => ({
            jobTitle: e.jobTitle ?? "",
            saveAsDefault: Boolean(e.saveAsDefault),
            earning: Number(e.earning ?? 0),
            clientRate: Number(e.clientRate ?? 0),
            fee: Number(e.fee ?? 0),
          }))
        )
        setState("preview")
      } else if (profile.recentJobTitle || profile.rateMin || profile.rateMax) {
        setProfileLoaded(true)
        const entry: MoreInfoFormValues = {
          jobTitle: profile.recentJobTitle ?? "",
          saveAsDefault: true,
          earning: profile.rateMin ? Number(profile.rateMin) : 0,
          clientRate: profile.rateMax ? Number(profile.rateMax) : 0,
          fee: 0,
        }
        setWorkExperiences([entry])
        setState("preview")
      }
    }
  }, [profile, profileLoaded, setWorkExperiences])
  const onSubmit: SubmitHandler<MoreInfoFormValues> = (values) => {
    const normalizedTitle = values.jobTitle.trim().toLowerCase()
    const isDuplicate = (workExperiences ?? []).some(
      (e, index) =>
        index !== editingIndex &&
        e.jobTitle.trim().toLowerCase() === normalizedTitle
    )
    if (isDuplicate) {
      setDuplicateError("This job title already exists.")
      return
    }
    setDuplicateError(null)
    let nextEntries: MoreInfoFormValues[]
    if (editingIndex !== undefined) {
      nextEntries = (workExperiences ?? []).map((workExperience, index) => {
        if (index === editingIndex) return values
        if (values.saveAsDefault)
          return { ...workExperience, saveAsDefault: false }
        return workExperience
      })
      setWorkExperiences(nextEntries)
      setEditingIndex(undefined)
    } else {
      const prev = workExperiences ?? []
      nextEntries = values.saveAsDefault
        ? [...prev.map((e) => ({ ...e, saveAsDefault: false })), values]
        : [...prev, values]
      setWorkExperiences(nextEntries)
    }
    if (userId) {
      const defaultEntry = nextEntries.find((e) => e.saveAsDefault) ?? nextEntries[0]
      UserAPI.updateProfile(userId, {
        rateMin: values.earning ? Number(values.earning) : undefined,
        rateMax: values.clientRate ? Number(values.clientRate) : undefined,
        jobTitles: nextEntries.map((e) => ({
          jobTitle: e.jobTitle,
          clientRate: e.clientRate ?? 0,
          earning: e.earning ?? 0,
          fee: e.fee ?? 0,
          saveAsDefault: e.saveAsDefault,
        })),
        recentJobTitle: defaultEntry?.jobTitle,
      }).catch(() => {})
    }
    reset(moreInfoFormDefaultValues as MoreInfoFormValues)
    setState("preview")
  }

  const submitTriggerRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={cn(
          "max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]",
          state === "action" && "grid-cols-5"
        )}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={cn(
            "transition-all duration-300 min-w-0",
            state === "action" && "col-span-3"
          )}
        >
          <div className="border-x border-t rounded-t-[10px] pt-[30px] border-gray-200 bg-gray-50">
            <div className="px-[30px]">
              {state !== "action" ? (
                <div className="flex items-start justify-between">
                  <div className="max-w-[157px] flex-auto flex items-center gap-x-3">
                    <span className="text-sm font-medium text-dark-blue-400">
                      {progressPercent ?? 0}%
                    </span>
                    <div className="max-w-[115px] flex-auto">
                      <Progress value={progressPercent ?? 0} />
                    </div>
                  </div>

                  {state === "preview" && (
                    <Button
                      onClick={() => {
                        if ((workExperiences?.length ?? 0) >= 3) return
                        setEditingIndex(undefined)
                        reset(moreInfoFormDefaultValues as MoreInfoFormValues)
                        setState("action")
                      }}
                      className="bg-white"
                      variant="outlined"
                      visual="gray"
                      type="button"
                      disabled={(workExperiences?.length ?? 0) >= 3}
                    >
                      <Plus className="size-[15px]" />
                      Add Job Title
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="text-dark-blue-400"
                  onClick={() => {
                    if (isDirty) {
                      setIsOpen(true)
                    } else {
                      setEditingIndex(undefined)
                      reset(moreInfoFormDefaultValues as MoreInfoFormValues)
                      Boolean(workExperiences?.length)
                        ? setState("preview")
                        : setState("default")
                    }
                  }}
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
              <DialogTitle asChild>
                <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                  Job Title & Rate
                </h1>
              </DialogTitle>
              {state === "default" && profileLoading && !profileError ? (
                <div className="mt-1 h-6 w-[280px] bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                  Tell us what you do and set your hourly rates
                </p>
              )}
            </div>

            <ScrollArea
              scrollBar={<ScrollBar className="w-4 p-1" />}
              className="h-[400px] px-[26px]"
            >
              <div className="pb-[30px] px-1">
                <div className="mt-6">
                  {state === "default" && profileError && (
                    <div className="flex flex-col items-start gap-y-3">
                      <p className="text-base text-dark-blue-400">Something went wrong. Please try again.</p>
                      <Button type="button" variant="outlined" visual="gray" onClick={() => onReloadProfile?.()}>Retry</Button>
                    </div>
                  )}

                  {state === "default" && !profileError && profileLoading && (
                    <div className="space-y-3" aria-busy="true" aria-label="Loading">
                      <div className="h-9 w-[200px] bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-[260px] bg-gray-200 rounded animate-pulse" />
                    </div>
                  )}

                  {state === "default" && !profileError && !profileLoading && (
                    <Button
                      onClick={() => {
                        setEditingIndex(undefined)
                        reset(moreInfoFormDefaultValues as MoreInfoFormValues)
                        setState("action")
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
                                  Client rate ${workExperience.clientRate ?? 0}
                                  /hr
                                </span>
                                <span className="inline-block size-1 bg-gray-300 rounded-full" />
                                <span className="text-xs leading-none font-light text-dark-blue-400">
                                  Your earnings ${workExperience.earning ?? 0}
                                  /hr
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
                              onClick={() => {
                                const updated = workExperiences?.filter(
                                  (_, i) => i !== index
                                )
                                setWorkExperiences(
                                  updated?.length ? updated : undefined
                                )
                                if (!updated?.length) setState("default")
                              }}
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
                        <Label size="sm" htmlFor="job-title-input">
                          Job Title{" "}
                          {editingIndex !== undefined
                            ? editingIndex + 1
                            : (workExperiences?.length ?? 0) + 1}
                        </Label>

                        <Input
                          id="job-title-input"
                          placeholder="e.g. Software Engineer"
                          {...register("jobTitle")}
                          onBlur={(e) => {
                            setValue("jobTitle", formatJobTitle(e.target.value))
                          }}
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
                        {duplicateError && (
                          <ErrorMessage size="sm">
                            {duplicateError}
                          </ErrorMessage>
                        )}
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
                                      onValueChange={(_, __, values) => {
                                        const rate = values?.float ?? null
                                        onChange(rate)
                                        if (rate != null) {
                                          setValue(
                                            "earning",
                                            Math.round(rate * 0.8)
                                          )
                                          setValue(
                                            "fee",
                                            Math.round(rate * 0.2)
                                          )
                                        }
                                      }}
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
                                Marketeq charges a 20% service fee on every
                                transaction to support the platform.
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
                                      placeholder="$0"
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
                                      onValueChange={(_, __, values) => {
                                        const earning = values?.float ?? null
                                        onChange(earning)
                                        if (earning != null) {
                                          const clientRate = Math.round(
                                            earning / 0.8
                                          )
                                          setValue("clientRate", clientRate)
                                          setValue(
                                            "fee",
                                            Math.round(clientRate * 0.2)
                                          )
                                        }
                                      }}
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
                  disabled={profileLoading || profileError}
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
                    disabled={profileLoading || profileError}
                  >
                    Skip
                  </Button>
                  <Button
                    size="md"
                    type="button"
                    disabled={!Boolean(workExperiences?.length) || profileLoading || profileError}
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
                    if (isDirty) {
                      setIsOpen(true)
                    } else {
                      setEditingIndex(undefined)
                      reset(moreInfoFormDefaultValues as MoreInfoFormValues)
                      Boolean(workExperiences?.length)
                        ? setState("preview")
                        : setState("default")
                    }
                  }}
                  variant="link"
                  visual="gray"
                  type="button"
                >
                  <X className="size-[15px]" /> Cancel
                </Button>
                <Button
                  ref={submitTriggerRef}
                  type="submit"
                  disabled={!isValid}
                >
                  Save
                </Button>

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
                          setEditingIndex(undefined)
                          reset(moreInfoFormDefaultValues as MoreInfoFormValues)
                          Boolean(workExperiences?.length)
                            ? setState("preview")
                            : setState("default")
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
              aria-label="Close"
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

const AboutMeDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
  userId,
  progressPercent,
  profile,
  profileLoading,
  profileError,
  onReloadProfile,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  userId: string
  progressPercent?: number
  profile?: UserProfile | null
  profileLoading?: boolean
  profileError?: boolean
  onReloadProfile?: () => void
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
    reset,
  } = useForm<AboutMeFormValues>({
    resolver: zodResolver(aboutMeFormSchema),
    defaultValues: {
      aboutMe: "",
    },
  })

  // Pre-fill from saved profile data
  useEffect(() => {
    if (profile?.bio) {
      reset({ aboutMe: profile.bio })
    }
  }, [profile, reset])

  const onSubmit: SubmitHandler<AboutMeFormValues> = ({ aboutMe }) => {
    next?.()
    if (userId) {
      UserAPI.updateProfile(userId, { bio: aboutMe }).catch(() => {})
    }
  }

  const aboutMe = useWatch({ control, name: "aboutMe" })

  useEffect(() => {
    onFinished(Boolean(aboutMe.length))
  }, [aboutMe, onFinished])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-x border-t p-[30px] rounded-t-[10px] border-gray-200 bg-gray-50">
            <div className="flex items-center gap-x-3">
              <span className="text-sm font-medium text-dark-blue-400">
                {progressPercent ?? 0}%
              </span>
              <div className="max-w-[115px] flex-auto">
                <Progress value={progressPercent ?? 0} />
              </div>
            </div>

            <div className="mt-6">
              <DialogTitle asChild>
                <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                  About Me
                </h1>
              </DialogTitle>
              {profileLoading && !profileError ? (
                <div className="mt-1 h-6 w-[280px] bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                  Create a connection and let clients feel like they already know
                  you!
                </p>
              )}
            </div>

            {profileError ? (
              <div className="mt-6 flex flex-col items-start gap-y-3">
                <p className="text-base text-dark-blue-400">Something went wrong. Please try again.</p>
                <Button type="button" variant="outlined" visual="gray" onClick={() => onReloadProfile?.()}>Retry</Button>
              </div>
            ) : profileLoading ? (
              <div className="mt-6 h-[345px] bg-gray-200 rounded animate-pulse" aria-busy="true" aria-label="Loading" />
            ) : (
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
            )}
          </div>
          <div className="border rounded-b-[10px] flex items-center gap-x-3 justify-end border-gray-200 bg-white py-4 px-6">
            <Button
              type="button"
              size="md"
              variant="ghost"
              visual="gray"
              onClick={next}
              disabled={profileLoading || profileError}
            >
              Skip
            </Button>
            <Button size="md" disabled={!isValid || profileLoading || profileError}>
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
              aria-label="Close"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
            This is your moment to shine!
          </h1>
          <p className="text-base text-dark-blue-400 mt-2.5">
            A killer "About Me" attracts top-tier clients and builds trust in
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
    .array(z.object({ id: z.union([z.number(), z.string()]), name: z.string() }))
    .max(100, "You have reached the maximum limit of 100 skills."),
})

type SkillsFormValues = z.infer<typeof skillsFormSchema>

const SkillsDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
  previous,
  userId,
  progressPercent,
  profile,
  profileLoading,
  profileError,
  onReloadProfile,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  userId: string
  progressPercent?: number
  profile?: UserProfile | null
  profileLoading?: boolean
  profileError?: boolean
  onReloadProfile?: () => void
}) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [query, setQuery] = React.useState("")
  const [filteredSkills, setFilteredSkills] = useState<{ id: number | string; name: string }[]>([])

  const fetchSkills = React.useCallback(async (q: string) => {
    if (!q.trim()) {
      setFilteredSkills([])
      return
    }
    try {
      const res = await fetch(
        `${getPublicApiUrl()}/autocomplete/skills?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) return
      const data = await res.json()
      const entries: { id: string; label: string }[] = Array.isArray(data) ? data : data.entries ?? data.results ?? []
      setFilteredSkills(entries.map((e) => ({ id: e.id ?? e.label, name: e.label })))
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSkills(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchSkills])
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    trigger,
    setValue,
  } = useForm<SkillsFormValues>({
    resolver: zodResolver(skillsFormSchema),
  })

  // Track which skill names already exist in DB to avoid duplicates
  const existingSkillNamesRef = React.useRef<Set<string>>(new Set())

  // Pre-fill from saved profile data
  useEffect(() => {
    if (profile?.skills?.length) {
      const mapped = profile.skills.map((s, i) => ({ id: i + 1, name: s.name }))
      setValue("skills", mapped, { shouldValidate: true })
      existingSkillNamesRef.current = new Set(profile.skills.map((s) => s.name))
    }
  }, [profile, setValue])

  const [serverError, setServerError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const onSubmit: SubmitHandler<SkillsFormValues> = async ({ skills }) => {
    setServerError(null)
    if (!userId) {
      next?.()
      return
    }
    const newSkills = skills.filter(
      (s) => !existingSkillNamesRef.current.has(s.name)
    )
    if (!newSkills.length) {
      next?.()
      return
    }
    setIsSaving(true)
    try {
      await Promise.all(
        newSkills.map((s) => UserAPI.addSkill({ name: s.name }))
      )
      newSkills.forEach((s) => existingSkillNamesRef.current.add(s.name))
      setIsSaving(false)
      next?.()
    } catch (err: any) {
      setIsSaving(false)
      const status = err?.response?.status
      const isTimeout =
        err?.code === "ECONNABORTED" ||
        /timeout/i.test(err?.message ?? "")
      if (status === 401) {
        try {
          sessionStorage.setItem(
            "complete-profile.skills.pending",
            JSON.stringify(skills.map((s) => s.name))
          )
        } catch {}
        setServerError("Your session has expired. Please sign in again.")
      } else if (isTimeout) {
        setServerError(
          "This is taking longer than usual. Please try again."
        )
      } else {
        setServerError(
          "We could not save your changes. Please try again."
        )
      }
      console.error("[skills wizard] save failed", err)
    }
  }

  const skills = useWatch({ control, name: "skills" })

  useEffect(() => {
    onFinished(Boolean(skills?.length))
  }, [skills, onFinished])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-x min-h-[567px] border-t rounded-t-[10px] p-[30px] border-gray-200 bg-gray-50">
            <div className="flex items-center gap-x-3">
              <span className="text-sm font-medium text-dark-blue-400">
                {progressPercent ?? 0}%
              </span>
              <div className="max-w-[115px] flex-auto">
                <Progress value={progressPercent ?? 0} />
              </div>
            </div>

            <div className="mt-6">
              <DialogTitle asChild>
                <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                  Skills
                </h1>
              </DialogTitle>
              {profileLoading && !profileError ? (
                <div className="mt-1 h-6 w-[280px] bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                  Share your expertise and make your profile unforgettable!
                </p>
              )}
            </div>

            {profileError && (
              <div className="mt-6 flex flex-col items-start gap-y-3">
                <p className="text-base text-dark-blue-400">Something went wrong. Please try again.</p>
                <Button type="button" variant="outlined" visual="gray" onClick={() => onReloadProfile?.()}>Retry</Button>
              </div>
            )}

            {!profileError && profileLoading && (
              <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading">
                <div className="h-11 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-[160px] bg-gray-200 rounded animate-pulse" />
              </div>
            )}

            {!profileError && !profileLoading && (
            <div className="mt-6">
              {serverError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700"
                >
                  {serverError}
                </div>
              )}
              <Controller
                name="skills"
                control={control}
                render={({ field: { value, onChange } }) => {
                  const atSkillsLimit = (value ?? []).length >= 100
                  return (
                    <>
                      <Combobox
                        className="w-full"
                        value={value}
                        onChange={(val: typeof value) => {
                          const capped = val.slice(0, 100)
                          const unique = capped.filter((s, i, arr) =>
                            arr.findIndex((x) => x.name.toLowerCase() === s.name.toLowerCase()) === i
                          )
                          onChange(unique)
                          setQuery("")
                        }}
                        multiple
                        disabled={atSkillsLimit}
                      >
                        <ComboboxTrigger>
                          <ComboboxInput
                            size="lg"
                            displayValue={() => query}
                            placeholder="Search for skills"
                            onChange={(event) => setQuery(event.target.value)}
                            invalid={hookFormHasError({ errors, name: "skills" })}
                            disabled={atSkillsLimit}
                          />
                          <ComboboxButton size="lg">
                            <SearchMd className="h-5 w-5" />
                          </ComboboxButton>
                        </ComboboxTrigger>
                        <ScaleOutIn afterLeave={() => setQuery("")}>
                          <ComboboxOptions>
                            <ScrollArea viewportClassName="max-h-[304px]">
                              {filteredSkills
                                .filter((skill) => !(value ?? []).some((s) => s.name.toLowerCase() === skill.name.toLowerCase()))
                                .map((skill) => (
                                  <ComboboxOption key={`${skill.id}-${skill.name}`} value={skill}>
                                    {skill.name}
                                  </ComboboxOption>
                                ))}
                              {(() => {
                                const q = query.trim().toLowerCase()
                                const alreadySelected = (value ?? []).some((s) => s.name.toLowerCase() === q)
                                const visibleOptions = filteredSkills.filter((skill) => !(value ?? []).some((s) => s.name.toLowerCase() === skill.name.toLowerCase()))
                                if (!q || alreadySelected || visibleOptions.length > 0) return null
                                return (
                                  <ComboboxOption value={{ id: `custom-${query.trim()}`, name: query.trim() }}>
                                    Add &ldquo;{query.trim()}&rdquo;
                                  </ComboboxOption>
                                )
                              })()}
                            </ScrollArea>
                          </ComboboxOptions>
                        </ScaleOutIn>
                      </Combobox>
                      {atSkillsLimit && (
                        <p
                          role="status"
                          aria-live="assertive"
                          className="mt-1.5 text-sm font-medium text-error-700"
                        >
                          You have reached the maximum limit of 100 skills.
                        </p>
                      )}
                    </>
                  )
                }}
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

              <ScrollArea
                viewportClassName="max-h-[200px]"
                scrollBar={<ScrollBar className="w-4 p-1" />}
              >
                <div className="mt-3 flex gap-3 flex-wrap pr-1">
                  {skills?.map((skill) => (
                    <Badge
                      key={`${skill.id}-${skill.name}`}
                      visual="primary"
                    >
                      {skill.name}
                      <button
                        type="button"
                        className="focus-visible:outline-none"
                        onClick={() => {
                          setValue(
                            "skills",
                            skills.filter((s) => s.name !== skill.name)
                          )
                          trigger()
                        }}
                      >
                        <X2 className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
            )}
          </div>
          <div className="border rounded-b-[10px] flex items-center justify-between border-gray-200 bg-white py-4 px-6">
            <Button
              className="bg-white"
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              onClick={previous}
              disabled={profileLoading || profileError}
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
                disabled={profileLoading || profileError || isSaving}
              >
                Skip
              </Button>
              <Button
                size="md"
                disabled={!isValid || profileLoading || profileError || isSaving}
                loading={isSaving}
              >
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
              aria-label="Close"
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
    id: z.string().optional(),
    employer: z
      .string()
      .min(1, "Please enter at least 1 character(s)")
      .max(200, "Employer must be 200 characters or fewer"),
    jobTitle: z
      .string()
      .min(1, "Please enter at least 1 character(s)")
      .max(120, "Job Title must be 120 characters or fewer"),
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
    jobDescription: z
      .string()
      .min(1, "Please enter at least 1 character(s)")
      .max(1000, "Job Description must be 1000 characters or fewer"),
  })
  .merge(skillsFormSchema)
  .extend({
    skills: z
      .array(
        z.object({ id: z.union([z.number(), z.string()]), name: z.string() })
      )
      .max(10, "Maximum 10 skills per work experience entry."),
  })
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
  .refine(
    (data) => {
      if (data.currentlyWorkHere) return true
      if (!data.endDate?.year || !data.endDate?.month) return true
      const start = data.startDate.year * 12 + data.startDate.month
      const end = data.endDate.year * 12 + data.endDate.month
      return end >= start
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate.year"],
    }
  )

type WorkExperienceFormValues = z.infer<typeof workExperienceFormSchema>

const workExperienceFormDefaultValues = {
  currentlyWorkHere: false,
  jobDescription: "",
  jobTitle: "",
  employer: "",
  skills: [],
} as DefaultValues<WorkExperienceFormValues>

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

const workExperienceYears: number[] = (() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 60 }, (_, i) => currentYear - i)
})()

const WorkExperienceDialog = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
  userId,
  progressPercent,
  profile,
  profileLoading,
  profileError,
  onReloadProfile,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  userId: string
  progressPercent?: number
  profile?: UserProfile | null
  profileLoading?: boolean
  profileError?: boolean
  onReloadProfile?: () => void
}) => {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = React.useState("")
  const [filteredSkills, setFilteredSkills] = useState<{ id: number | string; name: string }[]>([])

  const fetchSkills = React.useCallback(async (q: string) => {
    if (!q.trim()) {
      setFilteredSkills([])
      return
    }
    try {
      const res = await fetch(
        `${getPublicApiUrl()}/autocomplete/skills?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) return
      const data = await res.json()
      const entries: { id: string; label: string }[] = Array.isArray(data) ? data : data.entries ?? data.results ?? []
      setFilteredSkills(entries.map((e) => ({ id: e.id ?? e.label, name: e.label })))
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSkills(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchSkills])
  const [state, setState] = useState<"default" | "preview" | "action">(
    "default"
  )
  const [editingIndex, setEditingIndex] = useState<number>()
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [workExperiences, setWorkExperiences] = useUncontrolledState<
    WorkExperienceFormValues[] | undefined
  >({
    onChange: (value) => {
      onFinished?.(Boolean(value?.length))
    },
    defaultValue: undefined,
  })

  // Pre-fill from saved profile data
  useEffect(() => {
    if (profile?.experience?.length && !profileLoaded) {
      setProfileLoaded(true)
      const mapped: WorkExperienceFormValues[] = profile.experience.map(
        (exp) => {
          const [startYear, startMonth] = (exp.startDate ?? "")
            .split("-")
            .map(Number)
          const [endYear, endMonth] = (exp.endDate ?? "").split("-").map(Number)
          return {
            id: exp.id,
            employer: exp.company,
            jobTitle: exp.title,
            startDate: { month: startMonth || 1, year: startYear || 2020 },
            endDate: {
              month: endMonth || undefined,
              year: endYear || undefined,
            },
            currentlyWorkHere: Boolean(exp.isCurrentRole),
            jobDescription: exp.description ?? "",
            skills: (exp.skills ?? []).map((name, i) => ({ id: i + 1, name })),
          }
        }
      )
      setWorkExperiences(mapped)
      setState("preview")
    }
  }, [profile, profileLoaded, setWorkExperiences])
  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    trigger,
    setValue,
    register,
    reset,
  } = useForm<WorkExperienceFormValues>({
    resolver: zodResolver(workExperienceFormSchema),
    mode: "onChange",
    defaultValues: workExperienceFormDefaultValues,
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const onSubmit: SubmitHandler<WorkExperienceFormValues> = async (values) => {
    setServerError(null)
    const payload: ExperiencePayload = {
      company: values.employer,
      title: values.jobTitle,
      startDate: `${values.startDate.year}-${String(values.startDate.month).padStart(2, "0")}-01`,
      endDate: values.currentlyWorkHere
        ? undefined
        : values.endDate?.year && values.endDate?.month
          ? `${values.endDate.year}-${String(values.endDate.month).padStart(2, "0")}-01`
          : undefined,
      isCurrentRole: values.currentlyWorkHere,
      description: values.jobDescription,
      skills: values.skills.map((s) => s.name),
    }
    try {
      if (editingIndex !== undefined) {
        const editingExp = workExperiences?.[editingIndex]
        let savedId = editingExp?.id
        if (editingExp?.id) {
          await UserAPI.updateExperience(editingExp.id, payload)
        } else if (userId) {
          const res = await UserAPI.addExperience(payload)
          savedId = res?.data?.id ?? undefined
        }
        setWorkExperiences(
          workExperiences?.map((workExperience, index) =>
            index === editingIndex
              ? { ...values, id: savedId ?? workExperience.id }
              : workExperience
          )
        )
        setEditingIndex(undefined)
      } else {
        let savedId: string | undefined
        if (userId) {
          const res = await UserAPI.addExperience(payload)
          savedId = res?.data?.id ?? undefined
        }
        setWorkExperiences((prev) =>
          prev ? [...prev, { ...values, id: savedId }] : [{ ...values, id: savedId }]
        )
      }
      reset()
      setState("preview")
    } catch {
      setServerError(
        "We couldn't save your work experience. Please try again."
      )
    }
  }

  const skillsField = useWatch({ control, name: "skills" })
  const jobDescriptionField = useWatch({ control, name: "jobDescription" })
  const currentlyWorkHereField = useWatch({
    control,
    name: "currentlyWorkHere",
  })
  useEffect(() => {
    if (currentlyWorkHereField) {
      setValue("endDate.month", undefined as any, {
        shouldDirty: true,
        shouldValidate: true,
      })
      setValue("endDate.year", undefined as any, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [currentlyWorkHereField, setValue])
  const submitTriggerRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={cn(
          "max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]",
          state === "action" && "grid-cols-5"
        )}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={cn(
            "transition-all duration-300 min-w-0",
            state === "action" && "col-span-3"
          )}
        >
          <div className="border-x border-t rounded-t-[10px] pt-[30px] border-gray-200 bg-gray-50">
            <div className="px-[30px]">
              {state !== "action" ? (
                <div className="flex items-start justify-between">
                  <div className="max-w-[157px] flex-auto flex items-center gap-x-3">
                    <span className="text-sm font-medium text-dark-blue-400">
                      {progressPercent ?? 0}%
                    </span>
                    <div className="max-w-[115px] flex-auto">
                      <Progress value={progressPercent ?? 0} />
                    </div>
                  </div>

                  {state === "preview" && (
                    <Button
                      onClick={() => {
                        setEditingIndex(undefined)
                        reset(workExperienceFormDefaultValues)
                        setState("action")
                      }}
                      className="bg-white"
                      variant="outlined"
                      visual="gray"
                      type="button"
                    >
                      <Plus className="size-[15px]" />
                      Add Work Experience
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="text-dark-blue-400"
                  onClick={() => {
                    if (isDirty) {
                      setIsOpen(true)
                    } else {
                      setEditingIndex(undefined)
                      reset()
                      Boolean(workExperiences?.length)
                        ? setState("preview")
                        : setState("default")
                    }
                  }}
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
              <DialogTitle asChild>
                <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                  Work Experience
                </h1>
              </DialogTitle>
              {state === "default" && profileLoading && !profileError ? (
                <div className="mt-1 h-6 w-[280px] bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                  Tell us where you&apos;ve worked before!
                </p>
              )}
            </div>

            <ScrollArea
              scrollBar={<ScrollBar className="w-4 p-1" />}
              className="h-[400px] px-[26px]"
            >
              <div className="pb-[30px] px-1">
                <div className="mt-6">
                  {state === "default" && profileError && (
                    <div className="flex flex-col items-start gap-y-3">
                      <p className="text-base text-dark-blue-400">Something went wrong. Please try again.</p>
                      <Button
                        type="button"
                        variant="outlined"
                        visual="gray"
                        onClick={() => onReloadProfile?.()}
                      >
                        Retry
                      </Button>
                    </div>
                  )}

                  {state === "default" && !profileError && profileLoading && (
                    <div className="space-y-3" aria-busy="true" aria-label="Loading">
                      <div className="h-9 w-[200px] bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-[260px] bg-gray-200 rounded animate-pulse" />
                    </div>
                  )}

                  {state === "default" && !profileError && !profileLoading && (
                    <Button
                      onClick={() => {
                        setEditingIndex(undefined)
                        reset(workExperienceFormDefaultValues)
                        setState("action")
                      }}
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
                      {workExperiences
                        ?.map((workExperience, index) => ({
                          workExperience,
                          index,
                        }))
                        .sort((a, b) => {
                          if (
                            a.workExperience.currentlyWorkHere !==
                            b.workExperience.currentlyWorkHere
                          )
                            return a.workExperience.currentlyWorkHere ? -1 : 1
                          return (
                            (b.workExperience.startDate?.year ?? 0) -
                              (a.workExperience.startDate?.year ?? 0) ||
                            (b.workExperience.startDate?.month ?? 0) -
                              (a.workExperience.startDate?.month ?? 0)
                          )
                        })
                        .map(({ workExperience, index }) => (
                        <WorkExperienceCard
                          onRemove={() => {
                            const updated = workExperiences?.filter(
                              (_, i) => i !== index
                            )
                            setWorkExperiences(
                              updated?.length ? updated : undefined
                            )
                            if (!updated?.length) setState("default")
                          }}
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
                      {serverError && (
                        <div
                          role="alert"
                          className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700"
                        >
                          {serverError}
                        </div>
                      )}
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
                            onBlur={(e) => {
                              setValue(
                                "employer",
                                capitalizeCompanyName(e.target.value)
                              )
                            }}
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
                            onBlur={(e) => {
                              setValue(
                                "jobTitle",
                                formatJobTitle(e.target.value)
                              )
                            }}
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
                                  <Listbox
                                    value={value}
                                    onChange={(v) => {
                                      onChange(v)
                                      trigger("endDate.year")
                                    }}
                                  >
                                    <ListboxButton
                                      placeholder="Month"
                                      displayValue={(value: number) =>
                                        months.find((m) => m.value === value)
                                          ?.name ?? ""
                                      }
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
                                        {months.map((m) => (
                                          <ListboxOption key={m.value} value={m.value}>
                                            {m.value}
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
                                  <Listbox
                                    value={value}
                                    onChange={(v) => {
                                      onChange(v)
                                      trigger("endDate.year")
                                    }}
                                  >
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
                                        {workExperienceYears.map((year) => (
                                          <ListboxOption
                                            key={year}
                                            value={year}
                                          >
                                            {year}
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
                                  <Listbox
                                    key={`end-month-${currentlyWorkHereField}`}
                                    value={value}
                                    onChange={(v) => {
                                      onChange(v)
                                      trigger("endDate.year")
                                    }}
                                  >
                                    <ListboxButton
                                      placeholder="Month"
                                      displayValue={(value: number) =>
                                        months.find((m) => m.value === value)
                                          ?.name ?? ""
                                      }
                                      isInvalid={hookFormHasError({
                                        errors,
                                        name: "endDate.month",
                                      })}
                                    />
                                    <ListboxOptions>
                                      <ScrollArea
                                        viewportClassName="max-h-[304px]"
                                        scrollBar={
                                          <ScrollBar className="w-4 p-1" />
                                        }
                                      >
                                        {months.map((m) => (
                                          <ListboxOption key={m.value} value={m.value}>
                                            {m.value}
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
                                  <Listbox
                                    key={`end-year-${currentlyWorkHereField}`}
                                    value={value}
                                    onChange={(v) => {
                                      onChange(v)
                                      trigger("endDate.year")
                                    }}
                                  >
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
                                        {workExperienceYears.map((year) => (
                                          <ListboxOption
                                            key={year}
                                            value={year}
                                          >
                                            {year}
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
                          <div className="flex items-start justify-between gap-x-2">
                            <HookFormErrorMessage
                              name="jobDescription"
                              errors={errors}
                              render={({ message }) => (
                                <ErrorMessage size="sm">{message}</ErrorMessage>
                              )}
                            />
                            <span
                              className={cn(
                                "ml-auto text-xs font-light text-gray-500",
                                (jobDescriptionField?.length ?? 0) > 1000 &&
                                  "text-error-600 font-medium"
                              )}
                            >
                              {jobDescriptionField?.length ?? 0} / 1000
                            </span>
                          </div>
                        </div>
                      </div>

                      <Controller
                        name="skills"
                        control={control}
                        render={({ field: { value, onChange } }) => {
                          const atSkillsLimit = (value ?? []).length >= 10
                          return (
                          <>
                          <Combobox
                            className="w-full mt-[30px]"
                            value={value}
                            onChange={(val: typeof value) => {
                              const unique = val.filter((s, i, arr) =>
                                arr.findIndex((x) => x.name.toLowerCase() === s.name.toLowerCase()) === i
                              )
                              onChange(unique.slice(0, 10))
                              setQuery("")
                            }}
                            multiple
                          >
                            <ComboboxTrigger>
                              <ComboboxInput
                                size="lg"
                                displayValue={() => query}
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
                                  {filteredSkills
                                    .filter((skill) => !(value ?? []).some((s) => s.name.toLowerCase() === skill.name.toLowerCase()))
                                    .map((skill) => (
                                      <ComboboxOption
                                        key={`${skill.id}-${skill.name}`}
                                        value={skill}
                                      >
                                        {skill.name}
                                      </ComboboxOption>
                                    ))}
                                  {(() => {
                                    const q = query.trim().toLowerCase()
                                    const alreadySelected = (value ?? []).some((s) => s.name.toLowerCase() === q)
                                    const visibleOptions = filteredSkills.filter((skill) => !(value ?? []).some((s) => s.name.toLowerCase() === skill.name.toLowerCase()))
                                    if (!q || alreadySelected || visibleOptions.length > 0) return null
                                    return (
                                      <ComboboxOption value={{ id: `custom-${query.trim()}`, name: query.trim() }}>
                                        Add &ldquo;{query.trim()}&rdquo;
                                      </ComboboxOption>
                                    )
                                  })()}
                                </ScrollArea>
                              </ComboboxOptions>
                            </ScaleOutIn>
                          </Combobox>
                          {atSkillsLimit && (
                            <p
                              role="status"
                              aria-live="assertive"
                              className="mt-1.5 text-sm font-medium text-error-700"
                            >
                              Maximum 10 skills per work experience entry.
                            </p>
                          )}
                          </>
                          )
                        }}
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
                          <Badge
                            key={`${skill.id}-${skill.name}`}
                            visual="primary"
                          >
                            {skill.name}
                            <button
                              type="button"
                              className="focus-visible:outline-none"
                              onClick={() => {
                                setValue(
                                  "skills",
                                  skillsField.filter(
                                    (s) => s.name !== skill.name
                                  )
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
                  disabled={profileLoading || profileError}
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
                    disabled={profileLoading || profileError}
                  >
                    Skip
                  </Button>
                  <Button
                    size="md"
                    type="button"
                    onClick={next}
                    disabled={!Boolean(workExperiences?.length) || profileLoading || profileError}
                  >
                    Save & Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    if (isDirty) {
                      setIsOpen(true)
                    } else {
                      setEditingIndex(undefined)
                      reset()
                      Boolean(workExperiences?.length)
                        ? setState("preview")
                        : setState("default")
                    }
                  }}
                  variant="link"
                  visual="gray"
                  type="button"
                >
                  <X className="size-[15px]" /> Cancel
                </Button>
                <Button
                  ref={submitTriggerRef}
                  type="submit"
                  disabled={!isValid}
                >
                  Save
                </Button>

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
              aria-label="Close"
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
    id: z.string().optional(),
    schoolOrUniversity: z
      .string()
      .min(1, "Please enter at least 1 character(s)"),
    degree: z.string().min(1, "Please enter at least 1 character(s)"),
    major: z.string().optional(),
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
  .refine(
    (data) => {
      if (data.currentlyAttending) return true
      if (!data.endDate?.year || !data.endDate?.month) return true
      const start = data.startDate.year * 12 + data.startDate.month
      const end = data.endDate.year * 12 + data.endDate.month
      return end >= start
    },
    {
      message: "End date must be on or after the start date.",
      path: ["endDate.year"],
    }
  )

type EducationFormValues = z.infer<typeof educationFormSchema>

const educationFormDefaultValues = {
  currentlyAttending: false,
  degree: "",
  major: "",
  schoolOrUniversity: "",
} as EducationFormValues

const EducationDialog = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
  userId,
  progressPercent,
  profile,
  profileLoading,
  profileError,
  onReloadProfile,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  userId: string
  progressPercent?: number
  profile?: UserProfile | null
  profileLoading?: boolean
  profileError?: boolean
  onReloadProfile?: () => void
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
    formState: { errors, isValid, isDirty },
    register,
    reset,
    trigger,
    setValue: setFormValue,
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    mode: "onChange",
    defaultValues: educationFormDefaultValues,
  })
  const [state, setState] = useState<"default" | "preview" | "action">(
    "default"
  )
  const [editingIndex, setEditingIndex] = useState<number>()
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [educationQualifications, setEducationQualifications] =
    useUncontrolledState<EducationFormValues[] | undefined>({
      defaultValue: undefined,
      onChange: (value) => onFinished?.(Boolean(value?.length)),
    })

  // Pre-fill from saved profile data
  useEffect(() => {
    if (profile?.education?.length && !profileLoaded) {
      setProfileLoaded(true)
      const mapped: EducationFormValues[] = profile.education.map((edu) => {
        return {
          id: edu.id,
          schoolOrUniversity: edu.school,
          degree: edu.degree,
          major: edu.fieldOfStudy ?? "",
          startDate: {
            month: edu.startMonth ?? 1,
            year: edu.startYear || 2020,
          },
          endDate: {
            month: edu.endMonth ?? undefined,
            year: edu.endYear ?? undefined,
          },
          currentlyAttending: Boolean(edu.currentlyStudying),
        }
      })
      setEducationQualifications(mapped)
      setState("preview")
    }
  }, [profile, profileLoaded, setEducationQualifications])

  const [serverError, setServerError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveError = (err: any) => {
    const status = err?.response?.status
    const isTimeout =
      err?.code === "ECONNABORTED" ||
      /timeout/i.test(err?.message ?? "")
    if (status === 401) {
      setServerError("Your session has expired. Please sign in again.")
    } else if (isTimeout) {
      setServerError("This is taking longer than usual. Please try again.")
    } else {
      setServerError("We could not save your changes. Please try again.")
    }
  }

  const onSubmit: SubmitHandler<EducationFormValues> = async (values) => {
    setServerError(null)
    const payload: EducationPayload = {
      school: values.schoolOrUniversity,
      degree: values.degree,
      fieldOfStudy: values.major,
      startYear: values.startDate.year,
      startMonth: values.startDate.month,
      endYear: values.currentlyAttending ? undefined : values.endDate?.year,
      endMonth: values.currentlyAttending ? undefined : values.endDate?.month,
      currentlyStudying: values.currentlyAttending,
    }
    setIsSaving(true)
    try {
      if (editingIndex !== undefined) {
        const editingEdu = educationQualifications?.[editingIndex]
        if (editingEdu?.id) {
          await UserAPI.updateEducation(editingEdu.id, payload)
          setEducationQualifications(
            educationQualifications?.map((qualification, index) =>
              index === editingIndex
                ? { ...values, id: qualification.id }
                : qualification
            )
          )
        } else if (userId) {
          const res = await UserAPI.addEducation(payload)
          const newId = res?.data?.id
          setEducationQualifications(
            educationQualifications?.map((qualification, index) =>
              index === editingIndex
                ? { ...values, id: newId ?? qualification.id }
                : qualification
            )
          )
        }
        setEditingIndex(undefined)
      } else if (userId) {
        const res = await UserAPI.addEducation(payload)
        const newId = res?.data?.id
        setEducationQualifications((prev) =>
          prev ? [...prev, { ...values, id: newId }] : [{ ...values, id: newId }]
        )
      } else {
        setEducationQualifications((prev) =>
          prev ? [...prev, values] : [values]
        )
      }
      reset()
      setState("preview")
    } catch (err) {
      handleSaveError(err)
      console.error("[education wizard] save failed", err)
    } finally {
      setIsSaving(false)
    }
  }

  const currentlyAttending = useWatch({ control, name: "currentlyAttending" })
  useEffect(() => {
    if (currentlyAttending) {
      setFormValue("endDate.month", undefined as any, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      })
      setFormValue("endDate.year", undefined as any, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      })
    }
  }, [currentlyAttending, setFormValue])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <div className="border-x min-h-[567px] border-t rounded-t-[10px] p-[30px] border-gray-200 bg-gray-50">
              {state !== "action" ? (
                <div className="flex items-start justify-between">
                  <div className="max-w-[157px] flex-auto flex items-center gap-x-3">
                    <span className="text-sm font-medium text-dark-blue-400">
                      {progressPercent ?? 0}%
                    </span>
                    <div className="max-w-[115px] flex-auto">
                      <Progress value={progressPercent ?? 0} />
                    </div>
                  </div>

                  {state === "preview" && (
                    <Button
                      onClick={() => {
                        setEditingIndex(undefined)
                        reset(educationFormDefaultValues)
                        setState("action")
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
                  onClick={() => {
                    if (isDirty) {
                      setIsOpen(true)
                    } else {
                      setEditingIndex(undefined)
                      reset()
                      Boolean(educationQualifications?.length)
                        ? setState("preview")
                        : setState("default")
                    }
                  }}
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
                <DialogTitle asChild>
                  <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                    Education
                  </h1>
                </DialogTitle>
                {state === "default" && profileLoading && !profileError ? (
                  <div className="mt-1 h-6 w-[280px] bg-gray-200 rounded animate-pulse" />
                ) : (
                  <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                    Show your qualifications to give clients confidence.
                  </p>
                )}
              </div>

              <div className="mt-6">
                {state === "default" && profileError && (
                  <div className="flex flex-col items-start gap-y-3">
                    <p className="text-base text-dark-blue-400">Something went wrong. Please try again.</p>
                    <Button type="button" variant="outlined" visual="gray" onClick={() => onReloadProfile?.()}>Retry</Button>
                  </div>
                )}

                {state === "default" && !profileError && profileLoading && (
                  <div className="space-y-3" aria-busy="true" aria-label="Loading">
                    <div className="h-9 w-[200px] bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-[260px] bg-gray-200 rounded animate-pulse" />
                  </div>
                )}

                {state === "default" && !profileError && !profileLoading && (
                  <Button
                    onClick={() => {
                      setEditingIndex(undefined)
                      reset(educationFormDefaultValues)
                      setState("action")
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

                {state === "preview" && (
                  <div className="space-y-3">
                    {educationQualifications
                      ?.map((qualification, index) => ({
                        qualification,
                        index,
                      }))
                      .sort((a, b) => {
                        if (
                          a.qualification.currentlyAttending !==
                          b.qualification.currentlyAttending
                        )
                          return a.qualification.currentlyAttending ? -1 : 1
                        return (
                          (b.qualification.startDate?.year ?? 0) -
                            (a.qualification.startDate?.year ?? 0) ||
                          (b.qualification.startDate?.month ?? 0) -
                            (a.qualification.startDate?.month ?? 0)
                        )
                      })
                      .map(({ qualification, index }) => (
                      <EducationCard
                        onRemove={() => {
                          const updated = educationQualifications?.filter(
                            (_, i) => i !== index
                          )
                          setEducationQualifications(
                            updated?.length ? updated : undefined
                          )
                          if (!updated?.length) setState("default")
                        }}
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
                    {serverError && (
                      <div
                        role="alert"
                        aria-live="assertive"
                        className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700"
                      >
                        {serverError}
                      </div>
                    )}
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
                                  "High School Diploma",
                                  "Associate's Degree",
                                  "Bachelor's Degree",
                                  "Master's Degree",
                                  "Doctoral Degree (PhD)",
                                  "Professional Degree (MD, JD, etc.)",
                                  "Certificate",
                                  "Other",
                                ].map((degree) => (
                                  <ListboxOption key={degree} value={degree}>
                                    {degree}
                                  </ListboxOption>
                                ))}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                        <HookFormErrorMessage
                          name="degree"
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
                                <Listbox
                                  value={value}
                                  onChange={(v) => {
                                    onChange(v)
                                    trigger("endDate.year")
                                  }}
                                >
                                  <ListboxButton
                                    displayValue={(value: number) =>
                                      months.find((m) => m.value === value)
                                        ?.name ?? ""
                                    }
                                    placeholder="Month"
                                    isInvalid={hookFormHasError({
                                      errors,
                                      name: "startDate.month",
                                    })}
                                  />
                                  <ListboxOptions>
                                    {months.map((m) => (
                                      <ListboxOption key={m.value} value={m.value}>
                                        {m.value}
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
                                <Listbox
                                  value={value}
                                  onChange={(v) => {
                                    onChange(v)
                                    trigger("endDate.year")
                                  }}
                                >
                                  <ListboxButton
                                    displayValue={(value: number) => `${value}`}
                                    placeholder="Year"
                                    isInvalid={hookFormHasError({
                                      errors,
                                      name: "startDate.year",
                                    })}
                                  />
                                  <ListboxOptions>
                                    {workExperienceYears.map((year) => (
                                      <ListboxOption key={year} value={year}>
                                        {year}
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
                                <Listbox
                                  key={`edu-wiz-end-month-${currentlyAttending}`}
                                  value={value ?? null}
                                  onChange={(v) => {
                                    onChange(v)
                                    trigger("endDate.year")
                                  }}
                                >
                                  <ListboxButton
                                    displayValue={(value: number) =>
                                      months.find((m) => m.value === value)
                                        ?.name ?? ""
                                    }
                                    placeholder="Month"
                                    isInvalid={hookFormHasError({
                                      errors,
                                      name: "endDate.month",
                                    })}
                                  />
                                  <ListboxOptions>
                                    {months.map((m) => (
                                      <ListboxOption key={m.value} value={m.value}>
                                        {m.value}
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
                                <Listbox
                                  key={`edu-wiz-end-year-${currentlyAttending}`}
                                  value={value ?? null}
                                  onChange={(v) => {
                                    onChange(v)
                                    trigger("endDate.year")
                                  }}
                                >
                                  <ListboxButton
                                    displayValue={(value: number) => `${value}`}
                                    placeholder="Year"
                                    isInvalid={hookFormHasError({
                                      errors,
                                      name: "endDate.year",
                                    })}
                                  />
                                  <ListboxOptions>
                                    {workExperienceYears.map((year) => (
                                      <ListboxOption key={year} value={year}>
                                        {year}
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
                  disabled={profileLoading || profileError}
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
                    disabled={profileLoading || profileError}
                  >
                    Skip
                  </Button>
                  <Button
                    size="md"
                    type="button"
                    disabled={!Boolean(educationQualifications?.length) || profileLoading || profileError}
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
                    if (isDirty) {
                      setIsOpen(true)
                    } else {
                      setEditingIndex(undefined)
                      reset()
                      Boolean(educationQualifications?.length)
                        ? setState("preview")
                        : setState("default")
                    }
                  }}
                  variant="link"
                  visual="gray"
                  type="button"
                >
                  <X className="size-[15px]" /> Cancel
                </Button>

                <Button
                  ref={submitTriggerRef}
                  type="submit"
                  disabled={!isValid || isSaving}
                  loading={isSaving}
                >
                  Save
                </Button>

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
              aria-label="Close"
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
              "I value freelancers who have a complete education section. It
              shows dedication and makes me feel secure in their qualifications.
              It’s not just about skills; it’s about the foundation behind
              them."
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

const Portfolio = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
  progressPercent,
  profileLoading,
  profileError,
  onReloadProfile,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  progressPercent?: number
  profileLoading?: boolean
  profileError?: boolean
  onReloadProfile?: () => void
}) => {
  const [open, setOpen] = useControllableState({
    value: opened,
    onChange: onOpenedChange,
    defaultValue: false,
  })
  const [caseStudyOpen, setCaseStudyOpen] = useState(false)
  const [portfolioItems, setPortfolioItems] = useState<string[]>([])

  return (
    <>
      <Dialog open={caseStudyOpen} onOpenChange={setCaseStudyOpen}>
        <DialogContent
          variant="unanimated"
          className="inset-0 h-full z-[100] bg-white p-0 overflow-y-auto"
        >
          <DialogTitle className="sr-only">Case Study Builder</DialogTitle>
          <CaseStudyBuilder
            onClose={() => setCaseStudyOpen(false)}
            onSave={() => {
              setPortfolioItems((prev) => [
                ...prev,
                `Case Study ${prev.length + 1}`,
              ])
              onFinished?.(true)
              setCaseStudyOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]">
          <form>
            <div className="border-x min-h-[567px] border-t rounded-t-[10px] p-[30px] border-gray-200 bg-gray-50">
              <div className="flex items-center gap-x-3">
                <span className="text-sm font-medium text-dark-blue-400">
                  {progressPercent ?? 0}%
                </span>
                <div className="max-w-[115px] flex-auto">
                  <Progress value={progressPercent ?? 0} />
                </div>
              </div>

              <div className="mt-6">
                <DialogTitle asChild>
                  <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                    Portfolio
                  </h1>
                </DialogTitle>
                {profileLoading && !profileError ? (
                  <div className="mt-1 h-6 w-[280px] bg-gray-200 rounded animate-pulse" />
                ) : (
                  <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                    Show the quality and style that clients are looking for.
                  </p>
                )}
              </div>

              {profileError && (
                <div className="mt-6 flex flex-col items-start gap-y-3">
                  <p className="text-base text-dark-blue-400">Something went wrong. Please try again.</p>
                  <Button type="button" variant="outlined" visual="gray" onClick={() => onReloadProfile?.()}>Retry</Button>
                </div>
              )}

              {!profileError && profileLoading && (
                <div className="mt-6 grid grid-cols-2 gap-3" aria-busy="true" aria-label="Loading">
                  <div className="h-[150px] bg-gray-200 rounded animate-pulse" />
                  <div className="h-[150px] bg-gray-200 rounded animate-pulse" />
                </div>
              )}

              {!profileError && !profileLoading && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {portfolioItems.map((item, index) => (
                  <article
                    key={index}
                    className="h-[150px] bg-white gap-y-2 flex items-center flex-col justify-center border border-gray-200 p-6 rounded-[5px]"
                  >
                    <div className="size-10 shrink-0 rounded-full border-2 border-success-500 inline-flex items-center justify-center text-success-500">
                      <Check className="size-4" />
                    </div>
                    <h3 className="text-center text-sm font-semibold text-dark-blue-400">
                      {item}
                    </h3>
                    <button
                      type="button"
                      className="text-xs text-error-500 hover:underline"
                      onClick={() => {
                        const updated = portfolioItems.filter(
                          (_, i) => i !== index
                        )
                        setPortfolioItems(updated)
                        if (updated.length === 0) onFinished?.(false)
                      }}
                    >
                      Remove
                    </button>
                  </article>
                ))}
                <button
                  type="button"
                  className="h-[150px] bg-white gap-y-3 flex items-center flex-col justify-center border border-gray-300 border-dashed p-6 rounded-[5px] hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  onClick={() => setCaseStudyOpen(true)}
                >
                  <div className="size-[52px] rounded-full text-white shrink-0 border-[12px] border-gray-200 bg-gray-400 inline-flex items-center justify-center">
                    <Plus className="size-[21px]" />
                  </div>

                  <h3 className="text-center text-sm font-semibold text-gray-400">
                    Add a project
                  </h3>
                </button>
              </div>
              )}
            </div>
            <div className="border rounded-b-[10px] flex items-center justify-between border-gray-200 bg-white py-4 px-6">
              <Button
                className="bg-white"
                size="md"
                variant="outlined"
                visual="gray"
                type="button"
                onClick={previous}
                disabled={profileLoading || profileError}
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
                  disabled={profileLoading || profileError}
                >
                  Skip
                </Button>
                <Button
                  size="md"
                  type="button"
                  disabled={portfolioItems.length === 0 || profileLoading || profileError}
                  onClick={() => {
                    onFinished?.(true)
                    next?.()
                  }}
                >
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
                aria-label="Close"
              >
                <X className="size-5" />
              </IconButton>
            </DialogClose>
            <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
              Show Off Your Best Work!
            </h1>
            <p className="text-base text-dark-blue-400 mt-2.5">
              Your portfolio isn’t just a section, it’s the proof that you’re
              the real deal. It’s where talent meets results and leaves clients
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
    </>
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

const Congratulations = ({
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
                  <Button variant="link" size="lg" asChild>
                    <a href="/help">View FAQs</a>
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
              aria-label="Close"
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
              {[
                {
                  icon: (
                    <CreditCard02 className="shrink-0 size-8 text-dark-blue-400" />
                  ),
                  label: "Set up payments",
                  href: "/talent-dashboard",
                },
                {
                  icon: (
                    <Search className="shrink-0 size-8 text-dark-blue-400" />
                  ),
                  label: "Find open projects",
                  href: "/search",
                },
                {
                  icon: (
                    <UsersPlus className="shrink-0 size-8 text-dark-blue-400" />
                  ),
                  label: "Join a team",
                  href: "/search",
                },
                {
                  icon: (
                    <Briefcase02 className="shrink-0 size-8 text-dark-blue-400" />
                  ),
                  label: "Create a new project",
                  href: "/submit-project",
                },
                {
                  icon: (
                    <RefreshCw className="shrink-0 size-8 text-dark-blue-400" />
                  ),
                  label: "Start a new service",
                  href: "/talent-dashboard",
                },
                {
                  icon: (
                    <UserPlus01 className="shrink-0 size-8 text-dark-blue-400" />
                  ),
                  label: "Set up my account",
                  href: "/account-settings",
                },
              ].map(({ icon, label, href }) => (
                <li key={label}>
                  <DialogClose asChild>
                    <a
                      href={href}
                      className="flex items-center gap-x-[15px] border border-gray-300 p-[15px] rounded-lg bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      {icon}
                      <span className="text-lg font-semibold leading-none text-dark-blue-400">
                        {label}
                      </span>
                      <ChevronRight className="ml-auto size-5 text-gray-400" />
                    </a>
                  </DialogClose>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-[30px] flex items-center justify-center">
            <DialogClose asChild>
              <a
                href="/talent-dashboard"
                className="inline-flex items-center gap-x-2 text-xl text-dark-blue-400 hover:underline"
              >
                <Home03 className="size-[18px]" />
                Go to Dashboard
              </a>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const SaveWorkEducation = () => {
  return (
    <Dialog>
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

const DeleteWorkExperience = () => {
  return (
    <Dialog>
      <DialogContent className="max-w-[409px] p-0">
        <div className="p-6">
          <DialogTitle className="text-dark-blue-400">
            Delete Work Experience
          </DialogTitle>
          <DialogDescription className="text-dark-blue-400 mt-2">
            Your "Senior UX / UI Designer" job will be removed. This cannot be
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

const SaveEducationQualification = () => {
  return (
    <Dialog>
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

const DeleteEducation = () => {
  return (
    <Dialog>
      <DialogContent className="max-w-[409px] p-0">
        <div className="p-6">
          <DialogTitle className="text-dark-blue-400">
            Delete Education?
          </DialogTitle>
          <DialogDescription className="text-dark-blue-400 mt-2">
            Your "University of Florida" education will be removed. This cannot
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

const WorkExperienceCard = ({
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
      <div className="border size-[55px] shrink-0 inline-flex items-center justify-center rounded-lg border-gray-200 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] overflow-hidden relative">
        <span className="absolute inset-0 inline-flex items-center justify-center text-lg font-bold text-gray-400">
          {employer?.charAt(0)?.toUpperCase() || "W"}
        </span>
        {(() => {
          const brand = getCompanyBrandFromName(employer)
          if (brand?.type === "component") {
            return <brand.Icon className="size-9 relative bg-white" />
          }
          if (brand?.type === "remote-svg") {
            return (
              <img
                key={brand.url}
                src={brand.url}
                alt={employer || brand.name}
                width={36}
                height={36}
                className="object-contain size-9 relative bg-white"
                loading="lazy"
                data-fallback="0"
                onError={(e) => {
                  const el = e.currentTarget
                  if (el.dataset.fallback === "0") {
                    el.dataset.fallback = "1"
                    el.src = brand.faviconUrl
                  } else {
                    el.style.display = "none"
                  }
                }}
              />
            )
          }
          return null
        })()}
      </div>
      <div className="flex-auto min-w-0">
        <div className="flex items-start justify-between">
          <h1 className="text-base leading-none font-bold text-dark-blue-400">
            {jobTitle}
          </h1>

          <div className="inline-flex items-center gap-x-2">
            <IconButton
              className="text-gray-400 rounded-full"
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
                  className="text-gray-400 rounded-full hover:text-error-500 hover:bg-error-50"
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
                    Delete Work Experience
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    Your &ldquo;{jobTitle}&rdquo; job will be removed. This
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
            {capitalizeCompanyName(employer)}
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
          {formatExperienceDuration(startDate, endDate, currentlyWorkHere) && (
            <>
              <span className="inline-block shrink-0 size-1 rounded-full bg-gray-300" />
              <span className="text-[12px] leading-none font-semibold text-dark-blue-400">
                {formatExperienceDuration(
                  startDate,
                  endDate,
                  currentlyWorkHere
                )}
              </span>
            </>
          )}
        </div>

        <div className="mt-3 min-w-0 overflow-hidden">
          <p className="text-sm leading-none text-dark-blue-400 line-clamp-2 break-all">
            {jobDescription}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {skills?.map((skill) => (
            <Badge
              key={`${skill.id}-${skill.name}`}
              visual="gray"
              className="max-w-full break-all"
            >
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

const EducationCard = ({
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
      <div className="border size-[55px] shrink-0 inline-flex items-center justify-center rounded-lg border-gray-200 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] overflow-hidden relative">
        <span className="absolute inset-0 inline-flex items-center justify-center text-lg font-bold text-gray-400">
          {schoolOrUniversity?.charAt(0)?.toUpperCase() || "E"}
        </span>
        {(() => {
          const brand = getCompanyBrandFromName(schoolOrUniversity, {
            faviconTld: "edu",
          })
          if (brand?.type === "component") {
            return <brand.Icon className="size-9 relative bg-white" />
          }
          if (brand?.type === "remote-svg") {
            return (
              <img
                key={brand.url}
                src={brand.url}
                alt={schoolOrUniversity || brand.name}
                width={36}
                height={36}
                className="object-contain size-9 relative bg-white"
                loading="lazy"
                data-fallback="0"
                onError={(e) => {
                  const el = e.currentTarget
                  if (el.dataset.fallback === "0") {
                    el.dataset.fallback = "1"
                    el.src = brand.faviconUrl
                  } else {
                    el.style.display = "none"
                  }
                }}
              />
            )
          }
          return null
        })()}
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
              className="text-gray-400 rounded-full"
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
                  className="text-gray-400 rounded-full hover:text-error-500 hover:bg-error-50"
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
                    Your &ldquo;{schoolOrUniversity}&rdquo; education will be
                    removed. This cannot be undone.
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
      </div>
    </article>
  )
}
