"use client"

/**
 * CLIENT "COMPLETE MY PROFILE" STEPS
 *
 * A copy of the talent steps modal in `app/(group)/complete-profile/page.tsx`
 * — the same overview dialog, the same localStorage persistence, the same
 * progress/next/previous stepping, the same step-dialog shell — carrying the
 * client company content from Figma (node 13753-126540).
 *
 * The talent file is the source and is left untouched.
 */

import React, {
  Fragment,
  SVGProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { UserAPI } from "@/service/http/user"
import { ClientAPI } from "@/service/http/client"
import { TeamsAPI } from "@/service/http/teams"
import { InvitationsAPI } from "@/service/http/invitations"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { hookFormHasError } from "@/utils/functions"
import { useCallbackRef, useControllableState } from "@/utils/hooks"
import {
  Briefcase,
  Building03,
  Check,
  ChevronRight,
  CreditCard02,
  Globe01,
  Home03,
  ImagePlus,
  MarkerPin01,
  Phone,
  SearchMd,
  Star,
  ThumbsUp,
  UploadCloud,
  UsersPlus,
  X,
  X2,
} from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import Confetti from "react-confetti"
import { Controller, SubmitHandler, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { UserProfile } from "@/types/user"
import { PhoneNumberInput, isPhoneValid } from "@/components/phone-number-input"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  ErrorMessage,
  IconButton,
  Input,
  Progress,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Textarea,
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
      d="M7.5 17.5h5M10 2.5a5 5 0 0 0-3 9v1.25a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75V11.5a5 5 0 0 0-3-9Z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const ThinkCheck = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M6.25 10.417 8.75 12.917l5-5.834M10 18.333a8.333 8.333 0 1 1 0-16.666 8.333 8.333 0 0 1 0 16.666Z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

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

export const CLIENT_DIALOG_NAMES = [
  "COMPANY_NAME",
  "COMPANY_LOGO",
  "WEBSITE",
  "INDUSTRIES",
  "LOCATION",
  "COMPANY_BIO",
  "WORKPLACE_VALUES",
  "TEAM_MEMBERS",
  "CONTACT_NUMBER",
  "PAYMENT_METHOD",
  "CONGRATULATIONS",
] as const

/** Step titles and blurbs come straight from the Figma frame. */
const content = {
  COMPANY_NAME: {
    icon: <Building03 className="size-5" />,
    title: "Company Name",
    desc: "Establish your company's identity on Marketeq",
  },
  COMPANY_LOGO: {
    icon: <ImagePlus className="size-5" />,
    title: "Company Logo",
    desc: "Make your company instantly recognizable.",
  },
  WEBSITE: {
    icon: <Globe01 className="size-5" />,
    title: "Website",
    desc: "Give people a place to learn more about your business",
  },
  INDUSTRIES: {
    icon: <Briefcase className="size-5" />,
    title: "Industries",
    desc: "Get matched with the right talent and clients for your field.",
  },
  LOCATION: {
    icon: <MarkerPin01 className="size-5" />,
    title: "Location",
    desc: "Help talent and clients know where you're located",
  },
  COMPANY_BIO: {
    icon: <Star className="size-5" />,
    title: "Company Bio",
    desc: "Tell your story and what sets your company apart.",
  },
  WORKPLACE_VALUES: {
    icon: <ThumbsUp className="size-5" />,
    title: "Workplace Values",
    desc: "Show what it's like to work with your company.",
  },
  TEAM_MEMBERS: {
    icon: <UsersPlus className="size-5" />,
    title: "Add team members",
    desc: "Showcase your team members",
  },
  CONTACT_NUMBER: {
    icon: <Phone className="size-5" />,
    title: "Contact Number",
    desc: "Keep your account secure and stay reachable",
  },
  PAYMENT_METHOD: {
    icon: <CreditCard02 className="size-5" />,
    title: "Payment Method",
    desc: "Unlock the ability to hire and pay talent",
  },
} as Record<
  Exclude<(typeof CLIENT_DIALOG_NAMES)[number], "CONGRATULATIONS">,
  { icon: React.ReactNode; title: string; desc: string }
>

const STORAGE_KEY = "marketeq-client-profile-completion"

type DialogsStateType = {
  [Property in (typeof CLIENT_DIALOG_NAMES)[number]]: {
    finished: boolean
    opened: boolean
  }
}

const defaultDialogsState = (): DialogsStateType =>
  CLIENT_DIALOG_NAMES.reduce(
    (previous, current) => ({
      ...previous,
      [current]: { finished: false, opened: false },
    }),
    {} as DialogsStateType
  )

/**
 * The shared shell for every step dialog: the same two-column layout, the
 * same progress header, the same Skip / Save & Continue footer and the same
 * tips column as the talent step dialogs.
 */
const StepShell = ({
  title,
  description,
  progressPercent,
  profileLoading,
  profileError,
  onReloadProfile,
  onSubmit,
  canSave,
  next,
  asideTitle,
  asideDescription,
  tips,
  checklist,
  children,
}: {
  title: string
  description: string
  progressPercent?: number
  profileLoading?: boolean
  profileError?: boolean
  onReloadProfile?: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  canSave: boolean
  next?: () => void
  asideTitle: string
  asideDescription: string
  tips: string[]
  checklist: string[]
  children: React.ReactNode
}) => (
  <DialogContent className="max-w-[1090px] grid grid-cols-2 rounded-[24px] p-[30px]">
    <form onSubmit={onSubmit}>
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
              {title}
            </h1>
          </DialogTitle>
          {profileLoading && !profileError ? (
            <div className="mt-1 h-6 w-[280px] bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="mt-1 text-base leading-[24.31px] text-dark-blue-400">
              {description}
            </p>
          )}
        </div>

        {profileError ? (
          <div className="mt-6 flex flex-col items-start gap-y-3">
            <p className="text-base text-dark-blue-400">
              Something went wrong. Please try again.
            </p>
            <Button
              type="button"
              variant="outlined"
              visual="gray"
              onClick={() => onReloadProfile?.()}
            >
              Retry
            </Button>
          </div>
        ) : profileLoading ? (
          <div
            className="mt-6 h-[345px] bg-gray-200 rounded animate-pulse"
            aria-busy="true"
            aria-label="Loading"
          />
        ) : (
          <div className="mt-6 space-y-1.5">{children}</div>
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
        <Button size="md" disabled={!canSave || profileLoading || profileError}>
          Save &amp; Continue
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
        {asideTitle}
      </h1>
      <p className="text-base text-dark-blue-400 mt-2.5">{asideDescription}</p>

      <div className="mt-[49px]">
        <h1 className="text-lg leading-none font-bold text-dark-blue-400">
          Tips to get you started
        </h1>
        <ul className="mt-4 space-y-[15px]">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-x-5">
              <Bulb className="shrink-0 text-warning-300" />
              <span className="text-base text-dark-blue-400 leading-none">
                {tip}
              </span>
            </li>
          ))}
        </ul>
        <h1 className="text-lg mt-10 leading-none font-bold text-dark-blue-400">
          Checklist for a strong profile
        </h1>
        <ul className="mt-4 space-y-[15px]">
          {checklist.map((item) => (
            <li key={item} className="flex items-center gap-x-5">
              <ThinkCheck className="shrink-0 text-success-500" />
              <span className="text-base text-dark-blue-400">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </DialogContent>
)

type StepProps = {
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
}

const useStepDialog = ({
  opened,
  onOpenedChange,
}: Pick<StepProps, "opened" | "onOpenedChange">) =>
  useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })

/* ---------------------------------------------------------------- 1. Name */

const companyNameFormSchema = z.object({
  companyName: z.string().min(1, "Please enter at least 1 character(s)"),
})

type CompanyNameFormValues = z.infer<typeof companyNameFormSchema>

const CompanyNameDialog = ({
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
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    reset,
  } = useForm<CompanyNameFormValues>({
    resolver: zodResolver(companyNameFormSchema),
    defaultValues: { companyName: "" },
  })

  useEffect(() => {
    if (profile?.teamName) reset({ companyName: profile.teamName })
  }, [profile, reset])

  const companyName = useWatch({ control, name: "companyName" })

  useEffect(() => {
    onFinished(Boolean(companyName?.length))
  }, [companyName, onFinished])

  const onSubmit: SubmitHandler<CompanyNameFormValues> = (values) => {
    next?.()
    if (userId) {
      UserAPI.updateProfile(userId, { teamName: values.companyName }).catch(
        () => {}
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Company Name"
        description="Establish your company's identity on Marketeq."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={handleSubmit(onSubmit)}
        canSave={isValid}
        next={next}
        asideTitle="Start with the name talent will recognize."
        asideDescription="Your company name is the first thing talent sees on every job you post."
        tips={[
          "Use the name your clients already know you by.",
          "Skip the legal suffix unless you go by it.",
          "Keep it consistent with your website and invoices.",
        ]}
        checklist={[
          "Spelled the way it appears on your site.",
          "No placeholder or personal names.",
        ]}
      >
        <Input
          placeholder="Enter your company name"
          {...register("companyName")}
          isInvalid={hookFormHasError({ errors, name: "companyName" })}
        />
        <HookFormErrorMessage
          name="companyName"
          errors={errors}
          render={({ message }) => (
            <ErrorMessage size="sm">{message}</ErrorMessage>
          )}
        />
      </StepShell>
    </Dialog>
  )
}

/* ---------------------------------------------------------------- 2. Logo */

const CompanyLogoDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
  progressPercent,
  profile,
  profileLoading,
  profileError,
  onReloadProfile,
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [uploadError, setUploadError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile?.avatarUrl) setPreview(profile.avatarUrl)
  }, [profile?.avatarUrl])

  useEffect(() => {
    onFinished(Boolean(preview))
  }, [preview, onFinished])

  const onPick = (picked: File | null) => {
    if (!picked) return
    setUploadError("")
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    next?.()
    if (file) {
      // The client profile screen renders the account avatar as the company
      // logo, so the logo lands on the same upload the profile already reads.
      ClientAPI.UploadAvatar(file)
        .then(() => onReloadProfile?.())
        .catch(() => setUploadError("The logo could not be uploaded."))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Company Logo"
        description="Make your company instantly recognizable."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={onSubmit}
        canSave={Boolean(preview)}
        next={next}
        asideTitle="A logo makes your posts stand out."
        asideDescription="Jobs from companies with a logo get noticeably more qualified applicants."
        tips={[
          "Square images crop the cleanest.",
          "Use a transparent or white background.",
          "At least 200×200 so it stays sharp.",
        ]}
        checklist={[
          "The mark is readable at small sizes.",
          "It matches the logo on your website.",
        ]}
      >
        <div className="flex items-center gap-x-5">
          <Avatar className="size-[100px]" size="2xl">
            <AvatarImage src={preview} alt="Company logo" />
            <AvatarFallback>
              {(profile?.teamName ?? "C").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <Button
              type="button"
              variant="outlined"
              visual="gray"
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud className="size-4" />
              Upload logo
            </Button>
            <p className="mt-2 text-xs text-gray-500">
              PNG, JPG or SVG. 5MB max.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => onPick(event.target.files?.[0] ?? null)}
          />
        </div>
        {uploadError ? (
          <ErrorMessage size="sm">{uploadError}</ErrorMessage>
        ) : null}
      </StepShell>
    </Dialog>
  )
}

/* ------------------------------------------------------------- 3. Website */

const isWebsiteValid = (url: string) =>
  /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?$/i.test(url.trim())

const websiteFormSchema = z.object({
  website: z
    .string()
    .min(1, "Please enter your website")
    .refine((value) => isWebsiteValid(value), "Invalid website url"),
})

type WebsiteFormValues = z.infer<typeof websiteFormSchema>

const WebsiteDialog = ({
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
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    reset,
  } = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteFormSchema),
    defaultValues: { website: "" },
  })

  useEffect(() => {
    if (profile?.companyWebsite) reset({ website: profile.companyWebsite })
  }, [profile, reset])

  const website = useWatch({ control, name: "website" })

  useEffect(() => {
    onFinished(Boolean(website && isWebsiteValid(website)))
  }, [website, onFinished])

  const onSubmit: SubmitHandler<WebsiteFormValues> = (values) => {
    next?.()
    if (userId) {
      UserAPI.updateProfile(userId, {
        companyWebsite: values.website.trim(),
      }).catch(() => {})
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Website"
        description="Give people a place to learn more about your business."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={handleSubmit(onSubmit)}
        canSave={isValid}
        next={next}
        asideTitle="Let talent do their homework."
        asideDescription="A working link is the fastest way for talent to decide you are worth applying to."
        tips={[
          "Link the page that explains what you do.",
          "A careers page works well if you have one.",
          "Check the link opens before you save it.",
        ]}
        checklist={[
          "The address loads without an error.",
          "It belongs to your company, not a directory listing.",
        ]}
      >
        <Input
          placeholder="website.com"
          {...register("website")}
          isInvalid={hookFormHasError({ errors, name: "website" })}
        />
        <HookFormErrorMessage
          name="website"
          errors={errors}
          render={({ message }) => (
            <ErrorMessage size="sm">{message}</ErrorMessage>
          )}
        />
      </StepShell>
    </Dialog>
  )
}

