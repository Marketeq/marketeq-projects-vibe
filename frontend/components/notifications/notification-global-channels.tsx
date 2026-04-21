"use client"

import { useMemo, useState } from "react"
import { Edit01, Plus } from "@blend-metrics/icons"
import { Switch, useToast } from "@/components/ui"
import { cn } from "@/utils/functions"
import type {
  ChannelKey,
  GlobalChannelPrefs,
} from "@/service/http/notifications"
import {
  channelIcons,
  channelLabels,
  requestBrowserNotificationPermission,
} from "./shared"
import BrowserAlertsModal from "./modals/browser-alerts-modal"
import EditEmailModal from "./modals/edit-email-modal"
import EditPhoneModal from "./modals/edit-phone-modal"

interface Props {
  channels: GlobalChannelPrefs
  accountEmail: string
  accountPhone: string | null
  onToggleChannel: (channel: ChannelKey, next: boolean) => void
  onSetBrowserAlerts: (enabled: boolean) => void
  onSetEmailAddress: (address: string | null) => Promise<void>
  onSetAccountPhone: (phone: string | null) => Promise<void>
}

export default function NotificationGlobalChannels({
  channels,
  accountEmail,
  accountPhone,
  onToggleChannel,
  onSetBrowserAlerts,
  onSetEmailAddress,
  onSetAccountPhone,
}: Props) {
  const { toast } = useToast()
  const [browserMode, setBrowserMode] = useState<"enable" | "disable" | null>(null)
  const [browserLoading, setBrowserLoading] = useState(false)
  const [editEmailOpen, setEditEmailOpen] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [editPhoneOpen, setEditPhoneOpen] = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(false)

  const inAppDetail = useMemo(() => {
    const parts: Array<{ text: string; strike: boolean }> = [
      { text: "Bell", strike: !channels.inApp.bell },
      { text: "Popup", strike: !channels.inApp.popup },
      { text: "Browser", strike: !channels.inApp.browser },
    ]
    return parts
  }, [channels.inApp])

  const handleBrowserConfirm = async () => {
    setBrowserLoading(true)
    try {
      if (browserMode === "enable") {
        const result = await requestBrowserNotificationPermission()
        if (result !== "granted") {
          toast({
            title:
              result === "denied"
                ? "Browser notifications are blocked — enable them in your browser settings"
                : "Browser notification permission was dismissed",
            variant: "destructive",
          })
          setBrowserMode(null)
          return
        }
        onSetBrowserAlerts(true)
        toast({ title: "Browser alerts are now enabled" })
      } else {
        onSetBrowserAlerts(false)
        toast({ title: "Browser alerts are now disabled" })
      }
      setBrowserMode(null)
    } finally {
      setBrowserLoading(false)
    }
  }

  const handleSaveEmail = async (address: string | null) => {
    setEmailLoading(true)
    try {
      await onSetEmailAddress(address)
      toast({ title: "Your email has been updated" })
    } catch (err: any) {
      toast({
        title:
          err?.response?.data?.message || err?.message || "Failed to update email",
        variant: "destructive",
      })
    } finally {
      setEmailLoading(false)
    }
  }

  const handleSavePhone = async (phone: string | null) => {
    setPhoneLoading(true)
    try {
      await onSetAccountPhone(phone)
      toast({ title: phone ? "Your phone number has been updated" : "Phone number removed" })
    } catch (err: any) {
      toast({
        title:
          err?.response?.data?.message || err?.message || "Failed to update phone",
        variant: "destructive",
      })
    } finally {
      setPhoneLoading(false)
    }
  }

  const inAppBrowserBtn = channels.inApp.browser ? (
    <button
      type="button"
      onClick={() => setBrowserMode("disable")}
      className="hidden group-hover:inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600"
    >
      Disable Browser Alerts
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setBrowserMode("enable")}
      className="hidden group-hover:inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600"
    >
      Enable Browser Alerts
    </button>
  )

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5">
          <h3 className="text-base font-semibold text-dark-blue-400">
            Notifications by type
          </h3>
          <p className="text-sm text-gray-500">Control all notifications at once</p>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {/* In App */}
          <div
            className={cn(
              "group flex items-center gap-3 bg-gray-50 rounded-lg px-4 h-[52px]",
            )}
          >
            <InAppIcon />
            <span className="text-sm font-semibold text-dark-blue-400">
              {channelLabels.inApp}
            </span>
            <span className="flex-1" />
            <span
              className={cn(
                "text-xs text-gray-400 group-hover:hidden",
                !channels.inApp.enabled && "opacity-50",
              )}
            >
              {inAppDetail.map((part, i) => (
                <span key={part.text}>
                  <span className={part.strike ? "line-through" : ""}>
                    {part.text}
                  </span>
                  {i < inAppDetail.length - 1 ? ", " : ""}
                </span>
              ))}
            </span>
            {channels.inApp.enabled && inAppBrowserBtn}
            <Switch
              checked={channels.inApp.enabled}
              onCheckedChange={(v) => onToggleChannel("inApp", v)}
              size="sm"
            />
          </div>

          {/* Email */}
          <div className="group flex items-center gap-3 bg-gray-50 rounded-lg px-4 h-[52px]">
            <EmailIcon />
            <span className="text-sm font-semibold text-dark-blue-400">
              {channelLabels.email}
            </span>
            <span className="flex-1" />
            <span
              className={cn(
                "text-xs text-gray-400 group-hover:hidden",
                !channels.email.enabled && "opacity-50",
              )}
            >
              {channels.email.address ?? accountEmail}
            </span>
            {channels.email.enabled && (
              <button
                type="button"
                onClick={() => setEditEmailOpen(true)}
                className="hidden group-hover:inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600"
              >
                <Edit01 className="size-3.5" />
                Edit Email
              </button>
            )}
            <Switch
              checked={channels.email.enabled}
              onCheckedChange={(v) => onToggleChannel("email", v)}
              size="sm"
            />
          </div>

          {/* SMS / Text */}
          <div className="group flex items-center gap-3 bg-gray-50 rounded-lg px-4 h-[52px]">
            <SmsIcon />
            <span className="text-sm font-semibold text-dark-blue-400">
              {channelLabels.sms}
            </span>
            <span className="flex-1" />
            <span
              className={cn(
                "text-xs group-hover:hidden",
                accountPhone
                  ? "text-gray-400"
                  : "text-red-500",
                !channels.sms.enabled && "opacity-50",
              )}
            >
              {accountPhone ?? "Missing Phone Number"}
            </span>
            {accountPhone ? (
              <button
                type="button"
                onClick={() => setEditPhoneOpen(true)}
                className="hidden group-hover:inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600"
              >
                <Edit01 className="size-3.5" />
                Edit Phone Number
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditPhoneOpen(true)}
                className="hidden group-hover:inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600"
              >
                <Plus className="size-3.5" />
                Add Phone Number
              </button>
            )}
            <Switch
              checked={channels.sms.enabled && !!accountPhone}
              disabled={!accountPhone}
              onCheckedChange={(v) => {
                if (!accountPhone) {
                  setEditPhoneOpen(true)
                  return
                }
                onToggleChannel("sms", v)
              }}
              size="sm"
            />
          </div>
        </div>
      </div>

      <BrowserAlertsModal
        open={browserMode !== null}
        mode={browserMode ?? "enable"}
        onOpenChange={(open) => {
          if (!open) setBrowserMode(null)
        }}
        onConfirm={handleBrowserConfirm}
        isLoading={browserLoading}
      />

      <EditEmailModal
        open={editEmailOpen}
        onOpenChange={setEditEmailOpen}
        currentAddress={channels.email.address}
        accountEmail={accountEmail}
        onSave={handleSaveEmail}
        isLoading={emailLoading}
      />

      <EditPhoneModal
        open={editPhoneOpen}
        onOpenChange={setEditPhoneOpen}
        currentPhone={accountPhone}
        onSave={handleSavePhone}
        isLoading={phoneLoading}
      />
    </>
  )
}

function InAppIcon() {
  const Icon = channelIcons.inApp
  return <Icon className="size-5 text-gray-500" />
}
function EmailIcon() {
  const Icon = channelIcons.email
  return <Icon className="size-5 text-gray-500" />
}
function SmsIcon() {
  const Icon = channelIcons.sms
  return <Icon className="size-5 text-gray-500" />
}

