"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { AuthAPI } from "@/service/http/auth"
import { UserAPI } from "@/service/http/user"
import { LinkedInDefault } from "@blend-metrics/icons/social"
import Cookies from "js-cookie"
import { Button, useToast } from "@/components/ui"
import { Spinner } from "../ui/spinner/spinner"

const LinkedInLogin = () => {
  const hasLoggedInRef = useRef(false)

  const router = useRouter()
  const pathName = usePathname()

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
    const redirectUrl = `${window.location.origin}${pathName}`

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

        const redirectUrl = `${window?.location?.origin}${pathName}`

        setIsLoading(true)

        AuthAPI.LoginWithLinkedIn({
          code,
          redirectUrl,
        })
          .then((response) => {
            if (
              response?.status === 200 &&
              response?.data?.access_token &&
              response?.data?.user
            ) {
              Cookies.set("access_token", response?.data?.access_token)
              UserAPI.me().then((me) => {
                if (me?.status === 200) {
                  const user = me.data?.user ?? me.data
                  if (user?.role) {
                    setUser(user)
                    router.push("/")
                  } else {
                    console.warn("User missing role", me.data)
                  }
                }
              })
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
    [pathName, router, setUser, toast]
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
