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
import { User } from "@/types/user"
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

    UserAPI.me()
      .then((response) => {
        if (response?.status === 200) {
          const nextUser =
            response?.data?.user ??
            response?.data?.data?.user ??
            response?.data

          if (nextUser && typeof nextUser === "object") {
            setUser(nextUser)
          }
        }
      })
      .catch((error) => {
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

  const logoutHandler = async () => {
    try {
      await AuthAPI.Logout()
      document.cookie =
        "access_token=; Path=/; Max-Age=0; SameSite=None; Secure"
      document.cookie =
        "accessToken=; Path=/; Max-Age=0; SameSite=None; Secure"
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
