// Server component on purpose — this is the enforcement point. Checking
// NODE_ENV in a "use client" page only hides the UI after the JS bundle
// loads in the browser; the route itself, and everything the server sends
// down for it, would still exist outside development. notFound() here
// runs before any of that ships, so the response itself is a real 404
// outside development, not just a client-side redirect or blank page.
// (/desktop-tracker-preview has no such gate — that's a pre-existing gap
// in a different route, not a reason to skip this one.)
import { notFound } from "next/navigation"
import { IdentityVerificationPreviewClient } from "./preview-client"

export default function IdentityVerificationPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  return <IdentityVerificationPreviewClient />
}
