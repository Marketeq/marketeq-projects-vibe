"use client"

import { usePathname } from "next/navigation"
import { MarketplaceFooter } from "@/components/marketplace-footer"

export function MarketplaceFooterGate() {
  const pathname = usePathname()
  const showStaticFooter = pathname !== "/"
  return showStaticFooter ? <MarketplaceFooter /> : null
}

