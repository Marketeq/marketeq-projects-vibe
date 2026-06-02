"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { UserAPI } from "@/service/http/user"
import { getIssuerNameFromUrl } from "@/src/lib/certification-brand"
import { cn, hookFormHasError } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  Clock,
  DotsHorizontal,
  Edit03,
  Info,
  LogOut,
  MarkerPin02,
  Plus,
  SearchMd,
  Star,
  Trash03,
  UserPlus,
  X,
  X2,
  XCircle,
} from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { isAfter, isBefore } from "date-fns"
import CurrencyInput from "react-currency-input-field"
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form"
import { usePrevious } from "react-use"
import { z } from "zod"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
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
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorMessage,
  Favorite,
  FavoriteRoot,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  inputVariants,
} from "@/components/ui"

// ============================================================
// Schemas & Types
// ============================================================

const aboutMeFormSchema = z.object({
  aboutMe: z.string(),
})

type AboutMeFormValues = z.infer<typeof aboutMeFormSchema>

const aboutMeFormDefaultValues = {
  aboutMe: "",
} satisfies AboutMeFormValues

// Common job-title words for splitting concatenated titles like "softwareengineer"
const JOB_TITLE_WORDS = [
  "software",
  "senior",
  "junior",
  "lead",
  "principal",
  "staff",
  "chief",
  "engineer",
  "developer",
  "designer",
  "manager",
  "director",
  "officer",
  "architect",
  "analyst",
  "consultant",
  "specialist",
  "coordinator",
  "administrator",
  "assistant",
  "associate",
  "executive",
  "president",
  "vice",
  "head",
  "product",
  "project",
  "program",
  "technical",
  "technology",
  "data",
  "machine",
  "learning",
  "artificial",
  "intelligence",
  "cloud",
  "devops",
  "frontend",
  "backend",
  "fullstack",
  "full",
  "stack",
  "mobile",
  "web",
  "security",
  "network",
  "database",
  "systems",
  "operations",
  "marketing",
  "sales",
  "business",
  "human",
  "resources",
  "finance",
  "creative",
  "content",
  "strategy",
  "growth",
  "customer",
  "success",
  "support",
  "quality",
  "assurance",
  "research",
  "science",
  "scientist",
  "ux",
  "ui",
  "graphic",
  "visual",
  "motion",
  "brand",
  "copy",
  "writer",
  "editor",
  "producer",
  "scrum",
  "master",
  "agile",
  "coach",
  "trainer",
  "recruiter",
  "talent",
  "acquisition",
  "relations",
  "communications",
  "public",
  "media",
  "social",
  "digital",
  "seo",
  "sem",
  "ppc",
  "email",
  "automation",
  "integration",
  "platform",
  "solution",
  "solutions",
  "information",
  "cyber",
  "blockchain",
  "crypto",
  "defi",
  "nft",
  "startup",
  "founder",
  "co",
  "cto",
  "ceo",
  "cfo",
  "coo",
  "cmo",
  "cio",
  "vp",
  "svp",
  "evp",
  "avp",
]

