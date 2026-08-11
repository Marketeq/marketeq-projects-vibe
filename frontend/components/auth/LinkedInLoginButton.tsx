"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  mergeDashboardUserFields,
  resolveDashboardRoute,
  useAuth,
} from "@/contexts/auth"
import { AuthAPI } from "@/service/http/auth"
import { UserAPI } from "@/service/http/user"
import { LinkedInDefault } from "@blend-metrics/icons/social"
import { Button, useToast } from "@/components/ui"
import { Spinner } from "../ui/spinner/spinner"
import type { User } from "@/types/user"
import { getOAuthErrorMessage } from "@/utils/auth-errors"

const LinkedInLogin = ({
  onSuccess,
}: { onSuccess?: (user: User) => void } = {}) => {
  const hasLoggedInRef = useRef(false)
  const popupRef = useRef<Window | null>(null)
  const popupPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const router = useRouter()
  const redirectUrl = process.env.NEXT_PUBLIC_LINKEDIN_OAUTH_REDIRECT || ""

  const { setUser } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)

  const getCodeFromWindowURL = useCallback((url: string) => {
    const popupWindowURL = new URL(url)
    return popupWindowURL.searchParams.get("code")
  }, [])

  const stopPopupPoll = useCallback(() => {
    if (popupPollRef.current) {
      clearInterval(popupPollRef.current)
      popupPollRef.current = null
    }
  }, [])

  const handleLoginWithLinkedIn = () => {
    if (typeof window === "undefined") return

    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || ""

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUrl,
      state: "1234",
      scope: "openid profile email",
      // Force the LinkedIn login / account chooser instead of silently reusing
      // the browser's existing LinkedIn session after a Marketeq logout.
      prompt: "login",
    })

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`

    hasLoggedInRef.current = false
    popupRef.current = window.open(
      authUrl,
      "Linkedin",
      "menubar=no,location=no,resizable=yes,scrollbars=yes,status=no,width=550,height=730"
    )

    stopPopupPoll()
    popupPollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        stopPopupPoll()
        if (!hasLoggedInRef.current) {
          toast({
            title: "LinkedIn sign-in was cancelled or failed. Please try again.",
            variant: "destructive",
          })
        }
      }
    }, 500)
  }

  const handleLoginWithLinkedInApi = useCallback(
    (code: string) => {
      if (!hasLoggedInRef.current) {
        hasLoggedInRef.current = true
        stopPopupPoll()

        setIsLoading(true)

        AuthAPI.LoginWithLinkedIn({
          code,
          redirectUrl,
        })
          .then(async (response) => {
            if (
              response?.status === 200 &&
              response?.data?.user
            ) {
              let nextUser = response.data.user
              try {
                const me = await UserAPI.me()
                if (me?.status === 200) {
                  const profileUser =
                    me.data?.user ?? me.data?.data?.user ?? me.data
                  if (profileUser && typeof profileUser === "object") {
                    nextUser = mergeDashboardUserFields(nextUser, profileUser)
                  }
                }
              } catch {
                // fall back to auth payload
              }
              if (nextUser && typeof nextUser === "object") {
                setUser(nextUser)
              }
              if (response.data.user?.accountLinked) {
                toast({
                  title: "Your LinkedIn account has been linked to your existing Marketeq account.",
                })
              }
              if (onSuccess) {
                onSuccess(nextUser as User)
              } else {
                router.replace(resolveDashboardRoute(nextUser as any))
              }
            }
          })
          .catch((error) => {
            toast({
              title: getOAuthErrorMessage(error),
              variant: "destructive",
            })
          })
          .finally(() => {
            setIsLoading(false)
          })
      }
    },
    [redirectUrl, router, setUser, toast, stopPopupPoll]
  )

  const handlePostMessage = useCallback(
    (event: any) => {
      if (event?.data?.type === "code" && event?.data?.code) {
        const { code } = event.data
        handleLoginWithLinkedInApi(code)
      }
    },
    [handleLoginWithLinkedInApi]
  )

  useEffect(() => {
    if (window.opener && window.opener !== window) {
      const code = getCodeFromWindowURL(window.location.href)
      window.opener.postMessage({ type: "code", code }, "*")
      window.close()
    }

    window.addEventListener("message", handlePostMessage)

    return () => {
      window.removeEventListener("message", handlePostMessage)
      stopPopupPoll()
    }
  }, [getCodeFromWindowURL, handlePostMessage, stopPopupPoll])

  return (
    <>
      <Button
        className="xs:max-md:text-sm xs:max-md:py-2 xs:max-md:px-[14px] xs:max-md:h-9"
        variant="outlined"
        visual="gray"
        size="lg"
        onClick={() => {
          handleLoginWithLinkedIn()
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <Spinner
            size={24}
            trackClassName="stroke-white"
            className=" stroke-gray-300"
            strokeWidth={3}
          />
        ) : (
          <>
            <LinkedInDefault className="size-5 md:size-6" /> Sign in with
            Linkedin
          </>
        )}
      </Button>
    </>
  )
}

export default LinkedInLogin
