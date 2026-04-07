"use client"

import * as React from "react"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import industriesMock from "@/public/mock/industries.json"
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
import { generateUsernameSuggestions } from "@/utils/username"
import { HOT_KEYS } from "@/utils/constants"
import {
  cn,
  containsOneLowerCaseLetter,
  getIsNotEmpty,
  hookFormHasError,
  keys,
} from "@/utils/functions"
import { useControllableState, useStepper } from "@/utils/hooks"
import {
  AlertCircle,
  Briefcase02,
  Check,
  Check1,
  ChevronDown,
  ChevronRight,
  Home03,
  Info,
  Link01,
  Mail,
  Plus,
  Plus1,
  SearchMd,
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
import { useAutocomplete } from "@/libs/autocomplete"
import { CreateClientType } from "@/types/client"
import { ROLE, User } from "@/types/user"
import { PictureEditor } from "@/components/ui/image-editor/image-editor"
import { Spinner } from "@/components/ui/spinner/spinner"
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
  DropdownCommand,
  DropdownCommandEmpty,
  DropdownCommandGroup,
  DropdownCommandInput,
  DropdownCommandItem,
  DropdownPopover,
  DropdownPopoverContent,
  DropdownPopoverTrigger,
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

  const primarySuggestions = generateUsernameSuggestions(
    firstName ?? "",
    lastName ?? "",
    `${teamName ?? ""} ${role ?? ""} ${safeEmail}`.trim()
  )

  if (primarySuggestions.length > 0) {
    return primarySuggestions
  }

  const localPart = safeEmail.split("@")[0]?.trim().toLowerCase() ?? ""
  const normalized = localPart.replace(/[^a-z0-9_]/g, "")
  return normalized ? [normalized] : []
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

const isNonEmptyString = (value?: string | null) =>
  Boolean(value && value.trim().length > 0)

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)

