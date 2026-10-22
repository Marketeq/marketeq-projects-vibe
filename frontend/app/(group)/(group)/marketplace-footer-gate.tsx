"use client"

import { usePathname } from "next/navigation"
import { MarketplaceFooter } from "@/components/marketplace-footer"
import { useIsEmbeddedTalentProfile } from "../embedded-profile-gate"

export function MarketplaceFooterGate() {
  const pathname = usePathname()
  const isEmbeddedProfile = useIsEmbeddedTalentProfile()
  const showStaticFooter = pathname !== "/" && !isEmbeddedProfile
  return showStaticFooter ? <MarketplaceFooter /> : null
}
