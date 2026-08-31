"use client"

/**
 * Phone Verification — Figma node 13753-131112.
 *
 * The three modal states from the frame: enter the number (with the invalid
 * state), "Please check your phone" after the link is sent, and the success
 * card confirming the recovery number was saved.
 *
 * The number is persisted through the same `PATCH /user/phone` endpoint the
 * account settings use, so the dashboard and settings agree on one value.
 */

import { useEffect, useState } from "react"
import { UserAPI } from "@/service/http/user"
import { CheckCircle, Send01, X } from "@blend-metrics/icons"
import { PhoneNumberInput, isPhoneValid } from "@/components/phone-number-input"
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  ErrorMessage,
  IconButton,
} from "@/components/ui"

type Stage = "enter" | "sent" | "success"

export const PhoneVerificationDialog = ({
  open,
  onOpenChange,
  defaultPhone = "",
  onVerified,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fills the field with the number already on the account. */
  defaultPhone?: string | null
  /** Fires once the number has been saved, so callers can refetch. */
  onVerified?: (phone: string) => void
}) => {
  const [stage, setStage] = useState<Stage>("enter")
  const [phone, setPhone] = useState(defaultPhone ?? "")
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  // Reset back to the first state whenever the dialog is reopened, so a
  // previous run's "check your phone" screen is never what greets the user.
  useEffect(() => {
    if (open) {
      setStage("enter")
      setPhone(defaultPhone ?? "")
      setSaveAttempted(false)
      setSaveError("")
    }
  }, [open, defaultPhone])

  const lastFour = phone.replace(/\D/g, "").slice(-4) || "0000"

  const sendLink = () => {
    if (!isPhoneValid(phone)) {
      setSaveAttempted(true)
      return
    }
    setSaving(true)
    setSaveError("")
    UserAPI.updatePhone(phone)
      .then(() => {
        onVerified?.(phone)
        setStage("sent")
      })
      .catch(() => setSaveError("The number could not be saved. Try again."))
      .finally(() => setSaving(false))
  }

  if (stage === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[343px] rounded-[12px] p-[50px]">
          <div className="flex flex-col items-center gap-y-5">
            <div className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border-8 border-success-50 bg-success-100 text-success-500">
              <CheckCircle className="size-6" />
            </div>
            <div className="space-y-2 text-center">
              <DialogTitle asChild>
                <h1 className="text-lg font-semibold text-gray-900">
                  Successfully added account recovery number
                </h1>
              </DialogTitle>
              <p className="text-sm leading-5 text-gray-500">
                Your recovery number is saved and ready to use if you ever need
                to recover your account.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[740px] gap-0 p-0">
        <div className="px-6 pb-[50px] pt-6">
          <div className="flex items-start justify-between gap-x-2">
            <div className="flex-auto space-y-2">
              <DialogTitle asChild>
                <h1 className="text-lg font-semibold leading-7 text-dark-blue-400">
                  {stage === "sent"
                    ? "Please check your phone"
                    : "Phone Verification"}
                </h1>
              </DialogTitle>
              {stage === "sent" ? (
                <p className="text-sm font-light leading-5 text-dark-blue-400">
                  We sent a magic link sent to phone number ending with{" "}
                  <span className="font-bold">{lastFour}</span>.
                  <br />
                  The link will expire in{" "}
                  <span className="font-bold">24 hours</span>.
                </p>
              ) : (
                <p className="text-sm font-light leading-5 text-dark-blue-400">
                  Enter your phone number and we&apos;ll send a magic link to
                  the number entered. You&apos;ll be able to use this number if
                  you ever need to recover your account.
                </p>
              )}
            </div>
            <IconButton
              variant="ghost"
              visual="gray"
              size="sm"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-5" />
            </IconButton>
          </div>

          {stage === "enter" && (
            <div className="mt-8">
              <PhoneNumberInput
                defaultCountry="us"
                value={phone}
                onChange={(value) => setPhone(value)}
              />
              {saveAttempted && !isPhoneValid(phone) && (
                <ErrorMessage size="sm" className="mt-1.5">
                  Invalid phone number
                </ErrorMessage>
              )}
              {saveError && (
                <ErrorMessage size="sm" className="mt-1.5">
                  {saveError}
                </ErrorMessage>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-b-[12px] border-t border-gray-200 bg-gray-25 px-6 py-4">
          <Button
            variant="link"
            visual="gray"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-[15px]" /> Cancel
          </Button>
          {stage === "sent" ? (
            <Button size="sm" onClick={() => setStage("success")}>
              Resend Link
            </Button>
          ) : (
            <Button size="sm" onClick={sendLink} disabled={saving}>
              <Send01 className="size-[15px]" /> Send Link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
