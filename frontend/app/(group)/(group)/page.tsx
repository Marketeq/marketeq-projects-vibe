"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { fromLength, cn } from "@/utils/functions"
import { projectDetailsUrl } from "@/src/lib/listing-urls"
import {
  useFeaturedProjects,
  type FeaturedProject,
} from "@/src/lib/api/featured-projects"
import { ListingCardCompact } from "@/components/listing-card-compact"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  Check,
} from "@blend-metrics/icons"
import { TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { Tabs, TabsContent } from "@/components/ui"
import { SwiperSlide } from "swiper/react"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { Blocks1 } from "@/components/blocks-1"
import { ListingCard } from "@/components/listing-card"
import {
  SwiperContent,
  SwiperNextTrigger,
  SwiperPrevTrigger,
  SwiperRoot,
} from "@/components/swiper"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
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

// ── Hero ─────────────────────────────────────────────────────────────────────
// Contained banner (matches L1 category page hero pattern), 350px tall, content
// hugged with 75px padding all around. NOT edge-to-edge — sits inside the
// shared content container with rounded corners.
//
// Multi-slide rotating hero with cross-fade, Ken Burns zoom, staggered text
// reveal, and bottom-left slide navigator with filling progress bars. Draws
// from best-in-class patterns (Framer/Linear/Apple/Stripe/Vercel) without any
// new dependencies — pure React state + CSS transitions.
interface HeroSlide {
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  href: string
  image: string
  // Tailwind gradient fragment applied over the image — gives each slide a
  // distinct accent tint beneath the dark overlay.
  accent: string
}

const HERO_SLIDES: HeroSlide[] = [
  {
    eyebrow: "UI / UX Design",
    title: "UX / UI Experts on Demand",
    description:
      "Ship pixel-perfect product experiences with senior designers who embed with your team in days, not months.",
    ctaLabel: "Browse UX / UI experts",
    // Deep-links to the UI/UX Design L2 subcategory (not the broad Design L1).
    href: "/c/design/ui-ux-design",
    image: "/sending-emails.png",
    accent:
      "from-[#1661F6]/40 via-transparent to-[#0B1C3A]/60",
  },
  {
    eyebrow: "AI & Machine Learning",
    title: "AI Specialists Who Ship",
    description:
      "From RAG pipelines to production ML — hire AI engineers who turn your data into revenue, not research papers.",
    ctaLabel: "Explore AI talent",
    // AI/ML lives under Development in the taxonomy.
    href: "/c/development/ai-ml",
    image: "/artificial-intelligence.jpeg",
    accent:
      "from-[#6E3DF6]/45 via-transparent to-[#0B1C3A]/65",
  },
  {
    eyebrow: "Cloud & DevOps",
    title: "Cloud & DevOps, Done Right",
    description:
      "Scale confidently with certified cloud architects — AWS, GCP, Azure, Kubernetes, and CI/CD built to last.",
    ctaLabel: "Find cloud engineers",
    href: "/c/development/cloud-devops",
    image: "/clouds.png",
    accent:
      "from-[#0EA5E9]/40 via-transparent to-[#0B1C3A]/65",
  },
  {
    eyebrow: "Mobile Development",
    title: "Mobile Teams That Launch",
    description:
      "Native iOS, Android, and cross-platform apps built by teams with App Store and Play Store hits on their resume.",
    ctaLabel: "Meet mobile teams",
    href: "/c/development/mobile-development",
    image: "/design-screens.png",
    accent:
      "from-[#F6953D]/35 via-transparent to-[#0B1C3A]/65",
  },
]

const HERO_INTERVAL_MS = 7000

const Hero = () => {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  // Incrementing key forces the content stagger animation to replay whenever
  // the active slide changes (including on manual clicks).
  const [tick, setTick] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goTo = useCallback((index: number) => {
    setActive((prev) => {
      const next = (index + HERO_SLIDES.length) % HERO_SLIDES.length
      if (next !== prev) setTick((t) => t + 1)
      return next
    })
  }, [])

  // Auto-advance with pause-on-hover. Re-schedules on every slide change so
  // manual navigation resets the timer (feels less janky than a fixed tick).
  useEffect(() => {
    if (paused) return
    timerRef.current = setTimeout(() => {
      setActive((prev) => (prev + 1) % HERO_SLIDES.length)
      setTick((t) => t + 1)
    }, HERO_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [active, paused])

  const current = HERO_SLIDES[active]

  return (
    <div
      className="group/hero relative rounded-lg overflow-hidden h-[350px] isolate"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Layered slide images — each absolutely positioned, cross-fading via
          opacity. The active slide slowly zooms (Ken Burns) while visible. */}
      {HERO_SLIDES.map((slide, i) => {
        const isActive = i === active
        return (
          <div
            key={slide.image}
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
                isActive ? "hero-kenburns" : ""
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
            {/* Per-slide accent gradient — gives each slide its own tint */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br mix-blend-multiply",
                slide.accent
              )}
            />
          </div>
        )
      })}

      {/* Sophisticated multi-stop overlay (not flat black). Darker on the
          right where the text sits, fading to a subtle tint on the left where
          the navigator lives so the imagery stays visible. */}
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
            href={current.href}
            className="hero-reveal hero-reveal-cta group/cta self-start focus-visible:outline-none whitespace-nowrap shrink-0 mt-[38px] border-2 h-10 border-white px-4 rounded-[5px] inline-flex items-center justify-center gap-x-2 text-[13px] leading-6 font-semibold text-white backdrop-blur-[2px] hover:bg-white hover:text-dark-blue-400 transition-colors duration-300"
          >
            {current.ctaLabel}
            <ChevronRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" />
          </NextLink>
        </div>
      </div>

      {/* Bottom-left navigator — slide number + filling progress bars */}
      <div className="absolute left-[50px] bottom-[38px] flex flex-col gap-y-4 text-white select-none">
        <div className="flex items-end gap-x-2 leading-none tabular-nums">
          <span
            key={`num-${active}`}
            className="hero-reveal hero-reveal-num text-[44px] font-bold tracking-tight"
          >
            {String(active + 1).padStart(2, "0")}
          </span>
          <span className="text-[15px] font-light text-white/60 pb-1.5">
            / {String(HERO_SLIDES.length).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-x-2">
          {HERO_SLIDES.map((slide, i) => {
            const isActive = i === active
            const isPast = i < active
            return (
              <button
                key={slide.image}
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
                      ? { animationDuration: `${HERO_INTERVAL_MS}ms` }
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

      {/* Scoped styles for the banner. Co-located so the hero is
          self-contained and easy to tweak without hunting through globals. */}
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
          animation: hero-kenburns ${HERO_INTERVAL_MS + 1500}ms
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
          animation: hero-reveal-up 900ms cubic-bezier(0.22, 0.61, 0.36, 1)
            both;
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

// ── Section header (title + description + nav controls) ─────────────────────
const SectionHeader = ({
  title,
  description,
  rightSlot,
}: {
  title: string
  description?: string
  rightSlot?: React.ReactNode
}) => (
  <div className="flex items-start justify-between gap-x-6">
    <div className="space-y-2">
      <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
        {title}
      </h1>
      {description && (
        <p className="text-base leading-[19.36px] font-light text-gray-500 max-w-[800px]">
          {description}
        </p>
      )}
    </div>
    {rightSlot}
  </div>
)

// ── Carousel section ─────────────────────────────────────────────────────────
// Mirrors the L1 category page "Recommended in {Category}" Swiper carousel
// (SwiperRoot/SwiperContent/SwiperPrevTrigger/SwiperNextTrigger), with the
// Projects/Services/Teams/Talent pill tabs from that same section.
interface CarouselSectionProps {
  title: string
  description?: string
  count?: number
}

const CarouselSection = ({
  title,
  description,
  count = 8,
}: CarouselSectionProps) => {
  // Shared module-level fetch — every carousel/grid section on the
  // homepage reuses the same /v1/projects response.
  const { projects: allProjects } = useFeaturedProjects()
  const projects = allProjects.slice(0, count)

  const slides: Array<
    | { kind: "real"; project: FeaturedProject }
    | { kind: "placeholder"; key: number }
  > = projects.length > 0
    ? projects.map((p) => ({ kind: "real" as const, project: p }))
    : fromLength(count).map((key) => ({ kind: "placeholder" as const, key }))

  return (
    <div>
      <SwiperRoot>
        <SectionHeader
          title={title}
          description={description}
          rightSlot={
            <div className="flex items-center gap-x-3">
              <SwiperPrevTrigger asChild>
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  <ChevronLeft className="size-[18px]" />
                </IconButton>
              </SwiperPrevTrigger>
              <SwiperNextTrigger asChild>
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  <ChevronRight className="size-[18px]" />
                </IconButton>
              </SwiperNextTrigger>
            </div>
          }
        />

        <div className="mt-6">
          <div className="gap-5 flex items-center">
            <SwiperContent slidesPerView="auto" spaceBetween={20}>
                {slides.map((slide) => {
                  const isReal = slide.kind === "real"
                  const p = isReal ? slide.project : null
                  const slideKey = isReal
                    ? `project-${p!.id}`
                    : `placeholder-${(slide as { key: number }).key}`
                  return (
                  <SwiperSlide className="w-[355px]" key={slideKey}>
                    <ListingCard
                      kind="project"
                      id={p?.id ?? `homepage-placeholder-${slideKey}`}
                      href={
                        p
                          ? projectDetailsUrl(p.slug, p.id)
                          : projectDetailsUrl("modern-brand-identity-design")
                      }
                      title={p?.title ?? "The Ultimate Mobile App Experience"}
                      description={
                        p?.summary ??
                        p?.description ??
                        "Brief description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."
                      }
                      mediaUrl={p?.mediaUrls?.[0] ?? "/dashboard.png"}
                      budget="$50,000 budget"
                      duration="Starting from 12 weeks"
                      rating={4.9}
                      reviewCount={5}
                      collaborators={fromLength(6).map(() => "/woman.jpg")}
                      favoriteSlot={
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
                      }
                    />
                  </SwiperSlide>
                  )
                })}
            </SwiperContent>
          </div>
        </div>
      </SwiperRoot>
    </div>
  )
}

// ── Recently Viewed grid section ─────────────────────────────────────────────
// Mirrors the storybook "Recently Viewed" compact list pattern from
// stories/similar-projects.stories.tsx (3-col grid, 100px thumb + text), with
// pill tabs from the L1 category page pattern.
const RecentlyViewedSection = ({
  title,
  description,
  tabs,
  count = 6,
  offset = 0,
}: {
  title: string
  description?: string
  tabs?: string[]
  count?: number
  /** Skip the first N projects — lets two sections on the same page show
   *  different slices of the same fetched list. */
  offset?: number
}) => {
  const { projects: allProjects } = useFeaturedProjects()
  const projects = allProjects.slice(offset, offset + count)

  const items: Array<
    | { kind: "real"; project: FeaturedProject }
    | { kind: "placeholder"; key: number }
  > = projects.length > 0
    ? projects.map((p) => ({ kind: "real" as const, project: p }))
    : fromLength(count).map((key) => ({ kind: "placeholder" as const, key }))

  const grid = (
    <div className="mt-[29px] grid grid-cols-3 gap-x-[42px] gap-y-10">
      {items.map((item) => {
        if (item.kind === "real") {
          const p = item.project
          return (
            <ListingCardCompact
              key={`project-${p.id}`}
              kind="project"
              id={p.id}
              slug={p.slug}
              title={p.title}
              description={p.summary ?? p.description}
              mediaUrl={p.mediaUrls?.[0] ?? "/dashboard.png"}
              budget="Starting at $25,000"
              duration="2 weeks"
            />
          )
        }
        return (
          <ListingCardCompact
            key={`placeholder-${item.key}`}
            kind="project"
            id={`recently-viewed-placeholder-${item.key}`}
            slug="modern-brand-identity-design"
            title="BI Sales Forecasting & Inventory Management"
            description="Tempor nam commodo sapien lobortis pellentesque non. Elementum adipiscing sit senectus faucibus mauris amet. Elementum vitae semper lorem ornare congue."
            mediaUrl="/dashboard.png"
            budget="Starting at $25,000"
            duration="2 weeks"
          />
        )
      })}
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-x-6">
        <div className="space-y-2">
          <h1 className="text-[24px] leading-none text-dark-blue-400 font-bold">
            {title}
          </h1>
          {description && (
            <p className="text-base leading-[19.36px] font-light text-gray-500 max-w-[800px]">
              {description}
            </p>
          )}
        </div>
        <Button variant="link" visual="gray">
          {tabs && tabs.length > 0 ? "View More" : "View All"}
        </Button>
      </div>

      {tabs && tabs.length > 0 ? (
        <Tabs defaultValue={tabs[0]}>
          <div className="mt-6">
            <TabsList className="flex items-center gap-x-3 flex-wrap">
              {tabs.map((tab) => (
                <Badge
                  key={tab}
                  variant="circular"
                  visual="gray"
                  size="lg"
                  className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                  asChild
                >
                  <TabsTrigger value={tab}>{tab}</TabsTrigger>
                </Badge>
              ))}
            </TabsList>
          </div>
          {tabs.map((tab) => (
            <TabsContent key={tab} value={tab}>
              {grid}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        grid
      )}
    </div>
  )
}

// ── More Categories section ──────────────────────────────────────────────────
// Reused from the existing home page "Categories" block (originally from the
// nestjs frontend repo). Uses the inline category card variants below.
const CategoryTransparentVerticalCard = () => {
  return (
    <article className="flex rounded-lg overflow-hidden relative p-5 lg:px-[50px] lg:py-[55px] bg-white shadow-[0px_2px_5px_0px_theme(colors.black/[0.04])]">
      <div className="absolute inset-0">
        <NextImage
          className="object-cover"
          src="/working-2.jpeg"
          alt="Working"
          sizes="50vw"
          fill
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,42,75,0.48)_0%,rgba(22,97,246,0.31)_100%),linear-gradient(0deg,rgba(18,42,75,0.71),rgba(18,42,75,0.71))]" />

      <div className="relative mt-auto flex flex-col gap-y-[31px] items-start lg:flex-row lg:items-end lg:justify-between pt-[188px] md:pt-[124px] lg:pt-[135px]">
        <h1 className="text-[22px] leading-none lg:text-[62px] lg:leading-[57.4px] font-bold text-white">
          Interaction Design
        </h1>
        <button className="focus-visible:outline-none whitespace-nowrap shrink-0 border-2 h-10 border-white px-3.5 rounded-[5px] flex items-center justify-center text-[13px] leading-6 font-semibold text-white">
          Browse Projects
        </button>
      </div>
    </article>
  )
}

const CategoryVerticalCard = () => {
  return (
    <article className="relative overflow-hidden flex xs:max-md:flex-col lg:flex-col rounded-lg p-5 lg:pt-[55px] lg:px-[50px] lg:pb-[7.56px] bg-black shadow-[0px_2px_5px_0px_theme(colors.black/[0.04])]">
      <div className="md:max-lg:pb-[124px] flex md:flex-col md:max-lg:gap-y-[31px] lg:flex-row items-center md:items-start xs:max-md:justify-between lg:justify-between">
        <h1 className="text-[22px] leading-none lg:text-[62px] lg:leading-[57.4px] font-bold text-white">
          Blockchain Development
        </h1>
        <button className="focus-visible:outline-none whitespace-nowrap shrink-0 border-2 h-10 border-white px-3.5 rounded-[5px] flex items-center justify-center text-[13px] leading-6 font-semibold text-white">
          Browse Projects
        </button>
      </div>
      <div className="md:-bottom-[92.44px] xs:max-md:flex xs:max-md:justify-end xs:max-md:mt-[75px] md:-right-8 md:max-lg:absolute lg:mr-[76.8px] self-end">
        <Blocks1 />
      </div>
    </article>
  )
}

const CategoryTransparentCard = ({ className }: { className?: string }) => {
  return (
    <article
      className={cn(
        "relative rounded-lg p-5 lg:p-[30px] overflow-hidden flex items-center bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] border border-[#122A4B]/[.15]",
        className
      )}
    >
      <div className="space-y-5 flex-auto">
        <h1 className="text-lg leading-[21.78px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
          Cloud Security
        </h1>
        <button className="focus-visible:outline-none whitespace-nowrap shrink-0 border-2 h-10 border-primary-500 px-3.5 rounded-[5px] flex items-center justify-center text-[13px] leading-6 font-semibold text-primary-500">
          Browse Projects
        </button>
      </div>
      <div className="relative shrink-0 xs:max-md:absolute xs:max-md:top-5 xs:max-md:right-[-115.26px]">
        <NextImage
          className="object-contain mx-auto"
          src="/cpu-1.png"
          alt="CPU"
          sizes="25vw"
          width={206.15}
          height={150}
        />
      </div>
    </article>
  )
}

const MoreCategories = () => {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
            More Categories
          </h1>
          <p className="text-lg leading-[21.78px] font-light text-gray-500">
            Find more ways to maximize your results with Marketeq‘s curated
            project teams
          </p>
        </div>
        <Button className="xs:max-lg:hidden" visual="gray" variant="link">
          View More
        </Button>
      </div>

      <div className="mt-8 lg:mt-[42px] grid md:grid-cols-2 gap-3 lg:gap-x-8">
        <div className="contents md:grid gap-y-3 lg:gap-y-8">
          <CategoryTransparentVerticalCard />
          <CategoryTransparentCard />
          <CategoryTransparentCard />
        </div>
        <div className="contents md:grid gap-y-3 lg:gap-y-8">
          <CategoryTransparentCard />
          <CategoryTransparentCard />
          <CategoryVerticalCard />
        </div>
      </div>

      <div className="flex items-center mt-[29px] justify-center lg:hidden">
        <Button visual="gray" variant="ghost">
          View More
        </Button>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Marketplace() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="py-[50px]">
        <div className="max-w-[1440px] mx-auto px-[50px] space-y-[50px]">
          <Hero />
          <CarouselSection title="Our Favorite Projects" />
          <RecentlyViewedSection title="Newest Additions" />
          <RecentlyViewedSection
            title="Most Popular Projects"
            offset={6}
            tabs={[
              "View All",
              "Top Web Projects",
              "Top Mobile Projects",
              "Top Cloud Projects",
              "Top Digital Marketing Projects",
            ]}
          />
          <CarouselSection
            title="Online Sales Funnels"
            description="High-converting funnels, landing pages, and lead capture systems built by proven growth experts."
          />
          <CarouselSection
            title="Customer Service Solutions"
            description="Help desks, chatbots, and support workflows designed to scale your customer experience."
          />
          <CarouselSection
            title="Marketing Automation Campaigns"
            description="End-to-end automation workflows across email, SMS, and CRM that turn prospects into customers."
          />
          <CarouselSection
            title="Cloud Software Applications"
            description="Custom SaaS builds, internal tools, and cloud-native applications shipped by senior engineering teams."
          />
          <CarouselSection
            title="Mobile Applications"
            description="Native and cross-platform iOS and Android apps designed and developed by expert mobile teams."
          />
          <MoreCategories />
        </div>
      </div>
    </div>
  )
}
