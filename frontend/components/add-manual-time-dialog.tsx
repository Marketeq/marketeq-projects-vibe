"use client"

import { useEffect, useMemo, useState } from "react"
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
import { getTasksForContract, type ContractTaskDTO } from "@/service/http/tasks"
import { getContractsForClient, getContractsForTalent, type ContractDTO } from "@/service/http/contracts"
import { useAuth } from "@/contexts/auth"

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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { toast } = useToast()
  const { user } = useAuth()
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
  // US-79.06: required-field errors only surface after a submit attempt, not
  // while the contractor is still filling the form out.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  // US-76.01/76.03/76.05: contracts are fetched fresh each time the modal
  // opens (not reused from a page-level fetch that may be stale), with a
  // real loading state in the dropdown and a retry on failure.
  const [contracts, setContracts] = useState<ContractDTO[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)
  const [contractsError, setContractsError] = useState(false)

  const loadContracts = () => {
    if (!user?.id) return
    setContractsLoading(true)
    setContractsError(false)
    const role = ((user as any).role?.toUpperCase?.() || (user as any).accountType?.toUpperCase?.() || "")
    const fetcher = role === "CLIENT" ? getContractsForClient : getContractsForTalent
    fetcher(user.id)
      .then((all) => setContracts(all.filter((c) => c.status === "active")))
      .catch(() => setContractsError(true))
      .finally(() => setContractsLoading(false))
  }

  useEffect(() => {
    if (!open) return
    // Reset per-open so a previous session's values/errors never leak into a
    // fresh Log Time attempt.
    setDate(""); setStartTime(""); setEndTime(""); setContract(""); setTask(""); setNotes("")
    setSubmitError(""); setAttemptedSubmit(false); setShowOverlapConfirm(false)
    loadContracts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id])

  // Real contract tasks for the selected contract — replaces a previous
  // hardcoded, non-functional task list unrelated to any actual contract.
  const [tasks, setTasks] = useState<ContractTaskDTO[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  useEffect(() => {
    setTask("")
    if (!contract) { setTasks([]); return }
    setTasksLoading(true)
    getTasksForContract(contract)
      .then((rows) => setTasks(rows.filter((t) => !t.archived)))
      .catch(() => setTasks([]))
      .finally(() => setTasksLoading(false))
  }, [contract])

  // US-79: inline, per-field validation — computed reactively so errors show
  // next to the relevant field, not just after a failed round-trip.
  const fieldErrors = useMemo(() => {
    const errors: { date?: string; time?: string; notes?: string } = {}
    if (date) {
      const entryDate = new Date(`${date}T00:00:00`)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const earliestAllowed = new Date(today); earliestAllowed.setDate(earliestAllowed.getDate() - MAX_PAST_DAYS)
      if (entryDate > today) {
        errors.date = "Future dates cannot be selected."
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

  // US-79.06: a distinct inline error under each empty required field, not
  // one generic banner — only shown once the contractor has attempted Submit.
  const requiredErrors = useMemo(() => {
    if (!attemptedSubmit) return {} as Record<string, string>
    const errors: Record<string, string> = {}
    if (!date) errors.date = "Date is required."
    if (!startTime) errors.startTime = "Start time is required."
    if (!endTime) errors.endTime = "End time is required."
    if (!contract) errors.contract = "Contract is required."
    return errors
  }, [attemptedSubmit, date, startTime, endTime, contract])

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean)
  const hasActiveContracts = !contractsLoading && !contractsError && contracts.length > 0

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
      // US-80.02: exact spec copy — the entry is submitted for confirmation,
      // not immediately reflected in earnings.
      toast({ title: "Time entry submitted.", description: "Earnings will appear once the session is confirmed." })
      onSaved?.()
    } catch (e: any) {
      const errorCode = e?.response?.data?.errorCode
      if (errorCode === "ERR_MANUAL_TIME_OVERLAP" && !confirmOverlap) {
        setShowOverlapConfirm(true)
      } else {
        // US-81.02: exact spec fallback copy when the backend doesn't supply
        // its own message.
        setSubmitError(e?.response?.data?.message ?? "Could not submit. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    setAttemptedSubmit(true)
    if (!date || !startTime || !endTime || !contract) return
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
                {(fieldErrors.date || requiredErrors.date) && (
                  <p className="text-xs text-red-600">{fieldErrors.date ?? requiredErrors.date}</p>
                )}
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
                  {requiredErrors.startTime && <p className="text-xs text-red-600">{requiredErrors.startTime}</p>}
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
                  {requiredErrors.endTime && <p className="text-xs text-red-600">{requiredErrors.endTime}</p>}
                </div>
              </div>
              {fieldErrors.time && <p className="text-xs text-red-600 -mt-2">{fieldErrors.time}</p>}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-dark-blue-400">
                  Contract
                </label>
                {/* US-77.01/77.03: the dropdown itself stays visible but
                    disabled when there are no active contracts — it is never
                    replaced or hidden, and the other fields stay enabled. */}
                {contractsError ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-xs text-red-600">Couldn't load your contracts.</p>
                    <button type="button" className="text-xs font-medium text-primary-600 underline" onClick={loadContracts}>
                      Retry
                    </button>
                  </div>
                ) : (
                  <Select
                    value={contract}
                    onValueChange={setContract}
                    disabled={contractsLoading || !hasActiveContracts}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          contractsLoading
                            ? "Loading contracts…"
                            : !hasActiveContracts
                              ? "You have no active contracts."
                              : "Select Contract"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {requiredErrors.contract && <p className="text-xs text-red-600">{requiredErrors.contract}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-dark-blue-400">
                  Task <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Select value={task} onValueChange={setTask} disabled={!contract || tasksLoading || tasks.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={
                      !contract ? "Select a contract first" : tasksLoading ? "Loading tasks…" : tasks.length === 0 ? "No tasks for this contract" : "Select Task"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
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
                disabled={(attemptedSubmit && (!date || !startTime || !endTime || !contract)) || hasFieldErrors || submitting}
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