const getClientPayloadValidationErrors = (data: CreateClientType) => {
  const errors: string[] = []

  if (!isNonEmptyString(data.firstName)) errors.push("First name is required.")
  if (!isNonEmptyString(data.lastName)) errors.push("Last name is required.")
  if (!isNonEmptyString(data.username)) errors.push("Username must be at least 3 characters.")
  if (!isNonEmptyString(data.teamName)) errors.push("Team/company name is required.")
  if (!isNonEmptyString(data.role)) errors.push("Role/job title is required.")
  if (!isNonEmptyString(data.industry)) errors.push("Industry is required.")
  if (!isNonEmptyString(data.budget)) errors.push("Please select a budget range.")

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

const industryList = [...new Set(industriesMock.map((i) => i.label))]

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
  const { suggestions: industrySuggestions } =
    useAutocomplete("industries", industryQuery)
  const industryRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (industryRef.current && !industryRef.current.contains(e.target as Node)) {
        setShowIndustrySuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const { toggleValidation } = useStepContext()
  const { nextStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100

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
            What brings you here today?
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Whether you&apos;re here to hire or get hired, let&apos;s get you
            set up the right way.
          </p>

          <div className="mt-10 2xl:mt-[50px] flex flex-col">
            <div className="flex flex-col gap-y-1.5">
              <Label htmlFor="your-team-name" size="sm">
                What’s your team name?
              </Label>
              <Input
                id="your-team-name"
                placeholder="Enter your team or company name"
                {...register("teamName")}
                isInvalid={hookFormHasError({ errors, name: "teamName" })}
              />
              <HookFormErrorMessage
                errors={errors}
                name="teamName"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>
            <div className="flex flex-col gap-y-1.5 mt-6">
              <Label htmlFor="your-role" size="sm">
                What’s your role?
              </Label>
              <InputGroup>
                <Input
                  id="your-role"
                  placeholder="Enter your job title"
                  {...register("role")}
                  isInvalid={hookFormHasError({ errors, name: "role" })}
                />
                <InputRightElement>
                  <Info className="text-gray-500 h-4 w-4" />
                </InputRightElement>
              </InputGroup>
              <HookFormErrorMessage
                errors={errors}
                name="role"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>
            <div className="flex flex-col gap-y-1.5 mt-6">
              <Label htmlFor="your-industry" size="sm">
                What’s your industry?
              </Label>

              <DropdownPopover
                selected={values?.industry}
                onSelectedChange={(value) =>
                  setValue("industry", value || "", {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
              >
                <DropdownPopoverTrigger>
                  {values?.industry ? (
                    values?.industry
                  ) : (
                    <span className="text-gray-500">Select an industry</span>
                  )}
                  <ChevronDown className="ml-auto h-5 w-5 text-gray-500" />
                </DropdownPopoverTrigger>
                <DropdownPopoverContent>
                  <DropdownCommand className="overflow-hidden">
                    <InputGroup>
                      <InputLeftElement className="w-8">
                        <SearchMd className="h-[15] w-[15] text-gray-500" />
                      </InputLeftElement>
                      <DropdownCommandInput
                        placeholder="Search..."
                        className="pl-8"
                      />
                    </InputGroup>

                    <DropdownCommandEmpty className="text-sm text-gray-900">
                      No industry found.
                    </DropdownCommandEmpty>

                    <ScrollArea className="max-h-[200px] overflow-y-auto">
                      <DropdownCommandGroup>
                        {industryList.map((industry) => (
                          <DropdownCommandItem
                            key={industry}
                            itemValue={industry}
                          >
                            {industry}
                            <Check1 className="ml-auto text-primary-500 opacity-0 group-data-[state=selected]:opacity-100" />
                          </DropdownCommandItem>
                        ))}
                      </DropdownCommandGroup>
                    </ScrollArea>
                  </DropdownCommand>
                </DropdownPopoverContent>
              </DropdownPopover>

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

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100

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
            What brings you here today?
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Whether you&apos;re here to hire or get hired, let&apos;s get you
            set up the right way.
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
    emails: z
      .array(
        z.object({
          email: z.string().trim(),
        })
      )
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

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100

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
        throw new Error("We couldn't generate the invite link. Please try again.")
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
                Add your teammates’ emails to invite them
              </span>
              <Info className="size-4 shrink-0 text-gray-500" />
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

const createYourUsernameFormSchema = z.object({
  username: z.string().trim()
    .min(3, "Username must be at least 3 characters.")
    .max(24, "Username must be at most 24 characters.")
    .regex(/^[a-z][a-z0-9_]*$/, "Username must start with a letter and contain only lowercase letters, numbers, and underscores."),
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
  const { user } = useAuth()

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

  const usernameSuggestions = useMemo(
    () =>
      getClientUsernameSuggestions({
        email: user?.email,
        firstName: user?.firstName ?? stepData?.firstName,
        lastName: user?.lastName ?? stepData?.lastName,
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

  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100

  const onSubmit: SubmitHandler<CreateYourUsernameFormValues> = (values) => {
    setStepData({
      ...stepData,
      username: values.username,
    })

    nextStep()
  }

  const setFormValue: UseFormSetValue<CreateYourUsernameFormValues> = (
    key,
    value
  ) => {
    setValue(key, value)
    trigger(key)
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

  const checkUsernameAvailability = () => {
    if (username?.length > 2) {
      setIsUsernameLoading(true)
      clearErrors("username")

      AuthAPI.CheckUsername({ username })
        .then((response) => {
          if (response?.status === 200 && response?.data?.available) {
            setIsAvailable(response?.data?.available)
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
            setIsAvailable(false)
          }
        })
        .finally(() => {
          setIsUsernameLoading(false)
        })
    } else {
      setIsAvailable(null)
    }
  }

  useDebounce(checkUsernameAvailability, 700, [username])

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
              <Label className="text-dark-blue-400" id="username" size="sm">
                Enter Your Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  {...register("username")}
                  isInvalid={hookFormHasError({ errors, name: "username" })}
                  onKeyUp={(e) => {
                    if (username?.length < 3) {
                      setIsAvailable(null)
                    }
                  }}
                  className="pr-32"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isUsernameLoading ? (
                    <Spinner size={20} strokeWidth={2} />
                  ) : (
                    <>
                      {isAvailable === false && (
                        <ErrorMessage
                          size="sm"
                          className="flex flex-row items-center gap-0.5"
                        >
                          <X width={20} height={20} /> That username is already taken.
                        </ErrorMessage>
                      )}

                      {isAvailable && (
                        <ErrorMessage
                          size="sm"
                          className="text-emerald-600 flex flex-row items-center gap-0.5"
                        >
                          <Check />
                          Available
                        </ErrorMessage>
                      )}
                    </>
                  )}
                </div>
              </div>
              <HookFormErrorMessage
                errors={errors}
                name="username"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>

            {usernameSuggestions.length > 0 && (show ? (
              <div className="mt-6">
                {usernameSuggestions.map((username, index) => (
                  <React.Fragment key={username}>
                    <Button
                      className="text-primary-500/50 hover:text-primary-500"
                      size="lg"
                      visual="gray"
                      variant="link"
                      type="button"
                      onClick={() => setFormValue("username", username)}
                    >
                      {username}
                    </Button>

                    {index !== usernameSuggestions.length - 1 && (
                      <span>, </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <span className="block text-sm leading-[16.94px] text-gray-500">
                  {usernameSuggestions.slice(0, 3).map((username, index) => (
                    <React.Fragment key={username}>
                      <Button
                        className="text-primary-500/50 hover:text-primary-500"
                        size="lg"
                        visual="gray"
                        variant="link"
                        type="button"
                        onClick={() => setFormValue("username", username)}
                      >
                        {username}
                      </Button>

                      {index === 0 && <span>, </span>}
                      {index === 1 && <span> and </span>}
                    </React.Fragment>
                  ))}{" "}
                  are available
                </span>

                <Button
                  className="mt-3"
                  size="md"
                  variant="link"
                  type="button"
                  visual="gray"
                  onClick={toggleShow}
                >
                  <Plus className="size-[15px]" />
                  More suggestions
                </Button>
              </div>
            ))}

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
            <Button size="md" visual="primary" disabled={isAvailable === false}>
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
  if (!getIsNotEmpty(options)) return null

  return (
    <div className="p-5 mt-5 bg-gray-50">
      <span className="block text-xs leading-5 text-dark-blue-400">
        {label}
      </span>

      <div className="mt-3 flex gap-3 flex-wrap">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option)

          return (
            <Badge
              asChild
              key={option}
              visual={isSelected ? "primary" : "gray"}
            >
              <button
                type="button"
                className={cn(
                  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
                  isSelected
                    ? "cursor-not-allowed opacity-70"
                    : "hover:bg-gray-200"
                )}
                disabled={isSelected}
                onClick={() => onSelect(option)}
              >
                {option}
              </button>
            </Badge>
          )
        })}
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

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100

  const onSubmit: SubmitHandler<OutlineYourInterestsFormValues> = (values) => {
    setIsLoading(true)
    const { firstName, lastName } = deriveClientProfileNames(user, stepData)

    //const { userId, ...restStepData } = stepData || {};
    const clientData: CreateClientType = {
      ...stepData,
      firstName: user?.firstName ?? stepData?.firstName,
      lastName: user?.lastName ?? stepData?.lastName,
      avatarUrl: user?.avatarUrl ?? undefined,
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
                <AlertCircle className="size-6 text-gray-500" />
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
                <AlertCircle className="size-6 text-gray-500" />
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
                  What’s your budget?
                </h1>
                <AlertCircle className="size-6 text-gray-500" />
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
  const handleFinish = async () => {
    try {
      setIsLoading(true)
      const response = await UserAPI.handleSkip({ role: ROLE.CLIENT })

      let nextUser = response?.data?.user as User | undefined
      if (!nextUser) {
        const fallbackUser = clientUser ?? user
        if (fallbackUser) {
          nextUser = {
            ...fallbackUser,
            onboardingDismissed: true,
            userType: "client",
          }
        }
      }

      if (nextUser) {
        setUser(nextUser)
      }

      try {
        const userResponse = await UserAPI.me()
        if (userResponse?.data?.user) {
          setUser(userResponse.data.user)
        }
      } catch (error) {
        console.error("Failed to refresh user after onboarding", error)
      }

      router.push("/client-dashboard")
    } catch (error) {
      console.error("Failed to complete onboarding", error)
      // Show error toast if needed
    } finally {
      setIsLoading(false)
    }
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
            <div className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300">
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

            <div className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300">
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

            <div className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300">
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
                router.push("/client-dashboard")
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
  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])
  const { totalSteps, currentStep } = useStepRootContext()
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.trim()
  const onSubmit: SubmitHandler<IntroduceYourselfFormValues> = ({
    avatar,
    firstName,
    lastName,
  }) => {
    // If avatar[0] is a File, keep as is; if string, use as is
    let avatarUrl: string | undefined = undefined
    if (typeof avatar?.[0] === "string") {
      avatarUrl = avatar[0]
    } else if (avatar?.[0] instanceof File) {
      // You may want to upload the file and get a URL here; for now, just set undefined
      avatarUrl = undefined
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
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 1 / {totalSteps}
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
