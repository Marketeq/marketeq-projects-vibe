"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { MarketplaceFooter } from "@/components/marketplace-footer"
import { MarketplaceSecondaryNavShell } from "@/components/navigation/marketplace-secondary-nav"

export default function MarketPlaceLayout({
  children,
}: {
  children: ReactNode
}) {
  // The marketplace homepage (`/`) renders its own CMS-driven Footer
  // (homepage-client.tsx) sourced from the Homepages collection's footerNav
  // and talentNetworkCta data. Skip the static layout footer there to avoid
  // a double render. Sibling pages (project-details, services, talent, etc.)
  // continue to use this static footer.
  const pathname = usePathname()
  const showStaticFooter = pathname !== "/"
  return (
    <>
      {/* The primary header already lives in the parent group layout; this
          shared shell now owns the homepage secondary nav for every nested
          marketplace page so detail views stop drifting onto ad-hoc chrome. */}
      <MarketplaceSecondaryNavShell>{children}</MarketplaceSecondaryNavShell>
      {showStaticFooter && <MarketplaceFooter />}
    </>
  )
}
