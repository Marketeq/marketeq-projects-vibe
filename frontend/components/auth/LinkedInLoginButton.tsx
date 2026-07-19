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

const LinkedInLogin = ({
  onSuccess,
}: { onSuccess?: (user: User) => void } = {}) => {
  const hasLoggedInRef = useRef(false)

  const router = useRouter()
  const redirectUrl = process.env.NEXT_PUBLIC_LINKEDIN_OAUTH_REDIRECT || ""

  const { setUser } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)

  const getCodeFromWindowURL = useCallback((url: string) => {
    const popupWindowURL = new URL(url)
    return popupWindowURL.searchParams.get("code")
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
    })

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`

    window.open(
      authUrl,
      "Linkedin",
      "menubar=no,location=no,resizable=no,scrollbars=no,status=no,width=550,height=730"
    )
  }

  const handleLoginWithLinkedInApi = useCallback(
    (code: string) => {
      if (!hasLoggedInRef.current) {
        hasLoggedInRef.current = true

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
                router.push(resolveDashboardRoute(nextUser as any))
              }
            }
          })
          .catch((error) => {
            if (error?.response?.data?.errors?.message) {
              toast({
                title: error?.response?.data?.errors?.message,
                variant: "destructive",
              })
            }
          })
          .finally(() => {
            setIsLoading(false)
          })
      }
    },
    [redirectUrl, router, setUser, toast]
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
    }
  }, [getCodeFromWindowURL, handlePostMessage])

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
