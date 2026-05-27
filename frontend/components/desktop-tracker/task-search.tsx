"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"

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
  onSelect?: (result: SearchResult) => void
  selectedResult?: SearchResult | null
  onClear?: () => void
  placeholder?: string
  className?: string
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M13.5 13.5L17 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M5.5 5.5l5 5M10.5 5.5l-5 5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TaskSearch({
  value = "",
  onChange,
  results = [],
  onSelect,
  selectedResult,
  onClear,
  placeholder = "Search by task or contract name",
  className,
}: TaskSearchProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // If a result is selected, show the chip style
  if (selectedResult) {
    return (
      <div className={cn("relative", className)}>
        <div className="flex h-11 w-full items-center gap-2 rounded-lg border border-primary-300 bg-primary-25 px-3">
          <SearchIcon className="h-4 w-4 text-primary-400 shrink-0" />
          <Avatar size="xs">
            <AvatarImage
              src={selectedResult.avatarSrc}
              alt={selectedResult.taskName}
            />
            <AvatarFallback>{selectedResult.taskName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-dark-blue-500 truncate flex-1">
            {selectedResult.taskName}, {selectedResult.contractName}, @
            {selectedResult.clientHandle}
          </span>
          <button
            onClick={onClear}
            className="text-gray-400 hover:text-gray-600 transition shrink-0"
          >
            <ClearIcon className="h-4 w-4" />
          </button>
        </div>
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
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-8 text-sm text-gray-black placeholder:text-gray-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none"
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
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-100 bg-white py-1 shadow-lg z-10 max-h-[200px] overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect?.(result)
                setIsOpen(false)
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition"
            >
              <Avatar size="xs">
                <AvatarImage src={result.avatarSrc} alt={result.taskName} />
                <AvatarFallback>{result.taskName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-left min-w-0">
                <p className="text-sm text-dark-blue-500 truncate">
                  <span className="font-semibold">{result.taskName}</span>,{" "}
                  {result.contractName}
                </p>
                <p className="text-xs text-gray-500">@{result.clientHandle}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
