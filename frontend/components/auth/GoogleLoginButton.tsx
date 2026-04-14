"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { resolveDashboardRoute, useAuth } from "@/contexts/auth"
import { AuthAPI } from "@/service/http/auth"
import { UserAPI } from "@/service/http/user"
import { GoogleDefault } from "@blend-metrics/icons/social"
import { useGoogleLogin } from "@react-oauth/google"
import Cookies from "js-cookie"
import { Button, useToast } from "@/components/ui"
import { Spinner } from "../ui/spinner/spinner"

const GoogleLoginButtonInner = () => {
  const router = useRouter()

  const { setUser } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)

  const handleLoginWithGoogle = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: (tokenResponse) => {
      const accessToken = tokenResponse?.access_token

      if (!accessToken) return

      setIsLoading(true)

      AuthAPI.LoginWithGoogle({ access_token: accessToken })
        .then(async (response) => {
          if (
            response?.status === 200 &&
            response?.data?.access_token &&
            response?.data?.user
          ) {
            Cookies.set("access_token", response.data.access_token, { path: "/" })

            let nextUser = response.data.user
            try {
              const me = await UserAPI.me()
              if (me?.status === 200) {
                const profileUser = me.data?.user ?? me.data?.data?.user ?? me.data
                if (profileUser && typeof profileUser === "object") {
                  const merged: Record<string, unknown> = { ...nextUser, ...profileUser }
                  for (const key of ["role", "accountType", "userType"] as const) {
                    if (merged[key] == null && (nextUser as any)?.[key] != null) {
                      merged[key] = (nextUser as any)[key]
                    }
                  }
                  nextUser = merged as typeof nextUser
                }
              }
            } catch {
              // fall back to auth payload
            }
            if (nextUser && typeof nextUser === "object") {
              setUser(nextUser)
            }
            router.push(resolveDashboardRoute(nextUser as any))
          }
        })
        .catch((error) => {
          if (error?.response?.data?.errors?.message) {
            toast({
              title: error.response.data.errors.message,
              variant: "destructive",
            })
          }
        })
        .finally(() => setIsLoading(false))
    },
    onError: () => {},
  })

  return (
    <Button
      className="xs:max-md:text-sm xs:max-md:py-2 xs:max-md:px-[14px] xs:max-md:h-9"
      variant="outlined"
      visual="gray"
      size="lg"
      onClick={() => handleLoginWithGoogle()}
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
          <GoogleDefault className="size-5 md:size-6" /> Sign in with Google
        </>
      )}
    </Button>
  )
}

const GoogleLoginButton = () => {
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return (
      <Button
        className="xs:max-md:text-sm xs:max-md:py-2 xs:max-md:px-[14px] xs:max-md:h-9"
        variant="outlined"
        visual="gray"
        size="lg"
        disabled
        title="Google sign-in is not configured"
      >
        <GoogleDefault className="size-5 md:size-6" /> Sign in with Google
      </Button>
    )
  }

  return <GoogleLoginButtonInner />
}

export default GoogleLoginButton
