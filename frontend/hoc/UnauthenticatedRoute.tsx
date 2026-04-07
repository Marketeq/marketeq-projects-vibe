import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { Spinner } from "@/components/ui/spinner/spinner"

const UnauthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()

  const { isLoading, user } = useAuth()

  const [isPageLoading, setIsPageLoading] = useState(true)

  const routeCheck = async () => {
    setIsPageLoading(true)

    if (user && !isLoading) {
      if (user?.role) {
        if (user.role === ROLE.TALENT) {
          router.push(`/talent-dashboard`)
        } else if (user.role === ROLE.CLIENT) {
          router.push(`/client-dashboard`)
        } else {
          router.push(`/`)
        }
      } else {
        router.push("/onboarding")
      }
    }

    if (!isLoading && !user) {
      setIsPageLoading(false)
    }
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
