"use client"

import React, {
  Context,
  Dispatch,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { AuthAPI } from "@/service/http/auth"
import { UserAPI } from "@/service/http/user"
import Cookies from "js-cookie"
import { ROLE, User } from "@/types/user"
import { useToast } from "@/components/ui"

type DashboardResolvableUser = {
  userType?: string | null
  accountType?: string | null
  role?: string | null
  onboardingDismissed?: boolean | null
  onboardedAt?: string | Date | null
  hasCompletedOnboarding?: boolean | null
}

export const resolveDashboardRole = (
  user?: DashboardResolvableUser | null,
): ROLE | undefined => {
  const normalizedUserType = user?.userType?.toLowerCase?.()
  const normalizedAccountType = user?.accountType?.toUpperCase?.()
  const normalizedRole = user?.role?.toUpperCase?.()

  // `role` is the active session (account switcher toggles this) — check it first.
  // `accountType` / `userType` are profile labels a user may own both of.
  if (
    normalizedRole === ROLE.TALENT ||
    normalizedAccountType === ROLE.TALENT ||
    normalizedUserType === "talent"
  ) {
    return ROLE.TALENT
  }

  if (
    normalizedRole === ROLE.CLIENT ||
    normalizedAccountType === ROLE.CLIENT ||
    normalizedUserType === "client"
  ) {
    return ROLE.CLIENT
  }

  return undefined
}

export const resolveDashboardRoute = (
  user?: DashboardResolvableUser | null,
): string => {
  const dashboardRole = resolveDashboardRole(user)

  if (dashboardRole === ROLE.TALENT) {
    return "/talent-dashboard"
  }

  if (dashboardRole === ROLE.CLIENT) {
    return "/client-dashboard"
  }

  // Returning users who have already completed/dismissed onboarding must
  // never be bounced back to /onboarding just because the /me payload is
  // missing role/accountType/userType. Default them to client-dashboard
  // — the account switcher can flip them to talent if needed.
  const hasCompletedOnboarding =
    user?.hasCompletedOnboarding === true ||
    user?.onboardingDismissed === true ||
    user?.onboardedAt != null

  if (hasCompletedOnboarding) {
    return "/client-dashboard"
  }

  return "/onboarding"
}

export const mergeDashboardUserFields = <
  T extends Record<string, unknown> | null | undefined,
>(
  authUser: T,
  profileUser: unknown,
): T => {
  if (!authUser || !profileUser || typeof profileUser !== "object") {
    return authUser
  }

  const merged: Record<string, unknown> = {
    ...(authUser as Record<string, unknown>),
    ...(profileUser as Record<string, unknown>),
  }

  for (const key of ["role", "accountType", "userType"] as const) {
    const authValue = (authUser as Record<string, unknown>)[key]
    if (merged[key] == null && authValue != null) {
      merged[key] = authValue
    }
  }

  return merged as T
}

interface AuthContextType {
  isLoading: boolean
  isAuthChecked: boolean
  user: User | null
  setUser: Dispatch<React.SetStateAction<User | null>>
  logoutHandler: () => void
}

const AuthContext: Context<AuthContextType> = createContext<AuthContextType>({
  isLoading: true,
  isAuthChecked: false,
  user: null,
  setUser: () => {},
  logoutHandler: () => {},
})

const mergeUserAuthFields = (prev: User | null, next: User | null): User | null => {
  if (!next) return next

  return {
    ...prev,
    ...next,
    provider: next.provider ?? prev?.provider,
    hasPassword: next.hasPassword ?? prev?.hasPassword,
    socialId: next.socialId ?? prev?.socialId,
    emailVerified: next.emailVerified ?? prev?.emailVerified,
    deletedAt: next.deletedAt ?? prev?.deletedAt ?? null,
  }
}

function useProvideAuth() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false)

  const getUser = () => {
    setIsLoading(true)

    const accessToken = Cookies.get("access_token")
    if (!accessToken) {
      setUser(null)
      setIsAuthChecked(true)
      setIsLoading(false)
      return
    }

    // Ensure cookie is always set with path="/" so it's available on all routes
    Cookies.set("access_token", accessToken, { path: "/" })

    UserAPI.me()
      .then((response) => {
        if (response?.status === 200) {
          const nextUser =
            response?.data?.user ?? response?.data?.data?.user ?? response?.data

          if (nextUser && typeof nextUser === "object") {
            // Merge localStorage onboarding flag in case the API didn't persist it
            if (
              !nextUser.onboardingDismissed &&
              typeof window !== "undefined" &&
              window.localStorage.getItem("marketeq-onboarding-dismissed") === "true"
            ) {
              nextUser.onboardingDismissed = true
            }
            setUser(nextUser)
          }
        }
      })
      .catch((error) => {
        const status = error?.response?.status
        if (status === 401 || status === 403) {
          console.warn("[auth] /user/me unauthorized; clearing local session")
          // Session is dead — clear user and cookies so AuthenticatedRoute redirects to sign-in
          Cookies.remove("access_token", { path: "/" })
          Cookies.remove("refresh_token", { path: "/" })
          setUser(null)
        } else if (!status) {
          // Backend unavailable/offline during local dev; avoid noisy error-level logs.
          console.warn("[auth] /user/me unavailable:", error?.message)
        } else {
          console.warn("[auth] /user/me request failed:", status, error?.message)
        }
        setIsAuthChecked(true)
        setIsLoading(false)
      })
      .finally(() => {
        setIsLoading(false)
        setIsAuthChecked(true)
      })
  }

  const logoutHandler = async () => {
    try {
      const refreshToken = Cookies.get("refresh_token")
      await AuthAPI.Logout(refreshToken)
      document.cookie =
        "access_token=; Path=/; Max-Age=0; SameSite=None; Secure"
      document.cookie = "accessToken=; Path=/; Max-Age=0; SameSite=None; Secure"
      Cookies.remove("access_token", { path: "/" })
      Cookies.remove("accessToken", { path: "/" })
      Cookies.remove("refresh_token", { path: "/" })
      Cookies.remove("session_id", { path: "/" })
      try { window.localStorage.removeItem("marketeq-onboarding-dismissed") } catch {}
    } catch (err: any) {
      toast({
        title:
          err?.response?.data?.message ||
          err?.message ||
          "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setUser(null)
      router.push("/sign-in")
    }
  }

  useEffect(() => {
    getUser()
  }, [])

  // Heartbeat: keeps session alive and detects revocation
  useEffect(() => {
    const accessToken = Cookies.get("access_token")
    const sessionId = Cookies.get("session_id")
    if (!accessToken || !sessionId) return

    const tick = () => {
      AuthAPI.Heartbeat().catch((err) => {
        if (err?.response?.status === 401) {
          Cookies.remove("access_token", { path: "/" })
          Cookies.remove("refresh_token", { path: "/" })
          Cookies.remove("session_id", { path: "/" })
          setUser(null)
          router.push("/sign-in")
        }
      })
    }

    // First heartbeat immediately so lastActiveAt is fresh
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [user])

  return {
    isLoading,
    isAuthChecked,
    user,
    setUser,
    logoutHandler,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useProvideAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
