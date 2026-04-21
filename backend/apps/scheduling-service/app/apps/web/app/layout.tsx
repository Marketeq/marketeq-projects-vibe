import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { loadTranslations } from "@calcom/i18n/server";
import { IconSprites } from "@calcom/ui/components/icon";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { dir } from "i18next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import type React from "react";

import "../styles/globals.css";
import { AppRouterI18nProvider } from "./AppRouterI18nProvider";
import { Providers } from "./providers";
import { SpeculationRules } from "./SpeculationRules";

const interFont = Inter({ subsets: ["latin"], variable: "--font-sans", preload: true, display: "swap" });
const calFont = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "block",
  weight: "600",
});

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#f9fafb",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#1C1C1C",
    },
  ],
};

export const metadata = {
  icons: {
    icon: "/api/logo?type=favicon-32",
    apple: "/api/logo?type=apple-touch-icon",
    other: [
      {
        rel: "icon-mask",
        url: "/safari-pinned-tab.svg",
        color: "#000000",
      },
      {
        url: "/api/logo?type=favicon-16",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/api/logo?type=favicon-32",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  other: {
    "application-TileColor": "#ff0000",
  },
  twitter: {
    site: "@calcom",
    creator: "@calcom",
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const getInitialProps = async () => {
  const h = await headers();
  const isEmbed = h.get("x-isEmbed") === "true";
  const embedColorScheme = h.get("x-embedColorScheme");
  const newLocale = (await getLocale(buildLegacyRequest(await headers(), await cookies()))) ?? "en";
  const direction = dir(newLocale) ?? "ltr";

  return {
    isEmbed,
    embedColorScheme,
    locale: newLocale,
    direction,
  };
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get("x-csp-nonce") ?? "";

  const country = h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || "Unknown";

  const { locale, direction, isEmbed, embedColorScheme } = await getInitialProps();
  const allowDirectIframeEmbed = process.env.ALLOW_EMBEDDING === "1";

  const ns = "common";
  const translations = await loadTranslations(locale, ns);

  return (
    <html
      className="notranslate"
      translate="no"
      lang={locale}
      dir={direction}
      style={embedColorScheme ? { colorScheme: embedColorScheme as string } : undefined}
      suppressHydrationWarning
      data-nextjs-router="app">
      <head nonce={nonce}>
        <style>{`
          :root {
            --font-sans: ${interFont.style.fontFamily.replace(/\'/g, "")};
            --font-cal: ${calFont.style.fontFamily.replace(/\'/g, "")};
          }
        `}</style>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-options='{"activationKey":"Meta+c"}'
          />
        )}
      </head>
      <body
        className="dark:bg-default bg-subtle antialiased"
        style={
          isEmbed
            ? {
                background: "transparent",
                // In our local Marketeq iframe preview we embed the page directly
                // without Cal's parent embed SDK, so the upstream hidden-by-default
                // behavior leaves the frame blank forever.
                visibility: allowDirectIframeEmbed ? "visible" : "hidden",
                opacity: allowDirectIframeEmbed ? 1 : 0,
              }
            : {
                visibility: "visible",
                opacity: 1,
              }
        }>
        <IconSprites />
        <SpeculationRules
          // URLs In Navigation
          prerenderPathsOnHover={[
            "/event-types",
            "/availability",
            "/bookings/upcoming",
            "/teams",
            "/apps",
          ]}
        />

        <Providers isEmbed={isEmbed} nonce={nonce} country={country}>
          <AppRouterI18nProvider translations={translations} locale={locale} ns={ns}>
            {children}
          </AppRouterI18nProvider>
        </Providers>
      </body>
    </html>
  );
}
