"use client"

import React, { useEffect } from "react"
import { cn } from "@/utils/functions"
import { CheckCircle, X } from "@blend-metrics/icons"
import { createPortal } from "react-dom"

/** How long the card stays up before dismissing itself. Longer than a normal
 * toast because Undo has to stay reachable for the whole window. */
const AUTO_DISMISS_MS = 8000

/**
 * Shared top-right confirmation shell used by both the inviter's "invite
 * sent" and the invitee's "invite accepted" notifications. Deliberately not
 * part of the global `Toaster` (bottom-left, dark, single line). This one is
 * a light card with its own actions, so it renders into its own portal
 * instead of restyling every toast in the app.
 */
const NotificationCard = ({
  title,
  description,
  actions,
  onDismiss,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  onDismiss: () => void
}) => {
  const [mounted, setMounted] = React.useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  if (!mounted) return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed right-6 top-6 z-[100] w-[calc(100vw-3rem)] max-w-[390px] font-[Inter]",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      <div className="relative flex items-start gap-x-4 rounded-xl border border-gray-100 bg-white p-5 shadow-lg">
        <div className="flex size-11 flex-none items-center justify-center rounded-full bg-success-50">
          <CheckCircle className="size-6 text-success-600" />
        </div>

        <div className="min-w-0 flex-auto pr-6">
          <h3 className="text-base leading-6 font-semibold text-dark-blue-400">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm leading-5 break-words text-gray-500">
              {description}
            </p>
          )}

          {actions && (
            <div className="mt-4 flex items-center gap-x-5">{actions}</div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus-visible:outline-none"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>,
    document.body
  )
}

export interface InviteSentNotificationProps {
  /** Addresses the invitations actually went out to. */
  emails: string[]
  onUndo?: () => void
  onManageRoles?: () => void
  onDismiss: () => void
  /** Hides Undo while the cancel request is in flight. */
  isUndoing?: boolean
}

/** Top-right confirmation shown to the inviter after the invite dialog closes. */
export const InviteSentNotification = ({
  emails,
  onUndo,
  onManageRoles,
  onDismiss,
  isUndoing,
}: InviteSentNotificationProps) => {
  const description =
    emails.length === 1 ? (
      <>
        An email invitation has been sent to{" "}
        <span className="font-semibold text-gray-700">{emails[0]}</span>
      </>
    ) : (
      <>
        Email invitations have been sent to{" "}
        <span className="font-semibold text-gray-700">
          {emails.length} people
        </span>
      </>
    )

  return (
    <NotificationCard
      title="Invitation sent successfully!"
      description={description}
      onDismiss={onDismiss}
      actions={
        (onUndo || onManageRoles) && (
          <>
            {onUndo && (
              <button
                type="button"
                onClick={onUndo}
                disabled={isUndoing}
                className="text-sm leading-5 font-semibold text-gray-600 hover:text-gray-800 focus-visible:outline-none disabled:opacity-50"
              >
                {isUndoing ? "Undoing…" : "Undo"}
              </button>
            )}
            {onManageRoles && (
              <button
                type="button"
                onClick={onManageRoles}
                className="text-sm leading-5 font-semibold text-primary-500 hover:text-primary-600 focus-visible:outline-none"
              >
                Manage Roles
              </button>
            )}
          </>
        )
      }
    />
  )
}

export interface InviteAcceptedNotificationProps {
  /** The company the invitee just joined, when known. */
  companyName?: string
  onDismiss: () => void
}

/** Top-right confirmation shown to the invitee once their acceptance is
 * actually submitted. Same card as InviteSentNotification, shown on the
 * invitee's side instead of the inviter's. */
export const InviteAcceptedNotification = ({
  companyName,
  onDismiss,
}: InviteAcceptedNotificationProps) => (
  <NotificationCard
    title="Invite accepted"
    description={
      companyName ? (
        <>
          You&apos;re now a member of{" "}
          <span className="font-semibold text-gray-700">{companyName}</span>.
        </>
      ) : undefined
    }
    onDismiss={onDismiss}
  />
)
