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

const DIALOG_NAMES = [
  "ABOUT-ME",
  "SKILLS",
  "WORK-EXPERIENCE",
  "EDUCATION",
  "PORTFOLIO",
  "JOB_TITLE_RATE",
  "CONGRATULATIONS",
] as const

const content = {
  "ABOUT-ME": {
    icon: <User className="size-5" />,
    title: "About Me",
    desc: "Create a connection and let clients feel like they already know you",
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
  PORTFOLIO: {
    icon: <Palette className="size-5" />,
    title: "Portfolio",
    desc: "Show the quality and style that clients are looking for",
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

export const StatusDialog = ({
  onOpenChange,
  open,
  onCompletionChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCompletionChange?: (percentage: number) => void
}) => {
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

  const [isOpen, setIsOpen] = useControllableState({
    value: open,
    onChange: onOpenChange,
    defaultValue: false,
  })

  useEffect(() => {
    Promise.allSettled([
      UserAPI.me(),
      UserAPI.skills.list(),
      UserAPI.experiences.list(),
      UserAPI.education.list(),
      UserAPI.portfolio.list(),
    ]).then(([meRes, skillsRes, expRes, eduRes, portfolioRes]) => {
      const me = meRes.status === "fulfilled" ? meRes.value.data : null
      const skills =
        skillsRes.status === "fulfilled" ? skillsRes.value.data : []
      const experiences =
        expRes.status === "fulfilled" ? expRes.value.data.experiences : []
      const education = eduRes.status === "fulfilled" ? eduRes.value.data : []
      const portfolio =
        portfolioRes.status === "fulfilled" ? portfolioRes.value.data : []

      setDialogsState((prev) => ({
        ...prev,
        "ABOUT-ME": { ...prev["ABOUT-ME"], finished: Boolean(me?.overview) },
        PORTFOLIO: {
          ...prev["PORTFOLIO"],
          finished: Boolean(portfolio?.length),
        },
        SKILLS: { ...prev["SKILLS"], finished: Boolean(skills?.length) },
        "WORK-EXPERIENCE": {
          ...prev["WORK-EXPERIENCE"],
          finished: Boolean(experiences?.length),
        },
        EDUCATION: {
          ...prev["EDUCATION"],
          finished: Boolean(education?.length),
        },
        JOB_TITLE_RATE: {
          ...prev["JOB_TITLE_RATE"],
          finished: Boolean(me?.recentJobTitle || me?.rate_min || me?.rate_max),
        },
      }))
    })
  }, [])

  const completionPercentage = Math.round(
    ((Object.keys(content) as (keyof typeof content)[]).filter(
      (k) => dialogsState[k].finished
    ).length /
      Object.keys(content).length) *
      100
  )

  useEffect(() => {
    onCompletionChange?.(completionPercentage)
  }, [completionPercentage, onCompletionChange])

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
        completionPercentage={completionPercentage}
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
        previous={previous}
        completionPercentage={completionPercentage}
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
        completionPercentage={completionPercentage}
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
        completionPercentage={completionPercentage}
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
        completionPercentage={completionPercentage}
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
        completionPercentage={completionPercentage}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          dialogOverlay={
            <DialogOverlay className="bg-gray-700/20 backdrop-blur-sm" />
          }
          variant="unanimated"
          className="shadow-[0px_20px_24px_-4px_rgba(16,24,40,.08)] max-w-[451px] bottom-0 right-5 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-5 data-[state=open]:slide-in-from-bottom-5"
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
                  Object.keys(content).length
                )}{" "}
                steps left
              </Badge>
            </div>
            <div className="p-6 space-y-2.5 bg-gray-50">
              {(Object.keys(content) as (keyof typeof content)[]).map(
                (dialogName) => (
                  <Fragment key={dialogName}>
                    {dialogsState[dialogName].finished ? (
                      <article
                        className="py-3 px-4 border bg-white flex items-center gap-x-3 rounded-lg border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] cursor-pointer hover:border-success-400 transition-colors duration-150"
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
                          <div className="size-[30px] rounded-full bg-success-500 text-white inline-flex items-center justify-center shrink-0">
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
  fee: z.number({ message: "Please enter an amount" }).optional(),
})

type MoreInfoFormValues = z.infer<typeof moreInfoFormSchema>

const moreInfoFormDefaultValues: Partial<MoreInfoFormValues> = {
  jobTitle: "",
  saveAsDefault: false,
}

const MoreInfoDialog = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
  completionPercentage = 0,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  completionPercentage?: number
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
  const [hasChanges, setHasChanges] = useState(false)
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
    formState: { errors, isValid, isDirty },
    register,
    reset,
    setValue,
  } = useForm<MoreInfoFormValues>({
    resolver: zodResolver(moreInfoFormSchema),
    defaultValues: moreInfoFormDefaultValues,
  })
  const onSubmit: SubmitHandler<MoreInfoFormValues> = async (values) => {
    await Promise.all([
      UserAPI.updateJobTitle({ recentJobTitle: values.jobTitle }),
      UserAPI.updateRate({
        rate_min: values.earning,
        rate_max: values.clientRate,
      }),
    ])

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
    setHasChanges(true)
    setState("preview")
  }

  const submitTriggerRef = useRef<HTMLButtonElement>(null)

  const clientRateValue = useWatch({ control, name: "clientRate" })
  const earningValue = useWatch({ control, name: "earning" })

  useEffect(() => {
    function calculatePercentage(value: number) {
      return (value * 20) / 100
    }

    if (earningValue != null) {
      setValue("fee", calculatePercentage(earningValue))
    } else if (clientRateValue != null) {
      setValue("fee", calculatePercentage(clientRateValue))
    }
  }, [clientRateValue, earningValue, setValue])

  useEffect(() => {
    if (!open) return
    UserAPI.me()
      .then((res) => {
        const data = res.data
        if (data?.recentJobTitle || data?.rate_min || data?.rate_max) {
          setWorkExperiences([
            {
              jobTitle: data.recentJobTitle ?? "",
              saveAsDefault: false,
              clientRate: data.rate_max ?? 0,
              earning: data.rate_min ?? 0,
            },
          ])
          setState("preview")
        }
      })
      .catch(noop)
  }, [open, setWorkExperiences])

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
          <div className="border-x border-t rounded-t-[10px] pt-[30px] border-gray-200 bg-gray-50">
            <div className="px-[30px]">
              {state !== "action" ? (
                <div className="flex items-start justify-between">
                  <div className="max-w-[157px] flex-auto flex items-center gap-x-3">
                    <span className="text-sm font-medium text-dark-blue-400">
                      {completionPercentage}%
                    </span>
                    <div className="max-w-[115px] flex-auto">
                      <Progress
                        value={completionPercentage}
                        indicatorClassName={
                          completionPercentage === 100
                            ? "bg-green-500"
                            : undefined
                        }
                      />
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
                              onClick={async () => {
                                await Promise.all([
                                  UserAPI.updateJobTitle({
                                    recentJobTitle: "",
                                  }),
                                  UserAPI.updateRate({
                                    rate_min: null as unknown as number,
                                    rate_max: null as unknown as number,
                                  }),
                                ])
                                const updated = workExperiences?.filter(
                                  (_, i) => i !== index
                                )
                                setWorkExperiences(updated)
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
                    disabled={!hasChanges}
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
                <Button ref={submitTriggerRef} disabled={!isDirty}>
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

const AboutMeDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
  completionPercentage = 0,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  completionPercentage?: number
}) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const {
    register,
    formState: { errors, isValid, isDirty },
    handleSubmit,
    control,
    reset,
  } = useForm<AboutMeFormValues>({
    resolver: zodResolver(aboutMeFormSchema),
    defaultValues: {
      aboutMe: "",
    },
  })
  const onSubmit: SubmitHandler<AboutMeFormValues> = async (values) => {
    await UserAPI.updateOverview({ overview: values.aboutMe })
    next?.()
  }

  const aboutMe = useWatch({ control, name: "aboutMe" })

  useEffect(() => {
    if (!open) return
    UserAPI.me()
      .then((res) => {
        if (res.data?.overview) reset({ aboutMe: res.data.overview })
      })
      .catch(noop)
  }, [open, reset])

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
                {completionPercentage}%
              </span>
              <div className="max-w-[115px] flex-auto">
                <Progress
                  value={completionPercentage}
                  indicatorClassName={
                    completionPercentage === 100 ? "bg-green-500" : undefined
                  }
                />
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
            <Button size="md" disabled={!isValid || !isDirty}>
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

const SkillsDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
  previous,
  completionPercentage = 0,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  completionPercentage?: number
}) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const fetchedSkillNamesRef = useRef<Set<string>>(new Set())
  const [users] = React.useState([
    { id: 1, name: "TypeScript" },
    { id: 2, name: "JavaScript" },
    { id: 3, name: "React.js" },
    { id: 4, name: "Next.js" },
    { id: 5, name: "Tailwind CSS" },
    { id: 6, name: "Node.js" },
    { id: 7, name: "Python" },
    { id: 8, name: "Figma" },
    { id: 9, name: "UX Design" },
    { id: 10, name: "GraphQL" },
    { id: 11, name: "SQL" },
    { id: 12, name: "Docker" },
    { id: 13, name: "AWS" },
    { id: 14, name: "Photoshop" },
    { id: 15, name: "Illustrator" },
  ])

  const [query, setQuery] = React.useState("")
  const [optionsVisible, setOptionsVisible] = React.useState(false)

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

  useEffect(() => {
    if (!open) return
    UserAPI.skills
      .list()
      .then((res) => {
        const existing = (res.data ?? []).map(
          (s: { name: string }, i: number) => ({ id: -(i + 1), name: s.name })
        )
        fetchedSkillNamesRef.current = new Set(
          existing.map((s: { id: number; name: string }) => s.name)
        )
        if (existing.length) setValue("skills", existing)
      })
      .catch(noop)
  }, [open, setValue])

  const onSubmit: SubmitHandler<SkillsFormValues> = async (values) => {
    const newSkills = values.skills.filter(
      (s) => !fetchedSkillNamesRef.current.has(s.name)
    )
    await Promise.all(
      newSkills.map((skill) =>
        UserAPI.skills.create({ name: skill.name, proficiency: "intermediate" })
      )
    )
    next?.()
  }

  const skills = useWatch({ control, name: "skills" })

  const skillsChanged =
    (skills?.length ?? 0) !== fetchedSkillNamesRef.current.size ||
    skills?.some(
      (s: { id: number; name: string }) =>
        !fetchedSkillNamesRef.current.has(s.name)
    )

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
                {completionPercentage}%
              </span>
              <div className="max-w-[115px] flex-auto">
                <Progress
                  value={completionPercentage}
                  indicatorClassName={
                    completionPercentage === 100 ? "bg-green-500" : undefined
                  }
                />
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
                    onChange={(val) => {
                      onChange(val)
                      setOptionsVisible(false)
                    }}
                    multiple
                  >
                    <ComboboxTrigger>
                      <ComboboxInput
                        size="lg"
                        displayValue={(user: { id: number; name: string }) =>
                          user.name
                        }
                        placeholder="Search for skills"
                        onMouseDown={(event) =>
                          setOptionsVisible(
                            (event.target as HTMLInputElement).value.length > 0
                          )
                        }
                        onChange={(event) => {
                          setQuery(event.target.value)
                          setOptionsVisible(event.target.value.length > 0)
                        }}
                        invalid={hookFormHasError({ errors, name: "skills" })}
                      />
                      <ComboboxButton size="lg">
                        <SearchMd className="h-5 w-5" />
                      </ComboboxButton>
                    </ComboboxTrigger>
                    <ScaleOutIn
                      show={optionsVisible}
                      afterLeave={() => setQuery("")}
                    >
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
              <Button size="md" disabled={!isValid || !skillsChanged}>
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
    skills: z
      .array(z.object({ id: z.number(), name: z.string() }))
      .optional()
      .default([]),
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

const WorkExperienceDialog = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
  completionPercentage = 0,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  completionPercentage?: number
}) => {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [skills] = React.useState([
    { id: 1, name: "TypeScript" },
    { id: 2, name: "JavaScript" },
    { id: 3, name: "React.js" },
    { id: 4, name: "Next.js" },
    { id: 5, name: "Tailwind CSS" },
    { id: 6, name: "Node.js" },
    { id: 7, name: "Python" },
    { id: 8, name: "Figma" },
    { id: 9, name: "UX Design" },
    { id: 10, name: "GraphQL" },
    { id: 11, name: "SQL" },
    { id: 12, name: "Docker" },
    { id: 13, name: "AWS" },
    { id: 14, name: "Photoshop" },
    { id: 15, name: "Illustrator" },
  ])

  const [query, setQuery] = React.useState("")
  const [optionsVisible, setOptionsVisible] = React.useState(false)

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
  const [hasChanges, setHasChanges] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number>()
  const [workExperiences, setWorkExperiences] = useUncontrolledState<
    WorkExperienceFormValues[] | undefined
  >({
    onChange: (value) => {
      onFinished?.(Boolean(value?.length))
    },
    defaultValue: undefined,
  })
  const experienceIdsRef = useRef<(string | undefined)[]>([])
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
    defaultValues: {
      currentlyWorkHere: false,
      jobDescription: "",
      jobTitle: "",
      employer: "",
    },
  })

  useEffect(() => {
    if (!open) return
    UserAPI.experiences
      .list()
      .then((res) => {
        const items = (res.data.experiences ?? []).map((exp: any) => {
          const parseDate = (iso: string) => {
            const [year, month, day] = iso.split("T")[0].split("-").map(Number)
            // Old saves used local midnight which in UTC+ timezones rolled back to
            // the last day of the previous month (e.g. Nov 1 UTC+8 → Oct 31 UTC).
            // New saves always use day 01. If day >= 28 it's old corrupted data —
            // the real month is one ahead.
            if (day >= 28) {
              return month === 12
                ? { year: year + 1, month: 1 }
                : { year, month: month + 1 }
            }
            return { year, month }
          }
          const start = parseDate(exp.startDate)
          const end = exp.endDate ? parseDate(exp.endDate) : undefined
          return {
            formValues: {
              employer: exp.company ?? "",
              jobTitle: exp.title ?? "",
              jobDescription: exp.description ?? "",
              currentlyWorkHere: exp.isCurrentRole ?? false,
              skills: (exp.skills ?? []).map((name: string, i: number) => ({
                id: -(i + 1),
                name,
              })),
              startDate: {
                month: start.month,
                year: start.year,
              },
              endDate: end
                ? { month: end.month, year: end.year }
                : { month: undefined, year: undefined },
            } as WorkExperienceFormValues,
            id: exp.id as string | undefined,
          }
        })
        if (items.length) {
          setWorkExperiences(
            items.map(
              (i: { formValues: WorkExperienceFormValues }) => i.formValues
            )
          )
          experienceIdsRef.current = items.map(
            (i: { id: string | undefined }) => i.id
          )
          setState("preview")
        }
      })
      .catch(noop)
  }, [open, setWorkExperiences])

  const onSubmit: SubmitHandler<WorkExperienceFormValues> = async (values) => {
    const formatDate = (year: number, month: number) =>
      `${year}-${String(month).padStart(2, "0")}-01`
    const startDate = formatDate(values.startDate.year, values.startDate.month)
    const endDate =
      !values.currentlyWorkHere && values.endDate.year && values.endDate.month
        ? formatDate(values.endDate.year, values.endDate.month)
        : undefined

    const payload = {
      title: values.jobTitle,
      company: values.employer,
      startDate,
      endDate,
      isCurrentRole: values.currentlyWorkHere,
      description: values.jobDescription,
      skills: (values.skills ?? []).map((s) => s.name),
    }

    if (editingIndex !== undefined) {
      const id = experienceIdsRef.current[editingIndex]
      if (id) await UserAPI.experiences.update(id, payload)
      setWorkExperiences(
        workExperiences?.map((workExperience, index) =>
          index === editingIndex ? values : workExperience
        )
      )
      setEditingIndex(undefined)
    } else {
      const res = await UserAPI.experiences.create(payload)
      experienceIdsRef.current = [...experienceIdsRef.current, res.data?.id]
      setWorkExperiences((prev) => (prev ? [...prev, values] : [values]))
    }
    reset()
    setHasChanges(true)
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
                      {completionPercentage}%
                    </span>
                    <div className="max-w-[115px] flex-auto">
                      <Progress
                        value={completionPercentage}
                        indicatorClassName={
                          completionPercentage === 100
                            ? "bg-green-500"
                            : undefined
                        }
                      />
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
                      Add Work Experience
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
                  Work Experience
                </h1>
                <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                  Tell us where you&apos;ve worked before!
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
                    Add Work Experience
                  </Button>
                )}

                {state === "preview" && (
                  <div className="space-y-3">
                    {workExperiences?.map((workExperience, index) => (
                      <WorkExperienceCard
                        onRemove={async () => {
                          const id = experienceIdsRef.current[index]
                          if (id)
                            await UserAPI.experiences.delete(id).catch(noop)
                          experienceIdsRef.current =
                            experienceIdsRef.current.filter(
                              (_, i) => i !== index
                            )
                          setWorkExperiences((prev) =>
                            prev?.filter((_, i) => i !== index)
                          )
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
                                      {months.map((month) => (
                                        <ListboxOption
                                          key={month.value}
                                          value={month.value}
                                        >
                                          {month.name}
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
                                <ErrorMessage size="sm">{message}</ErrorMessage>
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
                                      {[2020, 2021, 2022, 2023, 2024, 2025].map(
                                        (month) => (
                                          <ListboxOption
                                            key={month}
                                            value={month}
                                          >
                                            {month}
                                          </ListboxOption>
                                        )
                                      )}
                                    </ScrollArea>
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
                                    displayValue={(value: number) =>
                                      months.find((m) => m.value === value)
                                        ?.name ?? ""
                                    }
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
                                      {months.map((month) => (
                                        <ListboxOption
                                          key={month.value}
                                          value={month.value}
                                        >
                                          {month.name}
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
                                <ErrorMessage size="sm">{message}</ErrorMessage>
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
                                      {[2020, 2021, 2022, 2023, 2024, 2025].map(
                                        (month) => (
                                          <ListboxOption
                                            key={month}
                                            value={month}
                                          >
                                            {month}
                                          </ListboxOption>
                                        )
                                      )}
                                    </ScrollArea>
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
                          onChange={(val) => {
                            onChange(val)
                            setOptionsVisible(false)
                          }}
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
                              onMouseDown={(event) =>
                                setOptionsVisible(
                                  (event.target as HTMLInputElement).value
                                    .length > 0
                                )
                              }
                              onChange={(event) => {
                                setQuery(event.target.value)
                                setOptionsVisible(event.target.value.length > 0)
                              }}
                              invalid={hookFormHasError({
                                errors,
                                name: "skills",
                              })}
                            />
                            <ComboboxButton size="lg">
                              <SearchMd className="h-5 w-5" />
                            </ComboboxButton>
                          </ComboboxTrigger>
                          <ScaleOutIn
                            show={optionsVisible}
                            afterLeave={() => setQuery("")}
                          >
                            <ComboboxOptions>
                              <ScrollArea viewportClassName="max-h-[304px]">
                                {filteredSkills.map((skill) => (
                                  <ComboboxOption key={skill.id} value={skill}>
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
                    disabled={!hasChanges}
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
                <Button ref={submitTriggerRef} disabled={!isDirty}>
                  Save{" "}
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

const EducationDialog = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
  completionPercentage = 0,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  completionPercentage?: number
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
  const [hasChanges, setHasChanges] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number>()
  const [educationQualifications, setEducationQualifications] =
    useUncontrolledState<EducationFormValues[] | undefined>({
      defaultValue: undefined,
      onChange: (value) => onFinished?.(Boolean(value?.length)),
    })
  const educationIdsRef = useRef<(string | undefined)[]>([])

  useEffect(() => {
    if (!open) return
    UserAPI.education
      .list()
      .then((res) => {
        const items = (res.data ?? []).map((edu: any) => ({
          formValues: {
            schoolOrUniversity: edu.school ?? "",
            degree: edu.degree ?? "",
            major: edu.fieldOfStudy ?? "",
            currentlyAttending: edu.currentlyStudying ?? false,
            startDate: {
              month: edu.startMonth ?? 1,
              year: edu.startYear ?? new Date().getFullYear(),
            },
            endDate: { month: edu.endMonth, year: edu.endYear },
          } as EducationFormValues,
          id: edu.id as string | undefined,
        }))
        if (items.length) {
          setEducationQualifications(
            items.map((i: { formValues: EducationFormValues }) => i.formValues)
          )
          educationIdsRef.current = items.map(
            (i: { id: string | undefined }) => i.id
          )
          setState("preview")
        }
      })
      .catch(noop)
  }, [open, setEducationQualifications])

  const onSubmit: SubmitHandler<EducationFormValues> = async (values) => {
    const payload = {
      school: values.schoolOrUniversity,
      degree: values.degree,
      fieldOfStudy: values.major,
      startYear: values.startDate.year,
      endYear: values.currentlyAttending ? undefined : values.endDate.year,
      currentlyStudying: values.currentlyAttending,
    }

    if (editingIndex !== undefined) {
      const id = educationIdsRef.current[editingIndex]
      if (id) await UserAPI.education.update(id, payload)
      setEducationQualifications(
        educationQualifications?.map((qualification, index) =>
          index === editingIndex ? values : qualification
        )
      )
      setEditingIndex(undefined)
    } else {
      const res = await UserAPI.education.create(payload)
      educationIdsRef.current = [...educationIdsRef.current, res.data?.id]
      setEducationQualifications((prev) =>
        prev ? [...prev, values] : [values]
      )
    }
    reset()
    setHasChanges(true)
    setState("preview")
  }

  const currentlyAttending = useWatch({ control, name: "currentlyAttending" })

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
            <div className="border-x min-h-full border-t rounded-t-[10px] p-[30px] border-gray-200 bg-gray-50">
              {state !== "action" ? (
                <div className="flex items-start justify-between">
                  <div className="max-w-[157px] flex-auto flex items-center gap-x-3">
                    <span className="text-sm font-medium text-dark-blue-400">
                      {completionPercentage}%
                    </span>
                    <div className="max-w-[115px] flex-auto">
                      <Progress
                        value={completionPercentage}
                        indicatorClassName={
                          completionPercentage === 100
                            ? "bg-green-500"
                            : undefined
                        }
                      />
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
                        onRemove={async () => {
                          const id = educationIdsRef.current[index]
                          if (id) await UserAPI.education.delete(id).catch(noop)
                          educationIdsRef.current =
                            educationIdsRef.current.filter(
                              (_, i) => i !== index
                            )
                          setEducationQualifications((prev) =>
                            prev?.filter((_, i) => i !== index)
                          )
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
                                    {months.map((month) => (
                                      <ListboxOption
                                        key={month.value}
                                        value={month.value}
                                      >
                                        {month.name}
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
                                    {months.map((month) => (
                                      <ListboxOption
                                        key={month.value}
                                        value={month.value}
                                      >
                                        {month.name}
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
                  <Button size="md" disabled={!hasChanges} onClick={next}>
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

                <Button ref={submitTriggerRef} disabled={!isDirty}>
                  {" "}
                  Save{" "}
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

const portfolioFormSchema = z.object({
  name: z.string().min(1, "Please enter a project name"),
  description: z.string().optional(),
  url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
})

type PortfolioFormValues = z.infer<typeof portfolioFormSchema>

const Portfolio = ({
  onFinished,
  onOpenedChange,
  opened,
  next,
  previous,
  completionPercentage = 0,
}: {
  onFinished?: (isFinished: boolean) => void
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  next?: () => void
  previous?: () => void
  completionPercentage?: number
}) => {
  const [open, setOpen] = useControllableState({
    value: opened,
    onChange: onOpenedChange,
    defaultValue: false,
  })
  const [state, setState] = useState<"default" | "preview" | "action">(
    "default"
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [projects, setProjects] = useUncontrolledState<
    (PortfolioFormValues & { id?: string })[] | undefined
  >({
    defaultValue: undefined,
    onChange: (value) => onFinished?.(Boolean(value?.length)),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: { name: "", description: "", url: "" },
  })

  useEffect(() => {
    if (!open) return
    UserAPI.portfolio
      .list()
      .then((res) => {
        const items = (res.data ?? []).map((p: any) => ({
          name: p.name ?? "",
          description: p.description ?? "",
          url: p.url ?? "",
          id: p.id,
        }))
        if (items.length) {
          setProjects(items)
          setState("preview")
        }
      })
      .catch(noop)
  }, [open, setProjects])

  const onSubmit: SubmitHandler<PortfolioFormValues> = async (values) => {
    const response = await UserAPI.portfolio.create({
      name: values.name,
      description: values.description,
      url: values.url || undefined,
    })
    setProjects((prev) => {
      const item = { ...values, id: response.data?.id }
      return prev ? [...prev, item] : [item]
    })
    reset()
    setHasChanges(true)
    setState("preview")
  }

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
          <div className="border-x min-h-[567px] border-t rounded-t-[10px] p-[30px] border-gray-200 bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="max-w-[157px] flex-auto flex items-center gap-x-3">
                <span className="text-sm font-medium text-dark-blue-400">
                  {completionPercentage}%
                </span>
                <div className="max-w-[115px] flex-auto">
                  <Progress
                    value={completionPercentage}
                    indicatorClassName={
                      completionPercentage === 100 ? "bg-green-500" : undefined
                    }
                  />
                </div>
              </div>
              {state === "preview" && (
                <Button
                  onClick={() => setState("action")}
                  className="bg-white"
                  variant="outlined"
                  visual="gray"
                  type="button"
                >
                  <Plus className="size-[15px]" />
                  Add Project
                </Button>
              )}
            </div>

            <div className="mt-6">
              <h1 className="text-[36px] leading-[44px] font-semibold text-dark-blue-400">
                Portfolio
              </h1>
              <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
                Show the quality and style that clients are looking for.
              </p>
            </div>

            <div className="mt-6">
              {state === "default" && (
                <div className="grid grid-cols-2 gap-3">
                  <article
                    className="h-[150px] bg-white gap-y-3 flex items-center flex-col border border-gray-300 p-6 rounded-[5px] cursor-pointer hover:border-primary-400"
                    onClick={() => setState("action")}
                  >
                    <div className="size-[52px] rounded-full text-white shrink-0 border-[12px] border-gray-200 bg-gray-400 inline-flex items-center justify-center">
                      <Plus className="size-[21px]" />
                    </div>
                    <h3 className="text-center text-sm font-semibold text-gray-400">
                      Add a project
                    </h3>
                  </article>
                </div>
              )}

              {state === "preview" && (
                <div className="space-y-3">
                  {projects?.map((project, index) => (
                    <article
                      key={index}
                      className="p-4 rounded-lg flex items-start bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                    >
                      <div className="flex-auto">
                        <h1 className="text-base leading-none font-bold text-dark-blue-400">
                          {project.name}
                        </h1>
                        {project.description && (
                          <p className="mt-1 text-xs leading-none font-light text-dark-blue-400">
                            {project.description}
                          </p>
                        )}
                        {project.url && (
                          <p className="mt-1 text-xs text-primary-500 truncate">
                            {project.url}
                          </p>
                        )}
                      </div>
                      <IconButton
                        visual="gray"
                        variant="ghost"
                        type="button"
                        className="text-gray-400 rounded-full hover:text-error-500 hover:bg-error-50"
                        onClick={async () => {
                          if (project.id) {
                            await UserAPI.portfolio.delete(project.id)
                          }
                          setProjects(projects?.filter((_, i) => i !== index))
                        }}
                      >
                        <Trash03 className="size-[15px]" />
                      </IconButton>
                    </article>
                  ))}
                </div>
              )}

              {state === "action" && (
                <div className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label size="sm" htmlFor="project-name">
                      Project Name
                    </Label>
                    <Input
                      id="project-name"
                      placeholder="e.g. E-commerce Redesign"
                      {...register("name")}
                      isInvalid={hookFormHasError({ errors, name: "name" })}
                    />
                    <HookFormErrorMessage
                      errors={errors}
                      name="name"
                      render={({ message }) => (
                        <ErrorMessage size="sm">{message}</ErrorMessage>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label size="sm" htmlFor="project-description">
                      Description
                    </Label>
                    <Textarea
                      id="project-description"
                      placeholder="Describe the project..."
                      {...register("description")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label size="sm" htmlFor="project-url">
                      Project URL
                    </Label>
                    <Input
                      id="project-url"
                      placeholder="https://example.com"
                      {...register("url")}
                      isInvalid={hookFormHasError({ errors, name: "url" })}
                    />
                    <HookFormErrorMessage
                      errors={errors}
                      name="url"
                      render={({ message }) => (
                        <ErrorMessage size="sm">{message}</ErrorMessage>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
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
                    type="button"
                    size="md"
                    variant="ghost"
                    visual="gray"
                    onClick={next}
                  >
                    Skip
                  </Button>
                  <Button
                    size="md"
                    type="button"
                    disabled={!hasChanges}
                    onClick={next}
                  >
                    Save & Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={() =>
                    projects?.length ? setState("preview") : setState("default")
                  }
                  variant="link"
                  visual="gray"
                  type="button"
                >
                  <X className="size-[15px]" /> Cancel
                </Button>
                <Button type="submit">Save Project</Button>
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
