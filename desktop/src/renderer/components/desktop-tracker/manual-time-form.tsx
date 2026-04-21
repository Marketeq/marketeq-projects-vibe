"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui"

interface ContractOption {
  id: string
  name: string
  clientHandle?: string
  avatarSrc?: string
}

interface ManualTimeFormProps {
  contracts?: ContractOption[]
  onCancel?: () => void
  onSubmit?: (data: { contractId?: string; startTime: string; endTime: string; notes: string }) => void
  className?: string
}

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

export function ManualTimeForm({
  contracts = [],
  onCancel,
  onSubmit,
  className,
}: ManualTimeFormProps) {
  const [contractId, setContractId] = React.useState("")
  const [showDropdown, setShowDropdown] = React.useState(false)
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("10:00")
  const [notes, setNotes] = React.useState("")
  const [showDiscard, setShowDiscard] = React.useState(false)
  const [touched, setTouched] = React.useState<Set<string>>(new Set())
  const maxNotes = 200

  const markTouched = (field: string) => setTouched((prev) => new Set(prev).add(field))

  const selectedContract = contracts.find((c) => c.id === contractId)
  const hasUnsavedWork = notes.trim().length > 0

  const handleCancel = () => {
    if (hasUnsavedWork) {
      setShowDiscard(true)
    } else {
      onCancel?.()
    }
  }

  // Calculate duration display
  const [startH, startM] = startTime.split(":").map(Number)
  const [endH, endM] = endTime.split(":").map(Number)
  const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM)
  const durationText = totalMinutes > 0
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : "—"
  const canSubmit = !!contractId && !!date && totalMinutes > 0 && notes.trim().length > 0

  // Field errors — only shown after user interacts with each field
  const errors = {
    contract: touched.has("contract") && !contractId,
    startTime: touched.has("endTime") && totalMinutes <= 0,
    endTime: touched.has("endTime") && totalMinutes <= 0,
    notes: touched.has("notes") && !notes.trim(),
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
            onClick={() => { setShowDropdown(!showDropdown); markTouched("contract") }}
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

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-dark-blue-400 mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={() => markTouched("endTime")}
              className={cn(
                "h-11 w-full rounded-[5px] border bg-white px-3.5 text-sm text-dark-blue-400 shadow-xs focus-visible:outline-none",
                errors.startTime
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
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={() => markTouched("endTime")}
              className={cn(
                "h-11 w-full rounded-[5px] border bg-white px-3.5 text-sm text-dark-blue-400 shadow-xs focus-visible:outline-none",
                errors.endTime
                  ? "border-error-300 focus:border-error-300 focus:ring-2 focus:ring-error-50"
                  : "border-gray-300 focus:border-primary-300 focus:ring-2 focus:ring-primary-50"
              )}
            />
          </div>
        </div>
        {errors.endTime && (
          <p className="text-xs text-error-500 -mt-3">Please enter a valid time range (end must be after start)</p>
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
              {notes.length}/{maxNotes}
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, maxNotes))}
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
            <p className="text-xs text-error-500 mt-1">Please enter a description of your work</p>
          )}
        </div>
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
          onClick={() => onSubmit?.({
            contractId: contractId || undefined,
            startTime: `${date}T${startTime}:00`,
            endTime: `${date}T${endTime}:00`,
            notes,
          })}
          className={cn(
            "inline-flex items-center justify-center rounded-[5px] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition",
            canSubmit
              ? "bg-primary-500 hover:bg-primary-600"
              : "bg-gray-300 cursor-not-allowed"
          )}
        >
          Submit Time
        </button>
      </div>
    </div>
  )
}
