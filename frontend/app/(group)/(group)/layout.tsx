import type { ReactNode } from "react"
import { MarketplaceSecondaryNavShell } from "@/components/navigation/marketplace-secondary-nav"
import { MarketplaceFooterGate } from "./marketplace-footer-gate"

export default function MarketPlaceLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      {/* The primary header already lives in the parent group layout; this
          shared shell now owns the homepage secondary nav for every nested
          marketplace page so detail views stop drifting onto ad-hoc chrome. */}
      <MarketplaceSecondaryNavShell>{children}</MarketplaceSecondaryNavShell>
      <MarketplaceFooterGate />
    </>
  )
}
