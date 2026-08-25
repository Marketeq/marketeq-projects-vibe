"use client"

import { useMemo, useState } from "react"
import type {
  ChannelKey,
  GlobalChannelPrefs,
} from "@/service/http/notifications"
import { cn } from "@/utils/functions"
import { Edit01, Plus } from "@blend-metrics/icons"
import { Button, Switch, useToast } from "@/components/ui"
import BrowserAlertsModal from "./modals/browser-alerts-modal"
import EditEmailModal from "./modals/edit-email-modal"
import EditPhoneModal from "./modals/edit-phone-modal"
import {
  SMS_ENABLED,
  channelIcons,
  channelLabels,
  requestBrowserNotificationPermission,
} from "./shared"

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
  const [browserMode, setBrowserMode] = useState<"enable" | "disable" | null>(
    null
  )
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
        toast({ title: "Browser alerts are now enabled", variant: "success" })
      } else {
        onSetBrowserAlerts(false)
        toast({ title: "Browser alerts are now disabled", variant: "success" })
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
      toast({ title: "Your email has been updated", variant: "success" })
    } catch (err: any) {
      toast({
        title:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update email",
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
      toast({
        title: phone
          ? "Your phone number has been updated"
          : "Phone number removed",
        variant: "success",
      })
    } catch (err: any) {
      toast({
        title:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update phone",
        variant: "destructive",
      })
    } finally {
      setPhoneLoading(false)
    }
  }

  const inAppBrowserBtn = channels.inApp.browser ? (
    <Button
      type="button"
      visual="gray"
      variant="outlined"
      size="sm"
      onClick={() => setBrowserMode("disable")}
      className="hidden group-hover:inline-flex"
    >
      Disable Browser Alerts
    </Button>
  ) : (
    <Button
      type="button"
      visual="gray"
      variant="outlined"
      size="sm"
      onClick={() => setBrowserMode("enable")}
      className="hidden group-hover:inline-flex"
    >
      Enable Browser Alerts
    </Button>
  )

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5">
          <h3 className="text-base font-semibold text-dark-blue-400">
            Notifications by type
          </h3>
          <p className="text-sm text-gray-500">
            Control all notifications at once
          </p>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {/* In App */}
          <div
            className={cn(
              "group flex items-center gap-3 bg-gray-50 rounded-lg px-4 h-[52px]"
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
                !channels.inApp.enabled && "opacity-50"
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
                !channels.email.enabled && "opacity-50"
              )}
            >
              {channels.email.address ?? accountEmail}
            </span>
            {channels.email.enabled && (
              <Button
                type="button"
                visual="gray"
                variant="outlined"
                size="sm"
                leftIcon={<Edit01 className="size-3.5" />}
                onClick={() => setEditEmailOpen(true)}
                className="hidden group-hover:inline-flex"
              >
                Edit Email
              </Button>
            )}
            <Switch
              checked={channels.email.enabled}
              onCheckedChange={(v) => onToggleChannel("email", v)}
              size="sm"
            />
          </div>

          {/* SMS / Text */}
          <div className="group flex items-center gap-3 bg-gray-50 rounded-lg px-4 h-[52px] opacity-60">
            <SmsIcon />
            <span className="text-sm font-semibold text-dark-blue-400">
              {channelLabels.sms}
            </span>
            <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
              Coming soon
            </span>
            <span className="flex-1" />
            <Switch checked={false} disabled size="sm" />
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
