"use client"

import { cn } from "@/utils/functions"
import {
  Bell,
  CreditCard,
  Lock,
  Settings02,
  UserCircle,
} from "@blend-metrics/icons"

export const settingsTabItems = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "account", label: "Account", icon: Settings02 },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const

export type SettingsTabId = (typeof settingsTabItems)[number]["id"]

interface SettingsSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const itemClass = (active: boolean) =>
  cn(
    "flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3 text-left",
    active && "bg-gray-100"
  )

const iconClass = "size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400"

export default function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  return (
    <div className="w-[224px] shrink-0 bg-gray-50 min-[1024px]:block hidden border-r space-y-6 border-gray-200 p-[15px] self-stretch">
      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Account Settings
        </span>

        <div className="flex flex-col gap-y-1">
          <button
            className={itemClass(activeTab === "profile")}
            onClick={() => onTabChange("profile")}
          >
            <UserCircle className={iconClass} />
            Profile
          </button>
          <button
            className={itemClass(activeTab === "account")}
            onClick={() => onTabChange("account")}
          >
            <Settings02 className={iconClass} />
            Account
          </button>
          <button
            className={itemClass(activeTab === "security")}
            onClick={() => onTabChange("security")}
          >
            <Lock className={iconClass} />
            Security
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Preferences
        </span>

        <div className="flex flex-col gap-y-1">
          <button
            className={itemClass(activeTab === "notifications")}
            onClick={() => onTabChange("notifications")}
          >
            <Bell className={iconClass} />
            Notifications
          </button>
          <button
            disabled
            title="Coming soon"
            className={cn(
              itemClass(false),
              "opacity-40 cursor-not-allowed hover:bg-transparent"
            )}
          >
            <CreditCard className={iconClass} />
            Billing
            <span className="ml-auto text-[10px] font-medium text-gray-500 bg-gray-200 rounded px-1.5 py-0.5">
              Soon
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
