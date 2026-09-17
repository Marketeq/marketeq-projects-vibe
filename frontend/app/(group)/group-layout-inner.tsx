"use client"

import { usePathname } from "next/navigation"

export function GroupLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isOnboarding = pathname.startsWith("/onboarding")

  if (isOnboarding) {
    return <>{children}</>
  }

  return <div className="pt-[62px] lg:pt-[65px]">{children}</div>
}
