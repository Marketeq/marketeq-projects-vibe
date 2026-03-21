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
import { ROLE, User } from "@/types/user"
import { useToast } from "@/components/ui"
import Cookies from "js-cookie"

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

function useProvideAuth() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUserRaw] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false)

  // Wrap setUser to always normalize userType → role
  const setUser: Dispatch<React.SetStateAction<User | null>> = (action) => {
    setUserRaw((prev) => {
      const next = typeof action === "function" ? action(prev) : action
      if (next && next.userType) {
        const typeMap: Record<string, ROLE> = { talent: ROLE.TALENT, client: ROLE.CLIENT }
        next.role = typeMap[next.userType] ?? next.role
      }
      return next
    })
  }

  const getUser = () => {
    // Skip auth check during SSR — cookies and API calls are client-side only
    if (typeof window === "undefined") {
      setIsLoading(false)
      setIsAuthChecked(true)
      return
    }

    setIsLoading(true)

    const accessToken = Cookies.get("access_token")
    console.log("[auth] access_token cookie:", accessToken ? "present" : "MISSING")
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
        console.log("[auth] /user/me response status:", response?.status, "data keys:", response?.data ? Object.keys(response.data) : "none")
        if (response?.status === 200) {
          const nextUser =
            response?.data?.user ??
            response?.data?.data?.user ??
            response?.data

          console.log("[auth] resolved user id:", nextUser?.id, "email:", nextUser?.email)
          if (nextUser && typeof nextUser === "object") {
            setUser(nextUser)
          }
        }
      })
      .catch((error) => {
        console.error("[auth] /user/me error:", error?.response?.status, error?.message)
        const status = error?.response?.status
        if (status === 401 || status === 403) {
          setUser(null)
        }
        setIsAuthChecked(true)
        setIsLoading(false)
      })
      .finally(() => {
        setIsLoading(false)
        setIsAuthChecked(true)
      })
  }

  const logoutHandler = () => {
    setUser(null)
    document.cookie = "access_token=; Path=/; Max-Age=0; SameSite=None; Secure"
    document.cookie = "accessToken=; Path=/; Max-Age=0; SameSite=None; Secure"
    document.cookie = "refresh_token=; Path=/; Max-Age=0; SameSite=None; Secure"
    router.push("/sign-in")
    AuthAPI.Logout().catch(() => {})
  }

  useEffect(() => {
    getUser()
  }, [])

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
