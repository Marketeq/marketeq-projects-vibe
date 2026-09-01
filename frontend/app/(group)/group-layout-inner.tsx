"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function GroupLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isOnboarding = pathname.startsWith("/onboarding")

  // Every page opens at the top. Client-side navigations keep the previous
  // scroll position otherwise, so following a link from halfway down a long
  // screen lands you halfway down the next one.
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  if (isOnboarding) {
    return <>{children}</>
  }

  return <div className="pt-[62px] lg:pt-[65px]">{children}</div>
}
