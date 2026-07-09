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
import NotificationCategoriesList from "./notifications/notification-categories-list"
import NotificationCategoryDetail from "./notifications/notification-category-detail"
import NotificationGlobalChannels from "./notifications/notification-global-channels"
import { EMPTY_CHANNELS } from "./notifications/shared"

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
    update({ channels: { [channel]: { enabled: next } } })
    if (!next) {
      const categoriesPatch: Record<
        string,
        { channels: Partial<ScopedChannelState> }
      > = {}
      const notificationsPatch: Record<
        string,
        { channels: Partial<ScopedChannelState> }
      > = {}
      for (const category of catalog) {
        categoriesPatch[category.id] = { channels: { [channel]: false } }
        for (const item of category.notifications) {
          notificationsPatch[item.id] = { channels: { [channel]: false } }
        }
      }
      update({ categories: categoriesPatch, notifications: notificationsPatch })
    }
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

    update({
      categories: {
        [categoryId]: { enabled: nextEnabled, channels: nextChannels },
      },
      notifications: Object.fromEntries(
        category.notifications.map((item) => [
          item.id,
          { enabled: nextEnabled, channels: nextChannels },
        ])
      ),
    })
  }

  const handleToggleCategoryChannel = (
    categoryId: string,
    channel: ChannelKey
  ) => {
    if (!globalChannels[channel].enabled) return
    const current = getCategoryState(categoryId)
    update({
      categories: {
        [categoryId]: { channels: { [channel]: !current.channels[channel] } },
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

  const selectedCategory = catalog.find((c) => c.id === expandedCategory)

  return (
    <>
      {isSaving && (
        <p className="text-xs text-gray-400 mb-2 text-right">Saving…</p>
      )}

      {selectedCategory ? (
        <NotificationCategoryDetail
          category={selectedCategory}
          categoryState={getCategoryState(selectedCategory.id)}
          globalChannels={globalChannels}
          accountEmail={accountEmail}
          accountPhone={accountPhone}
          getItemState={(notificationId) =>
            getItemState(selectedCategory.id, notificationId)
          }
          onBack={() => setExpandedCategory(null)}
          onToggleCategoryMaster={() =>
            handleToggleCategoryMaster(selectedCategory.id)
          }
          onToggleCategoryChannel={(channel) =>
            handleToggleCategoryChannel(selectedCategory.id, channel)
          }
          onToggleItemEnabled={(notificationId) =>
            handleToggleItemEnabled(selectedCategory.id, notificationId)
          }
          onToggleItemChannel={(notificationId, channel) =>
            handleToggleItemChannel(notificationId, channel)
          }
        />
      ) : (
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
            onSelect={setExpandedCategory}
            onRequestReset={() => setResetOpen(true)}
          />
        </div>
      )}

      <ResetDefaultsModal
        open={resetOpen}
        onOpenChange={setResetOpen}
        onConfirm={handleConfirmReset}
        isLoading={resetLoading}
      />
    </>
  )
}
