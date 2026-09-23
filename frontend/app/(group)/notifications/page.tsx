"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  type UiNotificationItem,
  mapApiNotificationToUi,
  mapAblyNotificationToUi,
} from "@/libs/notifications"
import NotificationsAPI, {
  isTransientNotificationsApiError,
} from "@/service/http/notifications"
import { useNotificationChannel } from "@/utils/useNotificationChannel"
import { cn } from "@/utils/functions"
import {
  Bell,
  Briefcase02,
  Check,
  FileCheck02,
  User,
} from "@blend-metrics/icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const NOTIFICATIONS_PAGE_LIMIT = 50

export default function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [notifications, setNotifications] = useState<UiNotificationItem[]>([])

  const unreadCount = notifications.filter((n) => !n.read).length

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const response = await NotificationsAPI.list({
        limit: NOTIFICATIONS_PAGE_LIMIT,
      })
      const items: UiNotificationItem[] = Array.isArray(response?.data?.data)
        ? response.data.data.map(mapApiNotificationToUi)
        : []
      setNotifications(items)
    } catch (error) {
      if (!isTransientNotificationsApiError(error)) {
        console.error("Failed to load notifications:", error)
      }
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useNotificationChannel({
    onNotificationNew: (payload) => {
      const nextItem = mapAblyNotificationToUi(payload)
      setNotifications((prev) => {
        const deduped = prev.filter((item) => item.id !== nextItem.id)
        return [nextItem, ...deduped]
      })
    },
  })

  const markAllRead = async () => {
    try {
      await NotificationsAPI.markAllRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      )
    } catch (error) {
      if (!isTransientNotificationsApiError(error)) {
        console.error("Failed to mark all notifications as read:", error)
      }
    }
  }

  const markNotificationRead = async (item: UiNotificationItem) => {
    try {
      if (!item.read) {
        await NotificationsAPI.markRead(item.id)
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id ? { ...n, read: true } : n
          )
        )
      }
    } catch (error) {
      if (!isTransientNotificationsApiError(error)) {
        console.error(`Failed to mark notification ${item.id} as read:`, error)
      }
    }
  }

  const handleNotificationClick = async (item: UiNotificationItem) => {
    await markNotificationRead(item)
    if (item.href && item.href !== "/notifications") {
      router.push(item.href)
    }
  }

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:pt-[50px] min-[1024px]:pb-8 min-[1024px]:pl-[var(--sidebar-content-pl,274px)] transition-[padding-left] duration-300 ease-in-out min-[1024px]:pr-[50px] overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-dark-blue-400">
                Notifications
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "You're all caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outlined"
                visual="gray"
                size="sm"
                onClick={markAllRead}
              >
                <Check className="size-4 mr-1.5" />
                Mark all as read
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="border-b border-gray-200 bg-transparent w-full justify-start gap-x-6 px-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 rounded-none pb-3 px-1 text-sm text-gray-500"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 rounded-none pb-3 px-1 text-sm text-gray-500"
              >
                Unread
                {unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-xs text-primary-500">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <NotificationList
                notifications={filteredNotifications}
                loading={loading}
                onNotificationClick={handleNotificationClick}
              />
            </TabsContent>
            <TabsContent value="unread" className="mt-4">
              <NotificationList
                notifications={filteredNotifications}
                loading={loading}
                onNotificationClick={handleNotificationClick}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}

function NotificationList({
  notifications,
  loading,
  onNotificationClick,
}: {
  notifications: UiNotificationItem[]
  loading: boolean
  onNotificationClick: (item: UiNotificationItem) => void
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-500">Loading notifications...</p>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Bell className="size-10 text-gray-300 mx-auto" />
        <p className="text-sm text-gray-500 mt-3">No notifications to show</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {notifications.map((item) => (
        <NotificationRow
          key={item.id}
          item={item}
          onClick={() => onNotificationClick(item)}
        />
      ))}
    </div>
  )
}

function NotificationRow({
  item,
  onClick,
}: {
  item: UiNotificationItem
  onClick: () => void
}) {
  const accent =
    item.kind === "project"
      ? {
          label: "Project",
          className: "bg-[#ECFDF3] text-[#027A48]",
          icon: FileCheck02,
        }
      : item.kind === "team"
        ? {
            label: "Team",
            className: "bg-[#ECFDF3] text-[#027A48]",
            icon: Briefcase02,
          }
        : item.kind === "message"
          ? {
              label: "Message",
              className: "bg-primary-50 text-primary-500",
              icon: User,
            }
          : {
              label: "System",
              className: "bg-[#EEF4FF] text-[#3538CD]",
              icon: Bell,
            }

  const AccentIcon = accent.icon

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left flex py-3.5 px-4 items-start gap-x-4 transition-colors",
        !item.read ? "bg-[#F8F9FC] hover:bg-gray-100" : "hover:bg-gray-50"
      )}
      onClick={onClick}
    >
      {item.isUserNotification ? (
        <div className="relative inline-block shrink-0">
          <Avatar size="md">
            <AvatarImage src={item.avatarSrc} alt={item.avatarAlt} />
            <AvatarFallback>{item.title.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-1.5 -right-2 flex size-[21px] items-center justify-center rounded-full",
              item.kind === "team"
                ? "bg-success-100 text-success-500"
                : item.kind === "project"
                  ? "bg-success-100 text-success-500"
                  : item.kind === "message"
                    ? "bg-primary-50 text-primary-600"
                    : "bg-[#EEF4FF] text-[#3538CD]"
            )}
          >
            {item.kind === "team" ? (
              <Briefcase02 className="size-2.5" />
            ) : item.kind === "project" ? (
              <FileCheck02 className="size-2.5" />
            ) : (
              <AccentIcon className="size-2.5" />
            )}
          </span>
        </div>
      ) : (
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
            accent.className
          )}
        >
          <AccentIcon className="size-[18px]" />
        </span>
      )}

      <div className="flex-auto min-w-0">
        <div className="flex items-center justify-between gap-x-3">
          <div className="min-w-0">
            <div className="text-sm leading-[16.94px] font-semibold text-dark-blue-400 truncate">
              {item.title}
            </div>
          </div>

          <span className="text-xs leading-[14.06px] text-[#585C65] whitespace-nowrap">
            {item.timeLabel}
          </span>
        </div>

        <div className="mt-1 text-sm leading-[16.94px] text-gray-700 break-words">
          {item.description}
        </div>
        {item.ctaLabel ? (
          <div className="mt-1 text-xs font-semibold leading-5 text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 underline-offset-2">
            {item.ctaLabel}
          </div>
        ) : null}
      </div>
    </button>
  )
}