/* ---------------------------------------------------------- 4. Industries */

const MAX_COMPANY_INDUSTRIES = 10

const industriesFormSchema = z.object({
  industries: z
    .array(z.object({ id: z.union([z.number(), z.string()]), name: z.string() }))
    .min(1, "Please at least provide 1 industry")
    .max(
      MAX_COMPANY_INDUSTRIES,
      `You have reached the maximum limit of ${MAX_COMPANY_INDUSTRIES} industries`
    ),
})

type IndustriesFormValues = z.infer<typeof industriesFormSchema>

const IndustriesDialog = ({
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
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    setValue,
    trigger,
  } = useForm<IndustriesFormValues>({
    resolver: zodResolver(industriesFormSchema),
    defaultValues: { industries: [] },
  })
  const selected = useWatch({ control, name: "industries" })
  const atLimit = (selected?.length ?? 0) >= MAX_COMPANY_INDUSTRIES
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<
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
      setOptions(entries.map((e) => ({ id: e.id ?? e.label, name: e.label })))
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchIndustries(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchIndustries])

  useEffect(() => {
    if (open && profile?.industries?.length) {
      setValue(
        "industries",
        profile.industries.map((ind, index) => ({
          id: ind.id ?? index + 1,
          name: ind.industry ?? "",
        }))
      )
    }
  }, [open, profile?.industries, setValue])

  useEffect(() => {
    onFinished(Boolean(selected?.length))
  }, [selected, onFinished])

  const onRemove = (index: number) => {
    setValue(
      "industries",
      selected?.filter((_, i) => i !== index)
    )
    trigger()
  }

  const onSubmit: SubmitHandler<IndustriesFormValues> = (values) => {
    next?.()
    if (!userId) return
    ;(async () => {
      try {
        if (profile?.industries?.length) {
          await Promise.all(
            profile.industries.map((ind) => UserAPI.removeIndustry(String(ind.id)))
          )
        }
        await Promise.all(
          values.industries.map((ind) =>
            UserAPI.addIndustry({ industry: ind.name })
          )
        )
      } catch {}
      onReloadProfile?.()
    })()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Industries"
        description="Get matched with the right talent and clients for your field."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={handleSubmit(onSubmit)}
        canSave={isValid}
        next={next}
        asideTitle="Matching starts here."
        asideDescription="Industries drive who we surface to you and who sees your jobs first."
        tips={[
          "Pick the fields you actually hire for.",
          "Two or three beats a long list.",
          "You can change these any time.",
        ]}
        checklist={[
          "Every industry reflects real work you do.",
          "Nothing added just to widen reach.",
        ]}
      >
        <Controller
          name="industries"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Combobox
              multiple
              className="w-auto"
              value={value}
              onChange={(next: { id: number | string; name: string }[]) => {
                if (next.length > MAX_COMPANY_INDUSTRIES) return
                onChange(next)
              }}
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
                    {options.map((industry) => (
                      <ComboboxOption key={industry.id} value={industry}>
                        {industry.name}
                      </ComboboxOption>
                    ))}
                  </ScrollArea>
                </ComboboxOptions>
              </ScaleOutIn>
            </Combobox>
          )}
        />

        {atLimit ? (
          <ErrorMessage size="sm">
            You have reached the maximum limit of {MAX_COMPANY_INDUSTRIES}{" "}
            industries
          </ErrorMessage>
        ) : (
          <HookFormErrorMessage
            errors={errors}
            name="industries"
            render={({ message }) => (
              <ErrorMessage size="sm">{message}</ErrorMessage>
            )}
          />
        )}

        <div className="mt-3 flex gap-3 flex-wrap">
          {selected?.map((industry, index) => (
            <Badge visual="primary" key={industry.id}>
              {industry.name}
              <button
                type="button"
                className="focus-visible:outline-none"
                onClick={() => onRemove(index)}
              >
                <X2 className="size-2" />
              </button>
            </Badge>
          ))}
        </div>
      </StepShell>
    </Dialog>
  )
}

