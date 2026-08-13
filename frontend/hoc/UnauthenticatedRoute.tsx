import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { resolveDashboardRoute, useAuth } from "@/contexts/auth"
import { Spinner } from "@/components/ui/spinner/spinner"

const UnauthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()

  const { isLoading, user } = useAuth()

  const [isPageLoading, setIsPageLoading] = useState(true)

  const routeCheck = async () => {
    if (isLoading) return

    if (user) {
      router.replace(resolveDashboardRoute(user))
      return
    }

    setIsPageLoading(false)
  }

  useEffect(() => {
    routeCheck()
  }, [user, isLoading])

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
