import { Suspense } from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/contexts/auth"
import { font } from "@/utils/font"
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google"
import { GoogleOAuthProvider } from "@react-oauth/google"
import "react-international-phone/style.css"
import "swiper/css"
import "swiper/css/effect-fade"
import "swiper/css/navigation"
import "swiper/css/pagination"
import { InviteWindow } from "@/components/invite-window"
import { NProgressBar } from "@/components/n-progress-bar"
import { Toaster } from "@/components/ui"
import "@/styles/globals.css"
import "@/styles/nprogress.css"
import QueryProvider from "../src/features/shared/query-provider"

export const metadata: Metadata = {
  title: "Marketeq",
  description: "Welcome to Marketeq's marketing website.",
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
  return (
    <html className={`scroll-smooth ${font.variable}`} lang="en">
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          <AuthProvider>
            <QueryProvider>
              <div className="min-h-screen flex flex-col bg-gray-50">
                {children}
              </div>
              <Suspense fallback={null}>
                <NProgressBar />
              </Suspense>
              <Toaster />
              <InviteWindow />
            </QueryProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
      <GoogleAnalytics gaId="G-265438626K" />
      <GoogleTagManager gtmId="GTM-MKB89M5M" />
    </html>
  )
}