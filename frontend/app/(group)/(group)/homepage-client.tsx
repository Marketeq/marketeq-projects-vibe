"use client"

import React from "react"
import { projectDetailsUrl, serviceDetailsUrl } from "@/src/lib/listing-urls"
import { cn, fromLength } from "@/utils/functions"
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from "@blend-metrics/icons"
import { SwiperSlide } from "swiper/react"
import type {
  CategoryRef,
  HomepageBanner,
  HomepageBlock,
  HomepageHeroSlide,
  HomepagePayload,
  HomepageSection,
  ProjectCard,
  ServiceCard,
  TalentCard,
  TeamCard,
} from "@/types/homepage"
import { Blocks1 } from "@/components/blocks-1"
import { ListingCard } from "@/components/listing-card"
import { ListingCardCompact } from "@/components/listing-card-compact"
import { MarketplaceFooter } from "@/components/marketplace-footer"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  SwiperContent,
  SwiperNextTrigger,
  SwiperPrevTrigger,
  SwiperRoot,
} from "@/components/swiper"
import {
  Button,
  Favorite,
  FavoriteRoot,
  IconButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

// ── Hero ────────────────────────────────────────────────────────────────────
// Multi-slide rotating hero with cross-fade, Ken Burns zoom, staggered text
// reveal, and a bottom-left navigator with filling progress bars. Falls back
// to legacy single-slide fields when `hero.slides` is not provided.

function Hero({ hero }: { hero: HomepagePayload["hero"] }) {
  // Resolve slides — prefer the new `slides` array; otherwise wrap legacy fields.
  const slides = React.useMemo<HomepageHeroSlide[]>(() => {
    if (hero.slides && hero.slides.length > 0) return hero.slides
    if (hero.headline) {
      return [
        {
          eyebrow: "Featured",
          title: hero.headline,
          description: hero.subheadline ?? "",
          ctaLabel: hero.ctaLabel ?? "Browse Projects",
          ctaUrl: hero.ctaUrl ?? "/c/development",
          image: hero.backgroundImage ?? "/sending-emails.png",
        },
      ]
    }
    return []
  }, [hero])

  const intervalMs = hero.intervalMs ?? 7000
  const [active, setActive] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  // Incrementing key forces the content stagger animation to replay whenever
  // the active slide changes (including on manual clicks).
  const [tick, setTick] = React.useState(0)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const goTo = React.useCallback(
    (index: number) => {
      if (slides.length === 0) return
      setActive((prev) => {
        const next = (index + slides.length) % slides.length
        if (next !== prev) setTick((t) => t + 1)
        return next
      })
    },
    [slides.length]
  )

  // Auto-advance with pause-on-hover. Re-schedules on every slide change so
  // manual navigation resets the timer (feels less janky than a fixed tick).
  React.useEffect(() => {
    if (paused || slides.length <= 1) return
    timerRef.current = setTimeout(() => {
      setActive((prev) => (prev + 1) % slides.length)
      setTick((t) => t + 1)
    }, intervalMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [active, paused, slides.length, intervalMs])

  if (slides.length === 0) return null
  const current = slides[active]

  return (
    <div
      className="group/hero relative rounded-lg overflow-hidden h-[350px] isolate"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Layered slide images — cross-fade via opacity, Ken Burns zoom on the
          active slide while visible. */}
      {slides.map((slide, i) => {
        const isActive = i === active
        return (
          <div
            key={`${slide.image}-${i}`}
            className={cn(
              "absolute inset-0 transition-opacity ease-out",
              isActive ? "opacity-100" : "opacity-0"
            )}
            style={{ transitionDuration: "1200ms" }}
            aria-hidden={!isActive}
          >
            <div
              className={cn(
                "absolute inset-0 will-change-transform",
                isActive && "hero-kenburns"
              )}
            >
              <NextImage
                className="object-cover"
                src={slide.image}
                alt={slide.title}
                fill
                sizes="100vw"
                priority={i === 0}
              />
            </div>
            {slide.accent && (
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br mix-blend-multiply",
                  slide.accent
                )}
              />
            )}
          </div>
        )
      })}

      {/* Sophisticated multi-stop overlay (not flat black). Darker on the
          right where the text sits, fading to a subtle tint on the left where
          the navigator lives. */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(11,28,58,0.35)_0%,rgba(11,28,58,0.55)_45%,rgba(11,28,58,0.78)_100%)]" />
      {/* Soft vignette to anchor the edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)_100%)] pointer-events-none" />

      {/* Content — staggered reveal keyed on `tick` so each slide change
          replays the entry animation. */}
      <div className="absolute inset-0 flex">
        <div
          key={tick}
          className="ml-auto p-[75px] max-w-[643px] flex flex-col justify-center"
        >
          <span className="hero-reveal hero-reveal-eyebrow inline-flex items-center gap-x-2 text-[11px] leading-none font-semibold uppercase tracking-[0.18em] text-white/80">
            <span className="inline-block h-px w-6 bg-white/60" />
            {current.eyebrow}
          </span>
          <h1 className="hero-reveal hero-reveal-title text-[36px] leading-[43.57px] font-bold text-white mt-3">
            {current.title}
          </h1>
          <p className="hero-reveal hero-reveal-desc text-lg leading-[21.78px] mt-[7px] text-white/90 font-light">
            {current.description}
          </p>
          <NextLink
            href={current.ctaUrl}
            className="hero-reveal hero-reveal-cta group/cta self-start focus-visible:outline-none whitespace-nowrap shrink-0 mt-[38px] border-2 h-10 border-white px-4 rounded-[5px] inline-flex items-center justify-center gap-x-2 text-[13px] leading-6 font-semibold text-white backdrop-blur-[2px] hover:bg-white hover:text-dark-blue-400 transition-colors duration-300"
          >
            {current.ctaLabel}
            <ChevronRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" />
          </NextLink>
        </div>
      </div>

      {/* Bottom-left navigator — slide number + filling progress bars */}
      {slides.length > 1 && (
        <div className="absolute left-[50px] bottom-[38px] flex flex-col gap-y-4 text-white select-none">
          <div className="flex items-end gap-x-2 leading-none tabular-nums">
            <span
              key={`num-${active}`}
              className="hero-reveal hero-reveal-num text-[44px] font-bold tracking-tight"
            >
              {String(active + 1).padStart(2, "0")}
            </span>
            <span className="text-[15px] font-light text-white/60 pb-1.5">
              / {String(slides.length).padStart(2, "0")}
            </span>
          </div>

          <div className="flex items-center gap-x-2">
            {slides.map((slide, i) => {
              const isActive = i === active
              const isPast = i < active
              return (
                <button
                  key={`${slide.image}-bar-${i}`}
                  type="button"
                  aria-label={`Go to slide ${i + 1}: ${slide.title}`}
                  onClick={() => goTo(i)}
                  className="group/dot relative h-[3px] w-10 overflow-hidden rounded-full bg-white/25 hover:bg-white/40 transition-colors"
                >
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 bg-white rounded-full",
                      isActive && !paused && "hero-progress",
                      isActive && paused && "w-full",
                      isPast && "w-full",
                      !isActive && !isPast && "w-0"
                    )}
                    style={
                      isActive && !paused
                        ? { animationDuration: `${intervalMs}ms` }
                        : undefined
                    }
                  />
                </button>
              )
            })}
          </div>

          <div
            key={`label-${active}`}
            className="hero-reveal hero-reveal-label text-[11px] font-medium uppercase tracking-[0.14em] text-white/70"
          >
            {current.eyebrow} · Featured
          </div>
        </div>
      )}

      {/* Scoped styles — co-located so the hero is self-contained. */}
      <style jsx>{`
        @keyframes hero-kenburns {
          0% {
            transform: scale(1) translate3d(0, 0, 0);
          }
          100% {
            transform: scale(1.08) translate3d(-1%, -1%, 0);
          }
        }
        :global(.hero-kenburns) {
          animation: hero-kenburns ${intervalMs + 1500}ms
            cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }

        @keyframes hero-reveal-up {
          0% {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
          }
        }
        :global(.hero-reveal) {
          animation: hero-reveal-up 900ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
        :global(.hero-reveal-eyebrow) {
          animation-delay: 80ms;
        }
        :global(.hero-reveal-title) {
          animation-delay: 160ms;
        }
        :global(.hero-reveal-desc) {
          animation-delay: 260ms;
        }
        :global(.hero-reveal-cta) {
          animation-delay: 380ms;
        }
        :global(.hero-reveal-num) {
          animation-delay: 120ms;
        }
        :global(.hero-reveal-label) {
          animation-delay: 300ms;
        }

        @keyframes hero-progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        :global(.hero-progress) {
          animation: hero-progress linear forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          :global(.hero-kenburns),
          :global(.hero-reveal),
          :global(.hero-progress) {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

// ── Banner ───────────────────────────────────────────────────────────────────

function Banner({ banner }: { banner: HomepageBanner }) {
  const [dismissed, setDismissed] = React.useState(false)

  if (!banner.enabled || dismissed) return null
  if (banner.expiresAt) {
    const expiry = new Date(banner.expiresAt)
    if (!isNaN(expiry.getTime()) && expiry < new Date()) return null
  }

  const colors = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    promo: "bg-primary-50 border-primary-200 text-primary-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  }

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 flex items-center gap-x-3",
        colors[banner.bannerType]
      )}
    >
      <AlertCircle className="size-5 shrink-0" />
      <span className="text-sm font-medium flex-auto">{banner.message}</span>
      {banner.ctaLabel && banner.ctaUrl && (
        <NextLink
          href={banner.ctaUrl}
          className="text-sm font-semibold underline shrink-0"
        >
          {banner.ctaLabel}
        </NextLink>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded hover:bg-black/5"
        aria-label="Dismiss banner"
        type="button"
      >
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
            <Button className="underline" variant="link" visual="gray">
              {ctaLabel}
              <ArrowRight className="size-[15px]" />
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
  return `Starting at $${budget.toLocaleString()}`
}

function formatDuration(duration: string | null): string {
  if (!duration) return ""
  return `Starting from ${duration}`
}

function formatPrice(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Contact for pricing"
  if (min != null && max != null)
    return `$${min.toLocaleString()} – $${max.toLocaleString()}/mo`
  const price = min ?? max
  if (price == null) return "Contact for pricing"
  return `$${price.toLocaleString()}/mo`
}

// ── Card renderers ──────────────────────────────────────────────────────────

function renderProjectCarousel(item: ProjectCard) {
  return (
    <ListingCard
      kind="project"
      id={item.id}
      href={projectDetailsUrl(
        item.slug ?? item.id,
        item.slug ? item.id : undefined
      )}
      title={item.title}
      description={item.shortDescription ?? item.description}
      mediaUrl={item.thumbnail ?? undefined}
      budget={formatBudget(item.budget)}
      duration={formatDuration(item.duration)}
      rating={item.rating ?? 4.9}
      reviewCount={item.reviewCount ?? 5}
      collaborators={item.collaborators}
      favoriteSlot={<FavoriteButton />}
    />
  )
}

function renderServiceCarousel(item: ServiceCard) {
  return (
    <ListingCard
      kind="service"
      id={item.id}
      href={serviceDetailsUrl(
        item.slug ?? item.id,
        item.slug ? item.id : undefined
      )}
      title={item.title}
      description={item.shortDescription ?? item.description}
      mediaUrl={item.thumbnail ?? undefined}
      budget={formatPrice(item.priceMin, item.priceMax)}
      duration={
        item.deliveryTime ? `Delivery: ${item.deliveryTime}` : undefined
      }
      rating={item.rating}
      reviewCount={item.reviewCount}
      favoriteSlot={<FavoriteButton />}
    />
  )
}

function renderTeamCard(item: TeamCard) {
  return (
    <ListingCard
      kind="team"
      id={item.id}
      name={item.name}
      tagline={item.specializations?.join(" · ")}
      rating={item.rating}
      projectCount={item.completedProjects}
      memberAvatars={item.logo ? [item.logo] : undefined}
    />
  )
}

function renderTalentCard(item: TalentCard) {
  const name =
    [item.firstName, item.lastName].filter(Boolean).join(" ") || item.username
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

// Grid sections (Newest Additions, Most Popular) use the compact horizontal
// card — matches the static page's RecentlyViewedSection which deliberately
// uses ListingCardCompact (image-left, title+description+budget+duration on
// the right, no rating/team/favorite). Only carousel sections get the full
// vertical ListingCard.
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

function renderBlockItem(
  block: HomepageBlock,
  item: ProjectCard | ServiceCard | TeamCard | TalentCard,
  layout: "carousel" | "grid"
) {
  if (block.entity === "projects") {
    return layout === "carousel"
      ? renderProjectCarousel(item as ProjectCard)
      : renderProjectGrid(item as ProjectCard)
  }
  if (block.entity === "services") {
    return layout === "carousel"
      ? renderServiceCarousel(item as ServiceCard)
      : renderServiceGrid(item as ServiceCard)
  }
  if (block.entity === "teams") return renderTeamCard(item as TeamCard)
  if (block.entity === "talent") return renderTalentCard(item as TalentCard)
  return null
}

/** Shared icon-button styling for the in-header swiper nav. */
const NAV_BUTTON_CLASS =
  "rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"

function CarouselNavButtons() {
  return (
    <div className="flex items-center gap-x-3">
      <SwiperPrevTrigger asChild>
        <IconButton
          className={NAV_BUTTON_CLASS}
          visual="gray"
          variant="outlined"
        >
          <ChevronLeft className="size-[18px]" />
        </IconButton>
      </SwiperPrevTrigger>
      <SwiperNextTrigger asChild>
        <IconButton
          className={NAV_BUTTON_CLASS}
          visual="gray"
          variant="outlined"
        >
          <ChevronRight className="size-[18px]" />
        </IconButton>
      </SwiperNextTrigger>
    </div>
  )
}

/** Carousel section: title + nav buttons in the same header row. */
function CarouselSectionView({
  section,
  block,
}: {
  section: HomepageSection
  block: HomepageBlock
}) {
  if (block.items.length === 0) return null

  return (
    <SwiperRoot>
      <SectionHeader
        title={section.title}
        subtitle={section.subtitle}
        ctaLabel={section.ctaLabel}
        ctaUrl={section.ctaUrl}
        rightSlot={<CarouselNavButtons />}
      />
      <div className="mt-6">
        <SwiperContent slidesPerView="auto" spaceBetween={20}>
          {block.items.map((item) => (
            <SwiperSlide
              className="w-[355px]"
              key={`${block.entity}-${item.id}`}
            >
              {renderBlockItem(block, item, "carousel")}
            </SwiperSlide>
          ))}
        </SwiperContent>
      </div>
    </SwiperRoot>
  )
}

function GridBlockBody({ block }: { block: HomepageBlock }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-[42px] gap-y-10">
      {block.items.map((item) => (
        <div key={`${block.entity}-${item.id}`}>
          {renderBlockItem(block, item, "grid")}
        </div>
      ))}
    </div>
  )
}

/** Tabbed section view — pill tabs across the top, each tab swaps the block. */
function TabbedSectionView({ section }: { section: HomepageSection }) {
  // Group blocks by tabSlug so we render one TabsContent per tab.
  const tabBlocks = React.useMemo(() => {
    const map = new Map<string, { label: string; blocks: HomepageBlock[] }>()
    for (const block of section.blocks) {
      if (!block.tabSlug) continue
      const existing = map.get(block.tabSlug)
      if (existing) {
        existing.blocks.push(block)
      } else {
        map.set(block.tabSlug, {
          label: block.tabLabel ?? block.tabSlug,
          blocks: [block],
        })
      }
    }
    return Array.from(map.entries()).map(([slug, v]) => ({ slug, ...v }))
  }, [section.blocks])

  if (tabBlocks.length === 0) return null

  return (
    <div>
      <div className="flex items-end justify-between gap-x-6">
        <div className="space-y-2">
          <h2 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-base leading-[19.36px] font-light text-gray-500 max-w-[800px]">
              {section.subtitle}
            </p>
          )}
        </div>
        {section.ctaLabel &&
          (section.ctaUrl ? (
            <NextLink href={section.ctaUrl}>
              <Button className="underline" variant="link" visual="gray">
                {section.ctaLabel}
                <ArrowRight className="size-[15px]" />
              </Button>
            </NextLink>
          ) : (
            <Button className="underline" variant="link" visual="gray">
              {section.ctaLabel}
              <ArrowRight className="size-[15px]" />
            </Button>
          ))}
      </div>

      <Tabs className="mt-[29px]" defaultValue={tabBlocks[0].slug}>
        <TabsList className="px-0 w-full justify-start gap-x-3 border-b-0">
          {tabBlocks.map((t) => (
            <TabsTrigger
              key={t.slug}
              value={t.slug}
              showUnderline={false}
              variant="unstyled"
              className="inline-flex items-center justify-center h-8 rounded-full border border-gray-300 bg-white px-3.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 focus-visible:outline-none data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabBlocks.map((t) => (
          <TabsContent key={t.slug} value={t.slug}>
            <div className="mt-[29px] space-y-10">
              {t.blocks.map((block) => (
                <GridBlockBody key={block.key} block={block} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

/** Plain grid section (no tabs). Mirrors the static page's RecentlyViewedSection:
 *  smaller 24px heading with a plain top-right "View All" button, followed by
 *  a 3-col compact-card grid. Spec 05-HP §5 (Newest Additions). */
function GridSectionView({ section }: { section: HomepageSection }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-x-6">
        <div className="space-y-2">
          <h2 className="text-[24px] leading-none text-dark-blue-400 font-bold">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-base leading-[19.36px] font-light text-gray-500 max-w-[800px]">
              {section.subtitle}
            </p>
          )}
        </div>
        {section.ctaLabel &&
          (section.ctaUrl ? (
            <NextLink href={section.ctaUrl}>
              <Button className="underline" variant="link" visual="gray">
                {section.ctaLabel}
                <ArrowRight className="size-[15px]" />
              </Button>
            </NextLink>
          ) : (
            <Button className="underline" variant="link" visual="gray">
              {section.ctaLabel}
              <ArrowRight className="size-[15px]" />
            </Button>
          ))}
      </div>
      <div className="mt-[29px] space-y-10">
        {section.blocks.map((block) => (
          <GridBlockBody key={block.key} block={block} />
        ))}
      </div>
    </div>
  )
}

// ── Section renderer ────────────────────────────────────────────────────────

function HomepageSectionRenderer({ section }: { section: HomepageSection }) {
  // Tabbed section: any block carries a tabSlug
  const isTabbed = section.blocks.some((b) => b.tabSlug)
  if (isTabbed) return <TabbedSectionView section={section} />

  // Carousel section: first block is a carousel
  const firstBlock = section.blocks[0]
  if (firstBlock?.type === "carousel") {
    return <CarouselSectionView section={section} block={firstBlock} />
  }

  // Otherwise: plain grid section
  return <GridSectionView section={section} />
}

// ── More Categories ─────────────────────────────────────────────────────────
// Featured "promo" category blocks — dark image-backed feature cards mixed
// with white spotlight cards. Labels/hrefs come from data.moreCategoriesList.

function CategoryImageFeatureCard({ category }: { category: CategoryRef }) {
  return (
    <NextLink
      href={`/c/${category.slug}`}
      className="group flex rounded-lg overflow-hidden relative p-5 lg:px-[50px] lg:py-[55px] bg-white shadow-[0px_2px_5px_0px_theme(colors.black/[0.04])] min-h-[260px] lg:min-h-[340px]"
    >
      <div className="absolute inset-0">
        <NextImage
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          src="/working-2.jpeg"
          alt={category.name}
          sizes="50vw"
          fill
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,42,75,0.48)_0%,rgba(22,97,246,0.31)_100%),linear-gradient(0deg,rgba(18,42,75,0.71),rgba(18,42,75,0.71))]" />
      <div className="relative mt-auto flex flex-col gap-y-[31px] items-start lg:flex-row lg:items-end lg:justify-between w-full">
        <h3 className="text-[22px] leading-none lg:text-[44px] lg:leading-[50px] font-bold text-white max-w-[60%]">
          {category.name}
        </h3>
        <span className="whitespace-nowrap shrink-0 border-2 h-10 border-white px-3.5 rounded-[5px] inline-flex items-center justify-center text-[13px] leading-6 font-semibold text-white">
          Browse Projects
        </span>
      </div>
    </NextLink>
  )
}

function CategoryBlocksFeatureCard({ category }: { category: CategoryRef }) {
  return (
    <NextLink
      href={`/c/${category.slug}`}
      className="group relative overflow-hidden flex xs:max-md:flex-col lg:flex-col rounded-lg p-5 lg:pt-[55px] lg:px-[50px] lg:pb-[7.56px] bg-black shadow-[0px_2px_5px_0px_theme(colors.black/[0.04])] min-h-[260px] lg:min-h-[340px]"
    >
      <div className="md:max-lg:pb-[124px] flex md:flex-col md:max-lg:gap-y-[31px] lg:flex-row items-center md:items-start xs:max-md:justify-between lg:justify-between w-full">
        <h3 className="text-[22px] leading-none lg:text-[44px] lg:leading-[50px] font-bold text-white max-w-[70%]">
          {category.name}
        </h3>
        <span className="whitespace-nowrap shrink-0 border-2 h-10 border-white px-3.5 rounded-[5px] inline-flex items-center justify-center text-[13px] leading-6 font-semibold text-white">
          Browse Projects
        </span>
      </div>
      <div className="md:-bottom-[92.44px] xs:max-md:flex xs:max-md:justify-end xs:max-md:mt-[75px] md:-right-8 md:max-lg:absolute lg:mr-[76.8px] self-end pointer-events-none">
        <Blocks1 />
      </div>
    </NextLink>
  )
}

function CategorySpotlightCard({
  category,
  className,
}: {
  category: CategoryRef
  className?: string
}) {
  return (
    <NextLink
      href={`/c/${category.slug}`}
      className={cn(
        "group relative rounded-lg p-5 lg:p-[30px] overflow-hidden flex items-center bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] border border-[#122A4B]/[.15] min-h-[140px]",
        className
      )}
    >
      <div className="space-y-5 flex-auto">
        <h3 className="text-lg leading-[21.78px] lg:text-[28px] lg:leading-[34px] font-bold text-dark-blue-600">
          {category.name}
        </h3>
        <span className="whitespace-nowrap shrink-0 border-2 h-10 border-primary-500 px-3.5 rounded-[5px] inline-flex items-center justify-center text-[13px] leading-6 font-semibold text-primary-500">
          Browse Projects
        </span>
      </div>
      <div className="relative shrink-0 xs:max-md:absolute xs:max-md:top-5 xs:max-md:right-[-115.26px]">
        <NextImage
          className="object-contain mx-auto"
          src="/cpu-1.png"
          alt={category.name}
          sizes="25vw"
          width={206.15}
          height={150}
        />
      </div>
    </NextLink>
  )
}

function MoreCategories({ categories }: { categories: CategoryRef[] }) {
  if (categories.length === 0) return null

  // Layout has 6 slots in a two-column featured grid. If fewer than 6
  // categories are provided, cycle through what we have so each visible
  // slot still maps back to a real category (instead of repeating only
  // the first one, which would produce 5 identical links).
  const cats: CategoryRef[] = Array.from(
    { length: 6 },
    (_, i) => categories[i % categories.length]
  )

  const [
    imageFeature,
    spotlightA,
    spotlightB,
    spotlightC,
    spotlightD,
    blocksFeature,
  ] = cats

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
        <NextLink href="/categories" className="xs:max-lg:hidden">
          <Button className="underline" visual="gray" variant="link">
            View All Categories
            <ArrowRight className="size-[15px]" />
          </Button>
        </NextLink>
      </div>

      <div className="mt-8 lg:mt-[42px] grid md:grid-cols-2 gap-3 lg:gap-x-8">
        <div className="contents md:grid gap-y-3 lg:gap-y-8">
          <CategoryImageFeatureCard category={imageFeature} />
          <CategorySpotlightCard category={spotlightA} />
          <CategorySpotlightCard category={spotlightB} />
        </div>
        <div className="contents md:grid gap-y-3 lg:gap-y-8">
          <CategorySpotlightCard category={spotlightC} />
          <CategorySpotlightCard category={spotlightD} />
          <CategoryBlocksFeatureCard category={blocksFeature} />
        </div>
      </div>

      <div className="flex items-center mt-[29px] justify-center lg:hidden">
        <NextLink href="/categories">
          <Button visual="gray" variant="ghost">
            View More
          </Button>
        </NextLink>
      </div>
    </div>
  )
}

// Talent Network CTA is now rendered inside the Footer component (per Figma).
// The previous standalone gradient-banner section component was removed when
// the content moved into the footer's right column.

// ── Main client component ───────────────────────────────────────────────────

export function HomepageClient({ data }: { data: HomepagePayload }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="py-[50px] flex-auto">
        <div className="max-w-[1440px] mx-auto px-[50px] space-y-[50px]">
          {data.banner && <Banner banner={data.banner} />}
          <Hero hero={data.hero} />
          {/* PopularTabsStrip removed — category quick-link pills are not in
              the homepage Figma. CMS still serves data.popularTabs (it's
              consumed by Most Popular Projects section's tab bar). */}
          {data.sections.map((section) => (
            <HomepageSectionRenderer key={section.key} section={section} />
          ))}
          <MoreCategories categories={data.moreCategoriesList} />
          {/* <TalentNetworkCtaSection cta={data.talentNetworkCta} /> */}
        </div>
      </div>
      <MarketplaceFooter
        columns={data.footerNav}
        talentCta={data.talentNetworkCta}
      />
    </div>
  )
}
