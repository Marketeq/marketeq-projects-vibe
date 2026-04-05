import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { Spinner } from "@/components/ui/spinner/spinner"

const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, isAuthChecked, user } = useAuth()
  const [isPageLoading, setIsPageLoading] = useState(true)

  const routeCheck = async () => {
    // Wait until auth context has finished its initial check
    if (isLoading || !isAuthChecked) return

    //Not logged in
    if (!user) {
      if (pathname !== "/sign-in") {
        router.push("/sign-in")
      }
      return
    }

    const normalizedUserType =
      typeof user?.userType === "string" ? user.userType.toLowerCase() : null
    const accountType =
      user?.accountType ??
      (normalizedUserType === "talent"
        ? ROLE.TALENT
        : normalizedUserType === "client"
          ? ROLE.CLIENT
          : user?.role === ROLE.TALENT || user?.role === ROLE.CLIENT
            ? user.role
            : undefined)
    const hasAccountType = !!accountType
    const onboardingDismissed = user?.onboardingDismissed

    //New user, no account type yet
    if (!hasAccountType) {
      if (!pathname?.includes("onboarding")) {
        router.push("/onboarding")
      } else {
        setIsPageLoading(false)
      }
      return
    }

    //Has account type, but onboarding not dismissed — send to the correct onboarding flow
    if (hasAccountType && !onboardingDismissed) {
      if (!pathname?.includes("onboarding")) {
        const onboardingPath = accountType === ROLE.TALENT ? "/onboarding/talent" : "/onboarding/client"
        router.push(onboardingPath)
      } else {
        setIsPageLoading(false)
      }
      return
    }

    //Has account type and onboarding is dismissed
    if (hasAccountType && onboardingDismissed) {
      if (pathname?.includes("onboarding")) {
        // User already completed onboarding, redirect away from onboarding pages
        if (accountType === ROLE.TALENT) {
          router.push(`/talent-dashboard`)
        } else if (accountType === ROLE.CLIENT) {
          router.push(`/client-dashboard`)
        } else {
          router.push(`/`)
        }
        return
      }

      // User is on a normal authenticated page — let them through
      setIsPageLoading(false)
      return
    }
  }

  useEffect(() => {
    routeCheck()
  }, [user, isLoading, isAuthChecked, pathname])

  return (
    <>
      {isPageLoading ? (
        <div className="w-full h-screen flex justify-center items-center">
          <Spinner size={32} strokeWidth={3} />
        </div>
      ) : (
        user && <>{children}</>
      )}
    </>
  )
}

export default AuthenticatedRoute
