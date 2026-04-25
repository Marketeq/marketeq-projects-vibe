"use client"

import { useState } from "react"
import { RefreshCcw01 } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  const [value, setValue] = useState(currentAddress ?? accountEmail ?? "")
  const [error, setError] = useState<string | null>(null)

  const differsFromAccount = value.trim().toLowerCase() !== accountEmail.toLowerCase()

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Enter a valid email address")
      return
    }
    setError(null)
    const next = trimmed.toLowerCase() === accountEmail.toLowerCase() ? null : trimmed
    await onSave(next)
    onOpenChange(false)
  }

  const handleResetToDefault = () => {
    setValue(accountEmail)
    setError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setValue(currentAddress ?? accountEmail ?? "")
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Email Address</DialogTitle>
          <DialogDescription className="sr-only">
            Change the email used for notifications
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label size="sm">You will receive notifications on this email</Label>
            {differsFromAccount && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600"
                    >
                      <RefreshCcw01 className="size-3.5" />
                      Reset To Default
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-center">
                    Reset to the email address you&apos;re using to log into your
                    Marketeq account
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Input
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="username@gmail.com"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter className="mt-6 flex gap-2 sm:gap-2">
          <Button
            variant="outlined"
            visual="gray"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
