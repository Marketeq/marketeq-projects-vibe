"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth"
import { UserAPI, UserProfilePayload } from "@/service/http/user"
import SecuritySettingsStepper from "@/components/security-settings"
import ActiveSessionsModal from "@/components/active-sessions-modal"
import { TwoFactorSetupModal, DisableTwoFactorModal } from "@/components/two-factor-setup"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  Bell,
  Lock,
  Settings,
  UserCircle,
} from "@blend-metrics/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  Label,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@/components/ui"

const settingsSections = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "account", label: "Account", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
]

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("profile")

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
  })

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [show2FADisable, setShow2FADisable] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        username: user.username ?? "",
      })
    }
  }, [user])

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
    setProfileForm({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
    })
    setIsEditing(false)
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold text-dark-blue-400">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="border-b border-gray-200 bg-transparent w-full justify-start gap-x-6 px-0">
              {settingsSections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 rounded-none pb-3 px-1 text-sm text-gray-500"
                >
                  <section.icon className="size-4 mr-1.5" />
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Profile Tab ── */}
            <TabsContent value="profile" className="mt-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-dark-blue-400">Profile Information</h2>
                    <p className="text-sm text-gray-500 mt-1">Update your personal details</p>
                  </div>
                  {!isEditing && (
                    <Button variant="outlined" visual="gray" size="sm" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-x-4">
                  <Avatar className="size-16">
                    <AvatarImage src={user?.avatarUrl ?? ""} alt={user?.firstName ?? "User"} />
                    <AvatarFallback className="text-lg">{user?.firstName?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-dark-blue-400">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label size="sm">First Name</Label>
                    <Input
                      value={profileForm.firstName}
                      onChange={(e) => handleProfileChange("firstName", e.target.value)}
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label size="sm">Last Name</Label>
                    <Input
                      value={profileForm.lastName}
                      onChange={(e) => handleProfileChange("lastName", e.target.value)}
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label size="sm">Email</Label>
                    <Input value={user?.email ?? ""} readOnly className="bg-gray-50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label size="sm">Username</Label>
                    <Input
                      value={profileForm.username}
                      onChange={(e) => handleProfileChange("username", e.target.value)}
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-6 flex justify-end gap-x-3">
                    <Button variant="outlined" visual="gray" size="sm" onClick={handleProfileCancel}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleProfileSave} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Account Tab ── */}
            <TabsContent value="account" className="mt-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-dark-blue-400">Account Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your account preferences</p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Language</p>
                      <p className="text-xs text-gray-500">Select your preferred language</p>
                    </div>
                    <span className="text-sm text-gray-500">English (US)</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Timezone</p>
                      <p className="text-xs text-gray-500">Set your local timezone</p>
                    </div>
                    <span className="text-sm text-gray-500">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Account Type</p>
                      <p className="text-xs text-gray-500">Your current account role</p>
                    </div>
                    <span className="text-sm text-gray-500 capitalize">{user?.userType?.toLowerCase() ?? user?.accountType?.toLowerCase() ?? "—"}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Notifications Tab ── */}
            <TabsContent value="notifications" className="mt-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-dark-blue-400">Notification Preferences</h2>
                <p className="text-sm text-gray-500 mt-1">Choose what notifications you receive</p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Email Notifications</p>
                      <p className="text-xs text-gray-500">Receive email updates about your account activity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Project Updates</p>
                      <p className="text-xs text-gray-500">Get notified when projects you follow are updated</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Messages</p>
                      <p className="text-xs text-gray-500">Receive notifications for new messages</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Marketing</p>
                      <p className="text-xs text-gray-500">Receive tips, product updates, and promotions</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Security Tab ── */}
            <TabsContent value="security" className="mt-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-dark-blue-400">Security</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your security settings</p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Password</p>
                      <p className="text-xs text-gray-500">
                        {user?.hasPassword ? "Password is set" : "No password set — secure your account"}
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
                      <p className="text-sm font-medium text-dark-blue-400">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-500">
                        {user?.twoFactorEnabled
                          ? "Authenticator app enabled"
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
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Active Sessions</p>
                      <p className="text-xs text-gray-500">Manage your active login sessions</p>
                    </div>
                    <Button variant="outlined" visual="gray" size="sm" onClick={() => setShowSessionsModal(true)}>View Sessions</Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showPasswordModal && (
        <SecuritySettingsStepper onCloseModal={() => setShowPasswordModal(false)} />
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
