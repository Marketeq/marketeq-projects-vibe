"use client"

import { useState } from "react"
import { cn } from "@/utils/functions"
import {
  Bell,
  BellRinging03,
  ChevronDown,
  Mail01,
  MessageTextSquare01,
  SearchMd,
  Briefcase,
  MessageChatSquare,
  FileSearch02,
  Star,
  Users,
} from "@blend-metrics/icons"
import { Input, Switch } from "@/components/ui"

interface NotificationChannel {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  detail?: string
  enabled: boolean
  disabled?: boolean
}

interface NotificationItem {
  id: string
  title: string
  description: string
  enabled: boolean
  channels: {
    inApp: boolean
    email: boolean
    text: boolean
  }
}

interface NotificationCategory {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  enabled: boolean
  channels: NotificationChannel[]
  notifications: NotificationItem[]
}

const defaultCategories: NotificationCategory[] = [
  {
    id: "projects",
    title: "Projects",
    icon: Briefcase,
    enabled: true,
    channels: [
      { id: "inApp", label: "In App", icon: BellRinging03, detail: "Bell, Popup", enabled: true },
      { id: "email", label: "Email", icon: Mail01, detail: "username@gmail.com", enabled: true },
      { id: "text", label: "Text", icon: MessageTextSquare01, detail: "(704) 555-0127", enabled: false },
    ],
    notifications: [
      {
        id: "new-proposal",
        title: "New Proposal Received",
        description: "Get notified when a freelancer submits a proposal on your project",
        enabled: true,
        channels: { inApp: true, email: true, text: false },
      },
      {
        id: "milestone-complete",
        title: "Milestone Completed",
        description: "Receive a notification when a project milestone is marked as complete",
        enabled: true,
        channels: { inApp: true, email: true, text: false },
      },
      {
        id: "project-update",
        title: "Project Status Update",
        description: "Get notified about changes to project status or timeline",
        enabled: false,
        channels: { inApp: false, email: false, text: false },
      },
      {
        id: "project-invitation",
        title: "Project Invitation",
        description: "Receive a notification when you are invited to collaborate on a project",
        enabled: true,
        channels: { inApp: true, email: true, text: true },
      },
    ],
  },
  {
    id: "messages",
    title: "Messages",
    icon: MessageChatSquare,
    enabled: true,
    channels: [
      { id: "inApp", label: "In App", icon: BellRinging03, detail: "Bell, Popup", enabled: true },
      { id: "email", label: "Email", icon: Mail01, detail: "username@gmail.com", enabled: true },
      { id: "text", label: "Text", icon: MessageTextSquare01, detail: "(704) 555-0127", enabled: true },
    ],
    notifications: [
      {
        id: "new-message",
        title: "New Message",
        description: "Get notified when you receive a new direct message",
        enabled: true,
        channels: { inApp: true, email: true, text: true },
      },
      {
        id: "message-request",
        title: "Message Request",
        description: "Receive a notification when someone sends you a message request",
        enabled: true,
        channels: { inApp: true, email: false, text: false },
      },
    ],
  },
  {
    id: "contracts",
    title: "Contracts & Payments",
    icon: FileSearch02,
    enabled: true,
    channels: [
      { id: "inApp", label: "In App", icon: BellRinging03, detail: "Bell, Popup", enabled: true },
      { id: "email", label: "Email", icon: Mail01, detail: "username@gmail.com", enabled: true },
      { id: "text", label: "Text", icon: MessageTextSquare01, detail: "(704) 555-0127", enabled: false },
    ],
    notifications: [
      {
        id: "contract-started",
        title: "Contract Started",
        description: "Get notified when a new contract is activated",
        enabled: true,
        channels: { inApp: true, email: true, text: false },
      },
      {
        id: "payment-received",
        title: "Payment Received",
        description: "Receive a notification when a payment is processed",
        enabled: true,
        channels: { inApp: true, email: true, text: false },
      },
      {
        id: "contract-deadline",
        title: "Contract Deadline Reminder",
        description: "Get reminded about upcoming contract deadlines",
        enabled: true,
        channels: { inApp: true, email: true, text: false },
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing & Promotions",
    icon: Star,
    enabled: false,
    channels: [
      { id: "inApp", label: "In App", icon: BellRinging03, detail: "Bell, Popup", enabled: false },
      { id: "email", label: "Email", icon: Mail01, detail: "username@gmail.com", enabled: false },
      { id: "text", label: "Text", icon: MessageTextSquare01, detail: "(704) 555-0127", enabled: false, disabled: true },
    ],
    notifications: [
      {
        id: "product-updates",
        title: "Product Updates",
        description: "Learn about new features and improvements to the platform",
        enabled: false,
        channels: { inApp: false, email: false, text: false },
      },
      {
        id: "tips-newsletter",
        title: "Tips & Newsletter",
        description: "Receive tips to improve your freelancing or hiring experience",
        enabled: false,
        channels: { inApp: false, email: false, text: false },
      },
    ],
  },
]

export default function NotificationPreferences() {
  const [categories, setCategories] = useState<NotificationCategory[]>(defaultCategories)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const toggleCategoryMaster = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat
        const newEnabled = !cat.enabled
        return {
          ...cat,
          enabled: newEnabled,
          channels: cat.channels.map((ch) => ({
            ...ch,
            enabled: ch.disabled ? ch.enabled : newEnabled,
          })),
          notifications: cat.notifications.map((n) => ({
            ...n,
            enabled: newEnabled,
            channels: {
              inApp: newEnabled,
              email: newEnabled,
              text: n.channels.text && newEnabled,
            },
          })),
        }
      })
    )
  }

  const toggleChannel = (categoryId: string, channelId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat
        return {
          ...cat,
          channels: cat.channels.map((ch) =>
            ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch
          ),
        }
      })
    )
  }

  const toggleNotificationEnabled = (categoryId: string, notificationId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat
        return {
          ...cat,
          notifications: cat.notifications.map((n) => {
            if (n.id !== notificationId) return n
            const newEnabled = !n.enabled
            return {
              ...n,
              enabled: newEnabled,
              channels: newEnabled
                ? { inApp: true, email: false, text: false }
                : { inApp: false, email: false, text: false },
            }
          }),
        }
      })
    )
  }

  const toggleNotificationChannel = (
    categoryId: string,
    notificationId: string,
    channel: "inApp" | "email" | "text"
  ) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat
        return {
          ...cat,
          notifications: cat.notifications.map((n) => {
            if (n.id !== notificationId) return n
            return {
              ...n,
              channels: { ...n.channels, [channel]: !n.channels[channel] },
            }
          }),
        }
      })
    )
  }

  const getChannelSummary = (n: NotificationItem) => {
    const active: string[] = []
    if (n.channels.inApp) active.push("In App")
    if (n.channels.email) active.push("Email")
    if (n.channels.text) active.push("Text")
    return active.length > 0 ? active.join(", ") : "Off"
  }

  const selectedCategory = categories.find((c) => c.id === expandedCategory)

  const filteredNotifications = selectedCategory
    ? selectedCategory.notifications.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  if (selectedCategory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => {
              setExpandedCategory(null)
              setExpandedNotification(null)
              setSearchQuery("")
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-dark-blue-400 transition-colors"
          >
            <ChevronDown className="size-4 rotate-90" />
            Back
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-gray-500">Notifications</span>
            <span className="text-gray-300">/</span>
            <span className="text-dark-blue-400">{selectedCategory.title}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-4 p-5">
            <div className="flex items-center justify-center size-12 rounded-xl bg-primary-500">
              <selectedCategory.icon className="size-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-dark-blue-400">
                {selectedCategory.title}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-dark-blue-400">
                Receive Notifications
              </span>
              <Switch
                checked={selectedCategory.enabled}
                onCheckedChange={() => toggleCategoryMaster(selectedCategory.id)}
                size="md"
              />
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h4 className="text-base font-semibold text-dark-blue-400">
                  Notifications by type
                </h4>
                <p className="text-sm text-gray-500">
                  Control all notifications at once
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {selectedCategory.channels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3"
                >
                  <channel.icon className="size-5 text-gray-500" />
                  <span className="text-sm font-semibold text-dark-blue-400">
                    {channel.label}
                  </span>
                  <span className="flex-1" />
                  {channel.detail && (
                    <span className="text-xs text-gray-400">{channel.detail}</span>
                  )}
                  <Switch
                    checked={channel.enabled}
                    onCheckedChange={() =>
                      toggleChannel(selectedCategory.id, channel.id)
                    }
                    disabled={channel.disabled}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5">
            <h4 className="text-base font-semibold text-dark-blue-400">
              Notifications
            </h4>
            <div className="relative w-56">
              <SearchMd className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 rounded-lg pl-9 pr-3 py-2 text-sm text-dark-blue-400 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-100 border border-transparent focus:border-primary-200 transition-colors"
              />
            </div>
          </div>

          <div className="px-5 pb-5 space-y-2">
            {filteredNotifications.map((notification) => {
              const isExpanded = expandedNotification === notification.id
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "rounded-lg overflow-hidden transition-colors",
                    isExpanded ? "bg-gray-50" : ""
                  )}
                >
                  <button
                    onClick={() =>
                      setExpandedNotification(isExpanded ? null : notification.id)
                    }
                    className={cn(
                      "flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors",
                      isExpanded
                        ? "bg-gray-100"
                        : "bg-gray-50 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-dark-blue-400">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getChannelSummary(notification)}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-5 text-gray-400 transition-transform shrink-0",
                        isExpanded ? "rotate-180" : ""
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pt-3 pb-4 space-y-4">
                      <p className="text-sm text-gray-500">
                        {notification.description}
                      </p>

                      <div className="flex items-center gap-3 py-2">
                        <BellRinging03 className="size-5 text-gray-500" />
                        <span className="text-sm font-semibold text-dark-blue-400 flex-1">
                          Allow notifications
                        </span>
                        <Switch
                          checked={notification.enabled}
                          onCheckedChange={() =>
                            toggleNotificationEnabled(
                              selectedCategory.id,
                              notification.id
                            )
                          }
                          size="sm"
                        />
                      </div>

                      {notification.enabled && (
                        <div>
                          <p className="text-xs font-semibold text-dark-blue-400 mb-1">
                            Where do you get these notifications
                          </p>
                          <div className="space-y-0.5">
                            {[
                              {
                                key: "inApp" as const,
                                label: "In App",
                                icon: BellRinging03,
                              },
                              {
                                key: "email" as const,
                                label: "Email",
                                icon: Mail01,
                              },
                              {
                                key: "text" as const,
                                label: "Text",
                                icon: MessageTextSquare01,
                                dimmed: true,
                              },
                            ].map((ch) => (
                              <div
                                key={ch.key}
                                className="flex items-center gap-3 py-2"
                              >
                                <div
                                  className={cn(
                                    "flex items-center gap-2 flex-1",
                                    ch.dimmed &&
                                      !notification.channels[ch.key] &&
                                      "opacity-50"
                                  )}
                                >
                                  <ch.icon className="size-5 text-gray-500" />
                                  <span className="text-sm font-semibold text-dark-blue-400">
                                    {ch.label}
                                  </span>
                                </div>
                                <Switch
                                  checked={notification.channels[ch.key]}
                                  onCheckedChange={() =>
                                    toggleNotificationChannel(
                                      selectedCategory.id,
                                      notification.id,
                                      ch.key
                                    )
                                  }
                                  size="sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-dark-blue-400">
          Notification Preferences
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose what notifications you receive and how you receive them
        </p>
      </div>

      {categories.map((category) => (
        <div
          key={category.id}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="flex items-center gap-4 p-5">
            <div
              className={cn(
                "flex items-center justify-center size-10 rounded-lg",
                category.enabled ? "bg-primary-500" : "bg-gray-300"
              )}
            >
              <category.icon className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-dark-blue-400">
                {category.title}
              </h3>
              <p className="text-xs text-gray-400">
                {category.notifications.filter((n) => n.enabled).length} of{" "}
                {category.notifications.length} active
              </p>
            </div>
            <Switch
              checked={category.enabled}
              onCheckedChange={() => toggleCategoryMaster(category.id)}
              size="sm"
            />
          </div>

          <div className="h-px bg-gray-100" />

          <div className="px-5 py-3 space-y-1">
            {category.notifications.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm text-gray-600">{n.title}</span>
                <span className="text-xs text-gray-400">
                  {getChannelSummary(n)}
                </span>
              </div>
            ))}
            {category.notifications.length > 3 && (
              <p className="text-xs text-gray-400">
                +{category.notifications.length - 3} more
              </p>
            )}
          </div>

          <div className="h-px bg-gray-100" />

          <button
            onClick={() => setExpandedCategory(category.id)}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 text-sm font-medium text-primary-500 hover:bg-primary-25 transition-colors"
          >
            Manage Notifications
            <ChevronDown className="size-4 -rotate-90" />
          </button>
        </div>
      ))}
    </div>
  )
}
