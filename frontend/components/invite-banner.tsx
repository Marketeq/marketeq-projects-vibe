"use client"

import React from "react"
import { cn } from "@/utils/functions"
import { Alert, AlertContent, AlertTitle } from "@/components/ui"

/** The handle travels on the invite link with or without its leading "@". */
const normalizeHandle = (handle: string) =>
  handle.startsWith("@") ? handle : `@${handle}`

/**
 * "You've been invited by <inviter> to join <destination>", the context strip
 * that keeps an invitee oriented while they sign up and finish setup. A thin
 * composition over the design-system `Alert` (variant="primary" already
 * renders the bg-primary-50/border-primary-300 styling this needs) rather
 * than a new primitive. See frontend/COMPONENTS.md.
 *
 * Inviter profile lookups can fail independently of the invite itself (e.g. a
 * cross-service identity mismatch), so this degrades to whichever of
 * inviter/destination actually resolved rather than hiding entirely, and
 * renders nothing only when neither did.
 */
export const InviteBanner = ({
  inviterName,
  inviterHandle,
  destination,
  className,
}: {
  inviterName?: string
  inviterHandle?: string
  destination?: string
  className?: string
}) => {
  if (!inviterName && !destination) return null

  return (
    <Alert variant="primary" className={cn("w-[560px] max-w-full", className)}>
      <AlertContent>
        <AlertTitle className="leading-5">
          {inviterName ? (
            <>
              You&apos;ve been invited by {inviterName}
              {inviterHandle && ` (${normalizeHandle(inviterHandle)})`}
              {destination && ` to join “${destination}”`}
            </>
          ) : (
            <>You&apos;ve been invited to join “{destination}”</>
          )}
        </AlertTitle>
      </AlertContent>
    </Alert>
  )
}
