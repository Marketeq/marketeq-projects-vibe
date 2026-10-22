import type { ReactNode } from "react"
import { MarketplaceSecondaryNavGate } from "../embedded-profile-gate"
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
      <MarketplaceSecondaryNavGate>{children}</MarketplaceSecondaryNavGate>
      <MarketplaceFooterGate />
    </>
  )
}
