"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  mergeDashboardUserFields,
  resolveDashboardRoute,
  useAuth,
} from "@/contexts/auth"
import { AuthAPI } from "@/service/http/auth"
import { UserAPI } from "@/service/http/user"
import { Lock01 } from "@blend-metrics/icons"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { UpdatePasswordForm } from "@/components/update-password-form"
import { NavigationForm, SessionChoice } from "@/components/navigation-form"
import { Button, useToast } from "@/components/ui"

function ResetPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { setUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isContinuing, setIsContinuing] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)
  const [nextUser, setNextUser] = useState<any>(null)
  const [sessionId, setSessionId] = useState("")

  const token = searchParams?.get("token") ?? ""

  const onSubmit = async ({ password }: { password: string }) => {
    if (!token) {
      router.push("/forgot-password")
      return
    }
    setIsLoading(true)
    try {
      const response = await AuthAPI.ResetPassword({ token, password })

      let resolvedUser = response?.data?.user
      try {
        const meResponse = await UserAPI.me()
        if (meResponse?.status === 200) {
          const profileUser =
            meResponse?.data?.user ??
            meResponse?.data?.data?.user ??
            meResponse?.data

          if (profileUser && typeof profileUser === "object") {
            resolvedUser = mergeDashboardUserFields(resolvedUser, profileUser)
          }
        }
      } catch {
        // fall back to auth payload
      }

      if (resolvedUser && typeof resolvedUser === "object") {
        setUser(resolvedUser)
      }

      setNextUser(resolvedUser)
      setSessionId(response?.data?.sessionId ?? "")
      setResetComplete(true)
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.errors?.message ??
          error?.response?.data?.message ??
          "Reset failed. Your link may have expired.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onContinue = async (choice: SessionChoice) => {
    setIsContinuing(true)
    try {
      if (choice === "sign-out-others" && sessionId) {
        await AuthAPI.RevokeAllOtherSessions(sessionId)
      }
      router.push(resolveDashboardRoute(nextUser))
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.errors?.message ??
          error?.response?.data?.message ??
          "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsContinuing(false)
    }
  }

  return (
    <>
      <div className="px-5 md:px-[100px] h-[64px] flex items-center justify-between">
        <Link href="/">
          <MarketeqLogo />
        </Link>
        <div className="flex items-center gap-x-3">
          <Link href="/sign-in">
            <Button size="md" variant="ghost">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="md">Sign Up</Button>
          </Link>
        </div>
      </div>

      {resetComplete ? (
        <NavigationForm onContinue={onContinue} isSubmitting={isContinuing} />
      ) : (
        <>
          <UpdatePasswordForm onSubmit={onSubmit} isLoading={isLoading} />

          <div className="max-w-[592px] mx-auto -mt-6 px-5 md:px-[50px] pb-10 w-full">
            <div className="flex items-center gap-x-2">
              <Lock01 className="size-5 text-primary-500" />
              <span className="text-sm font-bold leading-5 text-dark-blue-400">
                Security Tip
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-sm leading-5 text-dark-blue-400">
                Use a unique password you don't use on other sites. A mix of
                letters, numbers, and symbols makes it much harder to guess.
              </span>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  )
}
