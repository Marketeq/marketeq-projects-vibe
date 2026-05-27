"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"

interface ContractOption {
  id: string
  name: string
  clientHandle?: string
  avatarSrc?: string
}

interface NewTaskFormProps {
  contracts?: ContractOption[]
  defaultContractId?: string
  onCancel?: () => void
  onCreate?: (data: {
    contractId: string
    taskName: string
    notes: string
  }) => void
  className?: string
}

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M12.5 15l-5-5 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function NewTaskForm({
  contracts = [],
  defaultContractId,
  onCancel,
  onCreate,
  className,
}: NewTaskFormProps) {
  const [contractId, setContractId] = React.useState(defaultContractId || "")
  const [showDropdown, setShowDropdown] = React.useState(false)
  const [taskName, setTaskName] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const maxNotes = 50

  const selectedContract = contracts.find((c) => c.id === contractId)

  return (
    <div className={cn("flex flex-col flex-1", className)}>
      {/* Sub-header: back arrow + "New Task" centered */}
      <div className="flex items-center px-4 py-3">
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          <BackArrowIcon className="h-5 w-5" />
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-dark-blue-500">
          New Task
        </span>
        <div className="w-5" />
      </div>

      {/* Form body */}
      <div className="flex-1 px-4 py-3 space-y-5">
        {/* Contract field */}
        <div className="relative">
          <label className="block text-sm font-semibold text-dark-blue-500 mb-1.5">
            Contract
          </label>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex h-11 w-full items-center justify-between rounded-[5px] border border-gray-300 bg-white px-3.5 text-sm shadow-xs hover:border-gray-400 transition"
          >
            {selectedContract ? (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar size="xs">
                  <AvatarImage
                    src={selectedContract.avatarSrc}
                    alt={selectedContract.name}
                  />
                  <AvatarFallback>
                    {selectedContract.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <span className="text-sm text-gray-black truncate">
                    {selectedContract.name}
                  </span>
                  {selectedContract.clientHandle && (
                    <span className="text-xs text-gray-500 ml-1">
                      @{selectedContract.clientHandle}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-gray-500">Select Contract</span>
            )}
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 text-gray-400 shrink-0 transition-transform",
                showDropdown && "rotate-180"
              )}
            />
          </button>
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
                    "flex w-full items-center gap-2 px-3.5 py-2 text-sm hover:bg-gray-50 transition",
                    c.id === contractId
                      ? "text-primary-500 font-medium"
                      : "text-gray-700"
                  )}
                >
                  <Avatar size="xs">
                    <AvatarImage src={c.avatarSrc} alt={c.name} />
                    <AvatarFallback>{c.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Task Name */}
        <div>
          <label className="block text-sm font-semibold text-dark-blue-500 mb-1.5">
            Task Name
          </label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Enter task name"
            className="h-11 w-full rounded-[5px] border border-gray-300 bg-white px-3.5 text-sm text-gray-black shadow-xs placeholder:text-gray-500 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-dark-blue-500">
              Notes
            </label>
            <span className="text-xs text-gray-400">
              {notes.length}/{maxNotes}
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, maxNotes))}
            placeholder="Tell us what you'll be working on"
            rows={4}
            className="w-full rounded-[5px] border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-black shadow-xs placeholder:text-gray-500 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none resize-none"
          />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-100 shrink-0">
        <button
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-[5px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          disabled={!contractId || !taskName.trim()}
          onClick={() =>
            onCreate?.({ contractId, taskName: taskName.trim(), notes })
          }
          className={cn(
            "inline-flex items-center justify-center rounded-[5px] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition",
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
