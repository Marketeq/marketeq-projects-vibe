"use client"

import React from "react"
import { cn } from "@/utils/functions"
import { projectDetailsUrl, serviceDetailsUrl } from "@/src/lib/listing-urls"
import { ListingCardCompact } from "@/components/listing-card-compact"
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  ArrowRight,
  X,
} from "@blend-metrics/icons"
import { SwiperSlide } from "swiper/react"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { ListingCard } from "@/components/listing-card"
import {
  SwiperContent,
  SwiperNextTrigger,
  SwiperPrevTrigger,
  SwiperRoot,
} from "@/components/swiper"
import {
  Badge,
  Button,
  Favorite,
  FavoriteRoot,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import type {
  HomepagePayload,
  HomepageSection,
  HomepageBlock,
  ProjectCard,
  ServiceCard,
  TeamCard,
  TalentCard,
  HomepageBanner,
  CategoryRef,
} from "@/types/homepage"

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero({ hero }: { hero: HomepagePayload["hero"] }) {
  return (
    <div className="group/hero relative rounded-lg overflow-hidden h-[350px] isolate">
      <div className="absolute inset-0">
        <NextImage
          className="object-cover"
          src={hero.backgroundImage || "/sending-emails.png"}
          alt={hero.headline}
          fill
          sizes="100vw"
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#1661F6]/40 via-transparent to-[#0B1C3A]/60" />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(11,28,58,0.35)_0%,rgba(11,28,58,0.55)_45%,rgba(11,28,58,0.78)_100%)]" />

      <div className="absolute inset-0 flex">
        <div className="ml-auto p-[75px] max-w-[643px] flex flex-col justify-center">
          <h1 className="text-[36px] leading-[43.57px] font-bold text-white">
            {hero.headline}
          </h1>
          <p className="text-lg leading-[21.78px] mt-[7px] text-white/90 font-light">
            {hero.subheadline}
          </p>
          <NextLink
            href={hero.ctaUrl}
            className="self-start mt-[38px] border-2 h-10 border-white px-4 rounded-[5px] inline-flex items-center justify-center gap-x-2 text-[13px] leading-6 font-semibold text-white backdrop-blur-[2px] hover:bg-white hover:text-dark-blue-400 transition-colors duration-300"
          >
            {hero.ctaLabel}
            <ChevronRight className="size-4" />
          </NextLink>
        </div>
      </div>
    </div>
  )
}

// ── Banner ───────────────────────────────────────────────────────────────────

function Banner({ banner }: { banner: HomepageBanner }) {
  const [dismissed, setDismissed] = React.useState(false)

  if (!banner.enabled || dismissed) return null
  if (banner.expiresAt && new Date(banner.expiresAt) < new Date()) return null

  const colors = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    promo: "bg-primary-50 border-primary-200 text-primary-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  }

  return (
    <div className={cn("rounded-lg border px-4 py-3 flex items-center gap-x-3", colors[banner.bannerType])}>
      <AlertCircle className="size-5 shrink-0" />
      <span className="text-sm font-medium flex-auto">{banner.message}</span>
      {banner.ctaLabel && banner.ctaUrl && (
        <NextLink href={banner.ctaUrl} className="text-sm font-semibold underline shrink-0">
          {banner.ctaLabel}
        </NextLink>
      )}
      <button onClick={() => setDismissed(true)} className="shrink-0">
        <X className="size-4" />
      </button>
    </div>
  )
}

// ── Section header ──────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  ctaLabel,
  ctaUrl,
  rightSlot,
}: {
  title: string
  subtitle?: string
  ctaLabel?: string | null
  ctaUrl?: string | null
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-x-6">
      <div className="space-y-2">
        <h2 className="text-[28px] leading-none font-bold text-dark-blue-400">
          {title}
        </h2>
        {subtitle && (
          <p className="text-base leading-[19.36px] font-light text-gray-500 max-w-[800px]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-x-3">
        {ctaLabel && ctaUrl && (
          <NextLink href={ctaUrl}>
            <Button variant="link" visual="gray">
              {ctaLabel}
            </Button>
          </NextLink>
        )}
        {rightSlot}
      </div>
    </div>
  )
}

// ── Favorite button helper ──────────────────────────────────────────────────

function FavoriteButton() {
  return (
    <FavoriteRoot>
      {({ pressed }) => (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Favorite />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {pressed ? (
                <span className="inline-flex items-center gap-x-1">
                  <Check className="size-[15px] shrink-0 text-green-500" />
                  Saved
                </span>
              ) : (
                "Save to favorites"
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </FavoriteRoot>
  )
}

// ── Format helpers ──────────────────────────────────────────────────────────

function formatBudget(budget: number | null): string {
  if (budget == null) return "Budget TBD"
  return `$${budget.toLocaleString()} budget`
}

function formatDuration(duration: string | null): string {
  if (!duration) return ""
  return `Starting from ${duration}`
}

function formatPrice(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Contact for pricing"
  if (min != null && max != null) return `$${min.toLocaleString()} – $${max.toLocaleString()}/mo`
  return `$${(min ?? max)!.toLocaleString()}/mo`
}

// ── Card renderers ──────────────────────────────────────────────────────────

function renderProjectCarousel(item: ProjectCard) {
  return (
    <ListingCard
      kind="project"
      id={item.id}
      href={projectDetailsUrl(item.slug ?? item.id, item.slug ? item.id : undefined)}
      title={item.title}
      description={item.shortDescription ?? item.description}
      mediaUrl={item.thumbnail ?? undefined}
      budget={formatBudget(item.budget)}
      duration={formatDuration(item.duration)}
      rating={item.rating}
      reviewCount={item.reviewCount}
      favoriteSlot={<FavoriteButton />}
    />
  )
}

function renderServiceCarousel(item: ServiceCard) {
  return (
    <ListingCard
      kind="service"
      id={item.id}
      href={serviceDetailsUrl(item.slug ?? item.id, item.slug ? item.id : undefined)}
      title={item.title}
      description={item.shortDescription ?? item.description}
      mediaUrl={item.thumbnail ?? undefined}
      budget={formatPrice(item.priceMin, item.priceMax)}
      duration={item.deliveryTime ? `Delivery: ${item.deliveryTime}` : undefined}
      rating={item.rating}
      reviewCount={item.reviewCount}
      favoriteSlot={<FavoriteButton />}
    />
  )
}

function renderTeamCarousel(item: TeamCard) {
  return (
    <ListingCard
      kind="team"
      id={item.id}
      name={item.name}
      description={item.specializations?.join(" · ")}
      mediaUrl={item.logo ?? undefined}
      memberCount={item.memberCount}
    />
  )
}

function renderTalentCarousel(item: TalentCard) {
  const name = [item.firstName, item.lastName].filter(Boolean).join(" ") || item.username
  const rate = item.rateMin != null ? `$${item.rateMin}/hr` : undefined
  return (
    <ListingCard
      kind="talent"
      id={item.id}
      username={item.username}
      name={name}
      role={item.title ?? undefined}
      photo={item.avatarUrl ?? undefined}
      rate={rate}
      skills={item.skills}
      country={item.location ?? undefined}
    />
  )
}

function renderProjectGrid(item: ProjectCard) {
  return (
    <ListingCardCompact
      kind="project"
      id={item.id}
      slug={item.slug ?? undefined}
      title={item.title}
      description={item.shortDescription ?? item.description}
      mediaUrl={item.thumbnail ?? undefined}
      budget={formatBudget(item.budget)}
      duration={item.duration ?? undefined}
    />
  )
}

function renderServiceGrid(item: ServiceCard) {
  return (
    <ListingCardCompact
      kind="service"
      id={item.id}
      slug={item.slug ?? undefined}
      title={item.title}
      description={item.shortDescription ?? item.description}
      mediaUrl={item.thumbnail ?? undefined}
      budget={formatPrice(item.priceMin, item.priceMax)}
      duration={item.deliveryTime ?? undefined}
    />
  )
}

// ── Block renderer ──────────────────────────────────────────────────────────

function CarouselBlock({ block }: { block: HomepageBlock }) {
  return (
    <SwiperRoot>
      <div className="flex justify-end gap-x-3 mb-4">
        <SwiperPrevTrigger asChild>
          <IconButton
            className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100"
            visual="gray"
            variant="outlined"
          >
            <ChevronLeft className="size-[18px]" />
          </IconButton>
        </SwiperPrevTrigger>
        <SwiperNextTrigger asChild>
          <IconButton
            className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100"
            visual="gray"
            variant="outlined"
          >
            <ChevronRight className="size-[18px]" />
          </IconButton>
        </SwiperNextTrigger>
      </div>
      <SwiperContent slidesPerView="auto" spaceBetween={20}>
        {block.items.map((item) => (
          <SwiperSlide className="w-[355px]" key={item.id}>
            {block.entity === "projects" && renderProjectCarousel(item as ProjectCard)}
            {block.entity === "services" && renderServiceCarousel(item as ServiceCard)}
            {block.entity === "teams" && renderTeamCarousel(item as TeamCard)}
            {block.entity === "talent" && renderTalentCarousel(item as TalentCard)}
          </SwiperSlide>
        ))}
      </SwiperContent>
    </SwiperRoot>
  )
}

function GridBlock({ block }: { block: HomepageBlock }) {
  return (
    <div className="grid grid-cols-3 gap-x-[42px] gap-y-10">
      {block.items.map((item) => (
        <div key={item.id}>
          {block.entity === "projects" && renderProjectGrid(item as ProjectCard)}
          {block.entity === "services" && renderServiceGrid(item as ServiceCard)}
          {block.entity === "teams" && renderTeamCarousel(item as TeamCard)}
          {block.entity === "talent" && renderTalentCarousel(item as TalentCard)}
        </div>
      ))}
    </div>
  )
}

// ── Section renderer ────────────────────────────────────────────────────────

function HomepageSectionRenderer({ section }: { section: HomepageSection }) {
  return (
    <div>
      <SectionHeader
        title={section.title}
        subtitle={section.subtitle}
        ctaLabel={section.ctaLabel}
        ctaUrl={section.ctaUrl}
      />
      <div className="mt-6 space-y-6">
        {section.blocks.map((block) =>
          block.type === "carousel" ? (
            <CarouselBlock key={block.key} block={block} />
          ) : (
            <GridBlock key={block.key} block={block} />
          )
        )}
      </div>
    </div>
  )
}

// ── More Categories ─────────────────────────────────────────────────────────

function MoreCategories({ categories }: { categories: CategoryRef[] }) {
  if (categories.length === 0) return null

  return (
    <div>
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
            More Categories
          </h2>
          <p className="text-lg leading-[21.78px] font-light text-gray-500">
            Find more ways to maximize your results with Marketeq&apos;s curated
            project teams
          </p>
        </div>
        <Button className="xs:max-lg:hidden" visual="gray" variant="link">
          View All Categories
        </Button>
      </div>

      <div className="mt-8 lg:mt-[42px] grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
        {categories.map((cat) => (
          <NextLink
            key={cat.slug}
            href={`/c/${cat.slug}`}
            className="group relative rounded-lg overflow-hidden p-6 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-end min-h-[140px]"
          >
            {cat.iconUrl && (
              <div className="absolute top-4 right-4">
                <NextImage
                  src={cat.iconUrl}
                  alt={cat.name}
                  width={48}
                  height={48}
                  className="object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </div>
            )}
            <h3 className="text-lg font-bold text-dark-blue-600 group-hover:text-primary-500 transition-colors">
              {cat.name}
            </h3>
            <span className="mt-2 text-sm font-medium text-primary-500 inline-flex items-center gap-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Browse Projects <ArrowRight className="size-3.5" />
            </span>
          </NextLink>
        ))}
      </div>
    </div>
  )
}

// ── Main client component ───────────────────────────────────────────────────

export function HomepageClient({ data }: { data: HomepagePayload }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="py-[50px]">
        <div className="max-w-[1440px] mx-auto px-[50px] space-y-[50px]">
          {data.banner && <Banner banner={data.banner} />}
          <Hero hero={data.hero} />
          {data.sections.map((section) => (
            <HomepageSectionRenderer key={section.key} section={section} />
          ))}
          <MoreCategories categories={data.moreCategoriesList} />
        </div>
      </div>
    </div>
  )
}
