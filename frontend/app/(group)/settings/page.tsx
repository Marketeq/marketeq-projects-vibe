"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { UserAPI, UserProfilePayload } from "@/service/http/user"
import { cn, getIsNotEmpty } from "@/utils/functions"
import languagesMock from "@/public/mock/languages.json"
import ActiveSessionsModal from "@/components/active-sessions-modal"
import NotificationPreferences from "@/components/notification-preferences"
import SecuritySettingsStepper from "@/components/security-settings"
import SettingsSidebar, {
  buildSettingsTabItems,
} from "@/components/settings-sidebar"
import {
  DisableTwoFactorModal,
  TwoFactorSetupModal,
} from "@/components/two-factor-setup"
import { PhoneNumberInput } from "@/components/phone-number-input"
import dynamic from "next/dynamic"
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Edit01,
  Eye,
  EyeOff,
  Fingerprint01,
  Lock01,
  HelpCircle,
  Image as ImageIcon,
  Plus,
  Settings02,
  Share06,
  Trash03,
  X,
  X2,
} from "@blend-metrics/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui"
import { useInviteWindowStore } from "@/components/invite-window"
import type { BillingTabValue } from "@/components/billing-section-header"
import {
  BillingPaymentMethodsContent,
  BillingPaymentMethodsContentHandle,
} from "@/app/(group)/payments/page"

