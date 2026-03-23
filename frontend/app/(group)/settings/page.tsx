"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  Bell,
  ChevronRight,
  Globe,
  Lock,
  Mail01,
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
} from "@/components/ui"

const settingsSections = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "account", label: "Account", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")

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

            <TabsContent value="profile" className="mt-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-dark-blue-400">Profile Information</h2>
                <p className="text-sm text-gray-500 mt-1">Update your personal details</p>

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
                    <Input defaultValue={user?.firstName ?? ""} readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <Label size="sm">Last Name</Label>
                    <Input defaultValue={user?.lastName ?? ""} readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <Label size="sm">Email</Label>
                    <Input defaultValue={user?.email ?? ""} readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <Label size="sm">Username</Label>
                    <Input defaultValue={user?.username ?? ""} readOnly />
                  </div>
                </div>
              </div>
            </TabsContent>

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
                    <span className="text-sm text-gray-500 capitalize">{user?.role?.toLowerCase() ?? "—"}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

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

            <TabsContent value="security" className="mt-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-dark-blue-400">Security</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your security settings</p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Password</p>
                      <p className="text-xs text-gray-500">Last changed: Unknown</p>
                    </div>
                    <Button variant="outlined" visual="gray" size="sm">Change Password</Button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">Active Sessions</p>
                      <p className="text-xs text-gray-500">Manage your active login sessions</p>
                    </div>
                    <Button variant="outlined" visual="gray" size="sm">View Sessions</Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
