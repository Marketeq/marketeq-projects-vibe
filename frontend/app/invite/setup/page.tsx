"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { ClientAPI } from "@/service/http/client"
import { UserAPI } from "@/service/http/user"
import { capitalizeWords, cn, hookFormHasError } from "@/utils/functions"
import {
  Building01,
  Building02,
  Building03,
  Building04,
  Building05,
  ChevronRight,
  CreditCard02,
  Plus,
  SearchLg,
  Upload01,
  User01,
  User02,
  UserPlus01,
  Users01,
} from "@blend-metrics/icons"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import {
  COMPANY_NAME_IS_EMAIL_MESSAGE,
  Company,
  createCompany,
  isEmailLikeCompanyName,
  searchCompanies,
  uploadCompanyLogo,
} from "@/lib/company-directory"
import { useInvitationPreview } from "@/src/hooks/useInvitations"
import { getCompanyMembers } from "@/service/http/companies"
import { InvitationsAPI } from "@/service/http/invitations"
import {
  getAcceptInvitationPayload,
  getInvitationErrorMessage,
} from "@/utils/invitationRedirect"
import { Spinner } from "@/components/ui/spinner/spinner"
import {
  CompanyLogoField,
  CompanySearchField,
  SelectedCompanyField,
} from "@/components/company-fields"
import NextLink from "@/components/next-link"
import {
  OnboardingSidebar,
  WELCOME_ITEMS,
} from "@/components/onboarding-sidebar"
import {
  Button,
  ErrorMessage,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"
import {
  formatPermissionRolesLabel,
  getPermissionRoleName,
} from "@/components/select-permissions-panel"

/**
 * Invitee setup: the flow an invited user lands in after accepting an
 * invitation and creating their account.
 *
 * photo -> (added | register -> details) -> welcome
 *
 * The middle leg branches on what the inviting client specified:
 * - a company was named on the invite   -> "added" (with an escape hatch to
 *                                          register a company of their own)
 * - no company was named                -> "register", where they pick an
 *                                          existing company or create one
 * - an existing company is picked        -> straight to "welcome"; no logo
 *                                          step, whether or not it has a logo
 * - a brand-new company is registered    -> "details" to add its logo
 */

type Step = "photo" | "added" | "register" | "details" | "welcome"

// Two counted steps: your details, then your company. The closing "you're all
// set" screen is a confirmation, not a step, so it carries no counter.
const TOTAL_STEPS = 2

// Minimum breathing room between the company block and the roles label before
// the roles collapse from full names to the "N roles" summary.
const MIN_ROLES_GAP_PX = 32

type CountedStep = Exclude<Step, "welcome">

const STEP_NUMBER: Record<CountedStep, number> = {
  photo: 1,
  added: 2,
  register: 2,
  details: 2,
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name"),
  lastName: z.string().trim().min(1, "Please enter your last name"),
})

type ProfileFormValues = z.infer<typeof profileSchema>

/** Ring that fills clockwise as the flow advances. */
const StepRing = ({ step }: { step: CountedStep }) => {
  const radius = 6
  const circumference = 2 * Math.PI * radius
  const progress = STEP_NUMBER[step] / TOTAL_STEPS

  return (
    <svg viewBox="0 0 16 16" className="size-[15.43px] flex-none -rotate-90">
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="1.92857"
        className="stroke-[#F2F4F7]"
      />
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="1.92857"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        className="stroke-[#306CFE]"
      />
    </svg>
  )
}

const StepLabel = ({ step }: { step: CountedStep }) => (
  <div className="flex items-center gap-x-2">
    <StepRing step={step} />
    <p className="text-[11px] font-normal leading-[15px] text-[#344054]">
      STEP {STEP_NUMBER[step]} / {TOTAL_STEPS}
    </p>
  </div>
)

const StepHeading = ({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) => (
  <div className="mt-2 space-y-2">
    <h1 className="text-[24px] font-semibold leading-[36px] text-[#22376B]">
      {title}
    </h1>
    {subtitle && (
      <p className="text-[16px] font-light leading-[19px] text-[#22376B]">
        {subtitle}
      </p>
    )}
  </div>
)

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <Button type="button" variant="outlined" visual="gray" onClick={onClick}>
    Back
  </Button>
)

