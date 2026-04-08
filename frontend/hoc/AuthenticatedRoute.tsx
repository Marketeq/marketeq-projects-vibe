import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { Spinner } from "@/components/ui/spinner/spinner"

const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, user } = useAuth()
  const [isPageLoading, setIsPageLoading] = useState(true)

  const routeCheck = async () => {
    if (isLoading) return

    //Not logged in
    if (!user) {
      if (pathname !== "/sign-in") {
        router.push("/sign-in")
      }
      return
    }

    const dashboardRole = resolveDashboardRole(user)
    const hasRole = !!dashboardRole
    const onboardingDismissed = user?.onboardingDismissed

    //New user, no role yet
    if (!hasRole) {
      if (!pathname?.includes("onboarding")) {
        router.push("/onboarding")
      } else {
        setIsPageLoading(false)
      }
      return
    }

    //Has role, but onboarding not dismissed
    if (hasRole && !onboardingDismissed) {
      if (!pathname?.includes("onboarding")) {
        router.push("/onboarding")
      } else {
        setIsPageLoading(false)
      }
      return
    }

    //Has role and onboarding is dismissed — user can access the requested page
    if (hasRole && onboardingDismissed) {
      // If they somehow landed on an onboarding route, send them home
      if (pathname?.includes("onboarding")) {
        router.push("/")
        return
      }
      setIsPageLoading(false)
      return
    }
  }

  useEffect(() => {
    routeCheck()
  }, [user, isLoading, pathname])

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
