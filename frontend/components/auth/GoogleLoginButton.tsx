"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  mergeDashboardUserFields,
  resolveDashboardRoute,
  useAuth,
} from "@/contexts/auth"
import { AuthAPI } from "@/service/http/auth"
import { UserAPI } from "@/service/http/user"
import { GoogleDefault } from "@blend-metrics/icons/social"
import { useGoogleLogin } from "@react-oauth/google"
import { Button, useToast } from "@/components/ui"
import { Spinner } from "../ui/spinner/spinner"
import type { User } from "@/types/user"
import { getOAuthErrorMessage } from "@/utils/auth-errors"

const GoogleLoginButtonInner = ({
  onSuccess,
}: {
  onSuccess?: (user: User) => void
}) => {
  const router = useRouter()

  const { setUser } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)

  const handleLoginWithGoogle = useGoogleLogin({
    scope: "openid email profile",
    // Force the Google account chooser instead of silently reusing the last
    // signed-in Google account after a Marketeq logout.
    prompt: "select_account",
    onSuccess: (tokenResponse) => {
      const accessToken = tokenResponse?.access_token

      if (!accessToken) return

      setIsLoading(true)

      AuthAPI.LoginWithGoogle({ access_token: accessToken })
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
                title: "Your Google account has been linked to your existing Marketeq account.",
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
          toast({
            title: getOAuthErrorMessage(error),
            variant: "destructive",
          })
        })
        .finally(() => setIsLoading(false))
    },
    onError: () => {
      toast({
        title: "Google sign-in was cancelled or failed. Please try again.",
        variant: "destructive",
      })
    },
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

const GoogleLoginButton = ({
  onSuccess,
}: { onSuccess?: (user: User) => void } = {}) => {
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

  return <GoogleLoginButtonInner onSuccess={onSuccess} />
}

export default GoogleLoginButton
