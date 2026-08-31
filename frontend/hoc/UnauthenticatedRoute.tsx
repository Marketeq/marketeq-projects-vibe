import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { resolveDashboardRoute, useAuth } from "@/contexts/auth"
import { Spinner } from "@/components/ui/spinner/spinner"

const UnauthenticatedRoute = ({
  children,
  redirectTo,
}: {
  children: React.ReactNode
  /**
   * Overrides the default post-login destination (resolveDashboardRoute).
   * Callers set this to a validated `?redirect=` target. Sign-in and
   * sign-up pass the invite-accept URL an invitee arrived from. Without
   * this, setUser() from a successful login triggers this effect and
   * router.replace(resolveDashboardRoute(user)) races the page's own
   * post-login router.replace(nextRoute); the dashboard route consistently
   * wins, silently abandoning the pending invite accept.
   */
  redirectTo?: string
}) => {
  const router = useRouter()

  const { isLoading, user } = useAuth()

  const [isPageLoading, setIsPageLoading] = useState(true)

  const routeCheck = async () => {
    if (isLoading) return

    if (user) {
      router.replace(redirectTo || resolveDashboardRoute(user))
      return
    }

    setIsPageLoading(false)
  }

  useEffect(() => {
    routeCheck()
  }, [user, isLoading, redirectTo])

  return (
    <>
      {isPageLoading && (
        <div className="w-full h-screen flex justify-center items-center">
          <Spinner size={32} strokeWidth={3} />
        </div>
      )}

      {!isPageLoading && !user && <>{children}</>}
    </>
  )
}

export default UnauthenticatedRoute
