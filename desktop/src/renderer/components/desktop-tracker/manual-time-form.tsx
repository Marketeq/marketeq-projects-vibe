"use client"

import * as React from "react"
import { cn } from "@/utils/functions"

interface ManualTimeFormProps {
  contracts?: { id: string; name: string; clientHandle: string }[]
  onCancel?: () => void
  onSubmit?: (data: { contractId?: string; startTime: string; endTime: string; notes: string }) => void
  className?: string
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("10:00")
  const [notes, setNotes] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.({
      contractId: contractId || undefined,
      startTime: `${date}T${startTime}:00`,
      endTime: `${date}T${endTime}:00`,
      notes,
    })
  }

  // Calculate duration display
  const [startH, startM] = startTime.split(":").map(Number)
  const [endH, endM] = endTime.split(":").map(Number)
  const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM)
  const durationText = totalMinutes > 0
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : "—"

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col flex-1", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-dark-blue-400 hover:bg-gray-100 rounded-md p-1 transition"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-dark-blue-400">
          Add Manual Time
        </span>
        <div className="w-7" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Contract select */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Contract</label>
          <select
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark-blue-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
          >
            <option value="">Select a contract (optional)</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — @{c.clientHandle}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark-blue-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
          />
        </div>

        {/* Start / End time row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark-blue-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark-blue-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
            />
          </div>
        </div>

        {/* Duration display */}
        <div className="flex items-center justify-center py-2">
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
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What were you working on?"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-dark-blue-400 placeholder:text-gray-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none resize-none"
          />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={totalMinutes <= 0}
          className={cn(
            "flex-1 h-10 rounded-lg text-sm font-medium text-white transition",
            totalMinutes > 0
              ? "bg-primary-500 hover:bg-primary-600 shadow-sm"
              : "bg-gray-300 cursor-not-allowed"
          )}
        >
          Submit Time
        </button>
      </div>
    </form>
  )
}