const WELCOME_TILES = [
  { label: "Browse Teams", href: "/teams", Icon: Users01 },
  { label: "Browse Marketplace", href: "/projects", Icon: SearchLg },
  { label: "Browse Talent", href: "/talent", Icon: UserPlus01 },
  {
    label: "View Transactions",
    href: "/billing/transactions",
    Icon: CreditCard02,
  },
]

function InviteSetup() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, setUser } = useAuth()
  const { toast } = useToast()

  // Company/inviter/role previously rode along as URL query params
  // (lib/invite-link.ts); now resolved server-side from the same token
  // that got the invitee here, via GET /invitations/preview. The account
  // was already added to the company during accept, so this call is
  // read-only display data, not a second write.
  const inviteToken = searchParams.get("token")
  const { data: preview } = useInvitationPreview(inviteToken ?? undefined)
  // The legacy `role` field is fixed to "viewer" for every invite now.
  // `permissions` (picked in the Select Permissions panel) is the actual
  // grant, so that's what this screen and the dashboard card must show.
  const invitedPermissions = useMemo(
    () => preview?.permissions ?? [],
    [preview?.permissions]
  )
  const invitedRoleNames = useMemo(
    () => invitedPermissions.map(getPermissionRoleName),
    [invitedPermissions]
  )
  // Full names inline ("Negotiator, Hiring Manager") whenever the card has room
  // for them; the "N roles" summary is the fallback for when it doesn't.
  const invitedRoleLabel = formatPermissionRolesLabel(invitedPermissions)
  const invitedRolesInline = invitedRoleNames.join(", ")


  // The confirmation copy addresses the inviter by first name only, title-cased
  // for display whatever casing it was stored in, the same rule the team cards
  // and the invite emails use.
  const inviterFirstName = capitalizeWords(
    preview?.inviterName?.trim().split(/\s+/)[0] ?? "Your team"
  )

  const [step, setStep] = useState<Step>("photo")
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [draftName, setDraftName] = useState("")
  const [draftLogo, setDraftLogo] = useState<string | undefined>()
  const [logoError, setLogoError] = useState<string | undefined>()
  const [detailsError, setDetailsError] = useState<string | undefined>()
  // An email address typed into the company field is a mis-fill, not a
  // company. `createCompany` rejects it, so the step blocks before then.
  const draftNameIsEmail = isEmailLikeCompanyName(draftName)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Debounced search-as-you-type for the "register your own company" step.
  const [registerSearchMatches, setRegisterSearchMatches] = useState<Company[]>([])
  useEffect(() => {
    if (!draftName.trim()) {
      setRegisterSearchMatches([])
      return
    }
    let cancelled = false
    const timeout = setTimeout(() => {
      searchCompanies(draftName).then((matches) => {
        if (!cancelled) setRegisterSearchMatches(matches)
      })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [draftName])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "" },
  })

  const { firstName } = watch()

  // Seed the form and the avatar preview once the session user is available.
  useEffect(() => {
    if (!user) return
    reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    })
    setAvatarUrl((current) => current ?? user.avatarUrl ?? undefined)
  }, [user, reset])

  // Real member count from the company roster, replacing the previous
  // hard-coded `memberCount: 1`. Falls back to 1 (this invitee, at least)
  // if the lookup fails.
  const [companyMemberCount, setCompanyMemberCount] = useState(1)
  useEffect(() => {
    if (!preview?.companyId) return
    let cancelled = false
    getCompanyMembers(preview.companyId)
      .then((members) => {
        if (!cancelled && members.length) setCompanyMemberCount(members.length)
      })
      .catch(() => {
        // Keep the fallback of 1. This is display-only copy, not a gate.
      })
    return () => {
      cancelled = true
    }
  }, [preview?.companyId])

  const invitedCompany: Company | undefined = useMemo(() => {
    if (!preview?.companyName) return undefined
    return {
      id: preview.companyId ?? `invited-${preview.companyName}`,
      // Title-cased here so the heading, the roles card and the closing copy
      // all name this company the same way. The id keeps the raw value, since
      // it is matched against, not shown.
      name: capitalizeWords(preview.companyName),
      memberCount: companyMemberCount,
      logoUrl: preview.companyLogoUrl ?? undefined,
    }
  }, [preview, companyMemberCount])

  // The company named in the closing copy and in the "Invite accepted"
  // notification on /my-team is the one the invitation was for, since accepting
  // the token only ever joins that company. A company the invitee registers for
  // themselves mid-flow (`selectedCompany`) is a separate membership, so it
  // stands in only where the invite names no company at all (the legacy,
  // company-less path) or where there is no invite. While the preview is still
  // loading, or if it failed, nothing is named rather than the wrong thing.
  const isPreviewResolved = !inviteToken || preview !== undefined
  const joinedCompany =
    invitedCompany ??
    (isPreviewResolved && !preview?.companyName ? selectedCompany : undefined)

  // Measured collapse: the roles sit opposite the company block in a
  // space-between row, so "room" is whatever gap is left between the two. Below
  // MIN_ROLES_GAP_PX they'd crowd each other, and the summary + tooltip wins.
  const rolesRowRef = useRef<HTMLDivElement>(null)
  const companyBlockRef = useRef<HTMLDivElement>(null)
  const rolesMeasureRef = useRef<HTMLSpanElement>(null)
  const [areRolesCollapsed, setAreRolesCollapsed] = useState(false)

  useEffect(() => {
    // One role always renders in full. There is nothing to collapse it to.
    if (invitedRoleNames.length < 2) {
      setAreRolesCollapsed(false)
      return
    }

    const row = rolesRowRef.current
    const companyBlock = companyBlockRef.current
    if (!row || !companyBlock) return

    const measure = () => {
      const measurer = rolesMeasureRef.current
      if (!measurer) return
      const style = window.getComputedStyle(row)
      const contentWidth =
        row.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight)
      const gap =
        contentWidth -
        companyBlock.getBoundingClientRect().width -
        measurer.getBoundingClientRect().width
      setAreRolesCollapsed(gap < MIN_ROLES_GAP_PX)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    observer.observe(companyBlock)
    return () => observer.disconnect()
  }, [invitedRoleNames, invitedRolesInline, invitedCompany, step])

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    // Show the local preview immediately; the upload result replaces it.
    const previewUrl = URL.createObjectURL(file)
    setAvatarUrl(previewUrl)

    try {
      const response = await ClientAPI.UploadAvatar(file)
      // The backend returns `{ url: null }` when object storage isn't
      // configured (local/dev), so keep the local preview in that case rather
      // than blocking the step.
      const uploadedUrl = (response?.data as { url?: string | null })?.url
      if (uploadedUrl) {
        URL.revokeObjectURL(previewUrl)
        setAvatarUrl(uploadedUrl)
      }
    } catch (error: any) {
      URL.revokeObjectURL(previewUrl)
      setAvatarUrl(user?.avatarUrl ?? undefined)
      toast({
        title:
          error?.response?.data?.message ||
          "Failed to upload profile photo. Please try again.",
        variant: "destructive",
      })
    }
  }

  const goToCompanyStep = () => setStep(invitedCompany ? "added" : "register")

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (values) => {
    if (!user) return

    setIsSavingProfile(true)
    try {
      await UserAPI.updateProfile(user.id, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      })
      setUser((current) =>
        current
          ? {
              ...current,
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              avatarUrl: avatarUrl ?? current.avatarUrl,
            }
          : current
      )
      goToCompanyStep()
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.message ||
          "Failed to save your details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const continueFromRegister = () => {
    if (!selectedCompany) return
    // Picking an existing company (vs. registering a brand-new one via
    // startNewCompany below) never shows the logo-upload step, even if that
    // company has no logo yet. Only a newly created company goes through
    // "details".
    setStep("welcome")
  }

  const startNewCompany = () => {
    setSelectedCompany(null)
    setDraftLogo(undefined)
    setLogoError(undefined)
    setDetailsError(undefined)
    setStep("details")
  }

  const commitCompanyDetails = async () => {
    const name = draftName.trim()
    if (!name || draftNameIsEmail) return

    // "details" is only reached via startNewCompany, which always clears
    // selectedCompany first. An existing company picked in "register" skips
    // straight to "welcome" and never lands here.
    //
    // A blob: preview is local-only and fails the backend's @IsUrl(), which
    // used to 400 the whole request and lose the company along with the logo.
    // Uploads now resolve to a persisted URL or clear themselves, so this is
    // a guard rather than the normal path.
    const persistedLogoUrl = draftLogo?.startsWith("blob:")
      ? undefined
      : draftLogo
    setDetailsError(undefined)
    try {
      const company = await createCompany({
        name,
        logoUrl: persistedLogoUrl,
      })
      setSelectedCompany(company)
      setStep("welcome")
    } catch (error: any) {
      // Stay on the step so the typed name and chosen logo survive.
      setDetailsError(
        error?.response?.data?.message ||
          (error instanceof Error && error.message === COMPANY_NAME_IS_EMAIL_MESSAGE
            ? COMPANY_NAME_IS_EMAIL_MESSAGE
            : "Couldn't save your company. Please try again.")
      )
    }
  }

  const [isAccepting, setIsAccepting] = useState(false)

  // The invite is actually accepted here, not on landing. The invitee
  // finishes profile + company setup first, and only once they click through
  // to the dashboard does the roster write (and the "Invite accepted"
  // notification, shown on /my-team once it lands) happen.
  const goToDashboard = async () => {
    if (!inviteToken) {
      router.push("/my-network")
      return
    }

    setIsAccepting(true)
    try {
      const response = await InvitationsAPI.acceptInvitation(inviteToken)
      const payload = getAcceptInvitationPayload(response)
      const acceptedUser = payload?.acceptedUser

      if (acceptedUser) {
        setUser((currentUser) => {
          const baseUser = currentUser || user
          if (!baseUser) return currentUser

          const hasCompletedOnboarding =
            acceptedUser.hasCompletedOnboarding ??
            acceptedUser.onboardingDismissed ??
            baseUser.onboardingDismissed

          return {
            ...baseUser,
            ...acceptedUser,
            role: (acceptedUser.role ||
              baseUser.role) as typeof baseUser.role,
            onboardingDismissed: hasCompletedOnboarding,
          }
        })
      }

      // This wizard only runs for a team/company invite, so the useful
      // landing spot is the roster the invitee just joined, not the
      // generic talent/client dashboard, which has no mention of the invite.
      const companyName = joinedCompany?.name
      const query = new URLSearchParams({ inviteAccepted: "1" })
      if (companyName) query.set("company", companyName)
      router.push(`/my-network?${query.toString()}`)
    } catch (error: any) {
      const errorCode = error?.response?.data?.error as string | undefined
      const rawMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to accept invitation"
      toast({
        title: getInvitationErrorMessage(errorCode, rawMessage),
        variant: "destructive",
      })
    } finally {
      setIsAccepting(false)
    }
  }

  const sidebar =
    step === "welcome" ? (
      <OnboardingSidebar
        heading="Welcome to Marketeq!"
        subheading="Unlock your potential and explore exciting opportunities."
        items={WELCOME_ITEMS}
        showSignIn={false}
      />
    ) : (
      <OnboardingSidebar />
    )

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebar}

      <div className="flex-auto overflow-y-auto px-5 py-16 md:px-10">
        <div className="mx-auto w-full max-w-[560px]">
          {step === "photo" && (
            <form onSubmit={handleSubmit(onProfileSubmit)}>
              <StepLabel step={step} />
              <StepHeading
                title="Add a Profile Photo"
                subtitle="Photos make it easier to recognize and collaborate"
              />

              <div className="mt-10 flex items-center gap-x-8">
                <div className="flex size-[144px] flex-none items-center justify-center overflow-hidden rounded-full bg-gray-100">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <User02
                      className="size-[76px] text-gray-300"
                      strokeWidth={1.5}
                    />
                  )}
                </div>

                <Button
                  type="button"
                  variant="light"
                  onClick={() => avatarInputRef.current?.click()}
                  className="rounded-2xl px-4 py-[10px] text-[14px] font-semibold leading-5 text-[#306CFE]"
                >
                  <Upload01 className="size-4" />
                  Upload Photo
                </Button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-y-1.5">
                  <Label size="sm" htmlFor="firstName">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    className="font-normal text-[16px] leading-6 tracking-normal text-gray-500 placeholder:text-gray-500"
                    {...register("firstName")}
                    isInvalid={hookFormHasError({ errors, name: "firstName" })}
                  />
                  {errors.firstName && (
                    <ErrorMessage size="sm">
                      {errors.firstName.message}
                    </ErrorMessage>
                  )}
                </div>

                <div className="flex flex-col gap-y-1.5">
                  <Label size="sm" htmlFor="lastName">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    className="font-normal text-[16px] leading-6 tracking-normal text-gray-500 placeholder:text-gray-500"
                    {...register("lastName")}
                    isInvalid={hookFormHasError({ errors, name: "lastName" })}
                  />
                  {errors.lastName && (
                    <ErrorMessage size="sm">
                      {errors.lastName.message}
                    </ErrorMessage>
                  )}
                </div>
              </div>

              <div className="mt-24 flex items-center justify-between">
                <BackButton onClick={() => router.back()} />
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile && <Spinner className="size-4" />}
                  Done
                </Button>
              </div>
            </form>
          )}

          {step === "added" && invitedCompany && (
            <>
              <h1 className="text-2xl leading-9 font-semibold text-dark-blue-400">
                You&apos;ve been added to {invitedCompany.name}
              </h1>
              <p className="mt-2 text-base leading-[19.36px] font-light text-dark-blue-400">
                {inviterFirstName} added you to this company with the following
                roles...
              </p>

              <div
                ref={rolesRowRef}
                className="relative mt-10 flex items-center justify-between gap-x-5 rounded-lg border border-gray-200 py-3 pl-3 pr-6"
              >
                <div
                  ref={companyBlockRef}
                  className="flex min-w-0 items-center gap-x-3"
                >
                  <div className="flex size-11 flex-none items-center justify-center rounded-lg border border-gray-200 text-primary-500">
                    {invitedCompany.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={invitedCompany.logoUrl}
                        alt=""
                        className="size-full rounded-lg object-contain"
                      />
                    ) : (
                      <Building02 className="size-5" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-y-0.5">
                    <p className="truncate text-sm font-medium leading-[17px] text-dark-blue-400">
                      {invitedCompany.name}
                    </p>
                    <p className="text-xs font-normal leading-[15px] text-dark-blue-400">
                      {invitedCompany.memberCount}{" "}
                      {invitedCompany.memberCount === 1 ? "Member" : "Members"}
                    </p>
                  </div>
                </div>

                {/* Off-layout copy of the full inline label, kept at the same
                    type styles purely so the effect above can measure the width
                    it *would* take before deciding whether it fits. */}
                <span
                  ref={rolesMeasureRef}
                  aria-hidden
                  className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap text-sm font-medium leading-[21px]"
                >
                  {invitedRolesInline}
                </span>

                {areRolesCollapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        type="button"
                        className="flex-none cursor-default whitespace-nowrap text-sm font-medium leading-[21px] text-dark-blue-400"
                      >
                        {invitedRoleLabel}
                      </TooltipTrigger>
                      <TooltipContent
                        visual="white"
                        size="md"
                        side="bottom"
                        align="end"
                        className="flex flex-col gap-y-1 font-semibold shadow-[0px_4px_6px_-2px_rgba(16,24,40,0.03),0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
                      >
                        {invitedRoleNames.map((roleName) => (
                          <span key={roleName}>{roleName}</span>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className="flex-none whitespace-nowrap text-sm font-medium leading-[21px] text-dark-blue-400">
                    {invitedRolesInline}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-col items-center justify-center rounded-[8px] border border-[#EAECF0] bg-white px-3 py-[24px] gap-y-[20px] text-center shadow-[0px_1px_5px_rgba(16,24,40,0.02)]">
                <div className="flex flex-col items-center gap-y-2">
                  <Building03 className="size-[30px] text-[#22376B]" />
                  <div className="flex flex-col items-center gap-y-[3px]">
                    <p className="font-sans text-[16px] font-semibold leading-[150%] tracking-[-0.011em] text-[#22376B]">
                      Got your own company?
                    </p>
                    <p className="font-sans text-[12px] font-light leading-[15px] text-[#22376B]">
                      Add it to your account and start posting jobs and projects.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("register")}
                  className="inline-flex items-center gap-x-2 text-[14px] font-semibold leading-[20px] text-[#667085] hover:text-[#22376B] transition-colors focus-visible:outline-none"
                >
                  <Plus className="size-[15px] text-[#667085]" />
                  Add Your Company
                </button>
              </div>

              <div className="mt-24 flex justify-end">
                <Button onClick={() => setStep("welcome")}>Continue</Button>
              </div>
            </>
          )}

          {step === "register" && (
            <>
              <StepLabel step={step} />
              <StepHeading
                title="Register your company"
                subtitle="Start typing your company name to search or create a new company"
              />

              <div className="mt-8">
                {selectedCompany ? (
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">
                      Company Name
                    </span>
                    <SelectedCompanyField
                      company={selectedCompany}
                      onRemove={() => setSelectedCompany(null)}
                    />
                  </div>
                ) : (
                  <CompanySearchField
                    id="register-company-name"
                    autoFocus
                    value={draftName}
                    onChange={setDraftName}
                    matches={registerSearchMatches}
                    onSelect={(company) => {
                      setSelectedCompany(company)
                      setDraftName("")
                    }}
                    onCreate={startNewCompany}
                  />
                )}
              </div>

              <div className="mt-10 flex items-center justify-between">
                <BackButton
                  onClick={() => setStep(invitedCompany ? "added" : "photo")}
                />
                <div className="flex items-center gap-x-3">
                  {invitedCompany && (
                    <Button
                      variant="ghost"
                      visual="gray"
                      onClick={() => setStep("welcome")}
                    >
                      Skip
                    </Button>
                  )}
                  <Button
                    disabled={!selectedCompany}
                    onClick={continueFromRegister}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === "details" && (
            <>
              <StepLabel step={step} />
              <StepHeading
                title="Add your company details"
                subtitle="Please add your logo icon, preferably in svg format"
              />

              <div className="mt-[50px] space-y-[24px]">
                <div className="space-y-[6px]">
                  <label className="block text-[14px] font-medium leading-[20px] text-[#344054]">
                    Company Logo
                  </label>
                  <CompanyLogoField
                    name={draftName}
                    logoUrl={draftLogo}
                    onChange={setDraftLogo}
                    onFileSelected={(file) => {
                      // Swaps the blob preview for the persisted URL from
                      // POST /v1/companies/logo, same as
                      // invite-company-steps.tsx.
                      setLogoError(undefined)
                      uploadCompanyLogo(file)
                        .then((uploadedUrl) => setDraftLogo(uploadedUrl))
                        .catch((error: any) => {
                          // Drop the preview with the error: a blob: URL that
                          // is stripped before submit looks like a saved logo
                          // and isn't one.
                          setDraftLogo(undefined)
                          setLogoError(
                            error?.response?.data?.message ||
                              "Couldn't upload that logo. Please try again."
                          )
                        })
                    }}
                  />
                  {logoError && <ErrorMessage size="sm">{logoError}</ErrorMessage>}
                </div>

                <div className="space-y-[6px]">
                  <label
                    htmlFor="company-details-name"
                    className="block text-[14px] font-medium leading-[20px] text-[#22376B] capitalize"
                  >
                    Company Name
                  </label>
                  <input
                    id="company-details-name"
                    placeholder="Enter company name"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="flex h-[44px] w-full rounded-[5px] border border-[#D0D5DD] bg-white px-[14px] py-[10px] text-[16px] leading-[24px] text-[#101828] shadow-xs placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
                  />
                  {draftNameIsEmail && (
                    <ErrorMessage size="sm">
                      {COMPANY_NAME_IS_EMAIL_MESSAGE}
                    </ErrorMessage>
                  )}
                </div>
              </div>

              {detailsError && (
                <ErrorMessage size="sm" className="mt-4">
                  {detailsError}
                </ErrorMessage>
              )}

              <div className="mt-10 flex items-center justify-between">
                <BackButton onClick={() => setStep("register")} />
                <div className="flex items-center gap-x-3">
                  {!draftLogo && (
                    <Button
                      variant="ghost"
                      visual="gray"
                      onClick={commitCompanyDetails}
                      disabled={!draftName.trim() || draftNameIsEmail}
                    >
                      Skip
                    </Button>
                  )}
                  <Button
                    onClick={commitCompanyDetails}
                    disabled={!draftName.trim() || draftNameIsEmail}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === "welcome" && (
            <>
              <StepHeading
                title={`You're all set${firstName ? ` ${firstName}` : ""}!`}
                subtitle={
                  joinedCompany
                    ? `Here's what you can do as a member of ${joinedCompany.name}.`
                    : "Here's what you can do next on Marketeq."
                }
              />

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {WELCOME_TILES.map(({ label, href, Icon }) => (
                  <NextLink
                    key={label}
                    href={href}
                    className={cn(
                      "flex items-center gap-x-3 rounded-lg border border-gray-200 bg-white p-4",
                      "transition duration-300 hover:border-gray-300 hover:ring-1 hover:ring-gray-300",
                      "focus-visible:outline-none"
                    )}
                  >
                    <div className="inline-flex size-10 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200 text-primary-500">
                      <Icon className="size-5" />
                    </div>
                    <span className="flex-auto text-sm font-medium leading-5 text-gray-900">
                      {label}
                    </span>
                    <ChevronRight className="size-5 flex-none text-gray-400" />
                  </NextLink>
                ))}
              </div>

              <div className="mt-10 flex justify-end">
                <Button onClick={goToDashboard} disabled={isAccepting}>
                  {isAccepting ? (
                    <Spinner
                      size={20}
                      className="stroke-white"
                      trackClassName="stroke-primary-500"
                      strokeWidth={2}
                    />
                  ) : (
                    "Go to Dashboard"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const FullScreenSpinner = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Spinner size={32} strokeWidth={3} />
  </div>
)

/**
 * Sign-in gate for the setup flow.
 *
 * Deliberately not `AuthenticatedRoute`, for two reasons:
 * - that HOC bounces a user whose dashboard route still resolves to onboarding
 *   back to `/onboarding`, which is every invitee this page exists for;
 * - it signs a logged-out user in through `AuthModal`, which is mounted in
 *   `top-most-header` under the `(group)` layout. This route is outside that
 *   group, so the modal would never render and the page would hang on its
 *   spinner.
 *
 * A logged-out visitor is therefore sent to `/sign-in` with a `redirect` back
 * to this URL, the same handoff `/invite/accept` uses, so the invite context
 * on the query string survives the round trip.
 */
function InviteSetupGate() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isLoading, user } = useAuth()

  useEffect(() => {
    if (isLoading || user) return

    const query = searchParams.toString()
    const returnTo = `${pathname || "/invite/setup"}${query ? `?${query}` : ""}`
    router.replace(`/sign-in?redirect=${encodeURIComponent(returnTo)}`)
  }, [isLoading, user, pathname, searchParams, router])

  if (isLoading || !user) return <FullScreenSpinner />

  return <InviteSetup />
}

export default function InviteSetupPage() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <InviteSetupGate />
    </Suspense>
  )
}
