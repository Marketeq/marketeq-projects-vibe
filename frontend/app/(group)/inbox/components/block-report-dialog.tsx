"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Send03 } from "@blend-metrics/icons"
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
import { reportUser } from "@/src/lib/api/reports"

type View = "choose" | "block" | "report"

interface BlockReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUserId: string | null
  targetDisplayName?: string | null
  contextThreadId?: string | null
  onBlocked?: () => void
  onReported?: () => void
}

export function BlockReportDialog({
  open,
  onOpenChange,
  targetUserId,
  targetDisplayName,
  contextThreadId,
  onBlocked,
  onReported,
}: BlockReportDialogProps) {
  const [view, setView] = useState<View>("choose")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [alreadyReported, setAlreadyReported] = useState(false)

  useEffect(() => {
    if (!open) {
      setView("choose")
      setReason("")
      setSubmitting(false)
      setError(null)
      setReportSuccess(false)
      setAlreadyReported(false)
    }
  }, [open])

  const label = targetDisplayName?.trim() || "this user"

  const handleBlock = async () => {
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

  const handleReport = async () => {
    if (!targetUserId) return
    const trimmed = reason.trim()
    if (!trimmed) {
      setError("Please provide a reason.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await reportUser(targetUserId, {
        reason: trimmed,
        contextThreadId: contextThreadId ?? undefined,
      })
      onReported?.()
      setAlreadyReported(!!result.wasAlreadyReported)
      setReportSuccess(true)
      setSubmitting(false)
    } catch (err) {
      console.error("Failed to report user", err)
      setError("Could not submit report. Please try again.")
      setSubmitting(false)
    }
  }

  const goTo = (next: View) => {
    setView(next)
    setReason("")
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-7 rounded-xl">
        {view === "choose" && (
          <>
            <DialogTitle>Block or report {label}?</DialogTitle>
            <DialogDescription className="mt-2">
              Choose what you&apos;d like to do.
            </DialogDescription>
            <div className="mt-6 flex flex-col gap-y-3">
              <Button
                visual="gray"
                variant="outlined"
                onClick={() => goTo("block")}
                disabled={!targetUserId}
              >
                <AlertTriangle className="size-4" /> Block this user
              </Button>
              <Button
                visual="gray"
                variant="outlined"
                onClick={() => goTo("report")}
                disabled={!targetUserId}
              >
                <Send03 className="size-4" /> Report this user
              </Button>
            </div>
            <div className="mt-5 flex justify-end">
              <DialogClose asChild>
                <Button visual="gray" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
            </div>
          </>
        )}

        {view === "block" && (
          <>
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
              <Button
                visual="gray"
                variant="outlined"
                onClick={() => goTo("choose")}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                visual="error"
                onClick={handleBlock}
                disabled={submitting || !targetUserId}
              >
                {submitting ? "Blocking..." : "Yes, Block"}
              </Button>
            </div>
          </>
        )}

        {view === "report" && reportSuccess && (
          <>
            <DialogTitle>
              {alreadyReported ? "Already reported" : "Report submitted"}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {alreadyReported
                ? "You've already reported this. Our moderation team is reviewing it."
                : "Thanks for flagging this. Our moderation team will review it shortly."}
            </DialogDescription>
            <div className="mt-7 flex justify-end">
              <DialogClose asChild>
                <Button visual="primary">Done</Button>
              </DialogClose>
            </div>
          </>
        )}

        {view === "report" && !reportSuccess && (
          <>
            <DialogTitle>Report {label}</DialogTitle>
            <DialogDescription className="mt-2">
              Tell us what happened. Our moderation team will review your
              report.
            </DialogDescription>

            <div className="mt-5 flex flex-col gap-y-2">
              <label
                htmlFor="report-reason"
                className="text-sm font-medium text-dark-blue-400"
              >
                Reason
              </label>
              <Textarea
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="e.g. attempted to take this off-platform, sending spam, harassment..."
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-error-500" role="alert">
                {error}
              </p>
            )}

            <div className="mt-7 grid grid-cols-2 gap-x-3">
              <Button
                visual="gray"
                variant="outlined"
                onClick={() => goTo("choose")}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                visual="primary"
                onClick={handleReport}
                disabled={submitting || !targetUserId || !reason.trim()}
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
