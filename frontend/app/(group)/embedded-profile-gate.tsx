"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { MarketplaceSecondaryNavShell } from "@/components/navigation/marketplace-secondary-nav"
import { TopMostHeader } from "../top-most-header"

export function useIsEmbeddedTalentProfile() {
  const pathname = usePathname()
  const [isInIframe, setIsInIframe] = useState(false)

  useEffect(() => {
    setIsInIframe(window.self !== window.top)
  }, [])

  return isInIframe && pathname.startsWith("/talent-profile")
}

export function TopMostHeaderGate() {
  const isEmbeddedProfile = useIsEmbeddedTalentProfile()
  return isEmbeddedProfile ? null : <TopMostHeader />
}

export function MarketplaceSecondaryNavGate({
  children,
}: {
  children: React.ReactNode
}) {
  const isEmbeddedProfile = useIsEmbeddedTalentProfile()
  return isEmbeddedProfile ? (
    <>{children}</>
  ) : (
    <MarketplaceSecondaryNavShell>{children}</MarketplaceSecondaryNavShell>
  )
}
