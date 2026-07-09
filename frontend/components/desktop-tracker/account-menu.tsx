"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"

interface MenuItem {
  label: string
  shortcut?: string
  onClick?: () => void
  variant?: "default" | "danger"
}

interface MenuSection {
  items: MenuItem[]
}

interface AccountMenuProps {
  name: string
  email: string
  avatarSrc?: string
  sections?: MenuSection[]
  onClose?: () => void
  className?: string
}

const defaultSections: MenuSection[] = [
  {
    items: [
      { label: "My Profile", shortcut: "\u2318P" },
      { label: "Preferences", shortcut: "\u2318P" },
      { label: "Keyboard Shortcuts", shortcut: "\u2318 + /" },
    ],
  },
  {
    items: [
      { label: "Add Manual Time", shortcut: "\u2318M" },
      { label: "Reports", shortcut: "\u2318R" },
    ],
  },
  {
    items: [
      { label: "Send Feedback" },
      { label: "About Time Tracker" },
      { label: "Check for Updates..." },
    ],
  },
  {
    items: [
      { label: "Switch Account", shortcut: "\u2318C" },
      { label: "Sign Out", shortcut: "\u2318+ Shift + Q" },
    ],
  },
  {
    items: [
      { label: "Quit Time Tracker", shortcut: "\u2318Q", variant: "danger" },
    ],
  },
]

export function AccountMenu({
  name,
  email,
  avatarSrc,
  sections = defaultSections,
  onClose,
  className,
}: AccountMenuProps) {
  return (
    <div className={cn("w-full rounded-lg bg-white py-1 shadow-lg", className)}>
      {/* Hamburger close button row */}
      <div className="flex justify-end px-4 pt-2 pb-1">
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* User header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Avatar size="lg">
          <AvatarImage src={avatarSrc} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-dark-blue-500 truncate">
            {name}
          </p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
        </div>
      </div>

      {/* Menu sections */}
      {sections.map((section, sIdx) => (
        <div
          key={sIdx}
          className="border-b border-gray-100 last:border-b-0 py-1"
        >
          {section.items.map((item, iIdx) => (
            <button
              key={iIdx}
              onClick={item.onClick}
              className={cn(
                "flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-gray-50",
                item.variant === "danger" ? "text-error-500" : "text-gray-700"
              )}
            >
              <span>{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-gray-400 ml-4 shrink-0">
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
