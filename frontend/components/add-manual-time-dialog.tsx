"use client"

import { useMemo, useState } from "react"
import { HelpCircle } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from "@/components/ui"
import { createManualTime } from "@/service/http/manual-time"

const MAX_DURATION_HOURS = 12
const MAX_PAST_DAYS = 90
const MAX_NOTES_LENGTH = 500

// F-10 Log Time Modal (US-75–81). Shared between the Time Tracking screen and
// the Earnings tabs (US-75: reachable from within the Earnings area, not just
// by navigating away to /time-tracking).
export function AddManualTimeDialog({
  open,
  onOpenChange,
  onSaved,
  contracts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
  contracts?: Array<{ id: string; title: string }>
}) {
  const { toast } = useToast()
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [contract, setContract] = useState("")
  const [task, setTask] = useState("")
  const [notes, setNotes] = useState("")
  // US-81: submission failure must surface inline in the modal, not just as
  // an external toast that can be missed while the modal stays open.
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  // US-78: overlap is a soft, dismissible warning ("You have an overlapping
  // entry. Continue?"), not a hard block — shown only after Submit, never on
  // field change, and the contractor can Proceed or Cancel.
  const [showOverlapConfirm, setShowOverlapConfirm] = useState(false)

  // US-79: inline, per-field validation — computed reactively so errors show
  // next to the relevant field, not just after a failed round-trip.
  const fieldErrors = useMemo(() => {
    const errors: { date?: string; time?: string; notes?: string } = {}
    if (date) {
      const entryDate = new Date(`${date}T00:00:00`)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const earliestAllowed = new Date(today); earliestAllowed.setDate(earliestAllowed.getDate() - MAX_PAST_DAYS)
      if (entryDate > today) {
        errors.date = "Select a valid date within the allowed range."
      } else if (entryDate < earliestAllowed) {
        errors.date = "Select a valid date within the allowed range."
      }
    }
    if (startTime && endTime && date) {
      const startISO = new Date(`${date}T${startTime}:00`)
      const endISO = new Date(`${date}T${endTime}:00`)
      if (endISO <= startISO) {
        errors.time = "Start time must be before end time."
      } else {
        const durationHours = (endISO.getTime() - startISO.getTime()) / (1000 * 60 * 60)
        if (durationHours > MAX_DURATION_HOURS) {
          errors.time = "Entries cannot exceed 12 hours."
        }
      }
    }
    if (notes.length > MAX_NOTES_LENGTH) {
      errors.notes = "Maximum 500 characters."
    }
    return errors
  }, [date, startTime, endTime, notes])

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean)

  const buildPayload = (confirmOverlap?: boolean) => ({
    startTime: new Date(`${date}T${startTime}:00`).toISOString(),
    endTime: new Date(`${date}T${endTime}:00`).toISOString(),
    contractId: contract,
    taskId: task || undefined,
    notes: notes || undefined,
    confirmOverlap,
  })

  const finishSubmit = async (confirmOverlap?: boolean) => {
    setSubmitting(true)
    setSubmitError("")
    try {
      await createManualTime(buildPayload(confirmOverlap))
      setShowOverlapConfirm(false)
      onOpenChange(false)
      // US-80: manual time is submitted for confirmation, not
      // immediately reflected in earnings — say so explicitly.
      toast({ title: "Manual time added", description: `${startTime} – ${endTime}. Your earnings will appear once this session is confirmed.` })
      onSaved?.()
    } catch (e: any) {
      const errorCode = e?.response?.data?.errorCode
      if (errorCode === "ERR_MANUAL_TIME_OVERLAP" && !confirmOverlap) {
        setShowOverlapConfirm(true)
      } else {
        setSubmitError(e?.response?.data?.message ?? "Failed to add manual time. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    // US-79.06: per-field errors on submit for empty required fields, not
    // just a disabled button with no explanation.
    if (!date || !startTime || !endTime || !contract) {
      setSubmitError("Please fill in all required fields.")
      return
    }
    if (hasFieldErrors) return
    finishSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {showOverlapConfirm ? (
          // US-78.02/78.03: soft confirmation — Proceed submits with
          // confirmOverlap: true, Cancel returns to the form untouched.
          <div className="py-4 text-center space-y-4">
            <h3 className="text-base font-semibold text-dark-blue-400">You have an overlapping entry. Continue?</h3>
            <p className="text-sm text-gray-500">This time range overlaps another entry you've already logged for this contract.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outlined" visual="gray" onClick={() => setShowOverlapConfirm(false)}>Cancel</Button>
              <Button onClick={() => finishSubmit(true)} disabled={submitting}>
                {submitting ? "Adding…" : "Continue"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Manual Time</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-dark-blue-400">
                  Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Select Date"
                />
                {fieldErrors.date && <p className="text-xs text-red-600">{fieldErrors.date}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-dark-blue-400">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="Enter start time"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-dark-blue-400">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="Enter end time"
                  />
                </div>
              </div>
              {fieldErrors.time && <p className="text-xs text-red-600 -mt-2">{fieldErrors.time}</p>}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-dark-blue-400">
                  Contract
                </label>
                {/* US-77: explain why the picker is empty rather than showing a
                    Select with no options and no explanation. */}
                {(contracts || []).length === 0 ? (
                  <p className="text-sm text-gray-400">
                    You don&apos;t have any active contracts to log time against.
                  </p>
                ) : (
                  <Select value={contract} onValueChange={setContract}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Contract" />
                    </SelectTrigger>
                    <SelectContent>
                      {(contracts || []).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-dark-blue-400">
                  Task
                </label>
                <Select value={task} onValueChange={setTask}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editing">Editing Layouts</SelectItem>
                    <SelectItem value="logo">Creating logo</SelectItem>
                    <SelectItem value="wireframes">Wireframing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-dark-blue-400">
                  Notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell us what you worked on"
                  rows={3}
                />
                {fieldErrors.notes ? (
                  <p className="text-xs text-red-600">{fieldErrors.notes}</p>
                ) : (
                  <p className="text-xs text-gray-400 text-right">{notes.length}/{MAX_NOTES_LENGTH}</p>
                )}
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <HelpCircle className="size-3.5 flex-none" />
                Manual time will appear in your timeline without screenshots and may
                be subject to review or approval.
              </p>
            </div>

            {submitError && (
              <p className="text-sm text-red-600 px-1">{submitError}</p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outlined" visual="gray">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                disabled={!date || !startTime || !endTime || !contract || hasFieldErrors || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Adding…" : "Save"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
