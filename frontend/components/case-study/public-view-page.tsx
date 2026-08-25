"use client"

import {
  Briefcase,
  Check,
  Flag,
  HelpCircle,
  Rocket,
  Share06,
  ShieldDollar,
  ShieldZap,
  Star,
  Users03,
} from "@blend-metrics/icons"
import { Clock } from "@blend-metrics/icons"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { ListingCard } from "@/components/listing-card"
import { ListingCardCompact } from "@/components/listing-card-compact"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import type { CaseStudyBlock } from "@/service/http/case-study"
import type {
  DemoBreadcrumbItem,
  DemoListingCard,
  DemoPricing,
  DemoProject,
  DemoTeamMember,
} from "@/lib/case-study-public-demo-data"
import { DEMO_MORE_WAYS_TO_EXPLORE } from "@/lib/case-study-public-demo-data"
import CaseStudyViewer from "./case-study-viewer"
import { PublicTopBar, type PublicTopBarUser } from "./public-top-bar"

const STATIC_ICONS = {
  rocket: Rocket,
  "shield-zap": ShieldZap,
  "shield-dollar": ShieldDollar,
} as const

export interface PublicViewPageProps {
  breadcrumb: DemoBreadcrumbItem[]
  project: DemoProject
  pricing: DemoPricing
  team: DemoTeamMember[]
  user: PublicTopBarUser
  caseStudyBlocks: CaseStudyBlock[]
  similarProjects: DemoListingCard[]
  recommendedProjects: DemoListingCard[]
  recentlyViewed: DemoListingCard[]
  relatedSearches: string[]
  onClose?: () => void
}

/**
 * The full public case-study / project page. Site navbar and footer aren't
 * rendered here — both already come from app/(group)/(group)/layout.tsx for
 * any route nested under it, this page only owns what sits between them.
 */
