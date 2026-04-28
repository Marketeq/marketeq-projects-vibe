"use client"

import React from "react"
import { ArrowRight, ArrowUp } from "@blend-metrics/icons"
import {
  FacebookSolid,
  InstagramSolid,
  TwitterSolid,
} from "@blend-metrics/icons/social-solid"
import type {
  FooterNavColumn,
  HomepagePayload,
  TalentNetworkCta,
} from "@/types/homepage"
import { LinkedinSolid, Logo3 } from "@/components/icons"
import NextLink from "@/components/next-link"
import { Button, IconButton } from "@/components/ui"

type MarketplaceFooterProps = {
  columns?: FooterNavColumn[]
  talentCta?: TalentNetworkCta | null
}

type MarketplaceFooterData = Pick<
  HomepagePayload,
  "footerNav" | "talentNetworkCta"
>

const DEFAULT_MARKETPLACE_FOOTER_DATA: MarketplaceFooterData = {
  footerNav: [
    {
      heading: "About",
      links: [
        { label: "Why Marketeq?", url: "/about" },
        { label: "Careers", url: "/careers" },
        { label: "Partnerships", url: "/partnerships" },
        { label: "Support", url: "/support" },
        { label: "Core Values", url: "/about#values" },
        { label: "Events", url: "/events" },
      ],
    },
    {
      heading: "Solutions",
      links: [
        { label: "User Experience (UX)", url: "/c/design/ui-ux-design" },
        { label: "Interactive Prototyping", url: "/c/design/prototyping" },
        { label: "Mobile Development", url: "/c/development/mobile" },
        { label: "Software Engineering", url: "/c/development" },
        { label: "Digital Marketing", url: "/c/marketing/digital-marketing" },
        { label: "Growth Strategy", url: "/c/marketing/growth" },
        { label: "Q/A Testing", url: "/c/development/qa-testing" },
      ],
    },
    {
      heading: "Industries",
      links: [
        { label: "Logistics", url: "/industries/logistics" },
        { label: "Retail", url: "/industries/retail" },
        { label: "Government", url: "/industries/government" },
        { label: "Enterprise", url: "/industries/enterprise" },
        { label: "Fintech", url: "/industries/fintech" },
        { label: "Medical", url: "/industries/medical" },
        { label: "Marketing", url: "/industries/marketing" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { label: "Help Center", url: "/help" },
        { label: "Video Library", url: "/resources/videos" },
        { label: "Articles", url: "/blog" },
        { label: "Inspiration", url: "/resources/inspiration" },
        { label: "Project Templates", url: "/resources/templates" },
        { label: "PartnerUp Offers", url: "/partnerships/offers" },
      ],
    },
  ],
  talentNetworkCta: {
    headline: "Marketeq Talent Network",
    description:
      "Want the freedom of working from home without competing with overseas rates? Join our national talent network and get a chance to work on exciting projects from top corporations and disruptive startups.",
    ctaLabel: "Join the talent network",
    ctaUrl: "/sign-up?role=talent",
  },
}

const HOMEPAGE_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

let cachedFooterData: MarketplaceFooterData | null = null
let footerDataRequest: Promise<MarketplaceFooterData | null> | null = null

async function loadMarketplaceFooterData(): Promise<MarketplaceFooterData | null> {
  if (cachedFooterData) return cachedFooterData

  if (!footerDataRequest) {
    footerDataRequest = fetch(`${HOMEPAGE_API_BASE}/homepage`)
      .then(async (response) => {
        if (!response.ok) return null

        const data = (await response.json()) as Partial<HomepagePayload>
        const footerData: MarketplaceFooterData = {
          footerNav: Array.isArray(data.footerNav)
            ? data.footerNav
            : DEFAULT_MARKETPLACE_FOOTER_DATA.footerNav,
          talentNetworkCta:
            data.talentNetworkCta &&
            typeof data.talentNetworkCta.headline === "string"
              ? data.talentNetworkCta
              : DEFAULT_MARKETPLACE_FOOTER_DATA.talentNetworkCta,
        }

        cachedFooterData = footerData
        return footerData
      })
      .catch(() => null)
      .finally(() => {
        footerDataRequest = null
      })
  }

  return footerDataRequest
}

export function MarketplaceFooter({
  columns: columnsProp,
  talentCta: talentCtaProp,
}: MarketplaceFooterProps) {
  const [cmsFooterData, setCmsFooterData] =
    React.useState<MarketplaceFooterData | null>(cachedFooterData)
  const shouldLoadCmsData =
    columnsProp === undefined || talentCtaProp === undefined

  React.useEffect(() => {
    let isActive = true

    if (!shouldLoadCmsData) return

    loadMarketplaceFooterData().then((data) => {
      if (!isActive || !data) return

      React.startTransition(() => {
        setCmsFooterData(data)
      })
    })

    return () => {
      isActive = false
    }
  }, [shouldLoadCmsData])

  const columns =
    columnsProp ??
    cmsFooterData?.footerNav ??
    DEFAULT_MARKETPLACE_FOOTER_DATA.footerNav
  const talentCta =
    talentCtaProp === undefined
      ? (cmsFooterData?.talentNetworkCta ??
        DEFAULT_MARKETPLACE_FOOTER_DATA.talentNetworkCta)
      : talentCtaProp

  if (columns.length === 0 && !talentCta?.headline) return null

  const year = new Date().getFullYear()

  return (
    <footer className="bg-white">
      <div className="border-y border-gray-200">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex w-full items-center justify-center gap-x-2 py-[22px] text-sm font-medium text-dark-blue-400 transition-colors hover:bg-gray-50 focus-visible:outline-none"
          aria-label="Back to top"
        >
          <ArrowUp className="size-[15px]" />
          Back to Top
        </button>
      </div>

      <div className="mx-auto max-w-[1440px] px-[50px] pt-10 lg:pt-[50px]">
        <div className="flex flex-col gap-y-10 md:gap-y-20 lg:flex-row lg:items-start lg:gap-x-[100px]">
          {columns.length > 0 && (
            <div className="grid flex-auto grid-cols-2 items-start gap-y-10 md:flex md:justify-between">
              {columns.map((column) => (
                <div
                  key={column.heading}
                  className="flex flex-col gap-y-[15px]"
                >
                  <span className="inline-block text-sm font-medium leading-[16.94px] text-dark-blue-600">
                    {column.heading}
                  </span>

                  <ul className="space-y-[15px]">
                    {column.links.map((link) => (
                      <li key={`${column.heading}-${link.label}`}>
                        <NextLink
                          href={link.url}
                          className="text-[13px] font-light leading-[15.73px] text-dark-blue-600 hover:underline focus-visible:outline-none"
                        >
                          {link.label}
                        </NextLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {talentCta?.headline && (
            <div className="w-full max-w-[363px] lg:ml-auto">
              <h2 className="text-base font-medium leading-[19.36px] text-dark-blue-400">
                {talentCta.headline}
              </h2>

              {talentCta.description && (
                <p className="mt-3 whitespace-pre-line text-[13px] font-light leading-[15.73px] text-gray-700">
                  {talentCta.description}
                </p>
              )}

              {talentCta.ctaLabel && talentCta.ctaUrl && (
                <NextLink href={talentCta.ctaUrl}>
                  <Button
                    className="mt-[30px] border-primary-500 text-primary-500 hover:bg-primary-50"
                    variant="outlined"
                    visual="gray"
                  >
                    {talentCta.ctaLabel}
                    <ArrowRight className="size-[15px]" />
                  </Button>
                </NextLink>
              )}
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-y-10 border-t border-gray-200 py-10 md:py-5 lg:mt-[50px] lg:flex-row">
          <div className="flex flex-col items-center gap-y-5 md:flex-row md:gap-x-[57px]">
            <Logo3 className="h-[17.62px] w-[120px] shrink-0" />
            <span className="inline-block text-[13px] font-light leading-[15.73px] text-dark-blue-600">
              © 2011 - {year} Marketeq Digital Inc. All Rights Reserved.
            </span>
          </div>

          <div className="flex flex-col items-center gap-10 md:flex-row lg:gap-x-[50px]">
            <div className="flex items-center gap-x-5">
              <NextLink href="/terms">
                <Button className="text-dark-blue-400" variant="link">
                  Terms & Conditions
                </Button>
              </NextLink>

              <span className="inline-block h-4 w-px shrink-0 bg-gray-200" />

              <NextLink href="/privacy">
                <Button className="text-dark-blue-400" variant="link">
                  Privacy Policy
                </Button>
              </NextLink>
            </div>

            <div className="flex items-center gap-x-[16.6px]">
              <NextLink href="#" aria-label="Facebook">
                <IconButton
                  variant="outlined"
                  visual="gray"
                  className="size-[30px] rounded-full"
                >
                  <FacebookSolid className="size-3.5 text-dark-blue-400" />
                </IconButton>
              </NextLink>
              <NextLink href="#" aria-label="Twitter">
                <IconButton
                  variant="outlined"
                  visual="gray"
                  className="size-[30px] rounded-full"
                >
                  <TwitterSolid className="size-3.5 text-dark-blue-400" />
                </IconButton>
              </NextLink>
              <NextLink href="#" aria-label="Instagram">
                <IconButton
                  variant="outlined"
                  visual="gray"
                  className="size-[30px] rounded-full"
                >
                  <InstagramSolid className="size-3.5 text-dark-blue-400" />
                </IconButton>
              </NextLink>
              <NextLink href="#" aria-label="LinkedIn">
                <IconButton
                  variant="outlined"
                  visual="gray"
                  className="size-[30px] rounded-full"
                >
                  <LinkedinSolid className="size-3.5 text-dark-blue-400" />
                </IconButton>
              </NextLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
