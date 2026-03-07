"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { AuthAPI } from "@/service/http/auth"
import { GoogleDefault } from "@blend-metrics/icons/social"
import { useGoogleLogin } from "@react-oauth/google"
import Cookies from "js-cookie"
import { Button, useToast } from "@/components/ui"
import { Spinner } from "../ui/spinner/spinner"
import { UserAPI } from "@/service/http/user"

const GoogleLoginButton = () => {
  const router = useRouter()

  const { setUser } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)

  // No safety check needed as the client ID is hardcoded in layout.tsx

  const handleLoginWithGoogle = useGoogleLogin({
  scope: "openid email profile",
  onSuccess: (tokenResponse) => {
    const accessToken = tokenResponse?.access_token

    if (!accessToken) return

    setIsLoading(true)

    AuthAPI.LoginWithGoogle({ access_token: accessToken })
      .then(async(response) => {
        if (response?.status === 200 && response?.data?.access_token && response?.data?.user) {
          Cookies.set("access_token", response.data.access_token)
       
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

export default GoogleLoginButton