export function PublicViewPage({
  breadcrumb,
  project,
  pricing,
  team,
  user,
  caseStudyBlocks,
  similarProjects,
  recommendedProjects,
  recentlyViewed,
  relatedSearches,
  onClose,
}: PublicViewPageProps) {
  return (
    <div className="bg-white">
      <PublicTopBar projectTitle={project.title} user={user} onClose={onClose} />

      <header className="max-w-[1440px] mx-auto px-[100px] py-8">
        <Breadcrumb>
          {breadcrumb.map((item, i) => (
            <BreadcrumbItem key={item.href + i} isLastChild={i === breadcrumb.length - 1}>
              <BreadcrumbLink
                href={item.href}
                isCurrentPage={i === breadcrumb.length - 1}
              >
                {item.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
          ))}
        </Breadcrumb>

        <div className="mt-6 flex items-start gap-x-6">
          <div className="relative w-[181px] h-[121px] shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <NextImage
              src={project.thumbnailUrl}
              alt={project.title}
              fill
              className="object-cover"
              sizes="181px"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-x-3">
              <h1 className="text-[32px] font-bold leading-tight text-dark-blue-400">
                {project.title}
              </h1>
              <Badge visual="primary" size="md">{project.badge}</Badge>
            </div>

            <div className="mt-2 flex items-center gap-x-1.5">
              <Star className="size-[15px] text-primary-500 fill-primary-500" />
              <span className="text-sm font-medium text-dark-blue-400">
                {project.rating}{" "}
                <span className="font-light text-gray-500">
                  ({project.reviewCount} reviews)
                </span>
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {project.categories.map((c) => (
                <NextLink key={c.href} href={c.href}>
                  <Badge visual="gray" size="md">{c.label}</Badge>
                </NextLink>
              ))}
            </div>

            <p className="mt-4 max-w-[700px] text-sm font-light leading-normal text-dark-blue-400">
              {project.description}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto flex gap-x-8 px-[100px]">
        <main className="flex-1 max-w-[818px] min-w-0">
          <CaseStudyViewer blocks={caseStudyBlocks} />
        </main>

        <aside className="w-[390px] shrink-0">
          <div className="sticky top-[100px] space-y-6">
            <PriceSidebar pricing={pricing} team={team} />
            <GuaranteeCard />
          </div>
        </aside>
      </div>

      <div className="max-w-[1440px] mx-auto px-[100px] mt-[100px] space-y-[100px]">
        <CarouselSection title="Similar Projects" items={similarProjects} />
        <CarouselSection title="Recommended For You" items={recommendedProjects} />
        <MoreWaysToExplore />
        <RelatedSearches searches={relatedSearches} />
        {recentlyViewed.length ? (
          <section>
            <h2 className="text-2xl font-semibold text-dark-blue-400">
              Recently Viewed
            </h2>
            <div className="mt-6 grid grid-cols-3 gap-x-[42px] gap-y-10">
              {recentlyViewed.map((item) => (
                <ListingCardCompact
                  key={item.id}
                  kind="project"
                  id={item.id}
                  slug={item.slug}
                  href="#"
                  title={item.title}
                  description={item.description}
                  mediaUrl={item.mediaUrl}
                  budget={item.budget}
                  duration={item.duration}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <CtaBanner />
    </div>
  )
}

function PriceSidebar({
  pricing,
  team,
}: {
  pricing: DemoPricing
  team: DemoTeamMember[]
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6">
        <p className="text-xs font-medium text-gray-500">Starting at</p>
        <p className="mt-1">
          <span className="text-[32px] font-bold text-dark-blue-400">
            {pricing.amount}
          </span>
          <span className="text-base font-medium text-gray-500">
            {pricing.period}
          </span>
        </p>
        <p className="mt-1 text-xs text-gray-500">{pricing.initialPayment}</p>

        <AvatarGroup size="sm" className="mt-5">
          {team.map((member) => (
            <Avatar key={member.id} size="sm">
              {member.avatarUrl ? (
                <AvatarImage src={member.avatarUrl} alt={member.name} />
              ) : null}
              <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-x-2 text-sm text-dark-blue-400">
            <Clock className="size-4 text-gray-500" />
            {pricing.duration}
          </div>
          <div className="flex items-center gap-x-2 text-sm text-dark-blue-400">
            <Users03 className="size-4 text-gray-500" />
            {pricing.teamSize}
          </div>
        </div>

        <Button className="mt-6 w-full h-[52px]" size="xl">
          Customize &amp; Order
        </Button>

        <div className="mt-4 flex items-center gap-x-2">
          <span className="inline-flex items-center h-[22px] px-2 rounded text-[11px] font-bold text-[#0F1F4B] bg-[#FFB3C7]">
            Klarna
          </span>
          <span className="text-xs text-gray-500">
            4 interest-free payments available.
          </span>
        </div>
      </div>

      <div className="h-[50px] bg-gray-50 flex items-center justify-around border-t border-gray-200">
        <button
          type="button"
          className="inline-flex items-center gap-x-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          <Share06 className="size-4" /> Share
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-x-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          <HelpCircle className="size-4" /> Help
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-x-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          <Flag className="size-4" /> Report
        </button>
      </div>
    </div>
  )
}

function GuaranteeCard() {
  const items = [
    {
      icon: "rocket" as const,
      title: "Vetted, senior-only talent",
      description: "Every team on this listing has shipped production Unity titles before.",
    },
    {
      icon: "shield-zap" as const,
      title: "Milestone-based delivery",
      description: "Funds release per milestone, not all upfront.",
    },
  ]
  const highlighted = {
    icon: "shield-dollar" as const,
    description: "If the project falls short, you can initiate a dispute for a full refund.",
  }

  return (
    <div className="rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-dark-blue-400">
        Peace of Mind Guarantee
      </h3>
      <ul className="mt-4 space-y-4">
        {items.map((item) => {
          const Icon = STATIC_ICONS[item.icon]
          return (
            <li key={item.title} className="flex gap-x-3">
              <Icon className="size-5 shrink-0 text-primary-500" />
              <div>
                <p className="text-sm font-medium text-dark-blue-400">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 rounded-lg bg-primary-50 p-4 flex gap-x-3">
        {(() => {
          const Icon = STATIC_ICONS[highlighted.icon]
          return <Icon className="size-5 shrink-0 text-primary-500" />
        })()}
        <p className="text-xs text-primary-700">{highlighted.description}</p>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        We securely process payments and release upon rating.{" "}
        <NextLink href="/policy" className="text-primary-500 font-medium">
          See Policy Details.
        </NextLink>
      </p>
    </div>
  )
}

function CarouselSection({
  title,
  items,
}: {
  title: string
  items: DemoListingCard[]
}) {
  if (!items.length) return null
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-dark-blue-400">{title}</h2>
      </div>
      <Carousel opts={{ align: "start" }} className="mt-6">
        <CarouselContent>
          {items.map((item) => (
            <CarouselItem key={item.id} className="basis-1/4 min-w-[280px]">
              <ListingCard
                kind="project"
                id={item.id}
                title={item.title}
                description={item.description}
                mediaUrl={item.mediaUrl}
                budget={item.budget}
                duration={item.duration}
                rating={item.rating}
                reviewCount={item.reviewCount}
                href="#"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-4 flex justify-end gap-x-2">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </section>
  )
}

function MoreWaysToExplore() {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-dark-blue-400">
        More Ways to Explore
      </h2>
      <Tabs defaultValue="categories" className="mt-6">
        <TabsList>
          <TabsTrigger value="categories">Related Categories</TabsTrigger>
          <TabsTrigger value="skills">Related Skills</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <div className="mt-4 grid grid-cols-4 gap-x-6 gap-y-2">
            {DEMO_MORE_WAYS_TO_EXPLORE.categories.map((c) => (
              <Button key={c} variant="link" visual="gray" asChild className="justify-start">
                <NextLink href={`/c/${c.toLowerCase().replace(/\s+/g, "-")}`}>
                  {c}
                </NextLink>
              </Button>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="skills">
          <div className="mt-4 grid grid-cols-4 gap-x-6 gap-y-2">
            {DEMO_MORE_WAYS_TO_EXPLORE.skills.map((s) => (
              <Button key={s} variant="link" visual="gray" asChild className="justify-start">
                <NextLink href={`/search?q=${encodeURIComponent(s)}`}>{s}</NextLink>
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}

function RelatedSearches({ searches }: { searches: string[] }) {
  if (!searches.length) return null
  return (
    <section>
      <h2 className="text-2xl font-semibold text-dark-blue-400">
        Related Searches
      </h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {searches.map((term) => (
          <NextLink key={term} href={`/search?q=${encodeURIComponent(term)}`}>
            <Badge
              visual="gray"
              size="lg"
              className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
            >
              {term}
            </Badge>
          </NextLink>
        ))}
      </div>
    </section>
  )
}

function CtaBanner() {
  return (
    <section className="relative overflow-hidden bg-dark-blue-500 mt-[100px] py-20 text-center">
      <div className="relative z-[1] max-w-[600px] mx-auto px-6">
        <h2 className="text-[32px] md:text-[40px] font-semibold text-white leading-tight">
          Ready to Work With Premium Quality Talent?
        </h2>
        <p className="mt-4 text-white/70">
          Join thousands of businesses building with vetted, senior freelance
          teams on Marketeq.
        </p>
        <Button size="2xl" className="mt-8" asChild>
          <NextLink href="/sign-up">Create My Account</NextLink>
        </Button>
      </div>
    </section>
  )
}
