"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth"
import type {
  CategoryPref,
  ChannelKey,
  GlobalChannelPrefs,
  NotificationItemPref,
  ScopedChannelState,
} from "@/service/http/notifications"
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences"
import { useToast } from "@/components/ui"
import ResetDefaultsModal from "./notifications/modals/reset-defaults-modal"
import BrowserAlertsModal from "./notifications/modals/browser-alerts-modal"
import NotificationCategoriesList from "./notifications/notification-categories-list"
import NotificationGlobalChannels from "./notifications/notification-global-channels"
import { EMPTY_CHANNELS } from "./notifications/shared"

// Inbox gates the rest: every other category depends on it being on.
const INBOX_CATEGORY_ID = "inbox"

const defaultGlobalChannels: GlobalChannelPrefs = {
  inApp: { enabled: true, bell: true, popup: true, browser: false },
  email: { enabled: true, address: null },
  sms: { enabled: false, phone: null },
}

export default function NotificationPreferences() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()
  const {
    catalog,
    preferences,
    isLoading,
    isError,
    isSaving,
    update,
    reset,
    updatePhone,
  } = useNotificationPreferences()

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [inboxAlertsOpen, setInboxAlertsOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const globalChannels: GlobalChannelPrefs =
    preferences?.channels ?? defaultGlobalChannels

  const accountEmail = user?.email ?? ""
  const accountPhone = user?.phone ?? null

  const getCategoryState = (categoryId: string): CategoryPref => {
    const pref = preferences?.categories?.[categoryId]
    const fallback = catalog.find((c) => c.id === categoryId)
    return {
      enabled: pref?.enabled ?? fallback?.defaultEnabled ?? false,
      channels: pref?.channels ??
        fallback?.defaultChannels ?? { ...EMPTY_CHANNELS },
    }
  }

  const getItemState = (
    categoryId: string,
    notificationId: string
  ): NotificationItemPref => {
    const pref = preferences?.notifications?.[notificationId]
    const fallback = catalog
      .find((c) => c.id === categoryId)
      ?.notifications.find((n) => n.id === notificationId)
    return {
      enabled: pref?.enabled ?? fallback?.defaultEnabled ?? false,
      channels: pref?.channels ??
        fallback?.defaultChannels ?? { ...EMPTY_CHANNELS },
    }
  }

  const handleToggleGlobalChannel = (channel: ChannelKey, next: boolean) => {
    // Only the global flag. Switching one off used to also write `false` into
    // every category and every item, which was both unnecessary and lossy:
    // dispatch already refuses the channel when the global flag is off, and
    // switching it back on restored nothing — so one off/on round trip left the
    // switch reading "on" while every category had silently stopped using it.
    // The per-category selections are the user's; the global flag gates them
    // without overwriting them.
    update({ channels: { [channel]: { enabled: next } } })
  }

  const handleSetBrowserAlerts = (enabled: boolean) => {
    update({ channels: { inApp: { browser: enabled } } })
  }

  const handleSetEmailAddress = async (address: string | null) => {
    update({ channels: { email: { address } } })
  }

  const handleSetAccountPhone = async (phone: string | null) => {
    await updatePhone(phone)
    setUser((prev) => (prev ? { ...prev, phone } : prev))
    update({ channels: { sms: { phone } } })
  }

  const handleToggleCategoryMaster = (categoryId: string) => {
    const current = getCategoryState(categoryId)
    const nextEnabled = !current.enabled
    const nextChannels: ScopedChannelState = nextEnabled
      ? {
          inApp: globalChannels.inApp.enabled,
          email: globalChannels.email.enabled,
          sms: globalChannels.sms.enabled,
        }
      : { ...EMPTY_CHANNELS }

    const category = catalog.find((c) => c.id === categoryId)
    if (!category) return

    // Inbox is the master. Switching it off silences everything, and switching
    // any other category on requires Inbox to be on for anything to arrive —
    // so it comes on with it.
    const isInbox = categoryId === INBOX_CATEGORY_ID
    const inboxWasEnabled = getCategoryState(INBOX_CATEGORY_ID).enabled

    const affected =
      isInbox && !nextEnabled
        ? catalog // switching Inbox off switches every category off
        : catalog.filter(
            (c) =>
              c.id === categoryId ||
              (!isInbox && nextEnabled && c.id === INBOX_CATEGORY_ID)
          )

    const categoriesPatch: Record<
      string,
      { enabled: boolean; channels: ScopedChannelState }
    > = {}
    const notificationsPatch: Record<
      string,
      { enabled: boolean; channels: ScopedChannelState }
    > = {}

    for (const affectedCategory of affected) {
      categoriesPatch[affectedCategory.id] = {
        enabled: nextEnabled,
        channels: nextChannels,
      }
      for (const item of affectedCategory.notifications) {
        notificationsPatch[item.id] = {
          enabled: nextEnabled,
          channels: nextChannels,
        }
      }
    }

    update({ categories: categoriesPatch, notifications: notificationsPatch })

    // Inbox going from off to on is what prompts for browser alerts — whether
    // it was switched directly or pulled on by another category.
    if (nextEnabled && !inboxWasEnabled && INBOX_CATEGORY_ID in categoriesPatch) {
      setInboxAlertsOpen(true)
    }
  }

  const handleToggleCategoryChannel = (
    categoryId: string,
    channel: ChannelKey
  ) => {
    const current = getCategoryState(categoryId)
    const nextEnabled = !current.channels[channel]

    // Selecting a channel for a category turns the channel itself on if it was
    // off, the same way enabling any category pulls Inbox on. Without this the
    // switch would refuse to move: a channel the account has switched off
    // delivers nothing, so the category could never show it as selected.
    const channelsPatch =
      nextEnabled && !globalChannels[channel].enabled
        ? { [channel]: { enabled: true } }
        : undefined

    update({
      ...(channelsPatch ? { channels: channelsPatch } : {}),
      categories: {
        [categoryId]: { channels: { [channel]: nextEnabled } },
      },
    })
  }

  const handleToggleItemEnabled = (
    categoryId: string,
    notificationId: string
  ) => {
    const current = getItemState(categoryId, notificationId)
    const nextEnabled = !current.enabled
    const nextChannels: ScopedChannelState = nextEnabled
      ? {
          inApp: globalChannels.inApp.enabled,
          email: globalChannels.email.enabled,
          sms: globalChannels.sms.enabled,
        }
      : { ...EMPTY_CHANNELS }

    update({
      notifications: {
        [notificationId]: { enabled: nextEnabled, channels: nextChannels },
      },
    })
  }

  const handleToggleItemChannel = (
    notificationId: string,
    channel: ChannelKey
  ) => {
    if (!globalChannels[channel].enabled) return
    const current = preferences?.notifications?.[notificationId]
    const next = !(current?.channels?.[channel] ?? false)
    update({
      notifications: {
        [notificationId]: { channels: { [channel]: next } },
      },
    })
  }

  const handleConfirmReset = async () => {
    setResetLoading(true)
    try {
      await reset()
      toast({
        title: "Your notifications have been reset to default",
        variant: "success",
      })
    } catch (err: any) {
      toast({
        title:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to reset notifications",
        variant: "destructive",
      })
    } finally {
      setResetLoading(false)
    }
  }

  if (isLoading && !preferences) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 h-48 animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          Couldn&apos;t load your notification preferences. Please try again.
        </p>
      </div>
    )
  }


  return (
    <>
      {isSaving && (
        <p className="text-xs text-gray-400 mb-2 text-right">Saving…</p>
      )}

      {/* The categories now expand in place rather than replacing the screen,
          so the channels card and the list stay mounted throughout. */}
      <div className="space-y-6">
        <NotificationGlobalChannels
          channels={globalChannels}
          accountEmail={accountEmail}
          accountPhone={accountPhone}
          onToggleChannel={handleToggleGlobalChannel}
          onSetBrowserAlerts={handleSetBrowserAlerts}
          onSetEmailAddress={handleSetEmailAddress}
          onSetAccountPhone={handleSetAccountPhone}
        />

        <NotificationCategoriesList
          catalog={catalog}
          getCategoryState={getCategoryState}
          expandedCategory={expandedCategory}
          onToggleExpanded={(categoryId) =>
            setExpandedCategory((current) =>
              current === categoryId ? null : categoryId
            )
          }
          onToggleCategoryMaster={handleToggleCategoryMaster}
          onToggleCategoryChannel={handleToggleCategoryChannel}
          onRequestReset={() => setResetOpen(true)}
        />
      </div>

      <BrowserAlertsModal
        open={inboxAlertsOpen}
        mode="enable"
        onOpenChange={setInboxAlertsOpen}
        onConfirm={() => {
          handleSetBrowserAlerts(true)
          setInboxAlertsOpen(false)
        }}
      />

      <ResetDefaultsModal
        open={resetOpen}
        onOpenChange={setResetOpen}
        onConfirm={handleConfirmReset}
        isLoading={resetLoading}
      />
    </>
  )
}
