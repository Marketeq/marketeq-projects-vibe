import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { resolveDashboardRoute, useAuth } from "@/contexts/auth"
import { Spinner } from "@/components/ui/spinner/spinner"

const AuthenticatedRoute = ({
  children,
  redirectOnUnauth,
  redirectMessage,
}: {
  children: React.ReactNode
  redirectOnUnauth?: boolean
  redirectMessage?: string
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, user, authModalOpen, openAuthModal, closeAuthModal, setPendingRedirect } = useAuth()
  const [isPageLoading, setIsPageLoading] = useState(true)
  const didOpenModal = useRef(false)

  const routeCheck = async () => {
    if (isLoading) return

    if (!user) {
      if (redirectOnUnauth) {
        const redirectQuery = encodeURIComponent(pathname || "/")
        const messageQuery = encodeURIComponent(
          redirectMessage || "Please log in to continue."
        )
        router.push(`/sign-in?redirect=${redirectQuery}&message=${messageQuery}`)
        return
      }
      setPendingRedirect(pathname || "/")
      openAuthModal("sign-in")
      return
    } else {
      closeAuthModal()
      setPendingRedirect(null)
      didOpenModal.current = false
    }

    const targetRoute = resolveDashboardRoute(user)
    const isOnboardingRoute = pathname?.startsWith("/onboarding")

    if (targetRoute.includes("onboarding")) {
      // A generic "/onboarding" target means no role has been committed to
      // the backend yet — the role picker and either role's onboarding form
      // are all valid pages at this stage. Only a role-specific target
      // (set once the onboarding form itself submits) should force an exact
      // route match, so a talent user who wanders onto /onboarding/client
      // still gets bounced to /onboarding/talent.
      const isGenericFallback = targetRoute === "/onboarding"
      const shouldRedirect = isGenericFallback
        ? !isOnboardingRoute
        : pathname !== targetRoute
      if (shouldRedirect) {
        router.push(targetRoute)
        return
      }
      setIsPageLoading(false)
      return
    }

    if (isOnboardingRoute) {
      router.push(targetRoute)
      return
    }

    setIsPageLoading(false)
  }

  useEffect(() => {
    routeCheck()
  }, [user, isLoading, pathname])

  // Only arm the "closed without logging in" check once the modal has
  // actually committed as open — prevents a same-tick race where this
  // effect reads a stale authModalOpen=false right after routeCheck
  // requests the modal to open, which would fire router.back() instantly.
  useEffect(() => {
    if (authModalOpen && !user && !isLoading) {
      didOpenModal.current = true
    }
  }, [authModalOpen, user, isLoading])

  // If user closed the modal without logging in, go back to previous page
  useEffect(() => {
    if (didOpenModal.current && !authModalOpen && !user && !isLoading) {
      didOpenModal.current = false
      router.back()
    }
  }, [authModalOpen, user, isLoading, router])

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
