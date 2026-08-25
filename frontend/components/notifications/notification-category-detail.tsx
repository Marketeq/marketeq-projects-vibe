"use client"

import { useState } from "react"
import type {
  CatalogCategory,
  CategoryPref,
  ChannelKey,
  GlobalChannelPrefs,
  NotificationItemPref,
} from "@/service/http/notifications"
import { cn } from "@/utils/functions"
import { ChevronDown, SearchMd } from "@blend-metrics/icons"
import { Switch } from "@/components/ui"
import NotificationItemRow from "./notification-item-row"
import {
  SMS_ENABLED,
  channelIcons,
  channelLabels,
  channelOrder,
  resolveIcon,
} from "./shared"

interface Props {
  category: CatalogCategory
  categoryState: CategoryPref
  globalChannels: GlobalChannelPrefs
  accountEmail: string
  accountPhone: string | null
  getItemState: (notificationId: string) => NotificationItemPref
  onBack: () => void
  onToggleCategoryMaster: () => void
  onToggleCategoryChannel: (channel: ChannelKey) => void
  onToggleItemEnabled: (notificationId: string) => void
  onToggleItemChannel: (notificationId: string, channel: ChannelKey) => void
}

export default function NotificationCategoryDetail({
  category,
  categoryState,
  globalChannels,
  accountEmail,
  accountPhone,
  getItemState,
  onBack,
  onToggleCategoryMaster,
  onToggleCategoryChannel,
  onToggleItemEnabled,
  onToggleItemChannel,
}: Props) {
  const [byTypeOpen, setByTypeOpen] = useState(true)
  const [expandedNotification, setExpandedNotification] = useState<
    string | null
  >(null)
  const [notificationSearch, setNotificationSearch] = useState("")

  const CategoryIcon = resolveIcon(category.icon)
  const visible = category.notifications.filter((n) =>
    n.title.toLowerCase().includes(notificationSearch.toLowerCase())
  )

  const channelDetail = (key: ChannelKey) => {
    if (key === "inApp") {
      const parts = [
        { text: "Bell", strike: !globalChannels.inApp.bell },
        { text: "Popup", strike: !globalChannels.inApp.popup },
        { text: "Browser", strike: !globalChannels.inApp.browser },
      ]
      return (
        <>
          {parts.map((p, i) => (
            <span key={p.text}>
              <span className={p.strike ? "line-through" : ""}>{p.text}</span>
              {i < parts.length - 1 ? ", " : ""}
            </span>
          ))}
        </>
      )
    }
    if (key === "email") return globalChannels.email.address ?? accountEmail
    return accountPhone ?? "Missing Phone Number"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 px-3 h-9 text-sm font-semibold text-dark-blue-400 transition-colors"
        >
          <ChevronDown className="size-4 rotate-90" />
          Back
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-gray-500">Notifications</span>
          <span className="text-gray-300">/</span>
          <span className="text-dark-blue-400">{category.title}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-4 p-5">
          <div className="flex items-center justify-center size-12 rounded-xl bg-[#333951]">
            <CategoryIcon className="size-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-dark-blue-400 truncate">
              {category.title}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-dark-blue-400">
              Receive Notifications
            </span>
            <Switch
              checked={categoryState.enabled}
              onCheckedChange={onToggleCategoryMaster}
              size="md"
            />
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="p-5">
          <button
            onClick={() => setByTypeOpen((o) => !o)}
            className="flex items-center w-full text-left"
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-dark-blue-400">
                Notifications by type
              </h4>
              <p className="text-sm text-gray-500">
                Control all notifications at once
              </p>
            </div>
            <ChevronDown
              className={cn(
                "size-5 text-gray-400 transition-transform",
                byTypeOpen ? "rotate-180" : ""
              )}
            />
          </button>

          {byTypeOpen && (
            <div className="mt-4 space-y-2">
              {channelOrder
                .filter((k) => SMS_ENABLED || k !== "sms")
                .map((key) => {
                  const ChannelIcon = channelIcons[key]
                  const globalOff = !globalChannels[key].enabled
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center gap-3 bg-gray-50 rounded-lg px-4 h-[52px]",
                        globalOff && "opacity-50"
                      )}
                    >
                      <ChannelIcon className="size-5 text-gray-500" />
                      <span className="text-sm font-semibold text-dark-blue-400">
                        {channelLabels[key]}
                      </span>
                      <span className="flex-1" />
                      <span className="text-xs text-gray-400">
                        {channelDetail(key)}
                      </span>
                      <Switch
                        checked={categoryState.channels[key] && !globalOff}
                        onCheckedChange={() => onToggleCategoryChannel(key)}
                        disabled={globalOff || !categoryState.enabled}
                        size="sm"
                      />
                    </div>
                  )
                })}
            </div>
          )}
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
              value={notificationSearch}
              onChange={(e) => setNotificationSearch(e.target.value)}
              className="w-full bg-gray-50 rounded-lg pl-9 pr-3 py-2 text-sm text-dark-blue-400 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-100 border border-transparent focus:border-primary-200 transition-colors"
            />
          </div>
        </div>

        <div className="px-5 pb-5 space-y-2">
          {visible.map((notification) => (
            <NotificationItemRow
              key={notification.id}
              notification={notification}
              state={getItemState(notification.id)}
              globalChannels={globalChannels}
              categoryEnabled={categoryState.enabled}
              isExpanded={expandedNotification === notification.id}
              onToggleExpand={() =>
                setExpandedNotification(
                  expandedNotification === notification.id
                    ? null
                    : notification.id
                )
              }
              onToggleEnabled={() => onToggleItemEnabled(notification.id)}
              onToggleChannel={(channel) =>
                onToggleItemChannel(notification.id, channel)
              }
            />
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              No notifications match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