function formatJobTitle(raw: string): string {
  let title = raw.trim()
  if (!title) return title

  // If the title has no spaces and is long enough, try to split into known words
  if (!title.includes(" ") && title.length > 3) {
    const lower = title.toLowerCase()
    const words: string[] = []
    let remaining = lower
    while (remaining.length > 0) {
      // Find the longest matching word from the start
      let matched = false
      for (let len = Math.min(remaining.length, 15); len >= 2; len--) {
        const candidate = remaining.slice(0, len)
        if (JOB_TITLE_WORDS.includes(candidate)) {
          words.push(candidate)
          remaining = remaining.slice(len)
          matched = true
          break
        }
      }
      if (!matched) {
        // No known word found — take remaining as one word
        words.push(remaining)
        remaining = ""
      }
    }
    if (words.length > 1) {
      title = words.join(" ")
    }
  }

  // Capitalize every word
  return title
    .split(/\s+/)
    .map((w) => {
      // Keep common acronyms uppercase
      const upper = w.toUpperCase()
      if (
        [
          "CTO",
          "CEO",
          "CFO",
          "COO",
          "CMO",
          "CIO",
          "VP",
          "SVP",
          "EVP",
          "AVP",
          "UX",
          "UI",
          "SEO",
          "SEM",
          "PPC",
          "NFT",
          "AI",
          "ML",
          "QA",
          "HR",
          "IT",
          "PM",
          "API",
        ].includes(upper)
      ) {
        return upper
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(" ")
}

const moreInfoFormSchema = z.object({
  jobTitle: z.string().min(1, "Please enter a job title"),
  saveAsDefault: z.boolean(),
  clientRate: z
    .number({ message: "Please enter a client rate" })
    .min(1, "Please enter a client rate")
    .max(1000, "Rate cannot exceed $1,000/hr"),
  earning: z
    .number({ message: "Please enter your earnings" })
    .min(1, "Please enter your earnings")
    .max(1000, "Rate cannot exceed $1,000/hr"),
  fee: z.number({ message: "Please enter an amount" }),
})

export type MoreInfoFormValues = z.infer<typeof moreInfoFormSchema>

const defaultValues: Partial<MoreInfoFormValues> = {
  jobTitle: "",
  saveAsDefault: false,
}

const availabilityFormSchema = z.object({
  availability: z.string().min(1, "Please select at least 1 option(s)"),
})

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

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
    jobDescription: z.string().optional(),
    skills: z
      .array(
        z.object({ id: z.union([z.number(), z.string()]), name: z.string() })
      )
      .max(50, "You have reached the maximum limit of 50 skills"),
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
  .refine(
    (data) => {
      if (data.currentlyAttending) return true
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

type EducationFormValues = z.infer<typeof educationFormSchema>

const educationFormDefaultValues = {
  currentlyAttending: false,
  degree: "",
  major: "",
  schoolOrUniversity: "",
} as EducationFormValues

const languagesFormSchema = z.object({
  languages: z
    .array(
      z.object({ id: z.union([z.number(), z.string()]), name: z.string() })
    )
    .min(1, "Please at least provide 1 language(s)"),
})

type LanguagesFormValues = z.infer<typeof languagesFormSchema>

const languagesFormDefaultValue = {
  languages: [],
} satisfies LanguagesFormValues

const skillsFormSchema = z.object({
  skills: z.array(
    z.object({ id: z.union([z.number(), z.string()]), name: z.string() })
  ),
})

type SkillsFormValues = z.infer<typeof skillsFormSchema>

const skillsFormDefaultValue: SkillsFormValues = {
  skills: [],
}

const industriesFormSchema = z.object({
  industries: z
    .array(z.object({ id: z.union([z.number(), z.string()]), name: z.string() }))
    .min(1, "Please at least provide 1 industry"),
})

type IndustriesFormValues = z.infer<typeof industriesFormSchema>

const industriesFormDefaultValue: IndustriesFormValues = {
  industries: [],
}

const certificationsFormSchema = z
  .object({
    name: z.string().min(1, "Please provide at least 1 character(s)"),
    credentialId: z.string(),
    credentialsUrl: z
      .string()
      .refine(
        (url) => !url?.length || z.string().url().safeParse(url).success,
        {
          message: "Please provide a valid url",
        }
      ),
    skills: z.array(
      z.object({ id: z.union([z.number(), z.string()]), name: z.string() })
    ),
    issuedDate: z.instanceof(Date, { message: "Please provide a valid date" }),
    expirationDate: z
      .instanceof(Date, {
        message: "Please provide a valid date",
      })
      .optional(),
    canNotExpire: z.boolean(),
  })
  .refine((data) => isBefore(data.issuedDate, new Date()), {
    message: "Please enter a valid date",
    path: ["issuedDate"],
  })
  .refine((data) => data.canNotExpire || Boolean(data.expirationDate), {
    message: "Please provide an expiration date",
    path: ["expirationDate"],
  })

type CertificationsFormValues = z.infer<typeof certificationsFormSchema>

// ============================================================
// AboutMeDialog
// ============================================================

export const AboutMeDialog = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  onValueChange,
  value: valueProp,
  defaultValue,
  userId: userIdProp,
  profile,
  onSaved,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: AboutMeFormValues
  }) => React.ReactNode
  defaultValue?: AboutMeFormValues
  value?: AboutMeFormValues
  onValueChange?: (value: AboutMeFormValues) => void
  userId?: string
  profile?: any
  onSaved?: () => void
}) => {
  const { user } = useAuth()
  const userId = profile?.id ?? userIdProp ?? user?.id ?? ""
  const [value, setValue] = useControllableState<AboutMeFormValues>({
    defaultValue: defaultValue ? defaultValue : aboutMeFormDefaultValues,
    value: valueProp,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const {
    register,
    formState: { errors, isValid, isDirty, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<AboutMeFormValues>({
    resolver: zodResolver(aboutMeFormSchema),
    defaultValues: value,
  })

  useEffect(() => {
    if (open && profile?.bio) {
      reset({ aboutMe: profile.bio })
    }
  }, [open, profile?.bio, reset])

  const onSubmit: SubmitHandler<AboutMeFormValues> = async (values) => {
    setValue(values)
    setOpen(false)
    if (userId) {
      UserAPI.updateProfile(userId, {
        bio: values.aboutMe,
        overview: values.aboutMe,
      })
        .then(() => onSaved?.())
        .catch(() => {})
    }
  }
  const submitTriggerRef = useRef<HTMLButtonElement>(null)

  const resetFn = () => {
    reset()
    setValue(defaultValue ? defaultValue : aboutMeFormDefaultValues)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 p-6 pb-[50px]">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  About Me
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Create a connection and let clients feel like they already
                  know you!
                </p>
              </div>

              <IconButton
                type="button"
                onClick={() => (isDirty ? setIsOpen(true) : setOpen(false))}
                variant="ghost"
                visual="gray"
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-8">
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
                  <ErrorMessage size="sm" className="mt-1.5">
                    {message}
                  </ErrorMessage>
                )}
              />
            </div>
          </div>
          <div className="py-4 px-6 flex items-center justify-between">
            <Button
              variant="link"
              visual="gray"
              type="button"
              onClick={() => setIsOpen(true)}
            >
              <X className="size-[15px]" />
              Cancel
            </Button>

            <Button
              disabled={!isValid}
              loading={isSubmitting}
              ref={submitTriggerRef}
            >
              Save
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent className="max-w-[409px] p-0">
                <div className="p-6">
                  <DialogTitle className="text-dark-blue-400">
                    Save About Me?
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    Do you want to save your information?
                  </DialogDescription>
                </div>

                <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                  <DialogClose
                    onClick={() => {
                      resetFn()
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// MoreInfoForm (internal) + MoreInfoDialog
// ============================================================

const MoreInfoForm = ({
  onShow,
  onSubmit,
  onCheckDuplicate,
  duplicateError,
}: {
  onShow: () => void
  onSubmit: () => void
  onCheckDuplicate?: (title?: string) => boolean
  duplicateError?: boolean
}) => {
  const {
    control,
    formState: { errors, isValid },
    register,
    trigger,
  } = useFormContext<MoreInfoFormValues>()
  return (
    <div className="p-6 rounded-lg border-2 border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label size="sm" htmlFor="job-title-1">
            Job Title 1
          </Label>

          <div className="inline-flex items-center gap-x-1">
            <IconButton
              className="hover:bg-success-50 hover:text-success-500 rounded-full"
              variant="ghost"
              visual="gray"
              type="button"
              onClick={async () => {
                const valid = await trigger()
                if (!valid) return
                if (onCheckDuplicate?.()) return
                onSubmit()
              }}
            >
              <Check className="size-4" />
            </IconButton>
            <IconButton
              className="hover:bg-error-50 hover:text-error-500 rounded-full"
              variant="ghost"
              visual="gray"
              type="button"
              onClick={() => onShow()}
            >
              <Trash03 className="size-4" />
            </IconButton>
          </div>
        </div>

        <Input
          id="job-title-1"
          placeholder="e.g. Software Engineer"
          {...register("jobTitle", {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/[0-9]/g, "")
              onCheckDuplicate?.(e.target.value)
            },
          })}
          isInvalid={
            duplicateError ||
            hookFormHasError({
              errors,
              name: "jobTitle",
            })
          }
        />

        {duplicateError && (
          <ErrorMessage size="sm">
            This job title already exists. Please use a different title.
          </ErrorMessage>
        )}

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
            <div className="flex items-center gap-x-2 pr-4">
              <Label htmlFor="client-rate" className="sr-only">
                Client Rate
              </Label>
              <InputGroup>
                <InputLeftAddon className="inline-flex items-center gap-x-1">
                  USD
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="cursor-help">
                          <Info className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent size="sm">
                        The hourly rate clients will see on your profile
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </InputLeftAddon>

                <Controller
                  control={control}
                  name="clientRate"
                  render={({ field: { value, onChange } }) => (
                    <CurrencyInput
                      id="client-rate"
                      className={cn(
                        inputVariants({
                          className: "text-right placeholder:!text-gray-500",
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
                      placeholder="$0"
                      decimalsLimit={0}
                    />
                  )}
                />
              </InputGroup>

              <span className="inline-block text-base text-gray-500">/hr</span>
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
                A 20% service fee is applied to your client rate to cover
                platform costs.
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
                            "text-right placeholder:!text-gray-500 [field-sizing:content] pointer-events-none opacity-50",
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
            <div className="flex items-center gap-x-2 pr-4">
              <Label htmlFor="your-earning" className="sr-only">
                Your Earning
              </Label>
              <InputGroup>
                <InputLeftAddon className="inline-flex items-center gap-x-1">
                  USD
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="cursor-help">
                          <Info className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent size="sm">
                        Your take-home pay after the 20% Marketeq service fee
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </InputLeftAddon>

                <Controller
                  control={control}
                  name="earning"
                  render={({ field: { value, onChange } }) => (
                    <CurrencyInput
                      id="your-earning"
                      className={cn(
                        inputVariants({
                          className: "text-right placeholder:!text-gray-500",
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
                      placeholder="$0"
                      decimalsLimit={0}
                    />
                  )}
                />
              </InputGroup>

              <span className="inline-block text-base text-gray-500">/hr</span>
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
    </div>
  )
}

export const MoreInfoDialog = ({
  onOpenedChange,
  opened,
  trigger,
  onValueChange,
  value,
  userId: userIdProp,
  profile,
  onSaved,
}: {
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  trigger?: (options: { open: boolean; toggle: () => void }) => React.ReactNode
  value?: MoreInfoFormValues[]
  onValueChange?: (vale: MoreInfoFormValues[] | undefined) => void
  userId?: string
  profile?: any
  onSaved?: () => void
}) => {
  const { user } = useAuth()
  const userId = profile?.id ?? userIdProp ?? user?.id ?? ""
  const submitTriggerRef = useRef<HTMLButtonElement>(null)
  const submitDoneRef = useRef<Promise<void> | null>(null)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [show, setShow] = useState(false)
  const methods = useForm<MoreInfoFormValues>({
    resolver: zodResolver(moreInfoFormSchema),
    defaultValues,
    mode: "onChange",
  })
  const {
    handleSubmit,
    formState: { isValid, isDirty, isSubmitting },
    reset,
    watch,
    setValue,
  } = methods
  const [canPerformAction, setCanPerformAction] = useState(false)
  const [maxTitlesError, setMaxTitlesError] = useState(false)
  const [duplicateTitleError, setDuplicateTitleError] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number>()
  const [indexToRemove, setIndexToRemove] = useState<number>()
  const [infoChunks, setInfoChunks] = useControllableState<
    MoreInfoFormValues[] | undefined
  >({
    defaultValue: undefined,
    value,
    onChange: onValueChange,
  })

  useEffect(() => {
    if (opened) {
      // Reset editing state — all titles closed by default
      setEditingIndex(undefined)
      setMaxTitlesError(false)
      setDuplicateTitleError(false)

      // Load saved job titles from profile
      if (profile?.jobTitles && profile.jobTitles.length > 0) {
        setInfoChunks(profile.jobTitles)
        setCanPerformAction(false)
      } else if (profile?.role || profile?.rateMax) {
        // Legacy: single title from old fields — migrate into chunk
        const clientRate = Number(profile.rateMax) || 0
        const fee = Math.round(clientRate * 0.2)
        const earning = clientRate - fee
        const legacyChunk: MoreInfoFormValues = {
          jobTitle: profile.role || "Professional",
          clientRate,
          earning,
          fee,
          saveAsDefault: true,
        }
        if (clientRate > 0) {
          setInfoChunks([legacyChunk])
          setCanPerformAction(false)
        } else {
          methods.reset({ ...defaultValues, jobTitle: profile.role || "" })
          setCanPerformAction(true)
        }
      } else {
        setCanPerformAction(true)
      }
    }
  }, [opened])

  const checkDuplicate = (titleOverride?: string): boolean => {
    const raw = titleOverride ?? methods.getValues("jobTitle")
    if (!raw || !raw.trim()) {
      setDuplicateTitleError(false)
      return false
    }
    const title = formatJobTitle(raw)
    const existingTitles = (infoChunks ?? []).filter(
      (_, i) => i !== editingIndex
    )
    const isDuplicate = existingTitles.some(
      (chunk) => chunk.jobTitle.toLowerCase() === title.toLowerCase()
    )
    setDuplicateTitleError(isDuplicate)
    return isDuplicate
  }

  const onSubmit: SubmitHandler<MoreInfoFormValues> = async (values) => {
    let resolveDone: () => void
    submitDoneRef.current = new Promise((r) => {
      resolveDone = r
    })

    // Format the job title: add spaces, capitalize all words
    const formatted = { ...values, jobTitle: formatJobTitle(values.jobTitle) }
    const { saveAsDefault } = formatted

    // Build the updated chunks list
    let updatedChunks: MoreInfoFormValues[]

    if (editingIndex !== undefined) {
      updatedChunks = (infoChunks ?? []).map((qualification, index) =>
        index === editingIndex
          ? formatted
          : saveAsDefault
            ? { ...qualification, saveAsDefault: false }
            : qualification
      )
      setEditingIndex(undefined)
    } else {
      const isFirst = !infoChunks || infoChunks.length === 0
      const entry = isFirst ? { ...formatted, saveAsDefault: true } : formatted

      updatedChunks = infoChunks
        ? infoChunks
            .map((q) =>
              saveAsDefault || isFirst ? { ...q, saveAsDefault: false } : q
            )
            .concat(entry)
        : [entry]
      setCanPerformAction(false)
    }

    // Sort: default job title always at the top
    updatedChunks.sort((a, b) =>
      a.saveAsDefault === b.saveAsDefault ? 0 : a.saveAsDefault ? -1 : 1
    )
    setInfoChunks(updatedChunks)

    // Save to API: compute range across all job titles, use default title
    if (userId) {
      const allRates = updatedChunks
        .map((c) => c.clientRate)
        .filter((r) => r != null && r > 0)
      const defaultChunk =
        updatedChunks.find((c) => c.saveAsDefault) ?? updatedChunks[0]
      const payload: Record<string, unknown> = {}

      if (allRates.length > 1) {
        payload.rateMin = Math.min(...allRates)
        payload.rateMax = Math.max(...allRates)
      } else if (allRates.length === 1) {
        payload.rateMin = allRates[0]
        payload.rateMax = allRates[0]
      }

      if (defaultChunk?.jobTitle) payload.recentJobTitle = defaultChunk.jobTitle
      payload.jobTitles = updatedChunks
      UserAPI.updateProfile(userId, payload)
        .then(() => onSaved?.())
        .catch(() => {})
    }

    reset(defaultValues)
    resolveDone!()
  }
  const [clientRate, earning] = watch(["clientRate", "earning"])
  const previousClientRate = usePrevious(clientRate)
  const previousEarning = usePrevious(earning)

  useEffect(() => {
    function calculatePercentage({
      percentage,
      value,
    }: {
      value: number
      percentage: number
    }) {
      return (value * percentage) / 100
    }

    if (previousClientRate !== clientRate && clientRate != null) {
      const fee = Math.round(
        calculatePercentage({ percentage: 20, value: clientRate })
      )
      setValue("fee", fee, { shouldValidate: true })
      setValue("earning", clientRate - fee, { shouldValidate: true })
    } else if (previousEarning !== earning && earning != null) {
      // Reverse calculate: earning = clientRate * 0.8, so clientRate = earning / 0.8
      const derivedRate = Math.round(earning / 0.8)
      const fee = Math.round(
        calculatePercentage({ percentage: 20, value: derivedRate })
      )
      setValue("clientRate", derivedRate, { shouldValidate: true })
      setValue("fee", fee, { shouldValidate: true })
    }
  }, [previousClientRate, previousEarning, clientRate, earning, setValue])

  return (
    <FormProvider {...methods}>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger?.({ open, toggle: () => setOpen((prev) => !prev) })}
        <DialogContent className="max-w-[700px] rounded-[24px] p-0">
          <DialogTitle className="sr-only">Job Title & Rates</DialogTitle>
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault()
            }}
          >
            <div className="pt-6 border-b border-gray-200">
              <div className="flex px-6 items-start gap-x-2">
                <div className="flex-auto">
                  <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                    Job Title & Rates
                  </h1>
                  <p className="text-sm font-light text-dark-blue-400">
                    Tell us what you do and set your hourly rates
                  </p>
                </div>

                <div className="flex items-start gap-x-3">
                  {(infoChunks?.length ?? 0) >= 3 ? (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            tabIndex={0}
                            onClick={() => {
                              setMaxTitlesError(true)
                              setTimeout(() => setMaxTitlesError(false), 4000)
                            }}
                          >
                            <Button
                              variant="outlined"
                              visual="gray"
                              type="button"
                              disabled
                              className="pointer-events-none"
                            >
                              <Plus className="size-[15px]" />
                              Add Job Title
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent size="sm">
                          You can have a maximum of 3 job titles
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button
                      variant="outlined"
                      visual="gray"
                      type="button"
                      onClick={() => {
                        setMaxTitlesError(false)
                        setCanPerformAction(true)
                        reset(defaultValues)
                      }}
                    >
                      <Plus className="size-[15px]" type="button" />
                      Add Job Title
                    </Button>
                  )}

                  <IconButton
                    variant="ghost"
                    visual="gray"
                    type="button"
                    onClick={() => (isDirty ? setIsOpen(true) : setOpen(false))}
                  >
                    <X className="size-5" />
                  </IconButton>
                </div>
              </div>

              {maxTitlesError && (
                <div className="mx-6 mt-4 flex items-center gap-x-2 rounded-md border border-error-300 bg-error-25 px-3 py-2.5 text-sm text-error-700">
                  <AlertCircle className="size-4 shrink-0" />
                  You've reached the maximum of 3 job titles. Remove one to add
                  a new title.
                </div>
              )}

              <ScrollArea
                className="mt-8 px-6 pb-6"
                scrollBar={<ScrollBar className="w-4 p-1" />}
                viewportClassName="max-h-[652px]"
              >
                <div className="space-y-3">
                  {canPerformAction && (
                    <MoreInfoForm
                      onShow={() => setShow(true)}
                      onSubmit={() => handleSubmit(onSubmit)()}
                      onCheckDuplicate={checkDuplicate}
                      duplicateError={duplicateTitleError}
                    />
                  )}

                  {infoChunks?.map((infoChunk, index) =>
                    editingIndex === index ? (
                      <MoreInfoForm
                        key={index}
                        onShow={() => {
                          setIndexToRemove(index)
                          setShow(true)
                        }}
                        onSubmit={() => handleSubmit(onSubmit)()}
                        onCheckDuplicate={checkDuplicate}
                        duplicateError={duplicateTitleError}
                      />
                    ) : (
                      <article
                        key={index}
                        className="p-6 rounded-lg flex items-center bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                      >
                        <div className="flex-auto">
                          <h1 className="text-base leading-none font-bold text-dark-blue-400">
                            {infoChunk.jobTitle}
                          </h1>

                          <div className="mt-1 flex items-center gap-x-3">
                            <div className="flex items-center flex-none gap-x-2">
                              <span className="text-xs leading-none font-light text-dark-blue-400">
                                Client rate ${infoChunk.clientRate}/hr
                              </span>
                              <span className="inline-block size-1 bg-gray-300 rounded-full" />
                              <span className="text-xs leading-none font-light text-dark-blue-400">
                                Your earnings ${infoChunk.earning}/hr
                              </span>
                            </div>

                            {infoChunk.saveAsDefault && (
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
                              reset(infoChunk)
                              setEditingIndex(index)
                              setCanPerformAction(false)
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
                              setShow(true)
                              setIndexToRemove(index)
                            }}
                          >
                            <Trash03 className="size-[15px]" />
                          </IconButton>
                        </div>
                      </article>
                    )
                  )}
                </div>
              </ScrollArea>
            </div>

            <Dialog open={show} onOpenChange={setShow}>
              <DialogContent className="max-w-[409px] p-0">
                <div className="p-6">
                  <DialogTitle className="text-dark-blue-400">
                    Delete Job Title?
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    Your{" "}
                    {indexToRemove !== undefined && infoChunks?.[indexToRemove]
                      ? `"${infoChunks[indexToRemove].jobTitle}"`
                      : ""}{" "}
                    job title will be removed. This cannot be undone.
                  </DialogDescription>
                </div>

                <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                  <DialogClose asChild>
                    <Button variant="link" visual="gray">
                      <X className="size-[15px]" /> Cancel
                    </Button>
                  </DialogClose>

                  <DialogClose
                    onClick={async () => {
                      if (indexToRemove !== undefined) {
                        const remaining =
                          infoChunks?.filter((_, i) => i !== indexToRemove) ??
                          []

                        // If only one left, auto-set as default
                        if (
                          remaining.length === 1 &&
                          !remaining[0].saveAsDefault
                        ) {
                          remaining[0] = {
                            ...remaining[0],
                            saveAsDefault: true,
                          }
                        }
                        // If deleted the default, promote the first one
                        if (
                          remaining.length > 0 &&
                          !remaining.some((c) => c.saveAsDefault)
                        ) {
                          remaining[0] = {
                            ...remaining[0],
                            saveAsDefault: true,
                          }
                        }

                        setInfoChunks(
                          remaining.length > 0 ? remaining : undefined
                        )
                        setIndexToRemove(undefined)

                        // Update API
                        if (userId) {
                          const payload: Record<string, unknown> = {}
                          if (remaining.length > 0) {
                            const allRates = remaining
                              .map((c) => c.clientRate)
                              .filter((r) => r != null && r > 0)
                            const defaultChunk =
                              remaining.find((c) => c.saveAsDefault) ??
                              remaining[0]
                            if (allRates.length > 1) {
                              payload.rateMin = Math.min(...allRates)
                              payload.rateMax = Math.max(...allRates)
                            } else if (allRates.length === 1) {
                              payload.rateMin = allRates[0]
                              payload.rateMax = allRates[0]
                            }
                            if (defaultChunk?.jobTitle)
                              payload.role = defaultChunk.jobTitle
                            payload.jobTitles = remaining
                          } else {
                            // All titles deleted — clear everything
                            payload.rateMin = null
                            payload.rateMax = null
                            payload.role = null
                            payload.jobTitles = null
                          }
                          try {
                            await UserAPI.updateProfile(userId, payload)
                          } catch {}
                          onSaved?.()
                          if (remaining.length === 0) setCanPerformAction(true)
                        }
                      } else {
                        setCanPerformAction(false)
                      }
                    }}
                    asChild
                  >
                    <Button variant="outlined" visual="gray">
                      Yes, Delete
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>

            <div className="py-4 px-6 flex items-center justify-between">
              <Button
                variant="link"
                visual="gray"
                type="button"
                onClick={() => {
                  if (isDirty) {
                    setIsOpen(true)
                  } else {
                    setOpen(false)
                  }
                }}
              >
                <X className="size-[15px]" />
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  (canPerformAction || typeof editingIndex === "number") &&
                  (!clientRate ||
                    clientRate > 1000 ||
                    !methods.getValues("jobTitle"))
                }
                loading={isSubmitting}
                onClick={async () => {
                  if (canPerformAction || typeof editingIndex === "number") {
                    const valid = await methods.trigger()
                    if (!valid) return
                    if (checkDuplicate()) return
                    await handleSubmit(onSubmit)()
                  }
                  setOpen(false)
                }}
              >
                Save
              </Button>
              <Button ref={submitTriggerRef} className="sr-only" type="submit">
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
                        setCanPerformAction(false)
                        reset(defaultValues)
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
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </FormProvider>
  )
}

// ============================================================
// AvailabilityDialog (refactored with controllable open/close)
// ============================================================

export const AvailabilityDialog = ({
  opened,
  onOpenedChange,
  profile,
  onSaved,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  profile?: any
  onSaved?: () => void
}) => {
  const { user } = useAuth()
  const userId = profile?.id ?? user?.id ?? ""
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      availability: "",
    },
  })

  useEffect(() => {
    if (open && profile?.availability) {
      reset({ availability: profile.availability })
    }
  }, [open, profile?.availability, reset])

  const onSubmit: SubmitHandler<AvailabilityFormValues> = async (values) => {
    setOpen(false)
    if (userId) {
      UserAPI.updateProfile(userId, { availability: values.availability })
        .then(() => onSaved?.())
        .catch(() => {})
    }
  }
  const availability = useWatch({ control, name: "availability" })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 pt-6 px-6">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Availability
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Tell us more about your work schedule
                </p>
              </div>

              <IconButton
                type="button"
                onClick={() => setOpen(false)}
                variant="ghost"
                visual="gray"
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-8">
              <div className="pb-[50px]">
                <div className="space-y-1.5">
                  <Label size="sm" htmlFor="availability">
                    What&apos;s your availability?
                  </Label>
                  <Controller
                    control={control}
                    name="availability"
                    render={({ field: { value, onChange } }) => (
                      <Listbox value={value} onChange={onChange}>
                        <ListboxButton
                          id="availability"
                          placeholder="Select availability"
                        />
                        <ListboxOptions>
                          <ListboxOption value="Full-time">
                            Full-time
                          </ListboxOption>
                          <ListboxOption value="Part-time">
                            Part-time
                          </ListboxOption>
                          <ListboxOption value="Custom">Custom</ListboxOption>
                        </ListboxOptions>
                      </Listbox>
                    )}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="availability"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                {availability === "Custom" && (
                  <div className="mt-6">
                    {days.map((day) => (
                      <article
                        className="py-3 border-b last:border-b-0 flex items-center justify-between"
                        key={day}
                      >
                        <div className="pt-2.5 inline-flex gap-x-2">
                          <Switch
                            id={day}
                            defaultChecked={[
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                            ].includes(day)}
                          />
                          <Label
                            htmlFor={day}
                            className="text-gray-700"
                            size="sm"
                          >
                            {day}
                          </Label>
                        </div>

                        <div className="inline-flex items-center gap-x-3">
                          <InputGroup>
                            <Input
                              className="[field-sizing:content] flex-auto text-xs leading-6"
                              defaultValue="9:00"
                            />
                            <InputRightAddon>AM</InputRightAddon>
                          </InputGroup>

                          <span className="inline-block text-base leading-8 font-semibold text-gray-400">
                            to
                          </span>

                          <InputGroup>
                            <Input
                              className="[field-sizing:content] flex-auto text-xs leading-6"
                              defaultValue="5:00"
                            />
                            <InputRightAddon>PM</InputRightAddon>
                          </InputGroup>

                          <IconButton
                            size="lg"
                            visual="gray"
                            variant="outlined"
                          >
                            <Plus className="size-[15px]" />
                          </IconButton>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="py-4 px-6 flex items-center justify-between">
            <Button
              variant="link"
              visual="gray"
              type="button"
              onClick={() => setOpen(false)}
            >
              <X className="size-[15px]" />
              Cancel
            </Button>
            <Button loading={isSubmitting}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// WorkExperienceDialog
// ============================================================

export const WorkExperienceDialog = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,

  onValueChange,
  value: valueProp,
  profile,
  onSaved,
  editIndex,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: WorkExperienceFormValues[] | undefined
    edit: (id: string) => void
  }) => React.ReactNode
  value?: WorkExperienceFormValues[]
  onValueChange?: (value: WorkExperienceFormValues[] | undefined) => void
  profile?: any
  onSaved?: () => void
  editIndex?: string
}) => {
  const { user } = useAuth()
  const userId = profile?.id ?? user?.id ?? ""
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValueFn] = useControllableState<
    WorkExperienceFormValues[] | undefined
  >({
    value: valueProp,
    onChange: onValueChange,
  })
  const [editingId, setEditingId] = useState<string>()

  const [query, setQuery] = useState("")
  const [filteredSkills, setFilteredSkills] = useState<
    { id: number | string; name: string }[]
  >([])

  const fetchSkills = useCallback(async (q: string) => {
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
      const entries: { id: string; label: string }[] = Array.isArray(data)
        ? data
        : (data.entries ?? data.results ?? [])
      setFilteredSkills(entries.map((e) => ({ id: e.id, name: e.label })))
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSkills(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchSkills])

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty, isSubmitting },
    trigger,
    setValue,
    register,
    reset,
  } = useForm<WorkExperienceFormValues>({
    resolver: zodResolver(workExperienceFormSchema),
    mode: "onChange",
    defaultValues: {
      currentlyWorkHere: false,
      jobDescription: "",
      jobTitle: "",
      employer: "",
      endDate: undefined,
      startDate: undefined,
      skills: [],
    },
  })
  const onSubmit: SubmitHandler<WorkExperienceFormValues> = async (values) => {
    const startDate = values.startDate
      ? `${values.startDate.year}-${String(values.startDate.month).padStart(2, "0")}`
      : undefined
    const endDate = values.currentlyWorkHere
      ? undefined
      : values.endDate?.year && values.endDate?.month
        ? `${values.endDate.year}-${String(values.endDate.month).padStart(2, "0")}-01`
        : undefined
    const fullStart = startDate ? `${startDate}-01` : ""
    const payload = {
      company: values.employer,
      title: values.jobTitle,
      startDate: fullStart,
      endDate,
      isCurrentRole: values.currentlyWorkHere,
      description: values.jobDescription,
      skills: values.skills?.map((s) => s.name),
    }
    try {
      if (editingId) {
        await UserAPI.updateExperience(editingId, payload)
      } else {
        await UserAPI.addExperience(payload)
      }
    } catch (err) {
      console.error("[work-experience] save failed", err)
      return
    }
    onSaved?.()
    setEditingId(undefined)
    reset()
    setOpen(false)
  }

  const skillsField = useWatch({ control, name: "skills" })
  const submitTriggerRef = useRef<HTMLButtonElement>(null)

  const edit = (id: string) => {
    setEditingId(id)
    const exp = profile?.experience?.find((e: any) => String(e.id) === id)
    if (!exp) return
    const sd = exp.startDate ? exp.startDate.split("-") : []
    const ed = exp.endDate ? exp.endDate.split("-") : []
    reset({
      employer: exp.company ?? "",
      jobTitle: exp.title ?? "",
      startDate: {
        year: sd[0] ? Number(sd[0]) : undefined,
        month: sd[1] ? Number(sd[1]) : undefined,
      },
      endDate: {
        year: ed[0] ? Number(ed[0]) : undefined,
        month: ed[1] ? Number(ed[1]) : undefined,
      },
      currentlyWorkHere: Boolean(exp.isCurrentRole),
      jobDescription: exp.description ?? "",
      skills: (exp.skills ?? []).map((name: string, i: number) => ({
        id: i + 1,
        name,
      })),
    })
    setTimeout(() => trigger())
  }

  useEffect(() => {
    if (open && editIndex) {
      edit(editIndex)
    } else if (open && !editIndex) {
      setEditingId(undefined)
      reset()
    }
  }, [open, editIndex])

  useEffect(() => {
    if (open && profile?.experience?.length && !value?.length) {
      const mapped = profile.experience.map((exp: any) => {
        const sd = exp.startDate ? exp.startDate.split("-") : []
        const ed = exp.endDate ? exp.endDate.split("-") : []
        return {
          employer: exp.company ?? "",
          jobTitle: exp.title ?? "",
          startDate: {
            year: sd[0] ? Number(sd[0]) : undefined,
            month: sd[1] ? Number(sd[1]) : undefined,
          },
          endDate: {
            year: ed[0] ? Number(ed[0]) : undefined,
            month: ed[1] ? Number(ed[1]) : undefined,
          },
          currentlyWorkHere: Boolean(exp.isCurrentRole),
          jobDescription: exp.description ?? "",
          skills: (exp.skills ?? []).map((name: string, i: number) => ({
            id: i + 1,
            name,
          })),
        } as WorkExperienceFormValues
      })
      setValueFn(mapped)
    }
  }, [open, profile?.experience])

  const handleDeleteExperience = async (idx: number) => {
    const exp = profile?.experience?.[idx]
    if (userId && exp?.id) {
      try {
        await UserAPI.removeExperience(String(exp.id))
      } catch {}
      onSaved?.()
    }
    setValueFn((prev) => prev?.filter((_, i) => i !== idx))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        toggle: () => setOpen((prev) => !prev),
        open,
        formValues: value,
        edit,
      })}
      <DialogContent className="max-w-[700px] max-h-[calc(100vh-2rem)] rounded-[12px] p-0 flex flex-col overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
          <div className="pt-6 px-6 flex-1 overflow-y-auto min-h-0">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Work Experience
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Tell us where you&apos;ve worked before!
                </p>
              </div>

              <IconButton
                variant="ghost"
                visual="gray"
                type="button"
                onClick={() => (isDirty ? setIsOpen(true) : setOpen(false))}
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-8">
              <div className="pb-[50px]">
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
                            <Listbox value={value ?? null} onChange={onChange}>
                              <ListboxButton
                                placeholder="Month"
                                displayValue={(value: number) =>
                                  months.find((m) => m.value === value)?.name ??
                                  ""
                                }
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "startDate.month",
                                })}
                              />
                              <ListboxOptions>
                                <ScrollArea
                                  viewportClassName="max-h-[304px]"
                                  scrollBar={<ScrollBar className="w-4 p-1" />}
                                >
                                  {months.map((m) => (
                                    <ListboxOption
                                      key={m.value}
                                      value={m.value}
                                    >
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
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Controller
                          control={control}
                          name="startDate.year"
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value ?? null} onChange={onChange}>
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
                                  scrollBar={<ScrollBar className="w-4 p-1" />}
                                >
                                  {[2020, 2021, 2022, 2023, 2024, 2025].map(
                                    (month) => (
                                      <ListboxOption key={month} value={month}>
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

                  <div className="space-y-1.5 col-span-2">
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
                            <Listbox value={value ?? null} onChange={onChange}>
                              <ListboxButton
                                placeholder="Month"
                                displayValue={(value: number) =>
                                  months.find((m) => m.value === value)?.name ??
                                  ""
                                }
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "endDate.year",
                                })}
                              />
                              <ListboxOptions>
                                <ScrollArea
                                  viewportClassName="max-h-[304px]"
                                  scrollBar={<ScrollBar className="w-4 p-1" />}
                                >
                                  {months.map((m) => (
                                    <ListboxOption
                                      key={m.value}
                                      value={m.value}
                                    >
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
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Controller
                          control={control}
                          name="endDate.year"
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value ?? null} onChange={onChange}>
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
                                  scrollBar={<ScrollBar className="w-4 p-1" />}
                                >
                                  {[2020, 2021, 2022, 2023, 2024, 2025].map(
                                    (month) => (
                                      <ListboxOption key={month} value={month}>
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
                      render={({ field: { value, onChange, ...field } }) => (
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
                      onChange={(val: typeof value) => {
                        onChange(val)
                        setQuery("")
                      }}
                      multiple
                    >
                      <ComboboxTrigger>
                        <ComboboxInput
                          size="lg"
                          displayValue={() => query}
                          placeholder="Search for skills"
                          onChange={(event) => setQuery(event.target.value)}
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
                              .filter(
                                (skill) =>
                                  !(value ?? []).some(
                                    (s) =>
                                      s.name.toLowerCase() ===
                                      skill.name.toLowerCase()
                                  )
                              )
                              .map((skill) => (
                                <ComboboxOption
                                  key={`${skill.id}-${skill.name}`}
                                  value={skill}
                                >
                                  {skill.name}
                                </ComboboxOption>
                              ))}
                            {query.trim() && filteredSkills.length === 0 && (
                              <ComboboxOption
                                value={{
                                  id: `custom-${query.trim()}`,
                                  name: query.trim(),
                                }}
                              >
                                Add &ldquo;{query.trim()}&rdquo;
                              </ComboboxOption>
                            )}
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
                        type="button"
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
              </div>
            </div>
          </div>

          <div className="py-4 px-6 flex items-center justify-between shrink-0 border-t border-gray-200 bg-white">
            <DialogClose onClick={() => reset()} asChild>
              <Button variant="link" visual="gray" type="button">
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={!isValid}
              loading={isSubmitting}
              ref={submitTriggerRef}
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
                  <DialogClose onClick={() => reset()} asChild>
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// EducationDialog
// ============================================================

export const EducationDialog = ({
  opened,
  onOpenedChange,
  trigger,
  defaultValue,
  onValueChange,
  value: valueProp,
  profile,
  onSaved,
  editIndex,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: EducationFormValues
  }) => React.ReactNode
  defaultValue?: EducationFormValues
  value?: EducationFormValues
  onValueChange?: (value: EducationFormValues) => void
  profile?: any
  onSaved?: () => void
  editIndex?: string
}) => {
  const { user } = useAuth()
  const userId = profile?.id ?? user?.id ?? ""
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [value, setValue] = useControllableState<EducationFormValues>({
    defaultValue: defaultValue ? defaultValue : educationFormDefaultValues,
    value: valueProp,
    onChange: onValueChange,
  })
  const [editingId, setEditingId] = useState<string | undefined>()

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    register,
    reset,
    trigger: formTrigger,
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    mode: "onChange",
    defaultValues: {
      currentlyAttending: false,
      degree: "",
      major: "",
      schoolOrUniversity: "",
    },
  })

  const edit = (id: string) => {
    setEditingId(id)
    const edu = profile?.education?.find((e: any) => String(e.id) === id)
    if (!edu) return
    reset({
      schoolOrUniversity: edu.school ?? "",
      degree: edu.degree ?? "",
      major: edu.fieldOfStudy ?? "",
      currentlyAttending: Boolean(edu.currentlyStudying),
      startDate: {
        year: edu.startYear ?? undefined,
        month: edu.startMonth ?? undefined,
      },
      endDate: {
        year: edu.endYear ?? undefined,
        month: edu.endMonth ?? undefined,
      },
    })
    setTimeout(() => formTrigger())
  }

  useEffect(() => {
    if (open && editIndex) {
      edit(editIndex)
    } else if (open && !editIndex) {
      setEditingId(undefined)
      reset()
    }
  }, [open, editIndex])

  const onSubmit: SubmitHandler<EducationFormValues> = async (values) => {
    if (userId) {
      const payload = {
        school: values.schoolOrUniversity,
        degree: values.degree,
        fieldOfStudy: values.major,
        startYear: values.startDate?.year as number,
        startMonth: values.startDate?.month,
        endYear: values.currentlyAttending ? undefined : values.endDate?.year,
        endMonth: values.currentlyAttending ? undefined : values.endDate?.month,
        currentlyStudying: values.currentlyAttending,
      }
      try {
        if (editingId) {
          await UserAPI.updateEducation(editingId, payload)
        } else {
          await UserAPI.addEducation(payload)
        }
      } catch {}
      onSaved?.()
    }
    setEditingId(undefined)
    setValue(values)
    setOpen(false)
  }

  const currentlyAttending = useWatch({ control, name: "currentlyAttending" })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 pt-6 px-6">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Education
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Show your qualifications to give clients confidence.
                </p>
              </div>

              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <div className="mt-8">
              <div className="pb-[50px]">
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
                            <Listbox value={value ?? null} onChange={onChange}>
                              <ListboxButton
                                displayValue={(value: number) =>
                                  months.find((m) => m.value === value)?.name ??
                                  ""
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
                            <Listbox value={value ?? null} onChange={onChange}>
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
                            <Listbox value={value ?? null} onChange={onChange}>
                              <ListboxButton
                                displayValue={(value: number) =>
                                  months.find((m) => m.value === value)?.name ??
                                  ""
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
                            <Listbox value={value ?? null} onChange={onChange}>
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
                      I&apos;m currently attending
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="py-4 px-6 flex items-center justify-between">
            <DialogClose onClick={() => reset()} asChild>
              <Button variant="link" visual="gray" type="button">
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={!isValid} loading={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// LanguagesDialog
// ============================================================

export const LanguagesDialog = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  defaultValue,
  onValueChange,
  value: valueProp,
  profile,
  onSaved,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: LanguagesFormValues
  }) => React.ReactNode
  defaultValue?: LanguagesFormValues
  value?: LanguagesFormValues
  onValueChange?: (value: LanguagesFormValues) => void
  profile?: any
  onSaved?: () => void
}) => {
  const { user } = useAuth()
  const userId = profile?.id ?? user?.id ?? ""
  const [value, setValueFn] = useControllableState({
    defaultValue: defaultValue ? defaultValue : languagesFormDefaultValue,
    value: valueProp,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const {
    control,
    formState: { isValid, errors, isSubmitting },
    handleSubmit,
    setValue,
    trigger,
  } = useForm<LanguagesFormValues>({
    resolver: zodResolver(languagesFormSchema),
    defaultValues: value,
  })

  const selected = useWatch({ control, name: "languages" })
  const [query, setQuery] = useState("")
  const [filteredLanguages, setFilteredLanguages] = useState<
    { id: number | string; name: string }[]
  >([])

  const fetchLanguages = useCallback(async (q: string) => {
    if (!q.trim()) {
      setFilteredLanguages([])
      return
    }
    try {
      const res = await fetch(
        `${getPublicApiUrl()}/autocomplete/languages?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) return
      const data = await res.json()
      const entries: { id: string; label: string }[] = Array.isArray(data)
        ? data
        : (data.entries ?? data.results ?? [])
      setFilteredLanguages(entries.map((e) => ({ id: e.id, name: e.label })))
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchLanguages(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchLanguages])

  const onRemove = (index: number) => {
    setValue(
      "languages",
      selected?.filter((_, i) => i !== index)
    )
    trigger()
  }

  useEffect(() => {
    if (open && profile?.languages?.length) {
      const mapped = profile.languages.map((l: any, i: number) => ({
        id: l.id ?? i + 1,
        name: l.name ?? "",
      }))
      setValue("languages", mapped)
    }
  }, [open, profile?.languages])

  const onSubmit: SubmitHandler<LanguagesFormValues> = async (values) => {
    if (userId) {
      try {
        // Remove existing languages
        if (profile?.languages?.length) {
          await Promise.all(
            profile.languages.map((lang: any) =>
              UserAPI.removeLanguage(String(lang.id))
            )
          )
        }
        // Add new languages
        await Promise.all(
          values.languages.map((lang) =>
            UserAPI.addLanguage({ name: lang.name })
          )
        )
      } catch {}
      onSaved?.()
    }
    setValueFn(values)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 p-6 pb-[50px]">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Languages
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Share the languages you speak regularly
                </p>
              </div>

              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <Controller
              name="languages"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Combobox
                  multiple
                  className="mt-8 w-auto"
                  value={value}
                  onChange={(val: typeof value) => {
                    const unique = val.filter(
                      (s, i, arr) =>
                        arr.findIndex(
                          (x) => x.name.toLowerCase() === s.name.toLowerCase()
                        ) === i
                    )
                    onChange(unique)
                    setQuery("")
                  }}
                >
                  <ComboboxTrigger>
                    <ComboboxInput
                      size="lg"
                      displayValue={() => query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Enter your language"
                      invalid={hookFormHasError({ errors, name: "languages" })}
                    />
                    <ComboboxButton>
                      <SearchMd className="h-4 w-4" />
                    </ComboboxButton>
                  </ComboboxTrigger>
                  <ScaleOutIn afterLeave={() => setQuery("")}>
                    <ComboboxOptions>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {filteredLanguages
                          .filter(
                            (language) =>
                              !(value ?? []).some(
                                (s) =>
                                  s.name.toLowerCase() ===
                                  language.name.toLowerCase()
                              )
                          )
                          .map((language) => (
                            <ComboboxOption
                              key={`${language.id}-${language.name}`}
                              value={language}
                            >
                              {language.name}
                            </ComboboxOption>
                          ))}
                        {(() => {
                          const q = query.trim().toLowerCase()
                          const alreadySelected = (value ?? []).some(
                            (s) => s.name.toLowerCase() === q
                          )
                          const visibleOptions = filteredLanguages.filter(
                            (lang) =>
                              !(value ?? []).some(
                                (s) =>
                                  s.name.toLowerCase() ===
                                  lang.name.toLowerCase()
                              )
                          )
                          if (
                            !q ||
                            alreadySelected ||
                            visibleOptions.length > 0
                          )
                            return null
                          return (
                            <ComboboxOption
                              value={{
                                id: `custom-${query.trim()}`,
                                name: query.trim(),
                              }}
                            >
                              Add &ldquo;{query.trim()}&rdquo;
                            </ComboboxOption>
                          )
                        })()}
                      </ScrollArea>
                    </ComboboxOptions>
                  </ScaleOutIn>
                </Combobox>
              )}
            />

            <HookFormErrorMessage
              errors={errors}
              name="languages"
              render={({ message }) => (
                <ErrorMessage className="mt-1.5" size="sm">
                  {message}
                </ErrorMessage>
              )}
            />

            <div className="mt-3 flex gap-3 flex-wrap">
              {selected?.map((language, index) => (
                <Badge visual="primary" key={language.id}>
                  {language.name}
                  <button
                    className="focus-visible:outline-none"
                    type="button"
                    onClick={() => onRemove(index)}
                  >
                    <X2 className="size-2" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="py-4 px-6 flex items-center justify-between">
            <DialogClose asChild>
              <Button variant="link" visual="gray" type="button">
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>

            <Button disabled={!isValid} loading={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// SkillsDialog
// ============================================================

export const SkillsDialog = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  defaultValue,
  onValueChange,
  value: valueProp,
  profile,
  onSaved,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: SkillsFormValues
  }) => React.ReactNode
  defaultValue?: SkillsFormValues
  value?: SkillsFormValues
  onValueChange?: (value: SkillsFormValues) => void
  profile?: any
  onSaved?: () => void
}) => {
  const { user } = useAuth()
  const userId = profile?.id ?? user?.id ?? ""
  const [value, setValueFn] = useControllableState({
    defaultValue: defaultValue ? defaultValue : skillsFormDefaultValue,
    value: valueProp,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const {
    control,
    formState: { isValid, errors, isSubmitting },
    handleSubmit,
    setValue,
    trigger,
  } = useForm<SkillsFormValues>({
    resolver: zodResolver(skillsFormSchema),
    defaultValues: skillsFormDefaultValue,
  })
  const selected = useWatch({ control, name: "skills" })
  const [query, setQuery] = useState("")
  const [filteredSkills, setFilteredSkills] = useState<
    { id: number | string; name: string }[]
  >([])

  const fetchSkills = useCallback(async (q: string) => {
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
      const entries: { id: string; label: string }[] = Array.isArray(data)
        ? data
        : (data.entries ?? data.results ?? [])
      setFilteredSkills(entries.map((e) => ({ id: e.id, name: e.label })))
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSkills(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchSkills])
  const onRemove = (index: number) => {
    setValue(
      "skills",
      selected?.filter((_, i) => i !== index)
    )
    trigger()
  }

  useEffect(() => {
    if (open && profile?.skills?.length) {
      const mapped = profile.skills.map((s: any, i: number) => ({
        id: s.id ?? i + 1,
        name: s.name ?? "",
      }))
      setValue("skills", mapped)
    }
  }, [open, profile?.skills])

  const onSubmit: SubmitHandler<SkillsFormValues> = async (values) => {
    if (userId) {
      try {
        const currentSkills: any[] = profile?.skills ?? []
        const newNames = new Set(values.skills.map((s) => s.name.toLowerCase()))
        const currentNames = new Set(
          currentSkills.map((s: any) => s.name?.toLowerCase())
        )

        const toRemove = currentSkills.filter(
          (s: any) => !newNames.has(s.name?.toLowerCase())
        )
        const toAdd = values.skills.filter(
          (s) => !currentNames.has(s.name.toLowerCase())
        )

        await Promise.all(
          toRemove.map((skill: any) =>
            UserAPI.removeSkill(String(skill.id))
          )
        )
        await Promise.all(
          toAdd.map((skill) => UserAPI.addSkill({ name: skill.name }))
        )
      } catch {}
      onSaved?.()
    }
    setValueFn(values)
    setOpen(false)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <DialogTitle className="sr-only">Skills</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 p-6 pb-[50px]">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Skills
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Share your expertise and make your profile unforgettable!
                </p>
              </div>

              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <Controller
              name="skills"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Combobox
                  multiple
                  className="mt-8 w-auto"
                  value={value}
                  onChange={(val: typeof value) => {
                    const unique = val.filter(
                      (s, i, arr) =>
                        arr.findIndex(
                          (x) => x.name.toLowerCase() === s.name.toLowerCase()
                        ) === i
                    )
                    onChange(unique)
                    setQuery("")
                  }}
                >
                  <ComboboxTrigger>
                    <ComboboxInput
                      size="lg"
                      displayValue={() => query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search for skills"
                      invalid={hookFormHasError({ errors, name: "skills" })}
                    />
                    <ComboboxButton>
                      <SearchMd className="h-4 w-4" />
                    </ComboboxButton>
                  </ComboboxTrigger>
                  <ScaleOutIn afterLeave={() => setQuery("")}>
                    <ComboboxOptions>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {filteredSkills
                          .filter(
                            (skill) =>
                              !(value ?? []).some(
                                (s) =>
                                  s.name.toLowerCase() ===
                                  skill.name.toLowerCase()
                              )
                          )
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
                          const alreadySelected = (value ?? []).some(
                            (s) => s.name.toLowerCase() === q
                          )
                          const visibleOptions = filteredSkills.filter(
                            (skill) =>
                              !(value ?? []).some(
                                (s) =>
                                  s.name.toLowerCase() ===
                                  skill.name.toLowerCase()
                              )
                          )
                          if (
                            !q ||
                            alreadySelected ||
                            visibleOptions.length > 0
                          )
                            return null
                          return (
                            <ComboboxOption
                              value={{
                                id: `custom-${query.trim()}`,
                                name: query.trim(),
                              }}
                            >
                              Add &ldquo;{query.trim()}&rdquo;
                            </ComboboxOption>
                          )
                        })()}
                      </ScrollArea>
                    </ComboboxOptions>
                  </ScaleOutIn>
                </Combobox>
              )}
            />

            <HookFormErrorMessage
              errors={errors}
              name="languages"
              render={({ message }) => (
                <ErrorMessage className="mt-1.5" size="sm">
                  {message}
                </ErrorMessage>
              )}
            />

            <div className="mt-3 flex gap-3 flex-wrap">
              {selected?.map((skill, index) => (
                <Badge visual="primary" key={skill.id}>
                  {skill.name}
                  <button
                    className="focus-visible:outline-none"
                    type="button"
                    onClick={() => onRemove(index)}
                  >
                    <X2 className="size-2" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="py-4 px-6 flex items-center justify-between">
            <DialogClose asChild>
              <Button variant="link" visual="gray" type="button">
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>

            <Button disabled={!isValid} loading={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// IndustryExpertiseDialog
// ============================================================

export const IndustryExpertiseDialog = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  defaultValue,
  onValueChange,
  value: valueProp,
  profile,
  onSaved,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: IndustriesFormValues
  }) => React.ReactNode
  defaultValue?: IndustriesFormValues
  value?: IndustriesFormValues
  onValueChange?: (value: IndustriesFormValues) => void
  profile?: any
  onSaved?: () => void
}) => {
  const { user } = useAuth()
  const userId = profile?.id ?? user?.id ?? ""
  const [value, setValueFn] = useControllableState({
    defaultValue: defaultValue ? defaultValue : industriesFormDefaultValue,
    value: valueProp,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const {
    control,
    formState: { isValid, errors, isSubmitting },
    handleSubmit,
    setValue,
    trigger,
  } = useForm<IndustriesFormValues>({
    resolver: zodResolver(industriesFormSchema),
  })
  const selected = useWatch({ control, name: "industries" })
  const [query, setQuery] = useState("")
  const [filteredExpertise, setFilteredExpertise] = useState<
    { id: number | string; name: string }[]
  >([])

  const fetchIndustries = useCallback(async (q: string) => {
    try {
      const res = await fetch(
        `${getPublicApiUrl()}/autocomplete/industries?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) return
      const data = await res.json()
      const entries: { id?: string; label: string }[] = Array.isArray(data)
        ? data
        : (data.entries ?? data.results ?? [])
      setFilteredExpertise(
        entries.map((e) => ({ id: e.id ?? e.label, name: e.label }))
      )
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchIndustries(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchIndustries])
  const onRemove = (index: number) => {
    setValue(
      "industries",
      selected?.filter((_, i) => i !== index)
    )
    trigger()
  }
  useEffect(() => {
    if (open && profile?.industries?.length) {
      const mapped = profile.industries.map((ind: any, i: number) => ({
        id: ind.id ?? i + 1,
        name: ind.industry ?? "",
      }))
      setValue("industries", mapped)
    }
  }, [open, profile?.industries])

  const onSubmit: SubmitHandler<IndustriesFormValues> = async (values) => {
    setOpen(false)
    setValueFn(values)
    if (userId) {
      ;(async () => {
        try {
          if (profile?.industries?.length) {
            await Promise.all(
              profile.industries.map((ind: any) =>
                UserAPI.removeIndustry(String(ind.id))
              )
            )
          }
          await Promise.all(
            values.industries.map((ind) =>
              UserAPI.addIndustry({ industry: ind.name })
            )
          )
        } catch {}
        onSaved?.()
      })()
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 p-6 pb-[50px]">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Industry Expertise
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Let us know which industries you have experience with
                </p>
              </div>

              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <Controller
              name="industries"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Combobox
                  multiple
                  className="mt-8 w-auto"
                  value={value}
                  onChange={onChange}
                >
                  <ComboboxTrigger>
                    <ComboboxInput
                      className="w-full"
                      size="lg"
                      displayValue={(industry: { id: number; name: string }) =>
                        industry.name
                      }
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search for industries"
                      invalid={hookFormHasError({ errors, name: "industries" })}
                    />
                    <ComboboxButton>
                      <SearchMd className="h-4 w-4" />
                    </ComboboxButton>
                  </ComboboxTrigger>
                  <ScaleOutIn afterLeave={() => setQuery("")}>
                    <ComboboxOptions>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {filteredExpertise.map((language) => (
                          <ComboboxOption key={language.id} value={language}>
                            {language.name}
                          </ComboboxOption>
                        ))}
                      </ScrollArea>
                    </ComboboxOptions>
                  </ScaleOutIn>
                </Combobox>
              )}
            />

            <HookFormErrorMessage
              errors={errors}
              name="industries"
              render={({ message }) => (
                <ErrorMessage className="mt-1.5" size="sm">
                  {message}
                </ErrorMessage>
              )}
            />

            <div className="mt-3 flex gap-3 flex-wrap">
              {selected?.map((expertise, index) => (
                <Badge visual="primary" key={expertise.id}>
                  {expertise.name}
                  <button
                    className="focus-visible:outline-none"
                    onClick={() => onRemove(index)}
                  >
                    <X2 className="size-2" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="py-4 px-6 flex items-center justify-between">
            <DialogClose asChild>
              <Button variant="link" visual="gray" type="button">
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>

            <Button disabled={!isValid} loading={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// CertificationsDialog
// ============================================================

export const CertificationsDialog = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  onValueChange,
  value: valueProp,
  profile,
  onSaved,
  editIndex,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: CertificationsFormValues[] | undefined
  }) => React.ReactNode
  value?: CertificationsFormValues[]
  onValueChange?: (value: CertificationsFormValues[] | undefined) => void
  profile?: any
  onSaved?: () => void
  editIndex?: string
}) => {
  const { user } = useAuth()
  const userId = profile?.id ?? user?.id ?? ""
  const submitTriggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValueFn] = useControllableState<
    CertificationsFormValues[] | undefined
  >({
    value: valueProp,
    onChange: onValueChange,
  })
  const {
    control,
    formState: { errors, isValid, isDirty, isSubmitting },
    handleSubmit,
    setValue,
    reset,
    trigger,
  } = useForm<CertificationsFormValues>({
    resolver: zodResolver(certificationsFormSchema),
    defaultValues: {
      credentialId: "",
      credentialsUrl: "",
      name: "",
      canNotExpire: false,
      issuedDate: undefined,
      expirationDate: undefined,
      skills: [],
    },
  })
  const [isShowing, setIsShowing] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>()
  const selected = useWatch({ control, name: "skills" })
  const [query, setQuery] = useState("")
  const [filteredSkills, setFilteredSkills] = useState<
    { id: number | string; name: string }[]
  >([])

  const edit = useCallback(
    (id: string) => {
      setEditingId(id)
      const cert = profile?.certifications?.find(
        (c: any) => String(c.id) === id
      )
      if (!cert) return
      reset({
        name: cert.name ?? "",
        credentialId: cert.credentialId ?? "",
        credentialsUrl: cert.credentialUrl ?? "",
        issuedDate: cert.issueDate ? new Date(cert.issueDate) : undefined,
        expirationDate: cert.expirationDate
          ? new Date(cert.expirationDate)
          : undefined,
        canNotExpire: !cert.expirationDate,
        skills: Array.isArray(cert.skills)
          ? cert.skills.map((name: string, i: number) => ({
              id: `${cert.id}-${i}`,
              name,
            }))
          : [],
      })
    },
    [profile?.certifications, reset]
  )

  useEffect(() => {
    if (open && editIndex) {
      edit(editIndex)
    } else if (open && !editIndex) {
      setEditingId(undefined)
      reset()
    }
  }, [open, editIndex, edit, reset])

  const fetchSkills = useCallback(async (q: string) => {
    try {
      const res = await fetch(
        `${getPublicApiUrl()}/autocomplete/skills?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) return
      const data = await res.json()
      const entries: { id?: string; label: string }[] = Array.isArray(data)
        ? data
        : (data.entries ?? data.results ?? [])
      setFilteredSkills(
        entries.map((e) => ({ id: e.id ?? e.label, name: e.label }))
      )
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSkills(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchSkills])
  const onSubmit: SubmitHandler<CertificationsFormValues> = async (values) => {
    const credentialUrl = values.credentialsUrl?.trim() || undefined
    const payload = {
      name: values.name,
      issuer: getIssuerNameFromUrl(credentialUrl) ?? undefined,
      issueDate: values.issuedDate.toISOString(),
      expirationDate: values.canNotExpire
        ? undefined
        : values.expirationDate?.toISOString(),
      credentialId: values.credentialId || undefined,
      credentialUrl,
      skills: values.skills?.map((s) => s.name) ?? [],
    }
    try {
      if (editingId) {
        await UserAPI.updateCertification(editingId, payload)
      } else if (userId) {
        await UserAPI.addCertification(payload)
        setValueFn((prev) => (prev ? [...prev, values] : [values]))
      }
    } catch (err) {
      console.error("[certifications] save failed", err)
      return
    }
    onSaved?.()
    setEditingId(undefined)
    reset()
    setOpen(false)
  }

  const onRemove = (index: number) => {
    setValue(
      "skills",
      selected?.filter((_, i) => i !== index)
    )
    trigger("skills")
  }

  const canNotExpire = useWatch({ control, name: "canNotExpire" })

  useEffect(() => {
    if (canNotExpire) {
      setValue("expirationDate", undefined, { shouldDirty: true })
      trigger("expirationDate")
    }
  }, [canNotExpire, setValue, trigger])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Certifications
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Showcase your training credentials!
                </p>
              </div>

              <IconButton
                type="button"
                variant="ghost"
                visual="gray"
                onClick={() => (isDirty ? setIsOpen(true) : setOpen(false))}
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="certification-or-license" size="sm">
                  Name of Certification or License{" "}
                </Label>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      id="certification-or-license"
                      placeholder="Enter certification or license title"
                      {...field}
                      isInvalid={hookFormHasError({ errors, name: "name" })}
                    />
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="name"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-x-5">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="issue-date" size="sm">
                      Issue date
                    </Label>

                    <Controller
                      control={control}
                      name="issuedDate"
                      render={({ field: { value, onChange } }) => (
                        <DatePicker
                          inputClassName="w-full justify-start"
                          indicator={
                            <Calendar className="size-5 text-gray-500" />
                          }
                          placeholder="MM/DD/YYYY"
                          value={value}
                          onValueChange={onChange}
                        />
                      )}
                    />
                    <HookFormErrorMessage
                      errors={errors}
                      name="issuedDate"
                      render={({ message }) => (
                        <ErrorMessage size="sm">{message}</ErrorMessage>
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-x-3">
                    <Controller
                      control={control}
                      name="canNotExpire"
                      render={({ field: { value, onChange, ...field } }) => (
                        <Checkbox
                          id="whether-expired"
                          checked={value}
                          onCheckedChange={onChange}
                          {...field}
                        />
                      )}
                    />
                    <Label size="sm" htmlFor="whether-expired">
                      It doesn&apos;t expire
                    </Label>
                  </div>
                </div>
                <div
                  className={cn(
                    "space-y-1.5",
                    canNotExpire && "pointer-events-none opacity-50"
                  )}
                >
                  <Label htmlFor="expiration-date" size="sm">
                    Expiration Date
                  </Label>
                  <Controller
                    control={control}
                    name="expirationDate"
                    render={({ field: { value, onChange } }) => (
                      <DatePicker
                        inputClassName="w-full justify-start"
                        indicator={
                          <Calendar className="size-5 text-gray-500" />
                        }
                        placeholder="MM/DD/YYYY"
                        value={value}
                        onValueChange={onChange}
                      />
                    )}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="expirationDate"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="credentials-id" size="sm">
                  Credentials ID <span className="font-light">(optional)</span>
                </Label>
                <Controller
                  control={control}
                  name="credentialId"
                  render={({ field }) => (
                    <Input
                      id="credentials-id"
                      placeholder="Ex. 123456"
                      {...field}
                      isInvalid={hookFormHasError({ errors, name: "name" })}
                    />
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="credentialId"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="credentials-url" size="sm">
                  Credentials URL <span className="font-light">(optional)</span>
                </Label>
                <Controller
                  control={control}
                  name="credentialsUrl"
                  render={({ field: { onChange, value, ...field } }) => (
                    <InputGroup>
                      <InputLeftAddon>https://</InputLeftAddon>
                      <Input
                        type="text"
                        placeholder="website.com"
                        value={
                          value?.startsWith("https://") ? value.slice(8) : value
                        }
                        onChange={(e) =>
                          onChange(
                            e.target.value.startsWith("https://")
                              ? e.target.value
                              : `https://${e.target.value}`
                          )
                        }
                        {...field}
                        isInvalid={hookFormHasError({
                          errors,
                          name: "credentialsUrl",
                        })}
                      />
                    </InputGroup>
                  )}
                />

                <HookFormErrorMessage
                  errors={errors}
                  name="credentialsUrl"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>

              <div>
                <Label size="sm">Skills</Label>
                <span className="inline-block mt-2">
                  Which skills are associated with this license or certificate?
                </span>

                <div className="mt-3">
                  {isShowing ? (
                    <Controller
                      name="skills"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Combobox
                          multiple
                          className="w-auto"
                          value={value}
                          onChange={onChange}
                        >
                          <ComboboxTrigger>
                            <ComboboxInput
                              className="w-full"
                              size="lg"
                              displayValue={(skill: {
                                id: number
                                name: string
                              }) => skill.name}
                              onChange={(event) => setQuery(event.target.value)}
                              placeholder="Find skills"
                            />
                            <ComboboxButton>
                              <SearchMd className="size-5" />
                            </ComboboxButton>
                          </ComboboxTrigger>
                          <ScaleOutIn afterLeave={() => setQuery("")}>
                            <ComboboxOptions>
                              <ScrollArea className="h-[304px]">
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
                  ) : (
                    <Button
                      visual="gray"
                      variant="outlined"
                      className="rounded-full"
                      onClick={() => setIsShowing(true)}
                    >
                      <Plus className="size-[15px]" />
                      Add Skills
                    </Button>
                  )}

                  <div className="mt-3 flex gap-3 flex-wrap">
                    {selected?.map((skill, index) => (
                      <Badge visual="primary" key={skill.id}>
                        {skill.name}
                        <button
                          className="focus-visible:outline-none"
                          onClick={() => onRemove(index)}
                        >
                          <X2 className="size-2" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="py-4 px-6 flex items-center justify-between">
            <Button
              variant="link"
              visual="gray"
              type="button"
              onClick={() => setIsOpen(true)}
            >
              <X className="size-[15px]" />
              Cancel
            </Button>
            <Button
              disabled={!isValid}
              loading={isSubmitting}
              ref={submitTriggerRef}
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
                  <DialogClose onClick={() => reset()} asChild>
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// AffiliatedTeamsDialog + AffiliatedTeams1
// ============================================================

export const AffiliatedTeamsDialog = ({
  trigger,
  opened,
  onOpenedChange,
}: {
  trigger?: (opts: { toggle: () => void }) => React.ReactNode
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
}) => {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const router = useRouter()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger?.({ toggle: () => setOpen((prev) => !prev) })}
      <DialogContent className="max-w-[452px] py-8">
        <IconButton
          visual="gray"
          variant="ghost"
          className="opacity-50 absolute top-2.5 right-2.5 hover:opacity-100"
          size="md"
        >
          <X className="size-5" />
        </IconButton>

        <div className="max-w-[352px] mx-auto flex flex-col">
          <div className="size-16 mx-auto rounded-full shrink-0 flex-none border-[8px] bg-gray-100 border-gray-50 inline-flex items-center justify-center">
            <XCircle className="size-6 text-gray-500" />
          </div>

          <h2 className="text-base text-center mt-4 font-semibold text-gray-950">
            You&apos;re not affilated with any teams
          </h2>

          <p className="text-sm leading-5 text-gray-600 text-center mt-1">
            {" "}
            To get started with your first team browse the marketplace for the
            latest teams.
          </p>

          <div className="flex justify-center mt-6">
            <Button
              visual="gray"
              variant="outlined"
              onClick={() => {
                setOpen(false)
                router.push("/teams")
              }}
            >
              Browse Teams
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const AffiliatedTeams1 = ({
  onOpenChange,
  open,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) => {
  const [state, setState] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })

  const teamArticle = (
    <article className="rounded-lg border p-5 flex items-start gap-x-2 border-gray-200 bg-white">
      <Avatar size="sm">
        <AvatarImage src="/man.jpg" alt="Man" />
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
      <div className="flex-auto">
        <h1 className="text-sm leading-none font-bold text-dark-blue-400">
          Bitcoin Master Devs
        </h1>
        <div className="mt-1.5 inline-flex items-center gap-x-3">
          <div className="inline-flex items-center gap-x-2">
            <MarkerPin02 className="size-[12px] text-dark-blue-400" />
            <span className="text-xs leading-none font-light">
              Moscow, Russia
            </span>
          </div>
          <div className="inline-flex items-center gap-x-2">
            <Clock className="size-[12px] text-primary-500" />
            <span className="text-xs leading-none font-light">450 hrs</span>
          </div>
          <div className="inline-flex items-center gap-x-2">
            <Clock className="size-[12px] text-primary-500" />
            <span className="text-xs leading-none font-light">320 members</span>
          </div>
        </div>

        <div className="mt-1.5">
          <span className="text-sm font-light leading-none text-gray-700">
            Skilled developers building secure, scalable blockchain and
            Bitcoin-based applications worldwide.
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton variant="ghost" visual="gray">
            <DotsHorizontal className="size-[15px]" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" side="bottom" align="end">
          <DropdownMenuItem>
            <UserPlus className="h-4 w-4" /> Invite People
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell className="h-4 w-4" /> Manage Notifications
          </DropdownMenuItem>
          <DropdownMenuItem>
            <AlertTriangle className="h-4 w-4" /> Report Team
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem visual="destructive">
            <LogOut className="h-4 w-4" /> Leave Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  )

  return (
    <Dialog open={state} onOpenChange={setState}>
      <DialogContent className="max-w-[700px]">
        <div className="flex items-start gap-x-2">
          <div className="flex-auto">
            <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
              Affiliated Teams
            </h1>

            <p className="text-sm mt-2 leading-5 font-light text-dark-blue-400">
              Share your expertise and make your profile unforgettable!
            </p>
          </div>
          <DialogClose asChild>
            <IconButton
              className="opacity-50 hover:opacity-100"
              size="md"
              visual="gray"
              variant="ghost"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
        </div>
        <div className="mt-8 space-y-3">
          {teamArticle}
          {teamArticle}
          {teamArticle}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// MyOffersDialog
// ============================================================

const OfferCard = () => {
  const tooltipMembers = (
    <ScrollArea
      className="h-[192px] p-3"
      scrollBar={<ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />}
    >
      <div className="space-y-3 pr-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-x-[18px]">
            <div className="flex items-center gap-x-2 flex-auto">
              <Avatar>
                <AvatarImage src="/woman.jpg" alt="Woman" />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>

              <div className="flex flex-col flex-auto">
                <div className="flex items-center gap-x-0.5">
                  <span className="text-xs leading-5 font-semibold text-white">
                    Sevil
                  </span>
                  <span className="text-[10px] leading-none font-light text-white">
                    @designsuperstar23
                  </span>
                </div>
                <span className="text-[10px] font-light text-white">
                  Full-stack Developer
                </span>
              </div>
            </div>

            <span className="text-sm font-semibold text-white leading-5">
              $75 <span className="text-[10px] font-light leading-5">/hr</span>
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  )

  return (
    <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
      <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
        <NextImage
          className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
          src="/dashboard.png"
          alt="Dashboard"
          fill
          sizes="33vw"
        />
      </div>

      <div className="mt-3 flex items-start gap-x-3">
        <NextLink
          href="#"
          className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
        >
          The Ultimate Mobile App Experience
        </NextLink>

        <div className="inline-flex items-center gap-x-1">
          <Star className="size-[15px] text-primary-500 fill-primary-500" />
          <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
            4.9 <span className="font-extralight">(5)</span>
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
        Brief Description of the project. Lorem ipsum dolor sit amet,
        consectetur adipiscing elit, sed do eiusmod tempor incididunt.
      </p>

      <div className="mt-[14.5px] flex flex-col gap-y-3">
        <div className="flex items-center gap-x-[6.4px]">
          <Clock className="size-[18px] shrink-0 text-primary-500" />

          <span className="font-medium text-sm leading-none text-dark-blue-400">
            Starting from 12 weeks
          </span>
        </div>

        <div className="flex items-center gap-x-[6.4px]">
          <Money className="size-[18px] shrink-0 text-primary-500" />

          <span className="font-medium text-sm leading-none text-dark-blue-400">
            $50,000 budget
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup
                max={5}
                size="sm"
                excess
                excessClassName="border-gray-300 text-gray-500"
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Avatar
                    key={i}
                    size="sm"
                    className="border-2 border-white hover:ring-0 active:ring-0"
                  >
                    <AvatarImage src="/woman.jpg" alt="Woman" />
                    <AvatarFallback>W</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0 max-w-[262px]" size="md">
              {tooltipMembers}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <IconButton
          className="rounded-full text-gray-400 hover:text-gray-800"
          visual="gray"
          variant="ghost"
        >
          <Edit03 className="size-4" />
        </IconButton>
      </div>
    </article>
  )
}

export const MyOffersDialog = ({
  trigger,
  opened,
  onOpenedChange,
}: {
  trigger?: (opts: { toggle: () => void }) => React.ReactNode
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
}) => {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger?.({ toggle: () => setOpen((prev) => !prev) })}
      <DialogContent className="max-w-[1060px] rounded-[20px]">
        <div className="flex items-center justify-between">
          <h1 className="text-[36px] leading-11 tracking-[.02em] font-semibold text-dark-blue-400">
            My Offers
          </h1>

          <div className="flex items-center gap-x-2">
            <Button variant="outlined" visual="gray">
              <Plus className="size-[15px]" />
              New Offer
            </Button>

            <DialogClose asChild>
              <IconButton visual="gray" variant="ghost">
                <X className="size-4" />
              </IconButton>
            </DialogClose>
          </div>
        </div>

        <ScrollArea
          className="mt-5"
          viewportClassName="max-h-[578px]"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="bg-gray-50 p-[30px] border-t border-x border-gray-200 grid grid-cols-3 gap-6">
            <OfferCard />
            <OfferCard />
            <OfferCard />
            <OfferCard />
            <OfferCard />
            <OfferCard />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