const BillingOverviewContent = dynamic(
  () => import("@/app/(group)/billing/page").then((m) => m.BillingOverviewContent),
  { ssr: false }
)
const BillingTransactionsContent = dynamic(
  () => import("@/components/billing-transactions-content").then((m) => m.BillingTransactionsContent),
  { ssr: false }
)
const BillingInvoicesContent = dynamic(
  () => import("@/app/(group)/invoices/page").then((m) => m.BillingInvoicesContent),
  { ssr: false }
)
const BillingMyPlansContent = dynamic(
  () => import("@/app/(group)/billing/page").then((m) => m.BillingMyPlansContent),
  { ssr: false }
)
import {
  Alert,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
  useToast,
} from "@/components/ui"

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabParam || "personal-info")

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam)
  }, [tabParam])

  const toggleInviteWindow = useInviteWindowStore((s) => s.toggle)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    jobTitle: "",
    team: [] as string[],
    languages: [] as string[],
  })

  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false)

  const avatarSrc = isAvatarRemoved
    ? ""
    : avatarPreview ?? user?.avatarUrl ?? ""

  const onAvatarDropAccepted = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setIsAvatarRemoved(false)
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const onAvatarRemove = useCallback(() => {
    setAvatarPreview(null)
    setIsAvatarRemoved(true)
  }, [])

  const {
    getInputProps: getAvatarInputProps,
    open: openAvatarFilePicker,
  } = useDropzone({
    noClick: true,
    noDrag: true,
    multiple: false,
    maxFiles: 1,
    accept: { "image/*": [] },
    onDropAccepted: onAvatarDropAccepted,
  })

  const [showLogoModal, setShowLogoModal] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isLogoRemoved, setIsLogoRemoved] = useState(false)

  const logoSrc = isLogoRemoved ? "" : logoPreview ?? ""

  const onLogoDropAccepted = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setIsLogoRemoved(false)
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const onLogoRemove = useCallback(() => {
    setLogoPreview(null)
    setIsLogoRemoved(true)
  }, [])

  const {
    getInputProps: getLogoInputProps,
    open: openLogoFilePicker,
  } = useDropzone({
    noClick: true,
    noDrag: true,
    multiple: false,
    maxFiles: 1,
    accept: { "image/*": [] },
    onDropAccepted: onLogoDropAccepted,
  })

  const [isSavedAlertMounted, setIsSavedAlertMounted] = useState(false)
  const [isSavedAlertVisible, setIsSavedAlertVisible] = useState(false)
  const [savedAlertMessage, setSavedAlertMessage] = useState("")

  useEffect(() => {
    if (!isSavedAlertMounted) return

    const fadeIn = requestAnimationFrame(() => setIsSavedAlertVisible(true))
    const fadeOut = setTimeout(() => setIsSavedAlertVisible(false), 3000)
    const unmount = setTimeout(() => setIsSavedAlertMounted(false), 3300)

    return () => {
      cancelAnimationFrame(fadeIn)
      clearTimeout(fadeOut)
      clearTimeout(unmount)
    }
  }, [isSavedAlertMounted])

  const [isUpdatePasswordOpen, setIsUpdatePasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  })
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  })

  const passwordRequirements = [
    { label: "At least 8 characters", met: passwordForm.next.length >= 8 },
    { label: "One lowercase letter", met: /[a-z]/.test(passwordForm.next) },
    { label: "One uppercase letter", met: /[A-Z]/.test(passwordForm.next) },
    { label: "One number", met: /[0-9]/.test(passwordForm.next) },
    { label: "One symbol", met: /[^A-Za-z0-9]/.test(passwordForm.next) },
  ]

  const meetsPasswordRequirements = passwordRequirements.every((req) => req.met)

  const canSavePassword =
    meetsPasswordRequirements &&
    passwordForm.current !== "" &&
    passwordForm.confirm === passwordForm.next

  const isPasswordDirty =
    passwordForm.current !== "" ||
    passwordForm.next !== "" ||
    passwordForm.confirm !== ""

  const [isDiscardOpen, setIsDiscardOpen] = useState(false)
  const [isFingerprintOpen, setIsFingerprintOpen] = useState(false)
  const [acceptsFingerprintTerms, setAcceptsFingerprintTerms] = useState(false)

  const [isFingerprintEnabled, setIsFingerprintEnabled] = useState(false)

  const closeFingerprint = () => {
    setAcceptsFingerprintTerms(false)
    setIsFingerprintOpen(false)
  }

  const handleEnableFingerprint = () => {
    setIsFingerprintEnabled(true)
    setSavedAlertMessage("Successfully enabled fingerprint login")
    setIsSavedAlertMounted(true)
    closeFingerprint()
  }

  const closeUpdatePassword = () => {
    setPasswordForm({ current: "", next: "", confirm: "" })
    setVisiblePasswords({ current: false, next: false, confirm: false })
    setIsUpdatePasswordOpen(false)
  }

  const handlePasswordSave = () => {
    setSavedAlertMessage("Your password has been updated")
    setIsSavedAlertMounted(true)
    closeUpdatePassword()
  }

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [show2FADisable, setShow2FADisable] = useState(false)

  const languageOptions = useMemo(
    () => languagesMock.map((item) => item.label),
    []
  )

  const [companyForm, setCompanyForm] = useState({
    name: "",
    website: "",
    industry: "",
    businessType: "",
    companySize: "",
    annualRevenue: "",
    phone: "",
    timeZone: "",
  })

  const handleCompanyChange = (field: string, value: string) => {
    setCompanyForm((prev) => ({ ...prev, [field]: value }))
  }

  const industryOptions = [
    "Advertising & Marketing",
    "Construction",
    "Education",
    "Finance",
    "Healthcare",
    "Hospitality",
    "Manufacturing",
    "Real Estate",
    "Retail",
    "Technology",
  ]

  const businessTypeOptions = [
    "Sole Proprietorship",
    "Partnership",
    "LLC",
    "Corporation",
    "Non-Profit",
  ]

  const companySizeOptions = [
    "1 - 10",
    "11 - 50",
    "51 - 200",
    "201 - 500",
    "501 - 1000",
    "1000+",
  ]

  const annualRevenueOptions = [
    "Under $1M",
    "$1M - $10M",
    "$10M - $50M",
    "$50M - $100M",
    "$100M+",
  ]

  const timeZoneOptions = [
    "(GMT-08:00) America/Los_Angeles",
    "(GMT-07:00) America/Denver",
    "(GMT-06:00) America/Chicago",
    "(GMT-05:00) America/New_York",
    "(GMT+00:00) Europe/London",
    "(GMT+01:00) Europe/Berlin",
  ]

  const teamOptions = [
    "Engineering",
    "Design",
    "Marketing",
    "Sales",
    "Operations",
    "Product",
    "Finance",
    "HR",
    "Legal",
    "Other",
  ]

  useEffect(() => {
    if (user) {
      const rawTeam = (user as any).team ?? ""
      const rawLang = (user as any).language ?? ""
      setProfileForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        username: user.username ?? "",
        phone: (user as any).phone ?? "",
        jobTitle: (user as any).recentJobTitle ?? "",
        team: rawTeam ? rawTeam.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        languages: rawLang ? rawLang.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      })
    }
  }, [user])

  const isAvatarDirty = avatarPreview !== null || isAvatarRemoved

  const isProfileDirty = useMemo(() => {
    if (isAvatarDirty) return true
    if (!user) return false

    const rawTeam = (user as any).team ?? ""
    const rawLang = (user as any).language ?? ""
    const savedTeam = rawTeam
      ? rawTeam.split(",").map((s: string) => s.trim()).filter(Boolean)
      : []
    const savedLanguages = rawLang
      ? rawLang.split(",").map((s: string) => s.trim()).filter(Boolean)
      : []

    return (
      profileForm.firstName !== (user.firstName ?? "") ||
      profileForm.lastName !== (user.lastName ?? "") ||
      profileForm.username !== (user.username ?? "") ||
      profileForm.phone !== ((user as any).phone ?? "") ||
      profileForm.jobTitle !== ((user as any).recentJobTitle ?? "") ||
      profileForm.team.join(",") !== savedTeam.join(",") ||
      profileForm.languages.join(",") !== savedLanguages.join(",")
    )
  }, [profileForm, user, isAvatarDirty])

  const [hasJustSaved, setHasJustSaved] = useState(false)

  useEffect(() => {
    setHasJustSaved(false)
  }, [profileForm, avatarPreview, isAvatarRemoved])

  const areProfileActionsVisible = isProfileDirty && !hasJustSaved

  const isLogoDirty = logoPreview !== null || isLogoRemoved

  const isCompanyDirty = useMemo(() => {
    if (isLogoDirty) return true
    return Object.values(companyForm).some((value) => value !== "")
  }, [companyForm, isLogoDirty])

  const [hasJustSavedCompany, setHasJustSavedCompany] = useState(false)

  useEffect(() => {
    setHasJustSavedCompany(false)
  }, [companyForm, logoPreview, isLogoRemoved])

  const areCompanyActionsVisible = isCompanyDirty && !hasJustSavedCompany

  const handleCompanySave = () => {
    setSavedAlertMessage("Your company info has been saved")
    setIsSavedAlertMounted(true)
    setHasJustSavedCompany(true)
  }

  const handleCompanyCancel = () => {
    setCompanyForm({
      name: "",
      website: "",
      industry: "",
      businessType: "",
      companySize: "",
      annualRevenue: "",
      phone: "",
      timeZone: "",
    })
    setLogoPreview(null)
    setIsLogoRemoved(false)
  }

  const paymentMethodsRef = useRef<BillingPaymentMethodsContentHandle | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
    window.scrollTo(0, 0)
  }, [activeTab])

  const accountRole = useMemo(() => resolveDashboardRole(user), [user])
  const settingsTabItems = useMemo(() => buildSettingsTabItems(accountRole), [accountRole])

  const handleBillingTabChange = (value: BillingTabValue) => {
    const map: Record<BillingTabValue, string> = {
      "overview": "billing-overview",
      "transactions": "billing-transactions",
      "invoices": "billing-invoices",
      "payment-methods": "billing-payment-methods",
      "my-plans": "billing-plans",
    }
    setActiveTab(map[value])
  }

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfileSave = async () => {
    setSavedAlertMessage("Your personal info has been saved")
    setIsSavedAlertMounted(true)
    setHasJustSaved(true)

    if (!user?.id) return

    setIsSaving(true)
    try {
      const payload: UserProfilePayload = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        username: profileForm.username,
      }
      const response = await UserAPI.updateProfile(user.id, payload)
      const isSuccess =
        typeof response?.status === "number" &&
        response.status >= 200 &&
        response.status < 300

      if (isSuccess) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                firstName: profileForm.firstName,
                lastName: profileForm.lastName,
                username: profileForm.username,
              }
            : prev
        )
        setIsEditing(false)
        toast({ title: "Profile updated successfully" })
      } else {
        throw new Error("Failed to update profile")
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong"
      toast({ title: errorMessage, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleProfileCancel = () => {
    const rawTeam = (user as any)?.team ?? ""
    const rawLang = (user as any)?.language ?? ""
    setProfileForm({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
      phone: (user as any)?.phone ?? "",
      jobTitle: (user as any)?.recentJobTitle ?? "",
      team: rawTeam ? rawTeam.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      languages: rawLang ? rawLang.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    })
    setAvatarPreview(null)
    setIsAvatarRemoved(false)
    setIsEditing(false)
  }

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 h-screen overflow-hidden">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div
          ref={contentRef}
          className={cn(
          "flex-auto p-3.5 md:p-6 min-[1024px]:p-16 min-[1024px]:pl-[288px]",
          activeTab === "billing-payment-methods"
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto"
        )}>
          <div className={cn(
            "flex-auto min-w-0",
            activeTab === "billing-payment-methods" && "flex flex-col min-h-0 overflow-hidden"
          )}>
            <div className="min-[1024px]:hidden mb-6">
              <h1 className="text-2xl font-semibold text-dark-blue-400">
                Settings
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your account settings and preferences
              </p>
              <div className="flex gap-1 mt-4 border-b border-gray-200 overflow-x-auto">
                {settingsTabItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 pb-3 text-sm border-b-2 transition-colors whitespace-nowrap",
                        activeTab === item.id
                          ? "border-primary-500 text-primary-500"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "personal-info" && (
                <>
                  <div className="flex w-[658px] flex-col items-start gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Personal Info
                    </h1>
                    <p className="w-full text-sm text-gray-500">
                      Manage your personal details and account information.
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-x-6">
                    <div className="relative">
                      <Avatar className="size-24 border-4 border-white">
                        <AvatarImage
                          src={avatarSrc}
                          alt={user?.firstName ?? "User"}
                        />
                        <AvatarFallback className="text-4xl font-medium tracking-tight text-gray-300">
                          {(user?.firstName?.[0] ?? "").toUpperCase()}
                          {(user?.lastName?.[0] ?? "").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => setShowAvatarModal(true)}
                        className="absolute -bottom-1 -right-1 size-[30px] rounded-full bg-white border border-gray-300 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Edit01 className="size-4 text-gray-400" />
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center gap-x-3">
                        <h2 className="text-2xl leading-[38px] font-medium text-gray-600 capitalize">
                          {user?.firstName} {user?.lastName}
                        </h2>
                        <Badge visual="primary" size="sm">
                          {accountRole === "ADMIN"
                            ? "Admin"
                            : accountRole?.charAt(0).toUpperCase() +
                              (accountRole?.slice(1).toLowerCase() ?? "")}
                        </Badge>
                      </div>
                      <p className="text-sm leading-5 text-gray-500">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <Dialog
                    open={showAvatarModal}
                    onOpenChange={setShowAvatarModal}
                  >
                    <DialogContent
                      className="flex max-w-[467px] flex-col items-center gap-8 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <input hidden {...getAvatarInputProps()} />

                      <div className="flex w-full flex-col items-center justify-center gap-5">
                        <DialogTitle className="w-full text-center text-lg leading-7 font-semibold text-gray-900">
                          Change Profile Image
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                          Manage your profile image.
                        </DialogDescription>

                        <Avatar className="size-[160px] border-4 border-white">
                          <AvatarImage
                            src={avatarSrc}
                            alt={user?.firstName ?? "User"}
                          />
                          <AvatarFallback className="bg-gray-100 hover:bg-gray-100 text-[60px] leading-[44px] font-medium tracking-[-0.02em] uppercase text-gray-300">
                            {(user?.firstName?.[0] ?? "").toUpperCase()}
                            {(user?.lastName?.[0] ?? "").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <IconButton
                        size="sm"
                        visual="gray"
                        variant="ghost"
                        className="absolute right-2.5 top-2.5"
                        onClick={() => setShowAvatarModal(false)}
                      >
                        <X className="size-4 text-gray-500" />
                      </IconButton>

                      <div className="flex w-full items-start justify-center gap-x-3">
                        <Button
                          size="sm"
                          visual="error"
                          variant="ghost"
                          className="bg-error-100"
                          onClick={onAvatarRemove}
                          leftIcon={<Trash03 className="size-[15px]" />}
                        >
                          Remove Photo
                        </Button>
                        <Button
                          size="sm"
                          visual="gray"
                          variant="outlined"
                          className="bg-white"
                          onClick={openAvatarFilePicker}
                          leftIcon={
                            <ImageIcon className="size-[15px] text-gray-500" />
                          }
                        >
                          Change Profile Image
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="mt-6 max-w-[664px] grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label size="sm">First Name</Label>
                      <Input
                        value={profileForm.firstName}
                        onChange={(e) =>
                          handleProfileChange("firstName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Last Name</Label>
                      <Input
                        value={profileForm.lastName}
                        onChange={(e) =>
                          handleProfileChange("lastName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Email</Label>
                      <Input
                        value={user?.email ?? ""}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Phone Number</Label>
                      <PhoneNumberInput
                        defaultCountry="us"
                        value={profileForm.phone}
                        onChange={(v) => handleProfileChange("phone", v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">What team do you work on?</Label>
                      <Listbox
                        value={profileForm.team}
                        onChange={(values) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            team: values as string[],
                          }))
                        }
                        multiple
                      >
                        <ListboxButton
                          placeholder="Select Team"
                          displayValue={(val) =>
                            Array.isArray(val) && val.length
                              ? val.join(", ")
                              : null
                          }
                        />
                        <ListboxOptions>
                          {teamOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Job Title</Label>
                      <Input
                        value={profileForm.jobTitle}
                        onChange={(e) =>
                          handleProfileChange("jobTitle", e.target.value)
                        }
                        placeholder="e.g. President"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Language</Label>
                      <div className="flex flex-col gap-y-1.5">
                        <Listbox
                          value={profileForm.languages}
                          onChange={(values) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              languages: values as string[],
                            }))
                          }
                          multiple
                        >
                          <ListboxButton
                            placeholder="Select Language"
                            displayValue={(val) =>
                              Array.isArray(val) && val.length
                                ? val.join(", ")
                                : null
                            }
                          />
                          <ListboxOptions>
                            {languageOptions.map((item) => (
                              <ListboxOption key={item} value={item}>
                                {item}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>

                        {getIsNotEmpty(profileForm.languages) && (
                          <div className="flex flex-wrap gap-2">
                            {profileForm.languages.map((lang) => (
                              <Badge
                                key={lang}
                                visual="primary"
                                size="sm"
                                variant="rounded"
                              >
                                {lang}
                                <button
                                  className="focus-visible:outline-none"
                                  onClick={() =>
                                    setProfileForm((prev) => ({
                                      ...prev,
                                      languages: prev.languages.filter(
                                        (l) => l !== lang
                                      ),
                                    }))
                                  }
                                  type="button"
                                >
                                  <X2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-6 max-w-[664px] h-9">
                    {isSavedAlertMounted && (
                      <Alert
                        variant="success"
                        className={cn(
                          "absolute left-0 top-1/2 z-10 -translate-y-1/2 w-[296px] items-center rounded-[5px] pointer-events-none transition-opacity duration-300",
                          isSavedAlertVisible ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <AlertIcon>
                          <CheckCircle className="size-5 text-success-500" />
                        </AlertIcon>
                        <AlertTitle className="text-success-600">
                          {savedAlertMessage}
                        </AlertTitle>
                      </Alert>
                    )}

                    {areProfileActionsVisible && (
                      <div className="flex justify-end gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={handleProfileCancel}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleProfileSave}
                          disabled={isSaving}
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === "company-info" && (
                <>
                  <div className="flex flex-col gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Company Info
                    </h1>
                    <p className="text-sm text-gray-500">
                      Manage your company details and business information.
                    </p>
                  </div>

                  <div className="mt-6 space-y-1.5">
                    <Label size="sm">Logo</Label>
                    <div className="relative w-[228px] h-[104px] overflow-hidden rounded-[5px] border-4 border-white bg-gray-100">
                      {logoSrc && (
                        <img
                          src={logoSrc}
                          alt="Company logo"
                          className="size-full object-cover"
                        />
                      )}
                      <IconButton
                        size="sm"
                        visual="gray"
                        variant="ghost"
                        className="absolute bottom-0 right-0 size-[29px] bg-white rounded-none rounded-tl-[12px] rounded-br-[8px]"
                        onClick={() => setShowLogoModal(true)}
                      >
                        <Edit01 className="size-4 text-gray-400" />
                      </IconButton>
                    </div>
                  </div>

                  <Dialog open={showLogoModal} onOpenChange={setShowLogoModal}>
                    <DialogContent
                      className="flex max-w-[467px] flex-col items-center gap-8 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <input hidden {...getLogoInputProps()} />

                      <div className="flex w-full flex-col items-center justify-center gap-5">
                        <DialogTitle className="w-full text-center text-lg leading-7 font-semibold text-gray-900">
                          Change Logo
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                          Manage your company logo.
                        </DialogDescription>

                        <div className="w-[228px] h-[104px] overflow-hidden rounded-[5px] border-4 border-white bg-gray-100">
                          {logoSrc && (
                            <img
                              src={logoSrc}
                              alt="Company logo"
                              className="size-full object-cover"
                            />
                          )}
                        </div>
                      </div>

                      <IconButton
                        size="sm"
                        visual="gray"
                        variant="ghost"
                        className="absolute right-2.5 top-2.5"
                        onClick={() => setShowLogoModal(false)}
                      >
                        <X className="size-4 text-gray-500" />
                      </IconButton>

                      <div className="flex w-full items-start justify-center gap-x-3">
                        <Button
                          size="sm"
                          visual="error"
                          variant="ghost"
                          className="bg-error-100"
                          onClick={onLogoRemove}
                          leftIcon={<Trash03 className="size-[15px]" />}
                        >
                          Remove Logo
                        </Button>
                        <Button
                          size="sm"
                          visual="gray"
                          variant="outlined"
                          className="bg-white"
                          onClick={openLogoFilePicker}
                          leftIcon={
                            <ImageIcon className="size-[15px] text-gray-500" />
                          }
                        >
                          Change Logo
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="mt-6 max-w-[664px] grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label size="sm">Company Name</Label>
                      <Input
                        placeholder="e.g. Acme Analytics"
                        value={companyForm.name}
                        onChange={(e) =>
                          handleCompanyChange("name", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Company Website</Label>
                      <InputGroup>
                        <InputLeftAddon>https://</InputLeftAddon>
                        <Input
                          placeholder="www.yourwebsite.com"
                          value={companyForm.website}
                          onChange={(e) =>
                            handleCompanyChange("website", e.target.value)
                          }
                        />
                      </InputGroup>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Industry</Label>
                      <Listbox
                        value={companyForm.industry}
                        onChange={(value) =>
                          handleCompanyChange("industry", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="Select Industry"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {industryOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Business Type</Label>
                      <Listbox
                        value={companyForm.businessType}
                        onChange={(value) =>
                          handleCompanyChange("businessType", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="Select Type"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {businessTypeOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Company Size</Label>
                      <Listbox
                        value={companyForm.companySize}
                        onChange={(value) =>
                          handleCompanyChange("companySize", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="1 - 10"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {companySizeOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Annual Revenue</Label>
                      <Listbox
                        value={companyForm.annualRevenue}
                        onChange={(value) =>
                          handleCompanyChange("annualRevenue", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="Select Revenue"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {annualRevenueOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Company Phone Number</Label>
                      <PhoneNumberInput
                        defaultCountry="us"
                        value={companyForm.phone}
                        onChange={(v) => handleCompanyChange("phone", v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Time Zone</Label>
                      <Listbox
                        value={companyForm.timeZone}
                        onChange={(value) =>
                          handleCompanyChange("timeZone", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="(GMT-05:00) America/New_York"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {timeZoneOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                  </div>

                  <div className="relative mt-6 max-w-[664px] h-9">
                    {isSavedAlertMounted && (
                      <Alert
                        variant="success"
                        className={cn(
                          "absolute left-0 top-1/2 z-10 -translate-y-1/2 w-[296px] items-center rounded-[5px] pointer-events-none transition-opacity duration-300",
                          isSavedAlertVisible ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <AlertIcon>
                          <CheckCircle className="size-5 text-success-500" />
                        </AlertIcon>
                        <AlertTitle className="text-success-600">
                          {savedAlertMessage}
                        </AlertTitle>
                      </Alert>
                    )}

                    {areCompanyActionsVisible && (
                      <div className="flex justify-end gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={handleCompanyCancel}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleCompanySave}>
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === "privacy" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  Privacy
                </h1>
              )}

              {activeTab === "notifications" && (
                <>
                  <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400 mb-6">
                    Notifications
                  </h1>
                  <NotificationPreferences />
                </>
              )}

              {activeTab === "tax-info" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  Tax Info
                </h1>
              )}

              {activeTab === "login-password" && !isUpdatePasswordOpen && (
                <>
                  <div className="flex w-[658px] flex-col items-start gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Update Password
                    </h1>
                    <p className="w-full text-sm text-gray-500">
                      Manage your email, password, and login preferences.
                    </p>
                  </div>

                  <div className="relative mt-6 flex w-[658px] flex-col items-start gap-2.5">
                    {isSavedAlertMounted && (
                      <Alert
                        variant="success"
                        className={cn(
                          "absolute left-0 top-full z-10 mt-6 w-[296px] items-center rounded-[5px] pointer-events-none transition-opacity duration-300",
                          isSavedAlertVisible ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <AlertIcon>
                          <CheckCircle className="size-5 text-success-500" />
                        </AlertIcon>
                        <AlertTitle className="text-success-600">
                          {savedAlertMessage}
                        </AlertTitle>
                      </Alert>
                    )}

                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      onClick={() => setIsUpdatePasswordOpen(true)}
                      className="flex h-auto w-[658px] items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                    >
                      <span className="flex items-center gap-x-3">
                        <span className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                          <Lock01 className="size-5 text-primary-500" />
                        </span>
                        <span className="text-sm font-medium leading-[17px] text-gray-900">
                          Update Password
                        </span>
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-[5px]">
                        <ChevronRight className="size-5 text-gray-500" />
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      onClick={() => setIsFingerprintOpen(true)}
                      className="flex h-auto w-[658px] items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                    >
                      <span className="flex items-center gap-x-3">
                        <span className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                          <Fingerprint01 className="size-5 text-primary-500" />
                        </span>
                        <span className="text-sm font-medium leading-[17px] text-gray-900">
                          Fingerprint Login
                        </span>
                        {isFingerprintEnabled && (
                          <Badge visual="success" size="sm">
                            Enabled
                          </Badge>
                        )}
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-[5px]">
                        <ChevronRight className="size-5 text-gray-500" />
                      </span>
                    </Button>
                  </div>

                </>
              )}

              {activeTab === "login-password" && isUpdatePasswordOpen && (
                <div className="flex w-[492px] flex-col items-start gap-6">
                  <div className="flex w-full flex-col items-start gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Update Password
                    </h1>
                    <p className="w-full text-sm text-gray-500">
                      Marketeq recommends avoiding using personal information in
                      passwords and using a unique password for each account.{" "}
                      <a href="#" className="underline">
                        Learn more
                      </a>
                    </p>
                  </div>

                  <div className="flex w-full flex-col items-start gap-6">
                    <div className="flex w-full flex-col items-start gap-6">
                      <div className="flex w-full flex-col items-start gap-1.5">
                        <Label size="sm">Enter Your Current Password</Label>
                        <InputGroup className="w-full">
                          <Input
                            type={visiblePasswords.current ? "text" : "password"}
                            placeholder="Type your current password"
                            value={passwordForm.current}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                current: e.target.value,
                              }))
                            }
                          />
                          <InputRightElement>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="size-auto bg-transparent hover:bg-transparent"
                              onClick={() =>
                                setVisiblePasswords((prev) => ({
                                  ...prev,
                                  current: !prev.current,
                                }))
                              }
                            >
                              {visiblePasswords.current ? (
                                <Eye className="size-4 text-gray-400" />
                              ) : (
                                <EyeOff className="size-4 text-gray-400" />
                              )}
                            </IconButton>
                          </InputRightElement>
                        </InputGroup>
                      </div>

                      <div className="flex w-full flex-col items-start gap-1.5">
                        <Label size="sm">Type New Password</Label>
                        <InputGroup className="w-full">
                          <Input
                            type={visiblePasswords.next ? "text" : "password"}
                            placeholder="Type your new password"
                            value={passwordForm.next}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                next: e.target.value,
                              }))
                            }
                          />
                          <InputRightElement>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="size-auto bg-transparent hover:bg-transparent"
                              onClick={() =>
                                setVisiblePasswords((prev) => ({
                                  ...prev,
                                  next: !prev.next,
                                }))
                              }
                            >
                              {visiblePasswords.next ? (
                                <Eye className="size-4 text-gray-400" />
                              ) : (
                                <EyeOff className="size-4 text-gray-400" />
                              )}
                            </IconButton>
                          </InputRightElement>
                        </InputGroup>
                      </div>

                      <div className="flex w-full flex-col items-start gap-1.5">
                        <Label size="sm">Confirm New Password</Label>
                        <InputGroup className="w-full">
                          <Input
                            type={visiblePasswords.confirm ? "text" : "password"}
                            placeholder="Type your new password again"
                            value={passwordForm.confirm}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                confirm: e.target.value,
                              }))
                            }
                          />
                          <InputRightElement>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="size-auto bg-transparent hover:bg-transparent"
                              onClick={() =>
                                setVisiblePasswords((prev) => ({
                                  ...prev,
                                  confirm: !prev.confirm,
                                }))
                              }
                            >
                              {visiblePasswords.confirm ? (
                                <Eye className="size-4 text-gray-400" />
                              ) : (
                                <EyeOff className="size-4 text-gray-400" />
                              )}
                            </IconButton>
                          </InputRightElement>
                        </InputGroup>
                      </div>
                    </div>

                    <div className="flex w-[328px] flex-col items-start gap-3">
                      <Label size="sm">Password Requirements</Label>
                      <div className="flex w-full items-start gap-x-10">
                        <div className="flex w-[173px] flex-col items-start gap-2">
                          {passwordRequirements.slice(0, 3).map((req) => (
                            <div
                              key={req.label}
                              className="flex items-center gap-x-3"
                            >
                              <Checkbox
                                size="md"
                                variant="circular"
                                checked={req.met}
                              />
                              <span className="text-sm font-medium leading-5 text-gray-700">
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex w-[115px] flex-col items-start gap-2">
                          {passwordRequirements.slice(3).map((req) => (
                            <div
                              key={req.label}
                              className="flex items-center gap-x-3"
                            >
                              <Checkbox
                                size="md"
                                variant="circular"
                                checked={req.met}
                              />
                              <span className="text-sm font-medium leading-5 text-gray-700">
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-x-1">
                      <span className="text-sm font-medium leading-[17px] text-gray-700">
                        Forgot your password?
                      </span>
                      <a
                        href="#"
                        className="text-sm font-medium leading-[17px] text-primary-500 underline"
                      >
                        Request a new one
                      </a>
                    </div>
                  </div>

                  <div className="flex w-full justify-end gap-x-3">
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() =>
                        isPasswordDirty
                          ? setIsDiscardOpen(true)
                          : closeUpdatePassword()
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePasswordSave}
                      disabled={!canSavePassword}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "login-password" && (
                <Dialog open={isDiscardOpen} onOpenChange={setIsDiscardOpen}>
                  <DialogContent
                    className="flex max-w-[512px] flex-col items-center gap-8 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                    dialogOverlay={
                      <DialogOverlay className="backdrop-blur-[8px]" />
                    }
                  >
                    <div className="flex w-full flex-col items-start gap-10">
                      <div className="flex w-full flex-col items-start gap-5">
                        <div className="flex w-full items-start justify-between gap-5">
                          <span className="flex size-12 items-center justify-center rounded-full border-8 border-warning-50 bg-warning-100">
                            <AlertTriangle className="size-6 text-warning-500" />
                          </span>
                          <IconButton
                            variant="ghost"
                            visual="gray"
                            size="sm"
                            className="rounded-[5px]"
                            onClick={() => setIsDiscardOpen(false)}
                          >
                            <X className="size-5 text-gray-500" />
                          </IconButton>
                        </div>

                        <div className="flex w-full flex-col items-start gap-2">
                          <DialogTitle className="w-full text-lg leading-7 font-semibold text-gray-900">
                            Unsaved changes
                          </DialogTitle>
                          <DialogDescription className="w-full text-sm text-gray-500">
                            Do you want to save your password, or leave and
                            discard changes?
                          </DialogDescription>
                        </div>
                      </div>

                      <div className="flex items-start gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="lg"
                          onClick={() => {
                            setIsDiscardOpen(false)
                            closeUpdatePassword()
                          }}
                        >
                          Exit Without Saving
                        </Button>
                        <Button
                          size="lg"
                          onClick={() => {
                            setIsDiscardOpen(false)
                            handlePasswordSave()
                          }}
                        >
                          Save & Exit
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {activeTab === "login-password" && (
                <Dialog
                  open={isFingerprintOpen}
                  onOpenChange={(open) =>
                    open ? setIsFingerprintOpen(true) : closeFingerprint()
                  }
                >
                  <DialogContent
                    className="flex max-w-[414px] flex-col items-center gap-[55px] p-[55px] shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                    dialogOverlay={
                      <DialogOverlay className="backdrop-blur-[8px]" />
                    }
                  >
                    <div className="flex w-full flex-col items-center gap-8">
                      <span className="flex size-20 items-center justify-center rounded-full border-[10px] border-primary-25 bg-primary-50">
                        <Fingerprint01 className="size-11 text-primary-500" />
                      </span>

                      <div className="flex w-full flex-col items-center gap-6">
                        <DialogTitle className="text-center text-lg leading-7 font-semibold text-gray-900">
                          Fingerprint Login
                        </DialogTitle>
                        <div className="flex w-full flex-col items-center gap-2">
                          <DialogDescription className="w-full text-center text-sm text-gray-500">
                            Confirm your fingerprint on your device so Marketeq
                            can verify it&apos;s you.
                          </DialogDescription>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-x-3">
                        <Checkbox
                          size="md"
                          checked={acceptsFingerprintTerms}
                          onCheckedChange={(checked) =>
                            setAcceptsFingerprintTerms(checked === true)
                          }
                        />
                        <span className="text-sm font-medium capitalize text-gray-700">
                          Accept{" "}
                          <a href="#" className="underline">
                            Terms &amp; Conditions
                          </a>
                        </span>
                      </div>
                    </div>

                    <div className="flex w-full items-start justify-center gap-x-3">
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={closeFingerprint}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!acceptsFingerprintTerms}
                        onClick={handleEnableFingerprint}
                        leftIcon={<Check className="size-[15px]" />}
                      >
                        Enable Fingerprint Login
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {activeTab === "two-factor-auth" && (
                <>
                  <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400 mb-6">
                    Two-Factor Authentication
                  </h1>
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-dark-blue-400">
                          Two-Factor Authentication
                        </p>
                        <p className="text-xs text-gray-500">
                          {user?.twoFactorEnabled
                            ? user?.twoFactorMethod === "sms"
                              ? "SMS verification enabled"
                              : "Authenticator app enabled"
                            : "Add an extra layer of security to your account"}
                        </p>
                      </div>
                      <Switch
                        checked={user?.twoFactorEnabled ?? false}
                        onCheckedChange={(checked) => {
                          if (checked) setShow2FASetup(true)
                          else setShow2FADisable(true)
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "social-login" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  Social Login
                </h1>
              )}

              {activeTab === "account-recovery" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  Account Recovery
                </h1>
              )}

              {activeTab === "users" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  Users
                </h1>
              )}

              {activeTab === "roles" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  Roles
                </h1>
              )}

              {activeTab === "devices" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  Devices
                </h1>
              )}

              {activeTab === "ip-restrictions" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  IP Restrictions
                </h1>
              )}

              {activeTab === "integrations" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  Integrations
                </h1>
              )}

              {activeTab === "my-apps" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  My Apps
                </h1>
              )}

              {activeTab === "billing-overview" && (
                <>
                  <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400 mb-5">
                    Overview
                  </h1>
                  <BillingOverviewContent onNavigateTab={handleBillingTabChange} />
                </>
              )}

              {activeTab === "billing-transactions" && (
                <>
                  <div className="flex items-start justify-between gap-x-5 mb-5">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Transactions
                    </h1>
                    <div className="flex items-center gap-x-6">
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className="text-gray-500 underline decoration-gray-500/30 hover:decoration-gray-500 hover:text-dark-blue-500 transition-colors duration-300"
                        leftIcon={<HelpCircle className="size-[15px]" />}
                      >
                        Get Help
                      </Button>
                      <div className="flex items-center gap-x-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outlined"
                              visual="gray"
                              size="sm"
                              className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                              rightIcon={<ChevronDown className="size-[15px]" />}
                            >
                              Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" sideOffset={4}>
                            <DropdownMenuItem>Export CSV</DropdownMenuItem>
                            <DropdownMenuItem>Export PDF</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <IconButton
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                          onClick={() => toggleInviteWindow(true, "Share Your Transactions")}
                        >
                          <Share06 className="size-[15px]" />
                        </IconButton>
                        {/* <IconButton
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                        >
                          <Settings02 className="size-[15px]" />
                        </IconButton> */}
                      </div>
                    </div>
                  </div>
                  <BillingTransactionsContent />

                </>
              )}

              {activeTab === "billing-invoices" && (
                <>
                  <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400 mb-5">
                    Invoices
                  </h1>
                  <BillingInvoicesContent />
                </>
              )}

              {activeTab === "billing-payment-methods" && (
                <>
                  <div className="shrink-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Payment Methods
                    </h1>
                    <div className="flex shrink-0 flex-wrap items-center gap-6">
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className="text-gray-500 underline decoration-gray-500/30 hover:decoration-gray-500 hover:text-dark-blue-500 transition-colors duration-300"
                        leftIcon={<HelpCircle className="size-[15px]" />}
                      >
                        Get Help
                      </Button>
                      <Button
                        onClick={() => paymentMethodsRef.current?.openAddPaymentMethodDialog()}
                        leftIcon={<Plus className="size-4" />}
                      >
                        Add Payment Method
                      </Button>
                    </div>
                  </div>
                  <BillingPaymentMethodsContent ref={paymentMethodsRef} embedded />
                </>
              )}

              {activeTab === "billing-plans" && (
                <>
                  <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400 mb-5">
                    Plans
                  </h1>
                  <BillingMyPlansContent />
                </>
              )}
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <SecuritySettingsStepper
          onCloseModal={() => setShowPasswordModal(false)}
        />
      )}

      {show2FASetup && (
        <TwoFactorSetupModal onClose={() => setShow2FASetup(false)} />
      )}

      {show2FADisable && (
        <DisableTwoFactorModal onClose={() => setShow2FADisable(false)} />
      )}

      {showSessionsModal && (
        <ActiveSessionsModal onClose={() => setShowSessionsModal(false)} />
      )}
    </AuthenticatedRoute>
  )
}
