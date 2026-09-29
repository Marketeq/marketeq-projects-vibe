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

interface NewTaskFormProps {
  contracts?: ContractOption[]
  defaultContractId?: string
  /** Opened from a contract card: the contract is fixed (AC-033.2). */
  lockContract?: boolean
  onCancel?: () => void
  onCreate?: (data: { contractId: string; taskName: string; notes: string }) => void
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

// AC-034.1 — task names are plain text, at most 50 characters.
const MAX_TASK_NAME = 50

// Plain text only: drop control characters (EDGE-TASK.04) and cap the length.
function cleanTaskName(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, MAX_TASK_NAME)
}

export function NewTaskForm({ contracts = [], defaultContractId, lockContract = false, onCancel, onCreate, className }: NewTaskFormProps) {
  const [contractId, setContractId] = React.useState(defaultContractId || "")
  const [showDropdown, setShowDropdown] = React.useState(false)
  const [taskName, setTaskName] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [showDiscard, setShowDiscard] = React.useState(false)
  // Show "Please name this task before tracking" once the user has tried
  // to leave the name empty (blurred it, or pressed Enter on it).
  const [nameTouched, setNameTouched] = React.useState(false)
  const maxNotes = 50

  const selectedContract = contracts.find((c) => c.id === contractId)
  const hasUnsavedWork = taskName.trim().length > 0 || notes.trim().length > 0

  const handleCancel = () => {
    if (hasUnsavedWork) {
      setShowDiscard(true)
    } else {
      onCancel?.()
    }
  }

  return (
    <div className={cn("flex flex-col flex-1 min-h-0 h-full", className)}>
      {/* Discard confirmation overlay */}
      {showDiscard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-6 w-full max-w-[280px] rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-dark-blue-400 mb-1.5">Discard this task?</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              You haven&apos;t saved &lsquo;{taskName.trim() || "Untitled Task"}&rsquo;. Discard it?
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

      {/* Sub-header: back arrow + "New Task" centered */}
      <div className="flex items-center px-4 py-3">
        <button onClick={handleCancel} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-dark-blue-400 transition">
          <BackArrowIcon className="h-5 w-5" />
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-dark-blue-400">
          New Task
        </span>
        <div className="w-5" />
      </div>

      {/* Form body */}
      <div className="flex-1 px-4 py-3 space-y-5">
        {/* Contract field */}
        <div className="relative">
          <label className="block text-sm font-semibold text-dark-blue-400 mb-1.5">
            Contract
          </label>
          <button
            disabled={lockContract}
            onClick={() => { if (!lockContract) setShowDropdown(!showDropdown) }}
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-[5px] border bg-white px-3.5 text-sm shadow-xs transition",
              showDropdown
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
            {!lockContract && (
              <ChevronDownIcon className={cn("h-4 w-4 text-gray-400 shrink-0 ml-3 transition-transform", showDropdown && "rotate-180")} />
            )}
          </button>
          {showDropdown && !lockContract && contracts.length > 0 && (
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

        {/* Task Name */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-dark-blue-400">Task Name</label>
            <span className="text-xs text-gray-400">
              {taskName.length}/{MAX_TASK_NAME}
            </span>
          </div>
          <input
            type="text"
            value={taskName}
            maxLength={MAX_TASK_NAME}
            onChange={(e) => setTaskName(cleanTaskName(e.target.value))}
            onBlur={() => setNameTouched(true)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              if (!taskName.trim()) setNameTouched(true)
              else if (contractId) onCreate?.({ contractId, taskName: taskName.trim(), notes })
            }}
            placeholder="Enter task name"
            className={cn(
              "h-11 w-full rounded-[5px] border bg-white px-3.5 text-sm text-dark-blue-400 shadow-xs placeholder:text-gray-500 focus-visible:outline-none",
              nameTouched && !taskName.trim()
                ? "border-error-300 focus:border-error-300 focus:ring-2 focus:ring-error-50"
                : "border-gray-300 focus:border-primary-300 focus:ring-2 focus:ring-primary-50"
            )}
          />
          {nameTouched && !taskName.trim() && (
            <p className="text-xs text-error-500 mt-1">Please name this task before tracking</p>
          )}
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
            placeholder="Tell us what you'll be working on"
            rows={4}
            className="w-full rounded-[5px] border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-dark-blue-400 shadow-xs placeholder:text-gray-500 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none resize-none"
          />
        </div>
      </div>

      {/* Footer buttons — small CTAs, pinned bottom */}
      <div className="flex items-center justify-end gap-2.5 px-4 py-3 border-t border-gray-100 shrink-0">
        <button
          onClick={handleCancel}
          className="inline-flex items-center justify-center rounded-[5px] border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          disabled={!contractId || !taskName.trim()}
          onClick={() => onCreate?.({ contractId, taskName: taskName.trim(), notes })}
          className={cn(
            "inline-flex items-center justify-center rounded-[5px] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition",
            contractId && taskName.trim()
              ? "bg-primary-500 hover:bg-primary-600"
              : "bg-gray-300 cursor-not-allowed"
          )}
        >
          Create Task
        </button>
      </div>
    </div>
  )
}
