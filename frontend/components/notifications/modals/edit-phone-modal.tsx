"use client"

import { useEffect, useState } from "react"
import { RefreshCcw01 } from "@blend-metrics/icons"
import {
  PhoneNumberInput,
  isPhoneValid,
} from "@/components/phone-number-input"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPhone: string | null
  onSave: (phone: string | null) => Promise<void> | void
  isLoading?: boolean
}

export default function EditPhoneModal({
  open,
  onOpenChange,
  currentPhone,
  onSave,
  isLoading,
}: Props) {
  const saved = currentPhone ?? ""
  const [value, setValue] = useState(saved)
  const [error, setError] = useState<string | null>(null)

  // The saved number can change under an open dialog — saving here writes it
  // back to the account, and Personal Info edits the same field.
  useEffect(() => {
    if (open) {
      setValue(saved)
      setError(null)
    }
  }, [open, saved])

  // A phone input pre-fills the dial code, so "empty" is "+1", not "". Treating
  // it as typed content would enable Save on an untouched Add dialog.
  const digits = value.replace(/\D/g, "")
  const isEmpty = digits.length <= 1
  const isDirty = value !== saved

  const handleSave = async () => {
    if (!isPhoneValid(value)) {
      setError("Enter a valid phone number")
      return
    }
    setError(null)
    await onSave(value)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[404px] max-w-[calc(100vw-2rem)] gap-0 overflow-visible p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
        dialogOverlay={
          <DialogOverlay className="bg-gray-700/50 backdrop-blur-[8px]" />
        }
      >
        <DialogTitle className="text-base leading-6 font-semibold text-dark-blue-400">
          {currentPhone ? "Edit Phone Number" : "Add Phone Number"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-5 font-light text-dark-blue-400">
          You will receive notifications to this phone number
        </DialogDescription>

        <div className="mt-5">
          <PhoneNumberInput
            defaultCountry="us"
            placeholder="+1 (555) 000-0000"
            disableDialCodePrefill
            value={value}
            onChange={(v) => {
              setValue(v)
              setError(null)
            }}
            invalid={Boolean(error)}
          />
          {error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}
        </div>

        {/* Reset sits opposite the actions and only once there is something to
            reset — on an untouched dialog it would be a no-op control. */}
        <div className="mt-6 flex items-center justify-between gap-4">
          {isDirty ? (
            <Button
              type="button"
              variant="link"
              visual="gray"
              size="sm"
              className="h-5 p-0"
              onClick={() => {
                setValue(saved)
                setError(null)
              }}
              disabled={isLoading}
              leftIcon={<RefreshCcw01 className="size-3.5" />}
            >
              Reset to default
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isLoading || isEmpty || !isDirty}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
