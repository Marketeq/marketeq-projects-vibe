"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { Bell, Check, Mail01, Trash } from "@blend-metrics/icons"
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

const sampleNotifications = [
  {
    id: 1,
    user: "@Cam43",
    avatar: "/man.jpg",
    message: 'Uploaded final file for project "Video Editing"',
    time: "Just now",
    read: false,
  },
  {
    id: 2,
    user: "@Cam43",
    avatar: "/man.jpg",
    message: 'Uploaded final file for project "Video Editing"',
    time: "2 min ago",
    read: false,
  },
  {
    id: 3,
    user: "@Cam43",
    avatar: "/man.jpg",
    message: 'Uploaded final file for project "Video Editing"',
    time: "5 min ago",
    read: false,
  },
  {
    id: 4,
    user: "@Cam43",
    avatar: "/man.jpg",
    message: 'Uploaded final file for project "Video Editing"',
    time: "1 hour ago",
    read: true,
  },
  {
    id: 5,
    user: "@Cam43",
    avatar: "/man.jpg",
    message: 'Uploaded final file for project "Video Editing"',
    time: "2 hours ago",
    read: true,
  },
  {
    id: 6,
    user: "@Cam43",
    avatar: "/man.jpg",
    message: 'Left a comment on project "Brand Identity"',
    time: "3 hours ago",
    read: true,
  },
]

export default function NotificationsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("all")
  const [notifications, setNotifications] = useState(sampleNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length
  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:pt-[50px] min-[1024px]:pb-8 min-[1024px]:pl-[274px] min-[1024px]:pr-[50px] overflow-hidden">
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
                onMarkAsRead={markAsRead}
              />
            </TabsContent>
            <TabsContent value="unread" className="mt-4">
              <NotificationList
                notifications={filteredNotifications}
                onMarkAsRead={markAsRead}
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
  onMarkAsRead,
}: {
  notifications: typeof sampleNotifications
  onMarkAsRead: (id: number) => void
}) {
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
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className={`flex items-start gap-x-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            !notification.read ? "bg-primary-50/30" : ""
          }`}
          onClick={() => onMarkAsRead(notification.id)}
        >
          {!notification.read && (
            <span className="mt-2 size-2 rounded-full bg-primary-500 flex-none" />
          )}
          {notification.read && <span className="mt-2 size-2 flex-none" />}

          <Avatar size="md">
            <AvatarImage src={notification.avatar} alt={notification.user} />
            <AvatarFallback>
              {notification.user[1]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-auto min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-dark-blue-400">
                {notification.user}
              </span>
              <span className="text-xs text-gray-400">{notification.time}</span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">
              {notification.message}
            </p>
          </div>
        </article>
      ))}
    </div>
  )
}
