"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui"

interface TaskOption {
  id: string
  name: string
}

interface ContractOption {
  id: string
  name: string
  clientHandle?: string
  avatarSrc?: string
  tasks?: TaskOption[]
}

export interface ManualTimeSubmission {
  contractId: string
  taskId?: string
  /** ISO-8601 UTC instants built from the local date + times the user picked. */
  startTime: string
  endTime: string
  notes: string
  confirmOverlap?: boolean
}

export type ManualTimeSubmitResult =
  | { ok: true }
  | { ok: false; code?: string; message: string }

interface ManualTimeFormProps {
  contracts?: ContractOption[]
  onCancel?: () => void
  /** Resolves once the backend has answered; the form stays open on failure. */
  onSubmit?: (data: ManualTimeSubmission) => Promise<ManualTimeSubmitResult>
  className?: string
}

// Mirrors CreateManualTimeDto's server-side rules (manual-time.service.ts) so
// the user sees the problem inline before submitting; the server still has
// the final say and its message is shown if it disagrees.
const MAX_PAST_DAYS = 14
const MAX_DURATION_HOURS = 24
const MIN_NOTES = 10
const MAX_NOTES = 500

// Notes are counted in visible characters (graphemes), not UTF-16 units, so
// any emoji — ❤️, 👍🏽, 🇮🇳, 👨‍👩‍👧 — counts as one (matches the backend's
// 500-character limit) and is never cut in half.
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" })
const toChars = (s: string) => Array.from(graphemes.segment(s), (g) => g.segment)
const charCount = (s: string) => toChars(s).length
const clampChars = (s: string, max: number) => toChars(s).slice(0, max).join("")

