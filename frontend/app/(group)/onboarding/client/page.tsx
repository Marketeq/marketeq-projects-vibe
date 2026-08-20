"use client"

import * as React from "react"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { useAutocomplete } from "@/libs/autocomplete"
import jobTitlesMock from "@/public/mock/job_titles.json"
import rawSkillSuggestions from "@/public/mock/skills.json"
import { AuthAPI } from "@/service/http/auth"
import {
  AutocompleteAPI,
  type AutocompleteTypeSuggestion,
} from "@/service/http/autocomplete"
import { ClientAPI } from "@/service/http/client"
import { InvitationsAPI } from "@/service/http/invitations"
import { UserAPI } from "@/service/http/user"
import { HOT_KEYS } from "@/utils/constants"
import {
  cn,
  containsOneLowerCaseLetter,
  getIsNotEmpty,
  hookFormHasError,
  keys,
} from "@/utils/functions"
import { useControllableState, useStepper } from "@/utils/hooks"
import { generateUsernameSuggestions } from "@/utils/username"
import {
  AlertCircle,
  Briefcase02,
  Check,
  ChevronRight,
  Home03,
  Info,
  Link01,
  Mail,
  Plus,
  Plus1,
  Trash03,
  User02,
  Users03,
  X,
  X2,
} from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { Steps } from "headless-stepper"
import {
  Controller,
  SubmitHandler,
  UseFormSetValue,
  useFieldArray,
  useForm,
} from "react-hook-form"
import { useDebounce, useIsomorphicLayoutEffect, useToggle } from "react-use"
import { z } from "zod"
import { CreateClientType } from "@/types/client"
import { ROLE, User } from "@/types/user"
import { PictureEditor } from "@/components/ui/image-editor/image-editor"
import { Spinner } from "@/components/ui/spinner/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Logo } from "@/components/icons"
import { Pointer } from "@/components/icons/pointer"
import NextLink from "@/components/next-link"
import { Triangles } from "@/components/triangles"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  Badge,
  Button,
  CheckboxSelector,
  CircularProgress,
  ClipboardControl,
  ClipboardIndicator,
  ClipboardInput,
  ClipboardLabel,
  ClipboardRoot,
  ClipboardTrigger,
  Combobox,
  ComboboxInput,
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  ErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Label,
  RadioGroup,
  RadioGroupItemSelector,
  ScaleOutIn,
  ScrollArea,
  Step,
  StepControl,
  StepRootProvider,
  StepperProvider,
  buttonVariants,
  useStepContext,
  useStepRootContext,
  useStepperContext,
  useToast,
} from "@/components/ui"

// The flow is numbered 1..6, starting at "Introduce yourself!" and ending at
// "Outline Your Interests"; the closing "What would you like to do next?" screen
// is not numbered. Every numbered screen sits at step index 0-5 and draws a
// progress ring, so its displayed number is its own index + 1.
const NUMBERED_STEPS = 6

const getClientUsernameSuggestions = ({
  email,
  firstName,
  lastName,
  teamName,
  role,
}: {
  email?: unknown
  firstName?: string | null
  lastName?: string | null
  teamName?: string | null
  role?: string | null
}) => {
  const safeEmail = typeof email === "string" ? email : ""

  // Combine all available context for richer suggestions
  const contextParts = [teamName, role, safeEmail]
    .filter(Boolean)
    .join(" ")
    .trim()

  const primarySuggestions = generateUsernameSuggestions(
    firstName ?? "",
    "",
    contextParts
  )

  if (primarySuggestions.length > 0) {
    return Array.from(new Set(primarySuggestions))
  }

  // Fallback: try just with email if names were empty
  if (safeEmail) {
    const emailOnly = generateUsernameSuggestions("", "", safeEmail)
    if (emailOnly.length > 0) {
      return Array.from(new Set(emailOnly))
    }
  }

  return []
}

const toNameCase = (value?: string | null) => {
  if (!value) return ""

  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

const deriveClientProfileNames = (
  user: User | null,
  stepData: CreateClientType | null
) => {
  const firstName = user?.firstName?.trim() || stepData?.firstName?.trim() || ""
  const lastName = user?.lastName?.trim() || stepData?.lastName?.trim() || ""

  const source =
    user?.email?.split("@")[0] || stepData?.username || user?.username || ""

  const normalized = source
    .replace(/^@/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, " ")
    .trim()

  if (!normalized) {
    return { firstName: "", lastName: "" }
  }

  const [derivedFirstName = "", ...rest] = normalized.split(/\s+/)
  const derivedLastName = rest.join(" ")

  return {
    firstName: toNameCase(firstName || derivedFirstName),
    lastName: toNameCase(lastName || derivedLastName || derivedFirstName),
  }
}

const isNonEmptyString = (value?: string | null): value is string =>
  Boolean(value && value.trim().length > 0)

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)

const getClientPayloadValidationErrors = (data: CreateClientType) => {
  const errors: string[] = []

  if (!isNonEmptyString(data.firstName)) errors.push("First name is required.")
  if (!isNonEmptyString(data.lastName)) errors.push("Last name is required.")
  // Username is optional; only validate format when the user supplied one.
  // The step-5 schema allows an empty username, so the final payload must
  // not hard-require it — that would contradict a user who skipped that step.
  const rawUsername = data.username
  if (isNonEmptyString(rawUsername)) {
    const u = rawUsername.trim()
    if (u.length < 3 || u.length > 24) {
      errors.push("Username must be between 3 and 24 characters.")
    } else if (!/^[a-z][a-z0-9_]*$/.test(u)) {
      errors.push(
        "Username must start with a letter and contain only lowercase letters, numbers, and underscores."
      )
    }
  }
  if (!isNonEmptyString(data.teamName))
    errors.push("Team/company name is required.")
  if (!isNonEmptyString(data.role)) errors.push("Role/job title is required.")
  if (!isNonEmptyString(data.industry)) errors.push("Industry is required.")
  if (!isNonEmptyString(data.budget))
    errors.push("Please select a budget range.")

  if (!data.businessTypes?.length) {
    errors.push("Select at least one goal.")
  }

  if (data.teammateEmails && data.teammateEmails.length > 0) {
    if (data.teammateEmails.some((email) => !isValidEmail(email))) {
      errors.push("All teammate emails must be valid email addresses.")
    }
  }

  if (!data.industries?.length) {
    errors.push("Select at least one industry or vertical.")
  }

  if (!data.lookingToWorkWith?.length) {
    errors.push("Enter at least one desired role or one desired skill.")
  }

  if (!data.skills?.length) {
    errors.push("Enter at least one desired role or one desired skill.")
  }

  if (!data.projectTypes?.length) {
    errors.push("Select at least one project type.")
  }

  return errors
}

const getBudgetDefaultValue = (value?: string) => {
  if (value && budget.includes(value as (typeof budget)[number])) {
    return value as OutlineYourInterestsFormValues["budget"]
  }

  return undefined
}

const describeYourTeamFormSchema = z.object({
  teamName: z.string().min(1, "Team/company name is required."),
  role: z.string().min(1, "Role/job title is required."),
  industry: z.string().min(1, "Industry is required."),
})

type DescribeYourTeamFormValues = z.infer<typeof describeYourTeamFormSchema>

const InfoTooltip = ({ text }: { text: string }) => {
  const [pinned, setPinned] = React.useState(false)

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={pinned || undefined}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="More information"
            onClick={(e) => {
              e.preventDefault()
              setPinned((prev) => !prev)
            }}
          >
            <Info className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent size="md" visual="white" className="max-w-[280px]">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const ChipInput = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  isInvalid,
  children,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  isInvalid?: boolean
  children?: React.ReactNode
}) => {
  const [committed, setCommitted] = React.useState(Boolean(value))
  const [draft, setDraft] = React.useState(value)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!committed && inputRef.current) {
      inputRef.current.focus()
    }
  }, [committed])

  const commitValue = () => {
    const trimmed = draft.trim()
    if (trimmed) {
      onChange(trimmed)
      setCommitted(true)
    }
  }

  const clearValue = () => {
    onChange("")
    setDraft("")
    setCommitted(false)
  }

  if (committed && draft.trim()) {
    return (
      <div className="flex flex-col gap-y-1.5">
        <Label htmlFor={id} size="sm">
          {label}
        </Label>
        <div
          className={cn(
            "flex items-center min-h-[44px] w-full rounded-[5px] border border-gray-300 bg-white py-2 px-3.5 shadow-xs",
            "focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50"
          )}
        >
          <Badge visual="primary" size="md" className="gap-x-1.5 max-w-full">
            <span className="truncate">{draft.trim()}</span>
            <button
              type="button"
              onClick={clearValue}
              className="shrink-0 rounded-full hover:bg-primary-200 transition-colors"
              aria-label={`Remove ${draft.trim()}`}
            >
              <X className="size-3.5" />
            </button>
          </Badge>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-1.5">
      <Label htmlFor={id} size="sm">
        {label}
      </Label>
      <Input
        ref={inputRef}
        id={id}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
        }}
        onBlur={() => {
          const trimmed = draft.trim()
          if (trimmed) {
            onChange(trimmed)
            setCommitted(true)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commitValue()
          }
        }}
        isInvalid={isInvalid}
      />
      {children}
    </div>
  )
}

