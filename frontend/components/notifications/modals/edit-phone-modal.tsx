"use client"

import { useState } from "react"
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
} from "@/components/ui"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPhone: string | null
  onSave: (phone: string | null) => Promise<void> | void
  isLoading?: boolean
}

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/

export default function EditPhoneModal({
  open,
  onOpenChange,
  currentPhone,
  onSave,
  isLoading,
}: Props) {
  const [value, setValue] = useState(currentPhone ?? "")
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      await onSave(null)
      onOpenChange(false)
      return
    }
    const normalized = trimmed.replace(/[\s()\-]/g, "")
    if (!PHONE_REGEX.test(normalized)) {
      setError(
        "Enter a valid phone number with country code, e.g. +15551234567"
      )
      return
    }
    setError(null)
    await onSave(normalized)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setValue(currentPhone ?? "")
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentPhone ? "Edit Phone Number" : "Add Phone Number"}
          </DialogTitle>
          <DialogDescription>
            Used for SMS notifications and security alerts
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          <Label size="sm">Phone Number</Label>
          <Input
            type="tel"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="+1 (555) 123-4567"
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
