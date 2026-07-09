import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { resolveDashboardRoute, useAuth } from "@/contexts/auth"
import { Spinner } from "@/components/ui/spinner/spinner"

const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, user, openAuthModal, closeAuthModal } = useAuth()
  const [isPageLoading, setIsPageLoading] = useState(true)

  const routeCheck = async () => {
    if (isLoading) return

    if (!user) {
      openAuthModal("sign-in")
      return
    } else {
      closeAuthModal()
    }

    const targetRoute = resolveDashboardRoute(user)
    const isOnboardingRoute = pathname?.includes("onboarding")

    if (targetRoute.includes("onboarding")) {
      if (pathname !== targetRoute) {
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
