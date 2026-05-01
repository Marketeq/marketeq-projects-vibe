"use client"

import { useEffect, useState } from "react"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Textarea,
} from "@/components/ui"
import { blockUser } from "@/src/lib/api/blocks"

interface BlockConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUserId: string | null
  targetDisplayName?: string | null
  onBlocked?: () => void
}

export function BlockConfirmDialog({
  open,
  onOpenChange,
  targetUserId,
  targetDisplayName,
  onBlocked,
}: BlockConfirmDialogProps) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setReason("")
      setSubmitting(false)
      setError(null)
    }
  }, [open])

  const label = targetDisplayName?.trim() || "this user"

  const handleConfirm = async () => {
    if (!targetUserId) return
    setSubmitting(true)
    setError(null)
    try {
      await blockUser(targetUserId, reason.trim() || undefined)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("inbox:user-blocked", {
            detail: { blockedUserId: targetUserId },
          })
        )
      }
      onBlocked?.()
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to block user", err)
      setError("Could not block user. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-7 rounded-xl">
        <DialogTitle>Block {label}?</DialogTitle>
        <DialogDescription className="mt-2">
          They won&apos;t be able to message you, and your existing
          conversation will be hidden from your inbox.
        </DialogDescription>

        <div className="mt-5 flex flex-col gap-y-2">
          <label
            htmlFor="block-reason"
            className="text-sm font-medium text-dark-blue-400"
          >
            Reason (optional)
          </label>
          <Textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tell us why you&apos;re blocking this user"
            disabled={submitting}
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-error-500" role="alert">
            {error}
          </p>
        )}

        <div className="mt-7 grid grid-cols-2 gap-x-3">
          <DialogClose asChild>
            <Button visual="gray" variant="outlined" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            visual="error"
            onClick={handleConfirm}
            disabled={submitting || !targetUserId}
          >
            {submitting ? "Blocking..." : "Yes, Block"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
