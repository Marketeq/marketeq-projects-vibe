"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"

interface ActiveTrackingBarProps {
  taskName: string
  contractName: string
  avatarSrc?: string
  utcTime: string
  isRecording?: boolean
  label?: string
  className?: string
}

export function ActiveTrackingBar({
  taskName,
  contractName,
  avatarSrc,
  utcTime,
  isRecording = true,
  label = "Tracking time...",
  className,
}: ActiveTrackingBarProps) {
  return (
    <div className={cn("bg-gray-25 shrink-0", className)}>
      {/* Status row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-error-500" />
            </span>
          )}
          <span className="text-xs font-medium text-dark-blue-500">
            {label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">{utcTime}</span>
          <svg
            className="h-3.5 w-3.5 text-gray-400"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M3 5l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Active task chip */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Avatar size="xs">
            <AvatarImage src={avatarSrc} alt={contractName} />
            <AvatarFallback>{contractName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-dark-blue-500 truncate">
            {taskName}, {contractName}
          </span>
        </div>
      </div>
    </div>
  )
}