/* ------------------------------------------------------------ 5. Location */

const locationFormSchema = z.object({
  location: z.string().min(1, "Please enter your location"),
})

type LocationFormValues = z.infer<typeof locationFormSchema>

const LocationDialog = ({
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
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    reset,
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: { location: "" },
  })

  useEffect(() => {
    if (profile?.location) reset({ location: profile.location })
  }, [profile, reset])

  const location = useWatch({ control, name: "location" })

  useEffect(() => {
    onFinished(Boolean(location?.length))
  }, [location, onFinished])

  const onSubmit: SubmitHandler<LocationFormValues> = (values) => {
    next?.()
    if (userId) {
      UserAPI.updateProfile(userId, { location: values.location }).catch(
        () => {}
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Location"
        description="Help talent and clients know where you're located."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={handleSubmit(onSubmit)}
        canSave={isValid}
        next={next}
        asideTitle="Time zones matter more than you think."
        asideDescription="Talent uses your location to judge overlap before they apply."
        tips={[
          "City and state or country is enough.",
          "Use your headquarters if you have several offices.",
          "Remote-first? Say where the team is anchored.",
        ]}
        checklist={[
          "Specific enough to imply a time zone.",
          "Matches what your website says.",
        ]}
      >
        <Input
          placeholder="City, State or Country"
          {...register("location")}
          isInvalid={hookFormHasError({ errors, name: "location" })}
        />
        <HookFormErrorMessage
          name="location"
          errors={errors}
          render={({ message }) => (
            <ErrorMessage size="sm">{message}</ErrorMessage>
          )}
        />
      </StepShell>
    </Dialog>
  )
}

/* ---------------------------------------------------------- 6. Company Bio */

const companyBioFormSchema = z.object({
  companyBio: z.string().min(1, "Please enter at least 1 character(s)"),
})

type CompanyBioFormValues = z.infer<typeof companyBioFormSchema>

const CompanyBioDialog = ({
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
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    reset,
  } = useForm<CompanyBioFormValues>({
    resolver: zodResolver(companyBioFormSchema),
    defaultValues: { companyBio: "" },
  })

  useEffect(() => {
    const saved = profile?.bio ?? profile?.overview
    if (saved) reset({ companyBio: saved })
  }, [profile, reset])

  const companyBio = useWatch({ control, name: "companyBio" })

  useEffect(() => {
    onFinished(Boolean(companyBio?.length))
  }, [companyBio, onFinished])

  const onSubmit: SubmitHandler<CompanyBioFormValues> = (values) => {
    next?.()
    if (userId) {
      UserAPI.updateProfile(userId, { bio: values.companyBio }).catch(() => {})
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Company Bio"
        description="Tell your story and what sets your company apart."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={handleSubmit(onSubmit)}
        canSave={isValid}
        next={next}
        asideTitle="This is what talent reads first."
        asideDescription="A clear bio is the difference between applicants who fit and applicants who guess."
        tips={[
          "What does your company actually build or deliver?",
          "Who do you serve, and what do they get out of it?",
          "What makes working with you different?",
        ]}
        checklist={[
          "Concrete about the work, not the mission statement.",
          "Written the way you would say it out loud.",
        ]}
      >
        <Textarea
          className="h-[345px]"
          placeholder="Tell talent about your company..."
          {...register("companyBio")}
          isInvalid={hookFormHasError({ errors, name: "companyBio" })}
        />
        <HookFormErrorMessage
          name="companyBio"
          errors={errors}
          render={({ message }) => (
            <ErrorMessage size="sm">{message}</ErrorMessage>
          )}
        />
      </StepShell>
    </Dialog>
  )
}

/* ----------------------------------------------------- 7. Workplace Values */

const WORKPLACE_VALUE_OPTIONS = [
  "Collaboration",
  "Transparency",
  "Ownership",
  "Work-life balance",
  "Continuous learning",
  "Diversity & inclusion",
  "Craftsmanship",
  "Customer obsession",
  "Innovation",
  "Accountability",
]

const WorkplaceValuesDialog = ({
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
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const [values, setValues] = useState<string[]>([])

  useEffect(() => {
    if (profile?.workplaceValues?.length) setValues(profile.workplaceValues)
  }, [profile?.workplaceValues])

  useEffect(() => {
    onFinished(values.length > 0)
  }, [values, onFinished])

  const toggle = (value: string) =>
    setValues((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    )

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    next?.()
    if (userId) {
      UserAPI.updateProfile(userId, { workplaceValues: values }).catch(() => {})
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Workplace Values"
        description="Show what it's like to work with your company."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={onSubmit}
        canSave={values.length > 0}
        next={next}
        asideTitle="Culture is part of the offer."
        asideDescription="Talent picks between comparable jobs on how it feels to work with you."
        tips={[
          "Choose the values you would defend in a hard week.",
          "Three to five reads stronger than ten.",
          "Pick what is true today, not aspirational.",
        ]}
        checklist={[
          "Every value shows up in how you actually work.",
          "Nothing that contradicts your job posts.",
        ]}
      >
        <div className="flex flex-wrap gap-3">
          {WORKPLACE_VALUE_OPTIONS.map((option) => {
            const active = values.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={
                  active
                    ? "rounded-full border-2 border-primary-500 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-500 transition-colors duration-300"
                    : "rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-dark-blue-400 transition-colors duration-300 hover:border-primary-500 hover:text-primary-500"
                }
              >
                {active ? <Check className="mr-1.5 inline size-3" /> : null}
                {option}
              </button>
            )
          })}
        </div>
      </StepShell>
    </Dialog>
  )
}

/* ------------------------------------------------------- 8. Team members */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const TeamMembersDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
  progressPercent,
  profileLoading,
  profileError,
  onReloadProfile,
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const [raw, setRaw] = useState("")
  const [inviteError, setInviteError] = useState("")

  const emails = raw
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
  const allValid = emails.length > 0 && emails.every((e) => emailPattern.test(e))

  useEffect(() => {
    onFinished(allValid)
  }, [allValid, onFinished])

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    next?.()
    ;(async () => {
      try {
        const res = await TeamsAPI.getMyTeam()
        const teamId = res?.data?.id ?? res?.data?.team?.id
        if (!teamId) {
          setInviteError("We could not find your team. Try again shortly.")
          return
        }
        await InvitationsAPI.createInvitations({
          teamId,
          role: "editor",
          emails,
        })
        onReloadProfile?.()
      } catch {
        setInviteError("The invitations could not be sent.")
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Add team members"
        description="Showcase your team members."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={onSubmit}
        canSave={allValid}
        next={next}
        asideTitle="Hiring is a team sport."
        asideDescription="Teammates can review applicants, run interviews and approve work with you."
        tips={[
          "Invite whoever reviews candidates with you.",
          "Work email addresses land more reliably.",
          "Separate several addresses with a comma.",
        ]}
        checklist={[
          "Every address belongs to someone at your company.",
          "You are ready for them to see your jobs.",
        ]}
      >
        <Textarea
          className="h-[200px]"
          placeholder="name@company.com, name@company.com"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
        />
        {emails.length > 0 && !allValid ? (
          <ErrorMessage size="sm">
            One or more addresses are not valid email addresses.
          </ErrorMessage>
        ) : null}
        {inviteError ? (
          <ErrorMessage size="sm">{inviteError}</ErrorMessage>
        ) : null}
      </StepShell>
    </Dialog>
  )
}

/* ----------------------------------------------------- 9. Contact Number */

const ContactNumberDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
  progressPercent,
  profile,
  profileLoading,
  profileError,
  onReloadProfile,
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const [phone, setPhone] = useState("")
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone)
  }, [profile?.phone])

  const valid = isPhoneValid(phone)

  useEffect(() => {
    onFinished(valid)
  }, [valid, onFinished])

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    next?.()
    UserAPI.updatePhone(phone)
      .then(() => onReloadProfile?.())
      .catch(() => setSaveError("The number could not be saved."))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Contact Number"
        description="Keep your account secure and stay reachable."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={onSubmit}
        canSave={valid}
        next={next}
        asideTitle="The fastest way back into your account."
        asideDescription="We use this number to reach you about active hires and to recover your account."
        tips={[
          "Use a number you can answer during work hours.",
          "Include the country code.",
          "A mobile number recovers your account fastest.",
        ]}
        checklist={[
          "The number is one you control.",
          "You can receive a text on it.",
        ]}
      >
        <PhoneNumberInput
          defaultCountry="us"
          value={phone}
          onChange={(value) => setPhone(value)}
        />
        {phone && !valid ? (
          <ErrorMessage size="sm">Please enter a valid phone number</ErrorMessage>
        ) : null}
        {saveError ? <ErrorMessage size="sm">{saveError}</ErrorMessage> : null}
      </StepShell>
    </Dialog>
  )
}

