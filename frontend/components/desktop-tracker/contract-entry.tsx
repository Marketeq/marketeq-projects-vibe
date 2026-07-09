"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"

export interface TaskEntry {
  id: string
  name: string
  timeRange: string
  duration: string
  progress?: number
}

export interface ContractEntryProps {
  contractName: string
  clientHandle: string
  avatarSrc?: string
  totalHours?: string
  tasks?: TaskEntry[]
  isExpanded?: boolean
  onToggle?: () => void
  onAddTask?: () => void
  onPlay?: () => void
  onPlayTask?: (taskId: string) => void
  className?: string
}

function ChevronIcon({
  expanded,
  className,
}: {
  expanded: boolean
  className?: string
}) {
  return (
    <svg
      className={cn("h-4 w-4 text-gray-400 transition-transform", className)}
      viewBox="0 0 16 16"
      fill="none"
    >
      {expanded ? (
        <path
          d="M4 10l4-4 4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.5v7M6.5 10h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlaySmallIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 6.5l5.5 3.5L8 13.5V6.5z" fill="currentColor" />
    </svg>
  )
}

export function ContractEntry({
  contractName,
  clientHandle,
  avatarSrc,
  totalHours = "0 hrs",
  tasks = [],
  isExpanded = false,
  onToggle,
  onAddTask,
  onPlay,
  onPlayTask,
  className,
}: ContractEntryProps) {
  return (
    <div
      className={cn("rounded-lg border border-gray-200 bg-white", className)}
    >
      {/* Contract header row */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <button
          onClick={onToggle}
          className="flex h-5 w-5 shrink-0 items-center justify-center"
        >
          <ChevronIcon expanded={isExpanded} />
        </button>

        <Avatar size="sm">
          <AvatarImage src={avatarSrc} alt={contractName} />
          <AvatarFallback>{contractName.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dark-blue-500 truncate leading-5">
            {contractName}
          </p>
          <p className="text-xs text-gray-500 truncate leading-4">
            @{clientHandle}
          </p>
        </div>

        <button
          onClick={onAddTask}
          className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 transition shrink-0"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="text-[10px] leading-3 text-gray-400">Add task</span>
        </button>

        <button
          onClick={onPlay}
          className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-primary-500 transition shrink-0"
        >
          <PlaySmallIcon className="h-5 w-5" />
          <span className="text-[10px] leading-3 text-gray-400">
            {totalHours}
          </span>
        </button>
      </div>

      {/* Expanded task list */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {tasks.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400 mb-3">
                This contract doesn&apos;t have any tasks yet.
              </p>
              <button
                onClick={onAddTask}
                className="inline-flex items-center gap-1.5 rounded-[5px] border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 3v10M3 8h10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Add A Task
              </button>
            </div>
          ) : (
            <>
              {/* Task list header */}
              <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500">
                <span>Task Name</span>
                <span>Time Tracked</span>
              </div>

              {/* Task rows */}
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-50 hover:bg-gray-25 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-blue-500 truncate leading-5">
                      {task.name}
                    </p>
                    <p className="text-xs text-gray-400 leading-4">
                      {task.timeRange}
                    </p>
                  </div>

                  {/* Mini progress bar */}
                  {task.progress !== undefined && (
                    <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden shrink-0">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${Math.min(task.progress, 100)}%` }}
                      />
                    </div>
                  )}

                  <span className="text-sm font-medium text-dark-blue-500 tabular-nums whitespace-nowrap shrink-0">
                    {task.duration}
                  </span>

                  <button
                    onClick={() => onPlayTask?.(task.id)}
                    className="text-gray-400 hover:text-primary-500 transition shrink-0"
                  >
                    <PlaySmallIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
