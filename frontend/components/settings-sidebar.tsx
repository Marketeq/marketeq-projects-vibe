"use client"

import { cn } from "@/utils/functions"
import {
  Bell,
  CreditCard,
  Lock,
  Settings,
  UserCircle,
} from "@blend-metrics/icons"

interface SidebarItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

interface SidebarGroup {
  label: string
  items: SidebarItem[]
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: "Account Settings",
    items: [
      { id: "profile", label: "Profile", icon: UserCircle },
      { id: "account", label: "Account", icon: Settings },
      { id: "security", label: "Security", icon: Lock },
    ],
  },
  {
    label: "Preferences",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "billing", label: "Billing", icon: CreditCard, disabled: true },
    ],
  },
]

interface SettingsSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-dark-blue-400 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <Settings className="size-5 text-white" />
        <span className="text-base font-semibold text-white">Settings</span>
      </div>

      <nav className="flex flex-col gap-8 px-3 py-6 flex-1 overflow-y-auto">
        {sidebarGroups.map((group) => (
          <div key={group.label} className="flex flex-col">
            <span className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {group.label}
            </span>
            {group.items.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => !item.disabled && onTabChange(item.id)}
                  disabled={item.disabled}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
                    item.disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  {item.label}
                  {item.disabled && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">
                      Soon
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