const DescribeYourTeam = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateClientType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateClientType | null>>
}) => {
  const {
    register,
    setValue,
    formState: { errors, isValid },
    handleSubmit,
    watch,
  } = useForm<DescribeYourTeamFormValues>({
    resolver: zodResolver(describeYourTeamFormSchema),
    defaultValues: {
      teamName: stepData?.teamName || "",
      industry: stepData?.industry || "",
      role: stepData?.role || "",
    },
  })
  const values = watch()

  const [industryQuery, setIndustryQuery] = React.useState(
    stepData?.industry || ""
  )
  const [showIndustrySuggestions, setShowIndustrySuggestions] =
    React.useState(false)
  const [industryCommitted, setIndustryCommitted] = React.useState(
    Boolean(stepData?.industry)
  )
  const { suggestions: industrySuggestions } = useAutocomplete(
    "industries",
    industryQuery
  )
  const industryRef = React.useRef<HTMLDivElement>(null)
  const industryInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        industryRef.current &&
        !industryRef.current.contains(e.target as Node)
      ) {
        setShowIndustrySuggestions(false)
        if (industryQuery.trim()) {
          setIndustryCommitted(true)
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [industryQuery])

  const clearIndustry = () => {
    setIndustryQuery("")
    setIndustryCommitted(false)
    setValue("industry", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    setTimeout(() => industryInputRef.current?.focus(), 0)
  }

  const { toggleValidation } = useStepContext()
  const { nextStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const { currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / NUMBERED_STEPS) * 100

  const onSubmit: SubmitHandler<DescribeYourTeamFormValues> = (values) => {
    setStepData({
      ...stepData,
      teamName: values?.teamName,
      role: values?.role,
      industry: values?.industry,
    })

    toggleValidation(true)
    setStep(currentStep + 1)
  }

  const skip = () => {
    toggleValidation(true)
    const nextStepIndex = currentStep + 1
    setStep(nextStepIndex)
  }

  const setFieldValue = (
    field: keyof DescribeYourTeamFormValues,
    value: string
  ) => {
    setValue(field, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  return (
    <div className="min-h-screen flex 2xl:pl-[480px]">
      {sidebar}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative flex justify-between flex-col flex-auto px-5 md:px-10 py-10 2xl:py-[100px] 2xl:px-[200px]"
      >
        <div className="max-w-[488px] 2xl:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 2 / 6
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Describe Your Team!
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Give us insights into your team to help us make things even smoother.
          </p>

          <div className="mt-10 2xl:mt-[50px] flex flex-col">
            <ChipInput
              id="your-team-name"
              label="What’s your team name?"
              placeholder="Enter your team or company name"
              value={values.teamName}
              onChange={(val) => setFieldValue("teamName", val)}
              isInvalid={hookFormHasError({ errors, name: "teamName" })}
            >
              <HookFormErrorMessage
                errors={errors}
                name="teamName"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </ChipInput>

            <div className="mt-6">
              <ChipInput
                id="your-role"
                label="What’s your role?"
                placeholder="Enter your job title"
                value={values.role}
                onChange={(val) => setFieldValue("role", val)}
                isInvalid={hookFormHasError({ errors, name: "role" })}
              >
                <HookFormErrorMessage
                  errors={errors}
                  name="role"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </ChipInput>
            </div>

            <div className="flex flex-col gap-y-1.5 mt-6">
              <Label htmlFor="your-industry" size="sm">
                What’s your industry?
              </Label>

              {industryCommitted && industryQuery.trim() ? (
                <div
                  className={cn(
                    "flex items-center min-h-[44px] w-full rounded-[5px] border border-gray-300 bg-white py-2 px-3.5 shadow-xs",
                    "focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50"
                  )}
                >
                  <Badge
                    visual="primary"
                    size="md"
                    className="gap-x-1.5 max-w-full"
                  >
                    <span className="truncate">{industryQuery}</span>
                    <button
                      type="button"
                      onClick={clearIndustry}
                      className="shrink-0 rounded-full hover:bg-primary-200 transition-colors"
                      aria-label={`Remove ${industryQuery}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                </div>
              ) : (
                <div ref={industryRef} className="relative">
                  <Input
                    ref={industryInputRef}
                    id="your-industry"
                    placeholder="Enter your industry (e.g. Technology, Healthcare, Retail)"
                    value={industryQuery}
                    onChange={(e) => {
                      const val = e.target.value
                      setIndustryQuery(val)
                      setValue("industry", val, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                      setShowIndustrySuggestions(true)
                    }}
                    onFocus={() => setShowIndustrySuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        if (industryQuery.trim()) {
                          setShowIndustrySuggestions(false)
                          setIndustryCommitted(true)
                        }
                      }
                    }}
                    isInvalid={hookFormHasError({ errors, name: "industry" })}
                    autoComplete="off"
                  />
                  {showIndustrySuggestions &&
                    industrySuggestions.length > 0 && (
                      <ul className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {industrySuggestions.map(
                          (item: { label: string }, index: number) => (
                            <li
                              key={index}
                              className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onMouseDown={() => {
                                const label = item.label
                                setIndustryQuery(label)
                                setValue("industry", label, {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                })
                                setShowIndustrySuggestions(false)
                                setIndustryCommitted(true)
                              }}
                            >
                              {item.label}
                            </li>
                          )
                        )}
                      </ul>
                    )}
                </div>
              )}

              <HookFormErrorMessage
                errors={errors}
                name="industry"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 2xl:mt-[50px] max-w-[488px] 2xl:max-w-[560px] mx-auto w-full self-end flex justify-between">
          <NextLink
            href="/onboarding"
            className={cn(
              buttonVariants({
                size: "md",
                variant: "outlined",
                visual: "gray",
              })
            )}
          >
            Back
          </NextLink>

          <div className="flex items-center gap-x-6">
            <Button
              className="opacity-50 hover:opacity-100"
              variant="ghost"
              visual="gray"
              type="button"
              onClick={skip}
              size="md"
            >
              Skip
            </Button>

            <Button size="md" visual="primary">
              Continue
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

const data = [
  {
    helpText: `Focused on scaling, increasing sales, or entering new markets`,
    label: "Growth & Expansion",
  },
  {
    helpText: `Aiming to improve your brand presence, reputation and visibility`,
    label: "Brand Building & Awareness",
  },
  {
    helpText: `Focused on refining design quality and improving user experience`,
    label: "Design & Strategy",
  },
  {
    helpText: `Improving processes, streamlining workflows, or boosting team productivity`,
    label: "Operational Efficiency & Optimization",
  },
  {
    helpText: `Looking to innovate, improve, or launch new products or services`,
    label: "Product & Service Development",
  },
  {
    helpText: `Adopting new tech, leveraging data, or improving their digital tools`,
    label: "Technology & Innovation",
  },
  {
    helpText: `Focused on boosting customer satisfaction, loyalty, and interactions`,
    label: "Customer Engagement & Retention",
  },
  {
    helpText: `Focused on boosting customer satisfaction, loyalty, and interactions`,
    label: "Recruitment & Team Building",
  },
] as const

const [defaultValue] = data

const shareYourGoalsFormSchema = z
  .object(
    data.reduce(
      (previous, current) => ({ ...previous, [current.label]: z.boolean() }),
      {} as { [Property in (typeof data)[number]["label"]]: z.ZodBoolean }
    )
  )
  .refine((data) => keys(data).some((value) => data[value]), {
    message: "Select at least one goal.",
    path: [defaultValue.label],
  })

type ShareYourGoalsFormValues = z.infer<typeof shareYourGoalsFormSchema>

const ShareYourGoals = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateClientType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateClientType | null>>
}) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isValid },
    getValues,
  } = useForm<ShareYourGoalsFormValues>({
    resolver: zodResolver(shareYourGoalsFormSchema),
    defaultValues: data.reduce(
      (previous, current) => ({
        ...previous,
        [current.label]:
          stepData?.businessTypes?.includes(current.label) || false,
      }),
      {} as { [Property in (typeof data)[number]["label"]]: boolean }
    ),
  })

  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const { currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / NUMBERED_STEPS) * 100

  const onSubmit: SubmitHandler<ShareYourGoalsFormValues> = (values) => {
    const businessTypes = Object.entries(values)
      .filter(([key, value]) => value === true)
      .map(([key]) => key)

    setStepData({
      ...stepData,
      businessTypes,
    })

    toggleValidation(true)
    setStep(currentStep + 1)
  }

  const skip = () => {
    toggleValidation(true)
    const nextStepIndex = currentStep + 1
    setStep(nextStepIndex)
  }

  const back = () => {
    const businessTypes = Object.entries(getValues())
      .filter(([key, value]) => value === true)
      .map(([key]) => key)

    setStepData({
      ...stepData,
      businessTypes,
    })
    prevStep()
  }

  return (
    <div className="min-h-screen flex 2xl:pl-[480px]">
      {sidebar}
      <form
        className="relative flex justify-between flex-col flex-auto px-5 md:px-10 py-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="max-w-[488px] 2xl:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 3 / 6
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Share Your Goals!
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Give us insights into your team to help us make things even smoother.
          </p>

          <div className="mt-10 2xl:mt-[50px]">
            <div className="flex flex-col gap-y-2.5">
              {data.map((item) => (
                <Controller
                  key={item.label}
                  control={control}
                  name={item.label}
                  render={({ field: { onChange, value, ...field } }) => (
                    <CheckboxSelector
                      {...field}
                      checked={value}
                      onCheckedChange={onChange}
                      size="md"
                    >
                      <h1 className="text-sm leading-5 font-medium text-dark-blue-400">
                        {item.label}
                      </h1>
                      <p className="text-sm leading-5 font-light text-dark-blue-400">
                        {item.helpText}
                      </p>
                    </CheckboxSelector>
                  )}
                />
              ))}
            </div>

            <div className="mt-1.5">
              <HookFormErrorMessage
                errors={errors}
                name={defaultValue.label}
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 2xl:mt-[50px] max-w-[488px] 2xl:max-w-[560px] mx-auto w-full self-end flex justify-between">
          <Button
            size="md"
            variant="outlined"
            visual="gray"
            onClick={back}
            type="button"
          >
            Back
          </Button>

          <div className="flex items-center gap-x-6">
            <Button
              className="opacity-50 hover:opacity-100"
              variant="ghost"
              visual="gray"
              onClick={skip}
              type="button"
              size="md"
            >
              Skip
            </Button>
            <Button size="md" visual="primary">
              Continue
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

const inviteYourTeamFormSchema = z
  .object({
    emails: z.array(
      z.object({
        email: z.string().trim(),
      })
    ),
  })
  .superRefine(({ emails }, ctx) => {
    const populatedEmails = emails
      .map(({ email }) => email.trim())
      .filter((email) => email.length > 0)

    if (populatedEmails.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter at least 1 teammate email",
        path: ["emails", 0, "email"],
      })
    }

    emails.forEach(({ email }, index) => {
      const normalizedEmail = email.trim()
      if (!normalizedEmail) return

      if (!z.string().email().safeParse(normalizedEmail).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid email",
          path: ["emails", index, "email"],
        })
      }
    })

    const seenEmails = new Map<string, number[]>()

    emails.forEach(({ email }, index) => {
      const normalizedEmail = email.trim().toLowerCase()

      if (!normalizedEmail) return

      const indexes = seenEmails.get(normalizedEmail) ?? []
      indexes.push(index)
      seenEmails.set(normalizedEmail, indexes)
    })

    seenEmails.forEach((indexes) => {
      if (indexes.length < 2) return

      indexes.forEach((index) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each teammate email must be unique",
          path: ["emails", index, "email"],
        })
      })
    })
  })

type InviteYourTeamFormValues = z.infer<typeof inviteYourTeamFormSchema>

const InviteYourTeam = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateClientType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateClientType | null>>
}) => {
  const defaultValues = {
    emails: stepData?.teammateEmails?.length
      ? stepData?.teammateEmails?.map((value) => ({ email: value }))
      : [{ email: "" }, { email: "" }, { email: "" }],
  }
  const { user } = useAuth()
  const { toast } = useToast()
  const [inviteLink, setInviteLink] = React.useState("")
  const [isInviteLinkLoading, setIsInviteLinkLoading] = React.useState(false)
  const [hasInviteLinkError, setHasInviteLinkError] = React.useState(false)

  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    register,
    getValues,
  } = useForm<InviteYourTeamFormValues>({
    resolver: zodResolver(inviteYourTeamFormSchema),
    defaultValues,
  })
  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const { currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / NUMBERED_STEPS) * 100

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emails",
  })
  const inviteBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "")
  const genericTeamName = stepData?.teamName?.trim() || "Client Team"

  const onSubmit: SubmitHandler<InviteYourTeamFormValues> = (values) => {
    const teammateEmails = values.emails
      .map(({ email }) => email.trim())
      .filter(Boolean)

    setStepData({
      ...stepData,
      teammateEmails,
    })
    toggleValidation(true)
    setStep(currentStep + 1)
  }

  const skip = () => {
    toggleValidation(true)
    const nextStepIndex = currentStep + 1
    setStep(nextStepIndex)
  }

  const back = () => {
    const teammateEmails = getValues("emails")
      ?.map(({ email }) => email.trim())
      .filter(Boolean)

    setStepData({
      ...stepData,
      teammateEmails,
    })
    prevStep()
  }

  const generateInviteLink = async ({
    copyToClipboard = false,
    showErrorToast = false,
  }: {
    copyToClipboard?: boolean
    showErrorToast?: boolean
  }) => {
    const teamId = (user as any)?.id || (user as any)?.sub
    if (!teamId) {
      if (showErrorToast) {
        toast({
          title: "Please sign in again to generate an invite link.",
          variant: "destructive",
        })
      }
      return false
    }

    try {
      setIsInviteLinkLoading(true)
      setHasInviteLinkError(false)

      const response = await InvitationsAPI.createInvitationLink({
        teamId,
        teamName: genericTeamName,
        role: "viewer",
      })

      const inviteUrl =
        response?.data?.url ||
        (response?.data?.token
          ? `${inviteBaseUrl}/invite/accept?token=${response.data.token}`
          : "")

      if (!inviteUrl) {
        throw new Error(
          "We couldn't generate the invite link. Please try again."
        )
      }

      setInviteLink(inviteUrl)

      if (copyToClipboard) {
        await navigator.clipboard.writeText(inviteUrl)
        toast({
          title: "Invite link copied",
          description: "A team invite link is now on your clipboard.",
        })
      }
      return true
    } catch (error: any) {
      setHasInviteLinkError(true)
      if (showErrorToast) {
        toast({
          title:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to generate invite link.",
          variant: "destructive",
        })
      }
      return false
    } finally {
      setIsInviteLinkLoading(false)
    }
  }

  const handleCopyInviteLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink)
      toast({
        title: "Invite link copied",
        description: "A team invite link is now on your clipboard.",
      })
      return
    }

    await generateInviteLink({
      copyToClipboard: true,
      showErrorToast: true,
    })
  }

  useDebounce(
    () => {
      if (inviteLink || isInviteLinkLoading || hasInviteLinkError) return

      void generateInviteLink({})
    },
    400,
    [
      genericTeamName,
      inviteLink,
      isInviteLinkLoading,
      hasInviteLinkError,
      user?.id,
      (user as any)?.sub,
    ]
  )

  return (
    <div className="min-h-screen flex 2xl:pl-[480px]">
      {sidebar}

      <form
        className="relative flex justify-between flex-col flex-auto px-5 md:px-10 py-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="max-w-[488px] 2xl:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 4 / 6
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Invite Your Team!
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Share an invite with your team so they can be part of the process.
          </p>

          <div className="mt-10 2xl:mt-[50px]">
            <div className="flex items-center gap-x-3">
              <span className="text-lg leading-[36px] font-semibold">
                Add your teammates&#39; emails to invite them
              </span>
              <InfoTooltip text="Invite teammates so they can collaborate on projects, review proposals, and manage your team workspace." />
            </div>

            <div className="flex flex-col gap-y-1.5 mt-1.5">
              {fields.map((field, index) => (
                <div className="flex flex-col gap-y-1.5" key={field.id}>
                  <div className="flex items-start gap-x-2">
                    <InputGroup className="flex-auto">
                      <Input
                        type="email"
                        placeholder="Enter email"
                        {...register(`emails.${index}.email`)}
                        isInvalid={hookFormHasError({
                          errors,
                          name: `emails.${index}.email`,
                        })}
                      />
                      <InputRightElement>
                        <Mail className="text-gray-500 size-5" />
                      </InputRightElement>
                    </InputGroup>

                    {index >= 3 ? (
                      <IconButton
                        aria-label={`Remove teammate email ${index + 1}`}
                        className="shrink-0"
                        visual="error"
                        variant="ghost"
                        size="md"
                        type="button"
                        onClick={() => remove(index)}
                      >
                        <Trash03 className="size-[15px]" />
                      </IconButton>
                    ) : null}
                  </div>

                  <HookFormErrorMessage
                    errors={errors}
                    name={`emails.${index}.email`}
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
              ))}

              <Button
                className="text-gray-500/50 hover:text-gray-500 self-start"
                size="md"
                variant="link"
                visual="gray"
                type="button"
                onClick={() => append({ email: "" })}
              >
                <Plus className="size-[15px]" /> Add Another
              </Button>
            </div>

            <div className="mt-[50px] flex items-center gap-x-[9px]">
              <span className="flex-auto inline-block h-px bg-[#E1E6EA]" />
              <span className="text-xs leading-5 font-medium text-gray-500">
                Or
              </span>
              <span className="flex-auto inline-block h-px bg-[#E1E6EA]" />
            </div>

            <div className="mt-[50px]">
              <div className="text-lg leading-9 font-semibold">
                Share an invite link with your team
              </div>

              <div className="mt-3 flex h-11 w-full items-center gap-2 rounded-[5px] border border-gray-300 bg-white px-[14px] py-[10px]">
                <div className="min-w-0 flex-auto truncate text-base text-gray-700 leading-6">
                  {inviteLink ||
                    (hasInviteLinkError
                      ? "We couldn't generate the invite link. Please try again."
                      : "Invite link will appear here")}
                </div>

                <Button
                  className="shrink-0 gap-2"
                  size="sm"
                  variant="link"
                  type="button"
                  onClick={handleCopyInviteLink}
                  disabled={isInviteLinkLoading}
                >
                  {isInviteLinkLoading ? (
                    <>
                      <Spinner className="size-4" /> Generating...
                    </>
                  ) : (
                    <>
                      <Link01 className="size-[15px]" /> Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 2xl:mt-[50px] max-w-[488px] 2xl:max-w-[560px] mx-auto w-full self-end flex justify-between">
          <Button
            size="md"
            variant="outlined"
            visual="gray"
            onClick={back}
            type="button"
          >
            Back
          </Button>

          <div className="flex items-center gap-x-6">
            <Button
              className="opacity-50 hover:opacity-100"
              variant="ghost"
              visual="gray"
              onClick={skip}
              type="button"
              size="md"
            >
              Skip
            </Button>
            <Button size="md" visual="primary">
              Continue
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

const usernameRules = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be at most 24 characters.")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Username must start with a letter and contain only lowercase letters, numbers, and underscores."
  )

const createYourUsernameFormSchema = z.object({
  username: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? "" : val),
    z.union([z.literal(""), usernameRules])
  ),
})

type CreateYourUsernameFormValues = z.infer<typeof createYourUsernameFormSchema>

const CreateYourUsername = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateClientType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateClientType | null>>
}) => {
  const [show, toggleShow] = useToggle(false)
  const [isAvailable, setIsAvailable] = React.useState<boolean | null>(null)
  const [isUsernameLoading, setIsUsernameLoading] = useToggle(false)
  const [usernameCommitted, setUsernameCommitted] = React.useState(
    Boolean(stepData?.username)
  )
  const { user } = useAuth()
  const usernameInputRef = React.useRef<HTMLInputElement>(null)

  const {
    watch,
    formState: { errors, isValid },
    setValue,
    clearErrors,
    setError,
    register,
    handleSubmit,
    trigger,
  } = useForm<CreateYourUsernameFormValues>({
    resolver: zodResolver(createYourUsernameFormSchema),
    defaultValues: {
      username: stepData?.username || "",
    },
  })

  const { username } = watch()
  const { ref: registerRef, ...registerRest } = register("username")

  const usernameSuggestions = useMemo(
    () =>
      getClientUsernameSuggestions({
        email: user?.email,
        firstName: stepData?.firstName ?? user?.firstName,
        lastName: stepData?.lastName ?? user?.lastName,
        teamName: stepData?.teamName,
        role: stepData?.role,
      }),
    [
      stepData?.firstName,
      stepData?.lastName,
      stepData?.role,
      stepData?.teamName,
      user?.email,
      user?.firstName,
      user?.lastName,
    ]
  )

  const [checkedSuggestions, setCheckedSuggestions] = React.useState<
    Record<string, boolean>
  >({})
  const [suggestionsChecking, setSuggestionsChecking] = React.useState(false)

  React.useEffect(() => {
    if (usernameSuggestions.length === 0) return
    let cancelled = false
    setSuggestionsChecking(true)

    // Cap in-flight availability checks so a large suggestion list doesn't
    // produce a burst of parallel requests against the auth service. Three
    // in flight at a time is a reasonable balance between latency and load.
    const MAX_CONCURRENCY = 3
    const run = async () => {
      const map: Record<string, boolean> = {}
      let cursor = 0
      const worker = async () => {
        while (!cancelled) {
          const index = cursor++
          if (index >= usernameSuggestions.length) return
          const name = usernameSuggestions[index]
          try {
            const res = await AuthAPI.CheckUsername({ username: name })
            map[name] = res?.status === 200 && res?.data?.available === true
          } catch {
            map[name] = false
          }
        }
      }
      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENCY, usernameSuggestions.length) },
        () => worker()
      )
      await Promise.all(workers)
      if (cancelled) return
      setCheckedSuggestions(map)
      setSuggestionsChecking(false)
    }
    run()

    return () => {
      cancelled = true
    }
  }, [usernameSuggestions])

  const availableSuggestions = Array.from(
    new Set(
      usernameSuggestions.filter(
        (s) => checkedSuggestions[s] === true && s !== username?.trim()
      )
    )
  )

  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const { currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / NUMBERED_STEPS) * 100

  const onSubmit: SubmitHandler<CreateYourUsernameFormValues> = (values) => {
    if (isAvailable === false || errors.username) return

    setStepData({
      ...stepData,
      username: values.username,
    })

    nextStep()
  }

  const setFormValue = (value: string) => {
    setValue("username", value)
    trigger("username")
    setUsernameCommitted(false)
    setTimeout(() => usernameInputRef.current?.focus(), 0)
  }

  const clearUsername = () => {
    setValue("username", "")
    setIsAvailable(null)
    setUsernameCommitted(false)
    clearErrors("username")
    setTimeout(() => usernameInputRef.current?.focus(), 0)
  }

  const skip = () => {
    toggleValidation(true)
    const nextStepIndex = currentStep + 1
    setStep(nextStepIndex)
  }

  const back = () => {
    setStepData({
      ...stepData,
      username,
    })
    prevStep()
  }

  const hasValidationError = Boolean(errors.username)

  const checkUsernameAvailability = () => {
    const trimmed = username?.trim() ?? ""
    if (!trimmed || !usernameRules.safeParse(trimmed).success) {
      setIsAvailable(null)
      return
    }

    if (trimmed.length > 2) {
      setIsUsernameLoading(true)

      AuthAPI.CheckUsername({ username: trimmed })
        .then((response) => {
          if (response?.status === 200 && response?.data?.available) {
            setIsAvailable(true)
          } else {
            setIsAvailable(false)
          }
        })
        .catch((error) => {
          if (error?.response?.data?.errors?.message) {
            setError(
              "username",
              {
                ...errors?.username,
                message: error?.response?.data?.errors?.message,
              },
              {
                shouldFocus: true,
              }
            )
          }
          setIsAvailable(false)
        })
        .finally(() => {
          setIsUsernameLoading(false)
        })
    } else {
      setIsAvailable(null)
    }
  }

  useDebounce(checkUsernameAvailability, 700, [username])

  const usernameHasError = hasValidationError || isAvailable === false

  return (
    <div className="min-h-screen flex 2xl:pl-[480px]">
      {sidebar}

      <form
        className="relative flex justify-between flex-col flex-auto px-5 py-10 md:px-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="max-w-[488px] 2xl:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 5 / 6
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Create your username
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Your username is one-of-a-kind, and you can always update it
            later...
          </p>

          <div className="mt-10 2xl:mt-[50px]">
            <div className="flex flex-col gap-y-1.5">
              <Label
                className={cn(
                  "text-dark-blue-400",
                  usernameHasError && "text-error-500"
                )}
                id="username"
                size="sm"
              >
                Enter Your Username
              </Label>

              {usernameCommitted && username?.trim() && !hasValidationError ? (
                <div
                  className={cn(
                    "flex items-center min-h-[44px] w-full rounded-[5px] border bg-white py-2 px-3.5 shadow-xs",
                    isAvailable === true
                      ? "border-success-300"
                      : isAvailable === false
                        ? "border-error-300"
                        : "border-gray-300"
                  )}
                >
                  <Badge
                    visual="primary"
                    size="md"
                    className="gap-x-1.5 max-w-full"
                  >
                    <span className="truncate">{username}</span>
                    <button
                      type="button"
                      onClick={clearUsername}
                      className="shrink-0 rounded-full hover:bg-primary-200 transition-colors"
                      aria-label="Remove username"
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>

                  <div className="ml-auto pl-2 shrink-0">
                    {isUsernameLoading ? (
                      <Spinner size={20} strokeWidth={2} />
                    ) : isAvailable === true ? (
                      <span className="text-emerald-600 text-sm flex items-center gap-0.5">
                        <Check className="size-4" /> Available
                      </span>
                    ) : isAvailable === false ? (
                      <span className="text-error-500 text-sm flex items-center gap-0.5">
                        <X className="size-4" /> Taken
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="username"
                    ref={(el) => {
                      registerRef(el)
                      ;(
                        usernameInputRef as React.MutableRefObject<HTMLInputElement | null>
                      ).current = el
                    }}
                    {...registerRest}
                    isInvalid={usernameHasError}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const trimmed = username?.trim()
                        if (trimmed && !hasValidationError) {
                          setUsernameCommitted(true)
                        }
                      }
                    }}
                    onChange={(e) => {
                      registerRest.onChange(e)
                      setIsAvailable(null)
                      setUsernameCommitted(false)
                    }}
                    className="pr-32"
                  />

                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isUsernameLoading ? (
                      <Spinner size={20} strokeWidth={2} />
                    ) : (
                      <>
                        {isAvailable === false && !hasValidationError && (
                          <span className="text-error-500 text-sm flex items-center gap-0.5 whitespace-nowrap">
                            <X className="size-4" /> Taken
                          </span>
                        )}

                        {isAvailable === true && !hasValidationError && (
                          <span className="text-emerald-600 text-sm flex items-center gap-0.5 whitespace-nowrap">
                            <Check className="size-4" /> Available
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <HookFormErrorMessage
                errors={errors}
                name="username"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>

            {suggestionsChecking && usernameSuggestions.length > 0 && (
              <p className="mt-4 text-sm text-gray-400">
                Checking username suggestions...
              </p>
            )}

            {(() => {
              // Show available suggestions if we have them; otherwise fall back to raw suggestions
              const displaySuggestions =
                availableSuggestions.length > 0
                  ? availableSuggestions
                  : !suggestionsChecking
                    ? usernameSuggestions.filter((s) => s !== username?.trim())
                    : []
              const isVerified = availableSuggestions.length > 0

              if (suggestionsChecking || displaySuggestions.length === 0)
                return null

              return show ? (
                <div className="mt-6">
                  {displaySuggestions.map((s, index) => (
                    <React.Fragment key={s}>
                      <Button
                        className="text-primary-500/50 hover:text-primary-500"
                        size="lg"
                        visual="gray"
                        variant="link"
                        type="button"
                        onClick={() => setFormValue(s)}
                      >
                        @{s}
                      </Button>

                      {index !== displaySuggestions.length - 1 && (
                        <span>, </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="mt-6">
                  <span className="block text-sm leading-[16.94px] text-gray-500">
                    {displaySuggestions.slice(0, 3).map((s, index) => (
                      <React.Fragment key={s}>
                        <Button
                          className="text-primary-500/50 hover:text-primary-500"
                          size="lg"
                          visual="gray"
                          variant="link"
                          type="button"
                          onClick={() => setFormValue(s)}
                        >
                          @{s}
                        </Button>

                        {index === 0 && displaySuggestions.length > 1 && (
                          <span>, </span>
                        )}
                        {index === 1 && displaySuggestions.length > 2 && (
                          <span> and </span>
                        )}
                        {index === 1 && displaySuggestions.length === 2 && (
                          <span> and </span>
                        )}
                      </React.Fragment>
                    ))}{" "}
                    {isVerified ? "are available" : ""}
                  </span>

                  {displaySuggestions.length > 3 && (
                    <Button
                      className="mt-3"
                      size="md"
                      variant="link"
                      type="button"
                      visual="gray"
                      onClick={toggleShow}
                    >
                      <Plus className="size-[15px]" />
                      More Suggestions
                    </Button>
                  )}
                </div>
              )
            })()}

            <div className="mt-10 2xl:mt-[50px]">
              <Alert>
                <AlertIcon>
                  <AlertCircle className="size-5" />
                </AlertIcon>
                <AlertContent>
                  <AlertDescription className="mt-0">
                    {`We’ve just released a new feature. Feel free to browse
                    projects and explore talent without a username. To connect
                    with profiles or post a project, you’ll need to create one.`}
                  </AlertDescription>
                </AlertContent>
              </Alert>
            </div>
          </div>
        </div>

        <div className="mt-10 2xl:mt-[50px] max-w-[488px] 2xl:max-w-[560px] mx-auto w-full self-end flex justify-between">
          <Button
            size="md"
            variant="outlined"
            visual="gray"
            type="button"
            onClick={back}
          >
            Back
          </Button>

          <div className="flex items-center gap-x-10">
            <Button
              variant="ghost"
              visual="gray"
              type="button"
              size="md"
              onClick={skip}
            >
              Skip
            </Button>
            <Button
              size="md"
              visual="primary"
              disabled={usernameHasError || isUsernameLoading}
            >
              Continue
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

const skillSuggestions = Array.isArray(rawSkillSuggestions)
  ? rawSkillSuggestions
  : []

const normalizeAutocompleteLabel = (item: AutocompleteTypeSuggestion) => {
  if ("value" in item && typeof item.value === "string") return item.value
  if ("label" in item && typeof item.label === "string") return item.label
  return ""
}

const getUniqueOptions = (values: string[]) =>
  Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length))
  )

const FALLBACK_JOB_TITLE_OPTIONS = getUniqueOptions(
  jobTitlesMock.map((item) => item.label)
)

const FALLBACK_SKILL_OPTIONS = getUniqueOptions(
  skillSuggestions.map((item) => item.label)
)

const RECOMMENDATION_CHIP_LIMIT = 9

const useAutocompleteRecommendations = (
  type: "job_titles" | "skills",
  fallbackOptions: string[]
) => {
  const [recommendations, setRecommendations] = React.useState<string[]>(
    fallbackOptions.slice(0, RECOMMENDATION_CHIP_LIMIT)
  )

  React.useEffect(() => {
    let isActive = true

    const fetchRecommendations = async () => {
      try {
        const response = await AutocompleteAPI.getByType(type)
        if (!isActive) return

        const apiValues: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data
        )
          ? response.data
          : []
        const normalizedApiValues = getUniqueOptions(
          apiValues.map((item) => normalizeAutocompleteLabel(item))
        ).slice(0, RECOMMENDATION_CHIP_LIMIT)

        if (getIsNotEmpty(normalizedApiValues)) {
          setRecommendations(normalizedApiValues)
          return
        }
      } catch {
        // keep fallback recommendations when autocomplete API is unavailable
      }

      if (isActive) {
        setRecommendations(fallbackOptions.slice(0, RECOMMENDATION_CHIP_LIMIT))
      }
    }

    fetchRecommendations()

    return () => {
      isActive = false
    }
  }, [fallbackOptions, type])

  return recommendations
}

const RecommendationChips = ({
  label,
  options,
  selectedValues,
  onSelect,
}: {
  label: string
  options: string[]
  selectedValues: string[]
  onSelect: (value: string) => void
}) => {
  const selectedSet = new Set(selectedValues.map((v) => v.toLowerCase()))
  const filtered = Array.from(
    new Map(
      options
        .filter((o) => !selectedSet.has(o.toLowerCase()))
        .map((o) => [o.toLowerCase(), o] as const)
    ).values()
  )

  if (!getIsNotEmpty(filtered)) return null

  return (
    <div className="p-5 mt-5 bg-gray-50">
      <span className="block text-xs leading-5 text-dark-blue-400">
        {label}
      </span>

      <div className="mt-3 flex gap-3 flex-wrap">
        {filtered.map((option) => (
          <Badge asChild key={option} visual="gray">
            <button
              type="button"
              className="transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 hover:bg-gray-200"
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

const LookingToWorkWith = ({
  value: valueProp,
  onValueChange,
  invalid,
}: {
  onValueChange?: (value: string[]) => void
  value?: string[]
  invalid?: boolean
}) => {
  const [inputValue, setInputValue] = React.useState("")
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false)
  const preventNextFocusOpenRef = React.useRef(false)
  const requestIdRef = React.useRef(0)
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const [values, setValues] = useControllableState<string[]>({
    defaultValue: [],
    onChange: onValueChange,
    value: valueProp,
  })
  const [selected, setSelected] = React.useState<string[]>([])
  const [jobTitleOptions, setJobTitleOptions] = React.useState<string[]>(
    FALLBACK_JOB_TITLE_OPTIONS
  )

  const handleSelectedChange = (nextSelected: string[]) => {
    setSelected(nextSelected)
    setInputValue("")
    setIsOptionsOpen(false)
    preventNextFocusOpenRef.current = true
    inputRef.current?.blur()
  }

  const resetInputValue = () => setInputValue("")

  const addValue = () => {
    if (!inputValue) return

    setValues((prev) => {
      return prev.includes(inputValue) ? prev : [...prev, inputValue]
    })
    setIsOptionsOpen(false)
    preventNextFocusOpenRef.current = true
    resetInputValue()
    inputRef.current?.blur()
  }

  const removeValue = (index: number) => {
    const tag = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((value) => value !== tag)
      return nextState
    })
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setInputValue(value)
    setIsOptionsOpen(true)
  }

  const onClickInput = () => {
    if (preventNextFocusOpenRef.current) {
      preventNextFocusOpenRef.current = false
      return
    }

    setIsOptionsOpen(true)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = event
    if (key === HOT_KEYS.ENTER) {
      event.preventDefault()
      addValue()
    }
  }

  const filteredRoles = React.useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return jobTitleOptions
    return jobTitleOptions.filter((role) => role.toLowerCase().includes(query))
  }, [inputValue, jobTitleOptions])

  React.useEffect(() => {
    const query = inputValue.trim()
    if (!query) {
      setJobTitleOptions(FALLBACK_JOB_TITLE_OPTIONS)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current
      try {
        const response = await AutocompleteAPI.getByType("job_titles", query)
        if (currentRequestId !== requestIdRef.current) return

        const apiValues: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data
        )
          ? response.data
          : []
        const normalizedApiValues = getUniqueOptions(
          apiValues.map((item) => normalizeAutocompleteLabel(item))
        )

        if (getIsNotEmpty(normalizedApiValues)) {
          setJobTitleOptions(normalizedApiValues)
          return
        }
      } catch {
        // keep fallback options when autocomplete API is unavailable
      }

      const fallbackMatches = FALLBACK_JOB_TITLE_OPTIONS.filter((role) =>
        role.toLowerCase().includes(query.toLowerCase())
      )
      setJobTitleOptions(fallbackMatches)
    }, 250)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [inputValue])

  React.useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOptionsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDownOutside)

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside)
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    setValues((prevValues) => {
      const filteredSelected = selected.filter(
        (value) => !prevValues.includes(value)
      )

      if (filteredSelected.length > 0) {
        return [...prevValues, ...filteredSelected]
      }

      return prevValues
    })
  }, [selected])

  return (
    <div ref={rootRef}>
      <Combobox
        className="w-full"
        value={selected}
        onChange={handleSelectedChange}
        multiple
      >
        <ComboboxTrigger className="flex flex-col gap-y-1.5">
          <ComboboxLabel className="text-dark-blue-400" size="sm">
            Who are you looking to work with?
          </ComboboxLabel>
          <ComboboxInput
            ref={inputRef}
            size="lg"
            className="pl-3.5"
            placeholder="Enter job titles related to your project"
            onClick={onClickInput}
            onChange={onChange}
            onKeyDown={onKeyDown}
            value={inputValue}
            invalid={invalid}
          />
        </ComboboxTrigger>

        <ScaleOutIn show={isOptionsOpen} afterLeave={() => setInputValue("")}>
          <ComboboxOptions>
            <ScrollArea viewportClassName="max-h-[304px]">
              {filteredRoles.map((role, index) => (
                <ComboboxOption key={index} value={role}>
                  {role}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      {getIsNotEmpty(values) && (
        <div className="mt-3 flex flex-wrap gap-3">
          {values.map((item, index) => (
            <Badge visual="primary" key={index}>
              {item}
              <button
                className="focus-visible:outline-none"
                onClick={() => removeValue(index)}
                type="button"
              >
                <X2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

const SkillsLookingFor = ({
  value: valueProp,
  onValueChange,
  invalid,
}: {
  onValueChange?: (value: string[]) => void
  value?: string[]
  invalid?: boolean
}) => {
  const [inputValue, setInputValue] = React.useState("")
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false)
  const preventNextFocusOpenRef = React.useRef(false)
  const requestIdRef = React.useRef(0)
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const [values, setValues] = useControllableState<string[]>({
    defaultValue: [],
    onChange: onValueChange,
    value: valueProp,
  })
  const [selected, setSelected] = React.useState<string[]>([])
  const [skillOptions, setSkillOptions] = React.useState<string[]>(
    FALLBACK_SKILL_OPTIONS
  )

  const handleSelectedChange = (nextSelected: string[]) => {
    setSelected(nextSelected)
    setInputValue("")
    setIsOptionsOpen(false)
    preventNextFocusOpenRef.current = true
    inputRef.current?.blur()
  }

  const resetInputValue = () => setInputValue("")

  const addValue = () => {
    if (!inputValue) return

    setValues((prev) => {
      return prev.includes(inputValue) ? prev : [...prev, inputValue]
    })
    setIsOptionsOpen(false)
    preventNextFocusOpenRef.current = true
    resetInputValue()
    inputRef.current?.blur()
  }

  const removeValue = (index: number) => {
    const tag = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((value) => value !== tag)
      return nextState
    })
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setInputValue(value)
    setIsOptionsOpen(true)
  }

  const onClickInput = () => {
    if (preventNextFocusOpenRef.current) {
      preventNextFocusOpenRef.current = false
      return
    }

    setIsOptionsOpen(true)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = event
    if (key === HOT_KEYS.ENTER) {
      event.preventDefault()
      addValue()
    }
  }

  const filteredRoles = React.useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return skillOptions
    return skillOptions.filter((role) => role.toLowerCase().includes(query))
  }, [inputValue, skillOptions])

  React.useEffect(() => {
    const query = inputValue.trim()
    if (!query) {
      setSkillOptions(FALLBACK_SKILL_OPTIONS)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current
      try {
        const response = await AutocompleteAPI.getByType("skills", query)
        if (currentRequestId !== requestIdRef.current) return

        const apiValues: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data
        )
          ? response.data
          : []
        const normalizedApiValues = getUniqueOptions(
          apiValues.map((item) => normalizeAutocompleteLabel(item))
        )

        if (getIsNotEmpty(normalizedApiValues)) {
          setSkillOptions(normalizedApiValues)
          return
        }
      } catch {
        // keep fallback options when autocomplete API is unavailable
      }

      const fallbackMatches = FALLBACK_SKILL_OPTIONS.filter((role) =>
        role.toLowerCase().includes(query.toLowerCase())
      )
      setSkillOptions(fallbackMatches)
    }, 250)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [inputValue])

  React.useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOptionsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDownOutside)

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside)
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    setValues((prevValues) => {
      const filteredSelected = selected.filter(
        (value) => !prevValues.includes(value)
      )

      if (filteredSelected.length > 0) {
        return [...prevValues, ...filteredSelected]
      }

      return prevValues
    })
  }, [selected])

  return (
    <div ref={rootRef}>
      <Combobox
        className="w-full"
        value={selected}
        onChange={handleSelectedChange}
        multiple
      >
        <ComboboxTrigger className="flex flex-col gap-y-1.5">
          <ComboboxLabel className="text-dark-blue-400" size="sm">
            What skills are you looking for?
          </ComboboxLabel>
          <ComboboxInput
            ref={inputRef}
            size="lg"
            className="pl-3.5"
            placeholder="Search for skills related to your project"
            onClick={onClickInput}
            onChange={onChange}
            onKeyDown={onKeyDown}
            value={inputValue}
            invalid={invalid}
          />
        </ComboboxTrigger>

        <ScaleOutIn show={isOptionsOpen} afterLeave={() => setInputValue("")}>
          <ComboboxOptions>
            <ScrollArea viewportClassName="max-h-[304px]">
              {filteredRoles.map((role, index) => (
                <ComboboxOption key={index} value={role}>
                  {role}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      {getIsNotEmpty(values) && (
        <div className="mt-3 flex flex-wrap gap-3">
          {values.map((item, index) => (
            <Badge visual="primary" key={index}>
              {item}
              <button
                className="focus-visible:outline-none"
                onClick={() => removeValue(index)}
                type="button"
              >
                <X2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

const industriesOrVerticals = [
  "Tech & Software",
  "Health & Wellness",
  "Marketing & Advertising",
  "Retail & E-commerce",
  "Design & Creative",
  "Entertainment and Gaming",
  "Finance & Consulting",
  "Education & Training",
  "Government & Public Sector",
  "Other",
] as const

const projects = [
  "Sprints (1 - 3 weeks)",
  "Medium Term (3 - 5 months)",
  "Short Term (1 - 3 months)",
  "Long Term (6+ months)",
] as const

const budget = [
  "$100 - $500",
  "$25,000 - $50,000",
  "$500 - $1000",
  "$50,000 - $100,000",
  "$1,000 - $5,000",
  "$100,000 - $250,000",
  "$5,000 - $10,000",
  "$250,000 - $500,000",
  "$10,000 - $25,000",
  "$500,000 +",
  "My budget is flexible",
] as const

const outlineYourInterestsFormSchema = z
  .object({
    industriesOrVerticals: z.object(
      industriesOrVerticals.reduce(
        (previous, current) => ({ ...previous, [current]: z.boolean() }),
        {} as { [Key in (typeof industriesOrVerticals)[number]]: z.ZodBoolean }
      )
    ),
    projects: z.object(
      projects.reduce(
        (previous, current) => ({ ...previous, [current]: z.boolean() }),
        {} as { [Key in (typeof projects)[number]]: z.ZodBoolean }
      )
    ),
    budget: z.enum(budget, {
      required_error: "Please select a budget range.",
    }),
    lookingToWorkWith: z
      .array(z.string())
      .min(1, "Enter at least one desired role or one desired skill."),
    skillsLookingFor: z
      .array(z.string())
      .min(1, "Enter at least one desired role or one desired skill."),
  })
  .refine(
    (data) =>
      industriesOrVerticals.some((item) => data.industriesOrVerticals[item]),
    {
      message: "Select at least one industry or vertical.",
      path: ["industriesOrVerticals"],
    }
  )
  .refine((data) => projects.some((item) => data.projects[item]), {
    message: "Select at least one project type.",
    path: ["projects"],
  })

type OutlineYourInterestsFormValues = z.infer<
  typeof outlineYourInterestsFormSchema
>

const OutlineYourInterests = ({
  sidebar,
  stepData,
  setStepData,
  setClientUser,
}: {
  sidebar: React.ReactNode
  stepData: CreateClientType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateClientType | null>>
  setClientUser: React.Dispatch<React.SetStateAction<User | null>>
}) => {
  const { toast } = useToast()
  const { user } = useAuth()

  const [isLoading, setIsLoading] = React.useState(false)
  const recommendedJobTitles = useAutocompleteRecommendations(
    "job_titles",
    FALLBACK_JOB_TITLE_OPTIONS
  )
  const recommendedSkills = useAutocompleteRecommendations(
    "skills",
    FALLBACK_SKILL_OPTIONS
  )

  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    getValues,
    setValue,
  } = useForm<OutlineYourInterestsFormValues>({
    resolver: zodResolver(outlineYourInterestsFormSchema),
    defaultValues: {
      industriesOrVerticals: industriesOrVerticals.reduce(
        (previous, current) => ({
          ...previous,
          [current]: stepData?.industries?.includes(current) || false,
        }),
        {} as { [Key in (typeof industriesOrVerticals)[number]]: boolean }
      ),
      projects: projects.reduce(
        (previous, current) => ({
          ...previous,
          [current]: stepData?.projectTypes?.includes(current) || false,
        }),
        {} as { [Key in (typeof projects)[number]]: boolean }
      ),
      lookingToWorkWith: stepData?.lookingToWorkWith || [],
      skillsLookingFor: stepData?.skills || [],
      budget: getBudgetDefaultValue(stepData?.budget),
    },
  })
  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const { currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / NUMBERED_STEPS) * 100

  const onSubmit: SubmitHandler<OutlineYourInterestsFormValues> = (values) => {
    setIsLoading(true)
    const { firstName, lastName } = deriveClientProfileNames(user, stepData)

    //const { userId, ...restStepData } = stepData || {};
    const clientData: CreateClientType = {
      ...stepData,
      firstName: user?.firstName ?? stepData?.firstName,
      lastName: user?.lastName ?? stepData?.lastName,
      avatarUrl: stepData?.avatarUrl ?? user?.avatarUrl ?? undefined,
      budget: values.budget,
      skills: values?.skillsLookingFor,
      industries: Object.entries(values?.industriesOrVerticals)
        .filter(([key, value]) => value === true)
        .map(([key]) => key),
      lookingToWorkWith: values?.lookingToWorkWith,
      projectTypes:
        Object.entries(values?.projects)
          .filter(([key, value]) => value === true)
          .map(([key]) => key) || [],
    }

    const payloadErrors = getClientPayloadValidationErrors(clientData)
    if (payloadErrors.length > 0) {
      toast({
        title: payloadErrors[0],
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    ClientAPI.CreateClient(clientData)
      .then((response) => {
        if (response?.status === 201 && response?.data?.user) {
          toggleValidation(true)
          setStep(currentStep + 1)
          setStepData(null)
          setClientUser(response?.data?.user)
        }
      })
      .catch((error) => {
        if (error?.response?.data?.errors?.message) {
          toast({
            title: error?.response?.data?.errors?.message,
            variant: "destructive",
          })
        } else if (
          Array.isArray(error?.response?.data?.message) &&
          error?.response?.data?.message?.length > 0
        ) {
          toast({
            title: error?.response?.data?.message?.[0],
            variant: "destructive",
          })
        } else {
          toast({
            title: error?.response?.data?.message,
            variant: "destructive",
          })
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const skip = () => {
    try {
      toggleValidation(true)
      const nextStepIndex = currentStep + 1
      setStep(nextStepIndex)
    } catch (error) {
      toast({
        title: "Failed to skip onboarding. Please try again.",
        variant: "destructive",
      })
    }
  }

  const back = () => {
    const values = getValues()

    setStepData({
      ...stepData,
      budget: values.budget,
      skills: values?.skillsLookingFor,
      industries: Object.entries(values?.industriesOrVerticals)
        .filter(([key, value]) => value === true)
        .map(([key]) => key),
      lookingToWorkWith: values?.lookingToWorkWith,
      projectTypes:
        Object.entries(values?.projects)
          .filter(([key, value]) => value === true)
          .map(([key]) => key) || [],
    })
    prevStep()
  }

  return (
    <div className="min-h-screen flex 2xl:pl-[480px]">
      {sidebar}
      <form
        className="relative flex justify-between flex-col flex-auto px-5 md:px-10 py-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="max-w-[688px] 2xl:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 6 / 6
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Outline Your Interests
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Share an invite with your team so they can be part of the process.
          </p>

          <div className="mt-[50px]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-x-3">
                <h1 className="text-lg leading-9 font-semibold text-dark-blue-400">
                  What industries or verticals do you work in?
                </h1>
                <InfoTooltip text="Select the industries you operate in. This helps us match you with talent who have relevant domain experience." />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {industriesOrVerticals.map((item) => (
                  <Controller
                    key={item}
                    control={control}
                    name={`industriesOrVerticals.${item}`}
                    render={({ field: { value, onChange, ...field } }) => (
                      <CheckboxSelector
                        checked={value}
                        onCheckedChange={onChange}
                        {...field}
                      >
                        <span className="text-sm leading-5 font-medium text-dark-blue-400">
                          {item}
                        </span>
                      </CheckboxSelector>
                    )}
                  />
                ))}
              </div>

              <HookFormErrorMessage
                errors={errors}
                name="industriesOrVerticals.root"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>

            <div className="mt-10 2xl:mt-[50px]">
              <div className="flex flex-col gap-y-1.5">
                <Controller
                  control={control}
                  name="lookingToWorkWith"
                  render={({ field: { value, onChange } }) => {
                    const selectedValues = value || []

                    return (
                      <>
                        <LookingToWorkWith
                          value={selectedValues}
                          onValueChange={onChange}
                          invalid={hookFormHasError({
                            errors,
                            name: "lookingToWorkWith",
                          })}
                        />
                        <RecommendationChips
                          label="Who are you looking to work with?"
                          options={recommendedJobTitles}
                          selectedValues={selectedValues}
                          onSelect={(option) =>
                            setValue(
                              "lookingToWorkWith",
                              selectedValues.includes(option)
                                ? selectedValues
                                : [...selectedValues, option],
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              }
                            )
                          }
                        />
                      </>
                    )
                  }}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="lookingToWorkWith"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
            </div>

            <div className="mt-10 2xl:mt-[50px]">
              <div className="flex flex-col gap-y-1.5">
                <Controller
                  control={control}
                  name="skillsLookingFor"
                  render={({ field: { value, onChange } }) => {
                    const selectedValues = value || []

                    return (
                      <>
                        <SkillsLookingFor
                          value={selectedValues}
                          onValueChange={onChange}
                          invalid={hookFormHasError({
                            errors,
                            name: "skillsLookingFor",
                          })}
                        />
                        <RecommendationChips
                          label="Recommended skills"
                          options={recommendedSkills}
                          selectedValues={selectedValues}
                          onSelect={(option) =>
                            setValue(
                              "skillsLookingFor",
                              selectedValues.includes(option)
                                ? selectedValues
                                : [...selectedValues, option],
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              }
                            )
                          }
                        />
                      </>
                    )
                  }}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="skillsLookingFor"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5 mt-10 2xl:mt-[50px]">
              <div className="flex items-center gap-x-3">
                <h1 className="text-lg leading-9 font-semibold text-dark-blue-400">
                  What types of projects are you interested in?
                </h1>
                <InfoTooltip text="Choose the project types that match your needs. This helps us recommend relevant talent and listings." />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {projects.map((item, index) => (
                  <Controller
                    key={item}
                    control={control}
                    name={`projects.${item}`}
                    render={({ field: { value, onChange, ...field } }) => (
                      <CheckboxSelector
                        key={index}
                        checked={value}
                        onCheckedChange={onChange}
                        {...field}
                      >
                        <span className="text-sm leading-5 font-medium text-dark-blue-400">
                          {item}
                        </span>
                      </CheckboxSelector>
                    )}
                  />
                ))}
                <HookFormErrorMessage
                  errors={errors}
                  name="projects.root"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5 mt-10 2xl:mt-[50px]">
              <div className="flex items-center gap-x-3">
                <h1 className="text-lg leading-9 font-semibold text-dark-blue-400">
                  What&apos;s your budget?
                </h1>
                <InfoTooltip text="Select a monthly budget range. This helps us recommend talent and projects within your price range." />
              </div>

              <div className="flex flex-col gap-y-1.5">
                <Controller
                  control={control}
                  name="budget"
                  render={({ field: { value, onChange } }) => (
                    <RadioGroup
                      className="grid grid-cols-2 gap-2.5"
                      value={value ?? ""}
                      onValueChange={onChange}
                    >
                      {budget.map((item, index) => (
                        <RadioGroupItemSelector value={item} key={index}>
                          <span className="text-sm leading-5 font-medium text-dark-blue-400">
                            {item}
                          </span>
                        </RadioGroupItemSelector>
                      ))}
                    </RadioGroup>
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="budget"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 2xl:mt-[50px] max-w-[488px] 2xl:max-w-[560px] mx-auto w-full self-end flex justify-between">
          <Button
            size="md"
            variant="outlined"
            visual="gray"
            onClick={back}
            type="button"
          >
            Back
          </Button>

          <div className="flex items-center gap-x-6">
            <Button
              className="opacity-50 hover:opacity-100"
              variant="ghost"
              visual="gray"
              onClick={skip}
              type="button"
              size="md"
            >
              Skip
            </Button>
            <Button size="md" visual="primary">
              {isLoading ? (
                <Spinner
                  size={24}
                  className="stroke-white"
                  trackClassName="stroke-primary-500"
                  strokeWidth={2}
                />
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

const DoNext = ({
  sidebar,
  clientUser,
}: {
  sidebar: React.ReactNode
  clientUser: User | null
}) => {
  const router = useRouter()
  const { setUser, user } = useAuth()
  const [isLoading, setIsLoading] = React.useState(false)

  const requiresPasswordSetup = (candidate?: User | null) => {
    const safeUser = candidate as
      | { provider?: string; hasPassword?: boolean }
      | null
      | undefined
    return safeUser?.provider === "EMAIL" && !safeUser?.hasPassword
  }

  const getPostOnboardingRoute = (
    targetRoute: string,
    candidate?: User | null
  ) => {
    // Enforce password setup before allowing post-onboarding route jumps.
    return requiresPasswordSetup(candidate) ? "/client-dashboard" : targetRoute
  }

  const handleFinish = async () => {
    setIsLoading(true)

    // Always mark onboarding as dismissed locally so AuthenticatedRoute won't bounce back
    const finishedUser = {
      ...(clientUser ?? user),
      onboardingDismissed: true,
      clientOnboardedAt: new Date().toISOString(),
      userType: "client",
    } as User
    setUser(finishedUser)

    // Persist to localStorage as a fallback in case the API call fails
    try {
      window.localStorage.setItem("marketeq-onboarding-dismissed", "true")
    } catch {}

    try {
      await UserAPI.handleSkip({ role: ROLE.CLIENT })
      const userResponse = await UserAPI.me()
      if (userResponse?.data?.user) {
        setUser(userResponse.data.user)
      }
    } catch (error) {
      console.error("Failed to complete onboarding", error)
    }

    setIsLoading(false)
    router.push("/client-dashboard")
  }

  return (
    <div className="min-h-screen flex 2xl:pl-[480px]">
      {sidebar}

      <div className="relative flex justify-between flex-col flex-auto px-5 md:px-10 py-10 lg:py-[100px] 2xl:px-[150px]">
        <div className="max-w-[688px] 2xl:max-w-[660px] w-full mx-auto">
          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            What would you like to do next?
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Choose your next move and get started
          </p>

          <div className="mt-10 md:mt-[50px] grid md:grid-cols-2 gap-2.5 2xl:gap-5">
            <div
              className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
              onClick={() => {
                if (clientUser) {
                  setUser(clientUser)
                }
                router.push(
                  getPostOnboardingRoute("/projects", clientUser ?? user)
                )
              }}
            >
              <div className="flex items-center gap-x-3">
                <div className="size-11 rounded-lg border-[1.5px] shrink-0 inline-flex items-center justify-center border-[#EAECF0] text-primary-500">
                  <Briefcase02 className="size-5" />
                </div>
                <span className="text-sm leading-[16.94px] inline-block font-medium text-gray-900">
                  Browse Projects
                </span>
              </div>

              <ChevronRight className="shrink-0 size-5" />
            </div>

            <div
              className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
              onClick={() => {
                if (clientUser) {
                  setUser(clientUser)
                }
                router.push(
                  getPostOnboardingRoute("/teams", clientUser ?? user)
                )
              }}
            >
              <div className="flex items-center gap-x-3">
                <div className="size-11 rounded-lg border-[1.5px] shrink-0 inline-flex items-center justify-center border-[#EAECF0] text-primary-500">
                  <Users03 className="size-5" />
                </div>
                <span className="text-sm leading-[16.94px] inline-block font-medium text-gray-900">
                  Browse Teams
                </span>
              </div>

              <ChevronRight className="shrink-0 size-5" />
            </div>

            <div
              className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
              onClick={() => {
                if (clientUser) {
                  setUser(clientUser)
                }
                router.push(
                  getPostOnboardingRoute("/services", clientUser ?? user)
                )
              }}
            >
              <div className="flex items-center gap-x-3">
                <div className="size-11 rounded-lg border-[1.5px] shrink-0 inline-flex items-center justify-center border-[#EAECF0] text-primary-500">
                  <User02 className="size-5" />
                </div>
                <span className="text-sm leading-[16.94px] inline-block font-medium text-gray-900">
                  Find Talent
                </span>
              </div>

              <ChevronRight className="shrink-0 size-5" />
            </div>

            <div
              className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
              onClick={() => {
                if (clientUser) {
                  setUser(clientUser)
                }
                router.push(
                  getPostOnboardingRoute(
                    "/publish-project",
                    clientUser ?? user
                  )
                )
              }}
            >
              <div className="flex items-center gap-x-3">
                <div className="size-11 rounded-lg border-[1.5px] shrink-0 inline-flex items-center justify-center border-[#EAECF0] text-primary-500">
                  <Plus1 className="size-5" />
                </div>
                <span className="text-sm leading-[16.94px] inline-block font-medium text-gray-900">
                  Create a New Project
                </span>
              </div>

              <ChevronRight className="shrink-0 size-5" />
            </div>
          </div>
        </div>

        <div className="mt-10 lg:mt-[50px] max-w-[688px] 2xl:max-w-[660px] mx-auto w-full self-end flex justify-end">
          <Button
            onClick={handleFinish}
            className="text-primary-500"
            variant="link"
            visual="gray"
          >
            <Home03 className="size-[15px]" /> Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

const DoNextSidebar = () => {
  return (
    <div className="fixed inset-y-0 left-0 p-[75px] w-[480px] xs:max-2xl:hidden shrink-0 flex flex-col bg-dark-blue-500">
      <NextLink href="/" className="focus-visible:outline-none">
        <Logo className="h-9 w-[245px] shrink-0" />
      </NextLink>

      <div className="mt-[94px]">
        <h1 className="text-[45px] leading-none font-bold text-white">
          Welcome to Marketeq!
        </h1>

        <div className="mt-[30px]">
          <span className="text-white text-[22px] leading-[26.63px]">
            Unlock your potential and explore exciting opportunities
          </span>
        </div>
      </div>

      <Triangles className="absolute bottom-0 right-0" />

      <ul className="relative mt-[30px] flex flex-col gap-y-[30px]">
        <li className="flex items-center gap-x-[13px]">
          <Check className="size-[22px] text-primary-500" />
          <span className="text-sm leading-[16.94px] text-white font-light">
            Find top talent or exciting projects
          </span>
        </li>
        <li className="flex items-center gap-x-[13px]">
          <Check className="size-[22px] text-primary-500" />
          <span className="text-sm leading-[16.94px] text-white font-light">
            Manage all your projects in one place
          </span>
        </li>
        <li className="flex items-center gap-x-[13px]">
          <Check className="size-[22px] text-primary-500" />
          <span className="text-sm leading-[16.94px] text-white font-light">
            Track progress in real-time
          </span>
        </li>
        <li className="flex items-center gap-x-[13px]">
          <Check className="size-[22px] text-primary-500" />
          <span className="text-sm leading-[16.94px] text-white font-light">
            Collaborate with ease
          </span>
        </li>
        <li className="flex items-center gap-x-[13px]">
          <Check className="size-[22px] text-primary-500" />
          <span className="text-sm leading-[16.94px] text-white font-light">
            Secure contracts and payments
          </span>
        </li>
      </ul>
    </div>
  )
}

const Sidebar = () => {
  return (
    <div className="fixed inset-y-0 left-0 p-[75px] w-[480px] xs:max-2xl:hidden shrink-0 flex flex-col bg-dark-blue-500">
      <NextLink href="/" className="focus-visible:outline-none">
        <Logo className="h-9 w-[245px] shrink-0" />
      </NextLink>

      <div className="mt-[94px]">
        <h1 className="text-[45px] leading-none font-bold text-white">
          Connect. Create. Conquer.
        </h1>

        <div className="mt-[30px]">
          <span className="text-white text-[22px] leading-[26.63px]">
            From ideas to execution, find the talent that can make it happen.
          </span>
        </div>
      </div>

      <Triangles className="absolute bottom-0 right-0" />

      <div className="relative mt-auto flex flex-col gap-y-5">
        <span className="text-base leading-[19.36px] text-white focus-visible:outline-none">
          Already have an account?
        </span>

        <div className="relative self-start">
          <NextLink href="/onboarding" className="focus-visible:outline-none">
            <Button
              className="hover:bg-white hover:text-dark-blue-400 border-white/[.2] text-white hover:border-white"
              size="lg"
              visual="gray"
              variant="outlined"
            >
              Sign In
            </Button>
          </NextLink>

          <Pointer className="absolute top-[34px] right-0 -rotate-6" />
        </div>
      </div>
    </div>
  )
}

const steps: Steps[] = [
  { label: "introduce-yourself", isValid: false, disabled: false },
  { label: "describe-your-team", isValid: false, disabled: true },
  { label: "share-your-goals", isValid: false, disabled: true },
  { label: "invite-your-team", isValid: false, disabled: true },
  { label: "create-your-username", isValid: false, disabled: true },
  { label: "outline-your-interests", isValid: false, disabled: true },
  { label: "do-next", isValid: false, disabled: true },
]

// Inline IntroduceYourself step for client onboarding

// Accept File or string (URL) for avatar
const introduceYourselfFormSchema = z.object({
  avatar: z
    .array(z.union([z.instanceof(File), z.string()]), {
      required_error: "Please select a profile photo.",
    })
    .min(1, "Please select a profile photo."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
})
type IntroduceYourselfFormValues = z.infer<typeof introduceYourselfFormSchema>

const IntroduceYourself = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateClientType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateClientType | null>>
}) => {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    watch,
  } = useForm<IntroduceYourselfFormValues>({
    resolver: zodResolver(introduceYourselfFormSchema),
    defaultValues: {
      avatar: stepData?.avatarUrl ? [stepData.avatarUrl] : [],
      firstName: stepData?.firstName || "",
      lastName: stepData?.lastName || "",
    },
  })
  const { firstName, lastName } = watch()
  const { toggleValidation } = useStepContext()
  const { nextStep, setStep } = useStepperContext()
  const { toast } = useToast()
  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])
  const { currentStep } = useStepRootContext()
  const progress = ((currentStep + 1) / NUMBERED_STEPS) * 100
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.trim()
  const onSubmit: SubmitHandler<IntroduceYourselfFormValues> = async ({
    avatar,
    firstName,
    lastName,
  }) => {
    let avatarUrl: string | undefined = stepData?.avatarUrl
    const first = avatar?.[0]
    if (typeof first === "string") {
      avatarUrl = first
    } else if (first instanceof File) {
      try {
        const response = await ClientAPI.UploadAvatar(first)
        // Backend returns `{ url: null }` when object storage is not
        // configured (local/dev). In that case we keep going without
        // setting an avatar instead of blocking the step.
        avatarUrl = response?.data?.url ?? undefined
      } catch (error: any) {
        toast({
          title:
            error?.response?.data?.message ||
            "Failed to upload profile photo. Please try again.",
          variant: "destructive",
        })
        return
      }
    }
    setStepData({
      ...stepData,
      avatarUrl,
      firstName,
      lastName,
    })
    nextStep()
  }
  const skip = () => {
    toggleValidation(true)
    const nextStepIndex = currentStep + 1
    setStep(nextStepIndex)
  }
  return (
    <div className="min-h-screen flex 2xl:pl-[480px] bg-white">
      {sidebar}
      <form
        className="relative grid items-start flex-auto py-10 px-5 md:px-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="max-w-[488px] lg:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 1 / 6
            </span>
          </div>
          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Introduce yourself!
          </h1>
          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Tell us a bit about you to help us connect you with the right
            opportunities!
          </p>
          <div className="mt-10 2xl:mt-[50px]">
            <div className="space-y-6">
              <div className="flex flex-col gap-y-1.5">
                <Label
                  className="text-dark-blue-400"
                  htmlFor="profile-photo"
                  asChild
                >
                  <span>Profile Photo</span>
                </Label>
                <Controller
                  control={control}
                  name="avatar"
                  render={({ field: { onChange } }) => (
                    <PictureEditor
                      onValueChange={onChange}
                      startingPoint={({
                        dataUrl,
                        open,
                        style,
                        onRemove,
                        onEdit,
                      }: {
                        dataUrl: string | null
                        open: () => void
                        style: Record<string, string | number>
                        onRemove: () => void
                        onEdit: () => void
                      }) => (
                        <div className="flex gap-x-3 items-center">
                          <div className="relative overflow-hidden size-[96px] bg-gray-100 rounded-full inline-flex items-center justify-center shrink-0">
                            {dataUrl ? (
                              <img
                                alt="Avatar"
                                src={dataUrl}
                                className="rounded-full absolute inset-0 size-full object-cover transform"
                                style={style}
                              />
                            ) : (
                              <span className="text-4xl leading-[44px] uppercase text-gray-300 font-medium">
                                {initials || "CU"}
                              </span>
                            )}
                          </div>
                          {dataUrl ? (
                            <Button
                              className="rounded-full"
                              size="md"
                              onClick={open}
                              type="button"
                            >
                              Change Photo
                            </Button>
                          ) : (
                            <Button
                              className="rounded-full"
                              size="md"
                              type="button"
                              variant="outlined"
                              visual="gray"
                              onClick={open}
                            >
                              Upload Picture
                            </Button>
                          )}
                        </div>
                      )}
                    />
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="avatar"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
              <div className="grid 2xl:grid-cols-2 gap-6">
                <div className="flex flex-col gap-y-1.5">
                  <Label
                    className="text-dark-blue-400"
                    htmlFor="first-name"
                    size="sm"
                  >
                    First Name
                  </Label>
                  <Input
                    placeholder="John"
                    id="first-name"
                    {...register("firstName")}
                    isInvalid={!!errors.firstName}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="firstName"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-y-1.5">
                  <Label
                    className="text-dark-blue-400"
                    htmlFor="last-name"
                    size="sm"
                  >
                    Last Name
                  </Label>
                  <Input
                    placeholder="Doe"
                    id="last-name"
                    {...register("lastName")}
                    isInvalid={!!errors.lastName}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="lastName"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[488px] lg:max-w-[560px] self-end w-full mt-10 lg:mt-[50px]">
          <div className="flex items-center justify-between">
            <Button
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              disabled
            >
              Back
            </Button>
            <div className="flex items-center gap-x-6">
              <Button
                className="opacity-50 hover:opacity-100"
                variant="ghost"
                visual="gray"
                type="button"
                size="md"
                onClick={skip}
              >
                Skip
              </Button>
              <Button size="md" visual="primary">
                Continue
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

const ClientOnboarding = ({
  describeYourTeam,
  shareYourGoals,
  inviteYourTeam,
  createYourUsername,
  outlineYourInterests,
  doNext,
  stepData,
  setStepData,
}: {
  describeYourTeam?: React.ReactNode
  shareYourGoals?: React.ReactNode
  inviteYourTeam?: React.ReactNode
  createYourUsername?: React.ReactNode
  outlineYourInterests?: React.ReactNode
  doNext?: React.ReactNode
  stepData: CreateClientType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateClientType | null>>
}) => {
  const {
    nextStep,
    prevStep,
    setStep,
    toggleStepValidation,
    state: { currentStep, hasNextStep, hasPreviousStep, totalSteps },
    stepsState,
  } = useStepper({
    steps,
  })

  const stepperValue = useMemo(
    () => ({ nextStep, prevStep, setStep, toggleStepValidation }),
    [nextStep, prevStep, setStep, toggleStepValidation]
  )
  const stepperRootValue = useMemo(
    () => ({
      currentStep,
      hasNextStep,
      hasPreviousStep,
      totalSteps,
      stepsState,
    }),
    [currentStep, hasNextStep, hasPreviousStep, totalSteps, stepsState]
  )

  return (
    <StepperProvider value={stepperValue}>
      <StepRootProvider value={stepperRootValue}>
        <StepControl>
          <Step>
            <IntroduceYourself
              sidebar={<Sidebar />}
              stepData={stepData}
              setStepData={setStepData}
            />
          </Step>
          <Step>{describeYourTeam}</Step>
          <Step>{shareYourGoals}</Step>
          <Step>{inviteYourTeam}</Step>
          <Step>{createYourUsername}</Step>
          <Step>{outlineYourInterests}</Step>
          <Step>{doNext}</Step>
        </StepControl>
      </StepRootProvider>
    </StepperProvider>
  )
}

export default function ClientOnboardingRoot() {
  const [clientUser, setClientUser] = React.useState<User | null>(null)
  const [stepData, setStepData] = React.useState<CreateClientType | null>(null)

  return (
    <AuthenticatedRoute>
      <ClientOnboarding
        stepData={stepData}
        setStepData={setStepData}
        describeYourTeam={
          <DescribeYourTeam
            sidebar={<Sidebar />}
            stepData={stepData}
            setStepData={setStepData}
          />
        }
        shareYourGoals={
          <ShareYourGoals
            sidebar={<Sidebar />}
            stepData={stepData}
            setStepData={setStepData}
          />
        }
        inviteYourTeam={
          <InviteYourTeam
            sidebar={<Sidebar />}
            stepData={stepData}
            setStepData={setStepData}
          />
        }
        createYourUsername={
          <CreateYourUsername
            sidebar={<Sidebar />}
            stepData={stepData}
            setStepData={setStepData}
          />
        }
        outlineYourInterests={
          <OutlineYourInterests
            sidebar={<Sidebar />}
            stepData={stepData}
            setStepData={setStepData}
            setClientUser={setClientUser}
          />
        }
        doNext={<DoNext clientUser={clientUser} sidebar={<DoNextSidebar />} />}
      />
    </AuthenticatedRoute>
  )
}