/* ---------------------------------------------------- 10. Payment Method */

const PaymentMethodDialog = ({
  onFinished: onFinishedProp,
  opened,
  onOpenedChange,
  next,
  progressPercent,
  profileLoading,
  profileError,
  onReloadProfile,
}: StepProps) => {
  const onFinished = useCallbackRef(onFinishedProp)
  const [open, setOpen] = useStepDialog({ opened, onOpenedChange })
  const router = useRouter()
  const [added, setAdded] = useState(false)

  useEffect(() => {
    onFinished(added)
  }, [added, onFinished])

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAdded(true)
    next?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StepShell
        title="Payment Method"
        description="Unlock the ability to hire and pay talent."
        progressPercent={progressPercent}
        profileLoading={profileLoading}
        profileError={profileError}
        onReloadProfile={onReloadProfile}
        onSubmit={onSubmit}
        canSave
        next={next}
        asideTitle="Nothing is charged until you hire."
        asideDescription="A saved method means you can accept an offer the moment you find the right person."
        tips={[
          "Card, bank account, Google Pay and Apple Pay are all supported.",
          "Bank transfer carries the lowest fee.",
          "You can add more than one and pick a default.",
        ]}
        checklist={[
          "The billing address matches the method.",
          "A default method is set.",
        ]}
      >
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-base text-dark-blue-400">
            Add a card or bank account to start hiring. Your details are
            handled by our payment provider and are never shared with talent.
          </p>
          <Button
            type="button"
            className="mt-4"
            variant="outlined"
            visual="gray"
            onClick={() => {
              setAdded(true)
              router.push("/settings/billing-payment-methods?add=1")
            }}
          >
            <CreditCard02 className="size-4" />
            Add Payment Method
          </Button>
        </div>
      </StepShell>
    </Dialog>
  )
}

