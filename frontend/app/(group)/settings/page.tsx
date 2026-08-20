"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
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
import { Edit01, HelpCircle, Plus, X2 } from "@blend-metrics/icons"
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Input,
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
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "personal-info"
  )

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

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [show2FADisable, setShow2FADisable] = useState(false)

  const languageOptions = useMemo(
    () => languagesMock.map((item) => item.label),
    []
  )

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

  const isProfileDirty = useMemo(() => {
    if (!user) return false
    return (
      profileForm.firstName !== (user.firstName ?? "") ||
      profileForm.lastName !== (user.lastName ?? "") ||
      profileForm.username !== (user.username ?? "")
    )
  }, [profileForm, user])

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
                  <h1 className="text-xl font-bold text-dark-blue-400">
                    Personal Info
                  </h1>

                  <div className="mt-6 flex items-center gap-x-6">
                    <div className="relative">
                      <Avatar className="size-24 border-4 border-white">
                        <AvatarImage
                          src={user?.avatarUrl ?? ""}
                          alt={user?.firstName ?? "User"}
                        />
                        <AvatarFallback className="text-4xl font-medium tracking-tight text-gray-300">
                          {(user?.firstName?.[0] ?? "").toUpperCase()}
                          {(user?.lastName?.[0] ?? "").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
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

                  <div className="mt-6 max-w-[664px] flex justify-end gap-x-3">
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
                      disabled={isSaving || !isProfileDirty}
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </>
              )}

              {activeTab === "company-info" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  Company Info
                </h1>
              )}

              {activeTab === "privacy" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  Privacy
                </h1>
              )}

              {activeTab === "notifications" && (
                <>
                  <h1 className="text-xl font-bold text-dark-blue-400 mb-6">
                    Notifications
                  </h1>
                  <NotificationPreferences />
                </>
              )}

              {activeTab === "tax-info" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  Tax Info
                </h1>
              )}

              {activeTab === "login-password" && (
                <>
                  <h1 className="text-xl font-bold text-dark-blue-400 mb-6">
                    Login & Password
                  </h1>
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-dark-blue-400">
                            Password
                          </p>
                          <p className="text-xs text-gray-500">
                            {user?.hasPassword
                              ? "Password is set"
                              : "No password set, secure your account"}
                          </p>
                        </div>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() => setShowPasswordModal(true)}
                        >
                          {user?.hasPassword ? "Change Password" : "Set Password"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-dark-blue-400">
                            Active Sessions
                          </p>
                          <p className="text-xs text-gray-500">
                            Manage your active login sessions
                          </p>
                        </div>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() => setShowSessionsModal(true)}
                        >
                          View Sessions
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "two-factor-auth" && (
                <>
                  <h1 className="text-xl font-bold text-dark-blue-400 mb-6">
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
                <h1 className="text-xl font-bold text-dark-blue-400">
                  Social Login
                </h1>
              )}

              {activeTab === "account-recovery" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  Account Recovery
                </h1>
              )}

              {activeTab === "users" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  Users
                </h1>
              )}

              {activeTab === "roles" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  Roles
                </h1>
              )}

              {activeTab === "devices" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  Devices
                </h1>
              )}

              {activeTab === "ip-restrictions" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  IP Restrictions
                </h1>
              )}

              {activeTab === "integrations" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  Integrations
                </h1>
              )}

              {activeTab === "my-apps" && (
                <h1 className="text-xl font-bold text-dark-blue-400">
                  My Apps
                </h1>
              )}

              {activeTab === "billing-overview" && (
                <>
                  <h1 className="text-xl font-bold text-dark-blue-400 mb-5">
                    Overview
                  </h1>
                  <BillingOverviewContent onNavigateTab={handleBillingTabChange} />
                </>
              )}

              {activeTab === "billing-transactions" && (
                <>
                  <h1 className="text-xl font-bold text-dark-blue-400 mb-5">
                    Transactions
                  </h1>
                  <BillingTransactionsContent />
                </>
              )}

              {activeTab === "billing-invoices" && (
                <>
                  <h1 className="text-xl font-bold text-dark-blue-400 mb-5">
                    Invoices
                  </h1>
                  <BillingInvoicesContent />
                </>
              )}

              {activeTab === "billing-payment-methods" && (
                <>
                  <div className="shrink-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
                    <h1 className="text-xl font-bold text-dark-blue-400">
                      Payment Methods
                    </h1>
                    <div className="flex shrink-0 flex-wrap items-center gap-6">
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className="text-gray-500"
                        leftIcon={<HelpCircle className="size-4" />}
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
                  <h1 className="text-xl font-bold text-dark-blue-400 mb-5">
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
