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

      if (accountType) {
        if (accountType === ROLE.TALENT) {
          router.push(`/talent-dashboard`)
        } else if (accountType === ROLE.CLIENT) {
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