/* ------------------------------------------------------ Congratulations */

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
                  Your Company Profile Is Ready to Attract Top Talent.
                </h1>
              </div>

              <div className="mt-[25px]">
                <p className="text-base text-center leading-none text-gray-600">
                  With your profile fully set, your jobs stand out and the right
                  talent will start reaching out.
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
                  href: "/settings/billing-payment-methods",
                },
                {
                  icon: (
                    <Briefcase className="shrink-0 size-8 text-dark-blue-400" />
                  ),
                  label: "Post a job",
                  href: "/job-listing",
                },
                {
                  icon: (
                    <UsersPlus className="shrink-0 size-8 text-dark-blue-400" />
                  ),
                  label: "Invite your team",
                  href: "/settings",
                },
                {
                  icon: (
                    <SearchMd className="shrink-0 size-8 text-dark-blue-400" />
                  ),
                  label: "Find talent",
                  href: "/search",
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
                href="/client-dashboard"
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

/* --------------------------------------------------------- Status Dialog */

export const ClientStatusDialog = ({
  onOpenChange,
  open,
  onProgressChange,
  initialStep,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onProgressChange?: (percent: number) => void
  initialStep?: (typeof CLIENT_DIALOG_NAMES)[number] | null
}) => {
  const { user } = useAuth()
  const [dialogsState, setDialogsState] =
    useState<DialogsStateType>(defaultDialogsState)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState(false)

  // Load from localStorage on mount (client-side only — localStorage
  // unavailable during SSR)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setDialogsState(
          CLIENT_DIALOG_NAMES.reduce(
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
          COMPANY_NAME: {
            ...prev["COMPANY_NAME"],
            finished: Boolean(p.teamName),
          },
          COMPANY_LOGO: {
            ...prev["COMPANY_LOGO"],
            finished: Boolean(p.avatarUrl),
          },
          WEBSITE: {
            ...prev["WEBSITE"],
            finished: Boolean(p.companyWebsite),
          },
          INDUSTRIES: {
            ...prev["INDUSTRIES"],
            finished: Boolean(p.industries?.length),
          },
          LOCATION: {
            ...prev["LOCATION"],
            finished: Boolean(p.location),
          },
          COMPANY_BIO: {
            ...prev["COMPANY_BIO"],
            finished: Boolean(p.bio || p.overview),
          },
          WORKPLACE_VALUES: {
            ...prev["WORKPLACE_VALUES"],
            finished: Boolean(p.workplaceValues?.length),
          },
          CONTACT_NUMBER: {
            ...prev["CONTACT_NUMBER"],
            finished: Boolean(p.phone),
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
    if (initialStep && CLIENT_DIALOG_NAMES.includes(initialStep)) {
      setDialogsState((prev) => ({
        ...prev,
        [initialStep]: { ...prev[initialStep], opened: true },
      }))
    }
  }, [initialStep])

  // When opened directly to a step, closing that step should close the whole
  // dialog
  const closeAll = React.useCallback(() => {
    setDialogsState(defaultDialogsState())
    onOpenChange?.(false)
  }, [onOpenChange])

  const advancingRef = useRef(false)
  const next = () => {
    if (advancingRef.current) return
    advancingRef.current = true
    setTimeout(() => {
      advancingRef.current = false
    }, 300)
    // If opened directly to a single step, skip to next incomplete step (or
    // close if all done)
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

      const stepsToCheck = CLIENT_DIALOG_NAMES.filter(
        (n) => n !== "CONGRATULATIONS"
      )
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
      const index = CLIENT_DIALOG_NAMES.indexOf(openedDialogName)
      const nextIndex =
        index + 1 < CLIENT_DIALOG_NAMES.length ? index + 1 : undefined
      if (nextIndex !== undefined) {
        const nextDialogName = CLIENT_DIALOG_NAMES[nextIndex]

        if (nextDialogName === "CONGRATULATIONS") {
          const uncompletedDialogIndex = CLIENT_DIALOG_NAMES.slice(
            0,
            -1
          ).findIndex((dialogName) => !dialogsState[dialogName].finished)
          const uncompletedDialogName =
            CLIENT_DIALOG_NAMES[uncompletedDialogIndex]

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

  const stepProps = (name: keyof typeof content) => ({
    onFinished: (finished: boolean) =>
      setDialogsState((prev) => ({
        ...prev,
        [name]: { ...prev[name], finished },
      })),
    opened: dialogsState[name].opened,
    onOpenedChange: (opened: boolean) => {
      if (!opened && isDirectStep) {
        closeAll()
        return
      }
      setDialogsState((prev) => ({
        ...prev,
        [name]: { ...prev[name], opened },
      }))
    },
    next,
    userId: user?.id ?? "",
    progressPercent,
    profile,
    profileLoading,
    profileError,
    onReloadProfile: loadProfile,
  })

  return (
    <>
      <CompanyNameDialog {...stepProps("COMPANY_NAME")} />
      <CompanyLogoDialog {...stepProps("COMPANY_LOGO")} />
      <WebsiteDialog {...stepProps("WEBSITE")} />
      <IndustriesDialog {...stepProps("INDUSTRIES")} />
      <LocationDialog {...stepProps("LOCATION")} />
      <CompanyBioDialog {...stepProps("COMPANY_BIO")} />
      <WorkplaceValuesDialog {...stepProps("WORKPLACE_VALUES")} />
      <TeamMembersDialog {...stepProps("TEAM_MEMBERS")} />
      <ContactNumberDialog {...stepProps("CONTACT_NUMBER")} />
      <PaymentMethodDialog {...stepProps("PAYMENT_METHOD")} />
      <Congratulations
        opened={dialogsState["CONGRATULATIONS"].opened}
        onOpenedChange={(opened) =>
          setDialogsState((prev) => ({
            ...prev,
            CONGRATULATIONS: { ...prev["CONGRATULATIONS"], opened },
          }))
        }
      />

      <Dialog
        open={
          isOpen &&
          !isDirectStep &&
          !Object.values(dialogsState).some((s) => s.opened)
        }
        onOpenChange={setIsOpen}
      >
        <DialogContent
          dialogOverlay={<DialogOverlay className="bg-gray-700/50" />}
          variant="unanimated"
          className="shadow-[0px_20px_24px_-4px_rgba(16,24,40,.08)] max-w-[451px] bottom-5 right-5 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-5 data-[state=open]:slide-in-from-bottom-5"
        >
          <ScrollArea
            viewportStyle={{ maxHeight: "calc(100vh - 88px)" }}
            scrollBar={<ScrollBar className="w-4 p-1" />}
          >
            <div className="border border-gray-200 overflow-hidden rounded-[10px]">
              <div className="p-6 bg-white border-gray-200 flex items-center gap-x-[18px] border-b">
                <div className="flex-auto space-y-2">
                  <p className="text-sm leading-none text-dark-blue-400">
                    Boost your company&apos;s visibility
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
          </ScrollArea>

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

/**
 * Route form. The client dashboard opens `ClientStatusDialog` inline; this
 * page exists so `/complete-client-profile` is a reachable entry point too,
 * mirroring the talent `/complete-profile` route.
 */
export default function CompleteClientProfilePage() {
  const [open, setOpen] = useState(true)
  const router = useRouter()

  return (
    <ClientStatusDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) router.push("/client-dashboard")
      }}
    />
  )
}
