"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { AuthModal } from "@/components/auth/auth-modal"

export function GroupLayoutInner({
  children,
  header,
}: {
  children: React.ReactNode
  header: React.ReactNode
}) {
  const pathname = usePathname()
  const isOnboarding = pathname.startsWith("/onboarding")
  const isReview = /^\/active-project\/[^/]+\/review\/?$/.test(pathname)
  const { authModalOpen, authModalView, closeAuthModal } = useAuth()

  // Every page opens at the top. Client-side navigations keep the previous
  // scroll position otherwise, so following a link from halfway down a long
  // screen lands you halfway down the next one.
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  if (isReview) {
    return (
      <>
        {children}
        <AuthModal
          open={authModalOpen}
          onOpenChange={(open) => {
            if (!open) closeAuthModal()
          }}
          defaultView={authModalView}
        />
      </>
    )
  }

  if (isOnboarding) {
    return (
      <>
        {header}
        {children}
      </>
    )
  }

  return (
    <>
      {header}
      <div className="pt-[88px] md:pt-[62px] lg:pt-[65px]">{children}</div>
    </>
  )
}
