"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui"

export interface MenuItem {
  label: string
  shortcut?: string
  onClick?: () => void
  variant?: "default" | "danger"
}

export interface MenuSection {
  items: MenuItem[]
}

export interface AccountMenuProps {
  name: string
  email: string
  avatarSrc?: string
  sections?: MenuSection[]
  onClose?: () => void
  className?: string
}

export function AccountMenu({
  name,
  email,
  avatarSrc,
  sections = [],
  onClose,
  className,
}: AccountMenuProps) {
  return (
    <div
      className={cn(
        "w-full rounded-lg bg-white py-1 shadow-lg",
        className
      )}
    >
      {/* User header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Avatar size="lg">
          <AvatarImage src={avatarSrc} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-dark-blue-400 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
        </div>
      </div>

      {/* Menu sections */}
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="border-b border-gray-100 last:border-b-0 py-1">
          {section.items.map((item, iIdx) => (
            <button
              key={iIdx}
              onClick={item.onClick}
              className={cn(
                "flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-gray-50",
                item.variant === "danger"
                  ? "text-error-500"
                  : "text-gray-700"
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
