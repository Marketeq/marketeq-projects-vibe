"use client"

import { useEffect, useState } from "react"
import { Mail01, RefreshCcw01 } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  Input,
  InputGroup,
  InputLeftElement,
} from "@/components/ui"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAddress: string | null
  accountEmail: string
  onSave: (address: string | null) => Promise<void> | void
  isLoading?: boolean
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EditEmailModal({
  open,
  onOpenChange,
  currentAddress,
  accountEmail,
  onSave,
  isLoading,
}: Props) {
  // "Default" is the address you log in with; a notification address is only
  // stored once it diverges from that.
  const saved = currentAddress ?? accountEmail ?? ""
  const [value, setValue] = useState(saved)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValue(saved)
      setError(null)
    }
  }, [open, saved])

  const isDirty = value.trim() !== saved
  const canReset = value.trim().toLowerCase() !== accountEmail.toLowerCase()

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Enter a valid email address")
      return
    }
    setError(null)
    // Storing the account address as an override would silently pin the
    // notification address if the login email later changed.
    await onSave(
      trimmed.toLowerCase() === accountEmail.toLowerCase() ? null : trimmed
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[404px] max-w-[calc(100vw-2rem)] gap-0 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
        dialogOverlay={
          <DialogOverlay className="bg-gray-700/50 backdrop-blur-[8px]" />
        }
      >
        <DialogTitle className="text-base leading-6 font-semibold text-dark-blue-400">
          Edit Email Address
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-5 font-light text-dark-blue-400">
          You will receive notifications to this email
        </DialogDescription>

        <div className="mt-5">
          <InputGroup>
            <InputLeftElement>
              <Mail01 className="size-4 text-gray-400" />
            </InputLeftElement>
            <Input
              type="email"
              className="pl-9"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError(null)
              }}
              placeholder="you@email.com"
              isInvalid={Boolean(error)}
              autoFocus
            />
          </InputGroup>
          {error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          {canReset ? (
            <Button
              type="button"
              variant="link"
              visual="gray"
              size="sm"
              className="h-5 p-0"
              onClick={() => {
                setValue(accountEmail)
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
              disabled={isLoading || value.trim().length === 0 || !isDirty}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
