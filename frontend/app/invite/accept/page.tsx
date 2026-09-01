"use client"

import { useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { appendInviteContext, readInviteContext } from "@/lib/invite-link"

/**
 * Pure auth gate + handoff. Actually accepting the invitation is deferred to
 * the end of the setup wizard, in the "Go to Dashboard" handler in
 * app/invite/setup/page.tsx. That way the invitee finishes their profile and
 * company setup before the roster write (and the "Invite accepted" notification)
 * happens, instead of accepting immediately after login.
 */
export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const inviteToken = searchParams.get("token")
  // Company / inviter details ride along on the invite link. See
  // lib/invite-link.ts. /invite/setup resolves the same data server-side via
  // GET /invitations/preview, but the context is forwarded anyway so the
  // sign-in/sign-up invite banner (which reads it off the URL) still has it
  // if the visitor gets bounced there first.
  const inviteContext = useMemo(
    () => readInviteContext(searchParams),
    [searchParams]
  )
  const setupTarget = appendInviteContext(
    inviteToken
      ? `/invite/setup?token=${encodeURIComponent(inviteToken)}`
      : "/invite/setup",
    inviteContext
  )

  useEffect(() => {
    if (!inviteToken || isLoading) return

    if (!user) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(setupTarget)}`)
      return
    }

    router.replace(setupTarget)
  }, [inviteToken, isLoading, user, setupTarget, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {inviteToken ? (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-500" />
            <h2 className="text-xl font-semibold">Loading your invitation…</h2>
          </>
        ) : (
          <>
            <div className="text-red-500 text-4xl mb-4">✗</div>
            <h2 className="text-xl font-semibold text-red-600">
              Invitation Error
            </h2>
            <p className="text-gray-600 mt-2">
              This invitation link is missing its token.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
