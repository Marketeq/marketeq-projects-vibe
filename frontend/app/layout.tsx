import { Suspense } from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/contexts/auth"
import { font } from "@/utils/font"
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google"
import { GoogleOAuthProvider } from "@react-oauth/google"
import "react-international-phone/style.css"
import "swiper/css"
import "swiper/css/effect-fade"
import "swiper/css/free-mode"
import "swiper/css/navigation"
import "swiper/css/pagination"
import { Toaster } from "@/components/ui/toast/toaster"
import { InviteWindow } from "@/components/invite-window"
import { NProgressBar } from "@/components/n-progress-bar"
import { TimezoneSync } from "@/components/timezone-sync"
import "@/styles/globals.css"
import "@/styles/nprogress.css"
import QueryProvider from "../src/features/shared/query-provider"
import { CreateListingGateHost } from "@/utils/CreateListingGateHost"
import { IdentityVerificationHostProvider } from "@/contexts/identity-verification-host"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Marketeq",
  description: "Welcome to Marketeq's marketing website.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

  const content = (
    <AuthProvider>
      <QueryProvider>
        {/* The one identity verification host: it can open verification over any page, and
            stays inert (renders and reads nothing) when signed out and on the public
            authentication pages. */}
        <IdentityVerificationHostProvider>
          <div className="min-h-screen flex flex-col bg-gray-50">{children}</div>
          {/* G2's blocked-listing modal lives inside the host's provider so its Start
              Verification can open verification in place. */}
          <CreateListingGateHost />
        </IdentityVerificationHostProvider>
        <Suspense fallback={null}>
          <NProgressBar />
        </Suspense>
        <Toaster />
        <TimezoneSync />
        <InviteWindow />
      </QueryProvider>
    </AuthProvider>
  )

  return (
    <html
      className={`scroll-smooth ${font.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            {content}
          </GoogleOAuthProvider>
        ) : (
          content
        )}
        <GoogleAnalytics gaId="G-265438626K" />
        <GoogleTagManager gtmId="GTM-MKB89M5M" />
      </body>
    </html>
  )
}
