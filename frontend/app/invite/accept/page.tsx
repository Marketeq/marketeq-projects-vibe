"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { InvitationsAPI } from "@/service/http/invitations"
import {
  getAcceptInvitationPayload,
  getPostAcceptRedirect,
} from "@/utils/invitationRedirect"
import Cookies from "js-cookie"
import { Button } from "@/components/ui"

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, setUser } = useAuth()
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "signin"
  >("loading")
  const [message, setMessage] = useState("")
  const [errorTitle, setErrorTitle] = useState("Invitation Error")
  const hasAttemptedAccept = useRef(false)

  const inviteToken = searchParams.get("token")
  const redirectTarget = inviteToken
    ? `/invite/accept?token=${encodeURIComponent(inviteToken)}`
    : "/invite/accept"

  const getFriendlyErrorMessage = (rawMessage: string) => {
    const message = String(rawMessage)
    const normalizedMessage = message.toLowerCase()

    if (normalizedMessage.includes("email mismatch")) {
      return "You are signed in with a different account. Please sign in using the invited email address and try again."
    }

    if (
      normalizedMessage.includes("expired") ||
      normalizedMessage.includes("invalid token")
    ) {
      return "This invitation link is invalid or has expired. Please ask the team owner to send a new invite."
    }

    if (normalizedMessage.includes("already accepted")) {
      return "This invitation has already been accepted. You can view your team from the My Team page."
    }

    if (normalizedMessage.includes("canceled")) {
      return "This invitation was canceled. Please ask the team owner to send a new invite if you still need access."
    }

    if (
      normalizedMessage.includes("not found") ||
      normalizedMessage.includes("invitation not found")
    ) {
      return "We couldn't find this invitation. Please check that you opened the latest invite link."
    }

    if (
      normalizedMessage.includes("unauthorized") ||
      normalizedMessage.includes("forbidden")
    ) {
      return "Please sign in with the invited account to accept this invitation."
    }

    return message
  }

  const signInWithAnotherAccount = () => {
    Cookies.remove("access_token")
    Cookies.remove("refresh_token")
    setUser(null)
    router.push(`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`)
  }

  useEffect(() => {
    if (!inviteToken) {
      setStatus("error")
      setErrorTitle("Invitation Error")
      setMessage("This invitation link is missing its token.")
      return
    }

    if (hasAttemptedAccept.current) return

    const authToken = Cookies.get("access_token")
    if (!authToken) {
      setStatus("signin")
      setMessage("Sign in with the invited account to accept this invitation.")
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`)
      return
    }

    hasAttemptedAccept.current = true
    InvitationsAPI.acceptInvitation(inviteToken)
      .then((response) => {
        const payload = getAcceptInvitationPayload(response?.data)
        const redirect = getPostAcceptRedirect(response?.data)
        const acceptedUser = payload?.acceptedUser

        if (acceptedUser) {
          setUser((currentUser) => {
            const baseUser = currentUser || user
            if (!baseUser) return currentUser

            const hasCompletedOnboarding =
              acceptedUser.hasCompletedOnboarding ??
              acceptedUser.onboardingDismissed ??
              baseUser.onboardingDismissed

            return {
              ...baseUser,
              ...acceptedUser,
              role: (acceptedUser.role ||
                baseUser.role) as typeof baseUser.role,
              onboardingDismissed: hasCompletedOnboarding,
            }
          })
        }

        setStatus("success")
        setMessage("Invitation accepted successfully.")
        setTimeout(() => {
          const separator = redirect.destination.includes("?") ? "&" : "?"
          window.location.assign(
            `${redirect.destination}${separator}inviteAccepted=1`
          )
        }, 2000)
      })
      .catch((error) => {
        const rawMessage =
          error?.response?.data?.message ||
          error.message ||
          "Failed to accept invitation"

        setStatus("error")
        setErrorTitle(
          String(rawMessage).toLowerCase().includes("email mismatch")
            ? "Wrong Account"
            : "Invitation Error"
        )
        setMessage(getFriendlyErrorMessage(rawMessage))
      })
  }, [inviteToken, redirectTarget, router, setUser, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-500" />
            <h2 className="text-xl font-semibold">Accepting invitation...</h2>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-green-600">{message}</h2>
            <p className="text-gray-600 mt-2">
              Redirecting you to the next step...
            </p>
          </>
        )}

        {status === "signin" && (
          <>
            <div className="text-primary-500 text-4xl mb-4">•</div>
            <h2 className="text-xl font-semibold text-dark-blue-400">
              Sign In Required
            </h2>
            <p className="text-gray-600 mt-2">{message}</p>
            <div className="mt-6 space-y-2">
              <Button className="w-full" onClick={signInWithAnotherAccount}>
                Continue to Sign In
              </Button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-500 text-4xl mb-4">✗</div>
            <h2 className="text-xl font-semibold text-red-600">{errorTitle}</h2>
            <p className="text-gray-600 mt-2">{message}</p>
            <div className="mt-6 space-y-2">
              <Button
                className="w-full"
                onClick={() => router.push("/my-team")}
              >
                Go to My Team
              </Button>
              <Button
                variant="outlined"
                className="w-full"
                onClick={signInWithAnotherAccount}
              >
                Sign In With Invited Email
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