// AC-092.1 — exact wording from doc 03/08.
const REVIEW_NOTE =
  "Manual time requires client approval and is not covered by Hourly Protection. Use the timer when possible."

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12.5 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function localDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function ManualTimeForm({
  contracts = [],
  onCancel,
  onSubmit,
  className,
}: ManualTimeFormProps) {
  const [contractId, setContractId] = React.useState("")
  const [taskId, setTaskId] = React.useState("")
  const [showDropdown, setShowDropdown] = React.useState(false)
  const [showTaskDropdown, setShowTaskDropdown] = React.useState(false)
  const [date, setDate] = React.useState(() => localDateInputValue(new Date()))
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("10:00")
  const [notes, setNotes] = React.useState("")
  const [showDiscard, setShowDiscard] = React.useState(false)
  const [touched, setTouched] = React.useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [overlapPrompt, setOverlapPrompt] = React.useState<string | null>(null)

  const markTouched = (field: string) => setTouched((prev) => new Set(prev).add(field))

  const selectedContract = contracts.find((c) => c.id === contractId)
  const contractTasks = selectedContract?.tasks ?? []
  const selectedTask = contractTasks.find((t) => t.id === taskId)
  const hasUnsavedWork = notes.trim().length > 0

  const handleCancel = () => {
    if (hasUnsavedWork) {
      setShowDiscard(true)
    } else {
      onCancel?.()
    }
  }

  // Local wall-clock → real instants (the backend stores UTC). An end time
  // earlier than the start is an overnight shift (10 PM – 2 AM), so the end
  // falls on the next day; the 12-hour cap below still applies.
  const start = new Date(`${date}T${startTime}:00`)
  const end = new Date(`${date}T${endTime}:00`)
  if (endTime < startTime) end.setDate(end.getDate() + 1)
  const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
  const durationText = totalMinutes > 0
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : "—"

  const now = Date.now()
  const rangeError =
    !(totalMinutes > 0)
      ? "End time must be after start time"
      : end.getTime() > now
        ? "Entries cannot be logged for a future date or time"
        : start.getTime() < now - MAX_PAST_DAYS * 24 * 60 * 60 * 1000
          ? `Entries cannot start more than ${MAX_PAST_DAYS} days in the past`
          : totalMinutes > MAX_DURATION_HOURS * 60
            ? `A single entry cannot exceed ${MAX_DURATION_HOURS} hours`
            : null
  const notesError = notes.trim().length < MIN_NOTES
    ? `Please describe this time in at least ${MIN_NOTES} characters`
    : null

  const canSubmit = !!contractId && !!date && !rangeError && !notesError && !submitting

  // Field errors — only shown after user interacts with each field
  const errors = {
    contract: touched.has("contract") && !contractId,
    time: touched.has("endTime") ? rangeError : null,
    notes: touched.has("notes") ? notesError : null,
  }

  const submit = async (confirmOverlap = false) => {
    if (!onSubmit || !canSubmit) return
    setSubmitting(true)
    setServerError(null)
    try {
      const result = await onSubmit({
        contractId,
        taskId: taskId || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: notes.trim(),
        confirmOverlap: confirmOverlap || undefined,
      })
      if (!result.ok) {
        // The backend's soft overlap warning: confirm, then resubmit.
        if (result.code === "ERR_MANUAL_TIME_OVERLAP") setOverlapPrompt(result.message)
        else setServerError(result.message)
      }
    } catch {
      setServerError("We couldn't submit this time. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col flex-1 min-h-0 h-full", className)}>
      {/* Discard confirmation overlay */}
      {showDiscard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-6 w-full max-w-[280px] rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-dark-blue-400 mb-1.5">Discard this entry?</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              You haven&apos;t saved your manual time entry. Discard it?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowDiscard(false)}
                className="rounded-[5px] border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowDiscard(false); onCancel?.() }}
                className="rounded-[5px] bg-red-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-600 transition"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlap confirmation overlay — the backend's soft warning */}
      {overlapPrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-6 w-full max-w-[280px] rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-dark-blue-400 mb-1.5">Overlapping entry</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">{overlapPrompt}</p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setOverlapPrompt(null)}
                className="rounded-[5px] border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { setOverlapPrompt(null); void submit(true) }}
                className="rounded-[5px] bg-primary-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-600 transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-header: back arrow + title centered */}
      <div className="flex items-center px-4 py-3">
        <button onClick={handleCancel} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-dark-blue-400 transition">
          <BackArrowIcon className="h-5 w-5" />
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-dark-blue-400">
          Add Manual Time
        </span>
        <div className="w-5" />
      </div>

      {/* Form body */}
      <div className="flex-1 px-4 py-3 space-y-5 overflow-y-auto">
        {/* Contract field — custom dropdown matching NewTaskForm */}
        <div className="relative">
          <label className="block text-sm font-semibold text-dark-blue-400 mb-1.5">
            Contract
          </label>
          <button
            onClick={() => { setShowDropdown(!showDropdown); setShowTaskDropdown(false); markTouched("contract") }}
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-[5px] border bg-white px-3.5 text-sm shadow-xs transition",
              errors.contract
                ? "border-error-300 ring-2 ring-error-50"
                : showDropdown
                ? "border-primary-300 ring-2 ring-primary-50"
                : "border-gray-300 hover:border-gray-400"
            )}
          >
            {selectedContract ? (
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <Avatar size="xs" className="shrink-0">
                  <AvatarImage src={selectedContract.avatarSrc} alt={selectedContract.name} />
                  <AvatarFallback>{selectedContract.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-dark-blue-400 truncate">
                  {selectedContract.name}
                  {selectedContract.clientHandle && (
                    <span className="text-xs text-gray-500 ml-1">@{selectedContract.clientHandle}</span>
                  )}
                </span>
              </div>
            ) : (
              <span className="text-gray-500">Select Contract</span>
            )}
            <ChevronDownIcon className={cn("h-4 w-4 text-gray-400 shrink-0 ml-3 transition-transform", showDropdown && "rotate-180")} />
          </button>
          {errors.contract && (
            <p className="text-xs text-error-500 mt-1">Please select a contract</p>
          )}
          {showDropdown && contracts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-100 bg-white py-1 shadow-lg z-10 max-h-[160px] overflow-y-auto">
              {contracts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (c.id !== contractId) setTaskId("")
                    setContractId(c.id)
                    setShowDropdown(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 transition",
                    c.id === contractId ? "bg-primary-25" : ""
                  )}
                >
                  <Avatar size="xs">
                    <AvatarImage src={c.avatarSrc} alt={c.name} />
                    <AvatarFallback>{c.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-dark-blue-400 truncate leading-5">{c.name}</p>
                    {c.clientHandle && (
                      <p className="text-xs text-gray-400 leading-4">@{c.clientHandle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Task field (AC-088.2) — optional; lists the chosen contract's tasks */}
        <div className="relative">
          <label className="block text-sm font-semibold text-dark-blue-400 mb-1.5">
            Task
          </label>
          <button
            disabled={!selectedContract}
            onClick={() => { setShowTaskDropdown(!showTaskDropdown); setShowDropdown(false) }}
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-[5px] border bg-white px-3.5 text-sm shadow-xs transition disabled:cursor-not-allowed disabled:bg-gray-50",
              showTaskDropdown
                ? "border-primary-300 ring-2 ring-primary-50"
                : "border-gray-300 hover:border-gray-400"
            )}
          >
            {selectedTask ? (
              <span className="text-sm text-dark-blue-400 truncate">{selectedTask.name}</span>
            ) : (
              <span className="text-gray-500">{selectedContract ? "Select Task" : "Select a contract first"}</span>
            )}
            <ChevronDownIcon className={cn("h-4 w-4 text-gray-400 shrink-0 ml-3 transition-transform", showTaskDropdown && "rotate-180")} />
          </button>
          {showTaskDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-100 bg-white py-1 shadow-lg z-10 max-h-[160px] overflow-y-auto">
              {contractTasks.length === 0 ? (
                <p className="px-3.5 py-2.5 text-xs text-gray-400">This contract doesn&apos;t have any tasks yet.</p>
              ) : (
                contractTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTaskId(t.id); setShowTaskDropdown(false) }}
                    className={cn(
                      "flex w-full items-center px-3.5 py-2.5 text-left hover:bg-gray-50 transition",
                      t.id === taskId ? "bg-primary-25" : ""
                    )}
                  >
                    <span className="text-sm font-medium text-dark-blue-400 truncate leading-5">{t.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-dark-blue-400 mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={date}
            max={localDateInputValue(new Date())}
            onChange={(e) => { setDate(e.target.value); markTouched("endTime") }}
            className="h-11 w-full rounded-[5px] border border-gray-300 bg-white px-3.5 text-sm text-dark-blue-400 shadow-xs focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
          />
        </div>

        {/* Start / End time row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-dark-blue-400 mb-1.5">
              Start Time
            </label>
            <input
              type="time"
              step={60}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={() => markTouched("endTime")}
              className={cn(
                "h-11 w-full rounded-[5px] border bg-white px-3.5 text-sm text-dark-blue-400 shadow-xs focus-visible:outline-none",
                errors.time
                  ? "border-error-300 focus:border-error-300 focus:ring-2 focus:ring-error-50"
                  : "border-gray-300 focus:border-primary-300 focus:ring-2 focus:ring-primary-50"
              )}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-dark-blue-400 mb-1.5">
              End Time
            </label>
            <input
              type="time"
              step={60}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={() => markTouched("endTime")}
              className={cn(
                "h-11 w-full rounded-[5px] border bg-white px-3.5 text-sm text-dark-blue-400 shadow-xs focus-visible:outline-none",
                errors.time
                  ? "border-error-300 focus:border-error-300 focus:ring-2 focus:ring-error-50"
                  : "border-gray-300 focus:border-primary-300 focus:ring-2 focus:ring-primary-50"
              )}
            />
          </div>
        </div>
        {errors.time && (
          <p className="text-xs text-error-500 -mt-3">{errors.time}</p>
        )}

        {/* Duration display */}
        <div className="flex items-center justify-center py-1">
          <span className="text-xs text-gray-400">Duration: </span>
          <span className={cn(
            "text-sm font-semibold ml-1.5",
            totalMinutes > 0 ? "text-primary-500" : "text-gray-300"
          )}>
            {durationText}
          </span>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-dark-blue-400">Notes</label>
            <span className="text-xs text-gray-400">
              {charCount(notes)}/{MAX_NOTES}
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(clampChars(e.target.value, MAX_NOTES))}
            onBlur={() => markTouched("notes")}
            placeholder="What were you working on?"
            rows={3}
            className={cn(
              "w-full rounded-[5px] border bg-white px-3.5 py-2.5 text-sm text-dark-blue-400 shadow-xs placeholder:text-gray-500 focus-visible:outline-none resize-none",
              errors.notes
                ? "border-error-300 focus:border-error-300 focus:ring-2 focus:ring-error-50"
                : "border-gray-300 focus:border-primary-300 focus:ring-2 focus:ring-primary-50"
            )}
          />
          {errors.notes && (
            <p className="text-xs text-error-500 mt-1">{errors.notes}</p>
          )}
        </div>

        {/* Review note (AC-092.1) */}
        <p className="text-xs text-gray-500 leading-relaxed">{REVIEW_NOTE}</p>

        {serverError && (
          <p className="text-xs text-error-500">{serverError}</p>
        )}
      </div>

      {/* Footer buttons — small CTAs */}
      <div className="flex items-center justify-end gap-2.5 px-4 py-3 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center justify-center rounded-[5px] border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          disabled={!canSubmit}
          onClick={() => void submit()}
          className={cn(
            "inline-flex items-center justify-center rounded-[5px] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition",
            canSubmit
              ? "bg-primary-500 hover:bg-primary-600"
              : "bg-gray-300 cursor-not-allowed"
          )}
        >
          {submitting ? "Submitting…" : "Submit Time"}
        </button>
      </div>
    </div>
  )
}
