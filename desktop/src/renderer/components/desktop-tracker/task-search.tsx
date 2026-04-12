"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui"

export interface SearchResult {
  id: string
  taskName: string
  contractName: string
  clientHandle: string
  avatarSrc?: string
}

interface TaskSearchProps {
  value?: string
  onChange?: (value: string) => void
  results?: SearchResult[]
  /** Items to show when input is focused but empty (e.g. all contracts) */
  defaultResults?: SearchResult[]
  onSelect?: (result: SearchResult) => void
  selectedResult?: SearchResult | null
  onClear?: () => void
  onFocus?: () => void
  /** When set, enables contextual tooltips on dropdown items (same/different contract) */
  activeContractName?: string
  placeholder?: string
  className?: string
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function DropdownItem({
  result,
  onSelect,
  activeContractName,
}: {
  result: SearchResult
  onSelect: (r: SearchResult) => void
  /** When set, enables tooltips: same contract → "Switch to this task", different → switch contracts warning */
  activeContractName?: string
}) {
  const [hovered, setHovered] = React.useState(false)
  const isDifferentContract = activeContractName ? result.contractName !== activeContractName : false

  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(result)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition"
    >
      <Avatar size="xs">
        <AvatarImage src={result.avatarSrc} alt={result.taskName} />
        <AvatarFallback>{result.contractName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="text-left min-w-0 flex-1">
        <p className="text-sm text-dark-blue-400 truncate leading-5">
          <span className="font-semibold">{result.taskName}</span>
          <span className="text-gray-500">, {result.contractName}</span>
        </p>
        <p className="text-xs text-gray-400 leading-4">@{result.clientHandle}</p>
      </div>

      {/* Tooltip on hover during active tracking */}
      {activeContractName && hovered && (
        <div className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-white text-dark-blue-400 text-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-gray-100 z-50 pointer-events-none leading-tight",
          isDifferentContract ? "max-w-[180px] whitespace-normal text-center" : "whitespace-nowrap"
        )}>
          {isDifferentContract ? (
            <>
              You can only track one contract at a time.
              <br />
              <span className="text-primary-500 underline hover:text-primary-600 pointer-events-auto cursor-pointer">Click here</span> to switch contracts.
            </>
          ) : (
            "Switch to this task"
          )}
        </div>
      )}
    </button>
  )
}

export function TaskSearch({
  value = "",
  onChange,
  results = [],
  defaultResults = [],
  onSelect,
  selectedResult,
  onClear,
  onFocus,
  activeContractName,
  placeholder = "Search by task or contract name",
  className,
}: TaskSearchProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Show search results if typing, otherwise show defaults when focused
  const visibleResults = value.trim() ? results : defaultResults

  // If a result is selected, show the chip style — clickable to re-open dropdown
  if (selectedResult) {
    return (
      <div className={cn("relative", className)}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-full items-center gap-2 rounded-lg border border-primary-300 bg-white px-3 cursor-pointer"
        >
          <Avatar size="xs">
            <AvatarImage src={selectedResult.avatarSrc} alt={selectedResult.taskName} />
            <AvatarFallback>{selectedResult.taskName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-dark-blue-400 truncate leading-5">
              <span className="font-semibold">{selectedResult.taskName}</span>
              <span className="text-gray-500">, {selectedResult.contractName}</span>
            </p>
            {selectedResult.clientHandle && (
              <p className="text-xs text-gray-400 truncate leading-4">@{selectedResult.clientHandle}</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClear?.() }}
            className="text-gray-400 hover:text-gray-600 transition shrink-0"
          >
            <ClearIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Dropdown when chip is clicked */}
        {isOpen && visibleResults.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-100 bg-white py-1 shadow-lg z-[300] max-h-[200px] overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
          >
            {visibleResults.map((result) => (
              <DropdownItem
                key={result.id}
                result={result}
                onSelect={(r) => {
                  onSelect?.(r)
                  setIsOpen(false)
                }}
                activeContractName={activeContractName}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            setIsOpen(true)
            onFocus?.()
          }}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-8 text-sm text-dark-blue-400 placeholder:text-gray-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
        />
        {value && (
          <button
            onClick={() => {
              onChange?.("")
              onClear?.()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <ClearIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && visibleResults.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-100 bg-white py-1 shadow-lg z-[300] max-h-[200px] overflow-y-auto"
          onWheel={(e) => e.stopPropagation()}
        >
          {visibleResults.map((result) => (
            <DropdownItem
              key={result.id}
              result={result}
              onSelect={(r) => {
                onSelect?.(r)
                setIsOpen(false)
              }}
              activeContractName={activeContractName}
            />
          ))}
        </div>
      )}
    </div>
  )
}
