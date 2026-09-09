"use client"

/**
 * Master ListingCard component.
 *
 * Single entry point for rendering project / service / talent / team cards
 * across the app. Navigation hrefs are computed from `kind` + identifiers so
 * every call site lands on the correct detail page without hardcoding routes.
 *
 * Project/service cards share a layout and support two modes:
 *   - "browse": shows the favorite star (default).
 *   - "owned":  shows a status badge + edit icon (used in /my-listings).
 *
 * The "is-favorited" cardVariant is for lists that are already a set of
 * favorites: the star over the image would be redundant there, so it is
 * dropped and an options menu sits at the bottom right instead. Pass that
 * menu in through `optionsSlot`, the same way `favoriteSlot` is passed.
 *
 * Talent cards forward to the existing TalentSearchCard which already
 * implements the full grid layout with skills, rating, avatar, etc.
 */
import {
  jobDetailsUrl,
  projectDetailsUrl,
  serviceDetailsUrl,
  talentProfileUrl,
  teamDetailsUrl,
} from "@/src/lib/listing-urls"
import React from "react"
import { useAuth } from "@/contexts/auth"
import { cn, plainTextFromRichTextHtml } from "@/utils/functions"
import {
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  Edit03,
  File02,
  HelpCircle,
  MarkerPin02,
  RefreshCw,
  Star,
  User01,
  Users,
} from "@blend-metrics/icons"
import { Money } from "@/components/money"
import { NextImage } from "@/components/next-image"
import { NextLink } from "@/components/next-link"
import { claimProject } from "@/src/lib/api/claim"
import {
  isTalentAccount,
  NoTeamAssigned,
} from "@/components/no-team-assigned"
import { TalentSearchCard } from "@/components/talent-search-card"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

/* ─── Types ────────────────────────────────────────────────────────────── */

export type ListingStatus =
  | "Active"
  | "Draft"
  | "Paused"
  | "Completed"
  | "In Review"
  | "Needs Update"

export type ListingMode = "browse" | "owned"
export type ListingCardVariant =
  | "default"
  | "job"
  | "job-grid"
  | "is-favorited"

interface ProjectLikeProps {
  kind: "project" | "service"
  id: string
  title: string
  description?: string
  mediaUrl?: string
  budget: string
  duration?: string
  rating?: number
  reviewCount?: number
  status?: ListingStatus
  /** Avatar URLs to render in the bottom avatar group. Ignored if avatarsSlot is provided. */
  collaborators?: string[]
  /**
   * Custom element to render in place of the default AvatarGroup.
   * Use this when you need tooltips, custom images, or other complex behavior.
   */
  avatarsSlot?: React.ReactNode
  /**
   * Called when someone clicks "Claim this Project/Service" in the no-team
   * tooltip. Omit it and the CTA sends them to the listing's details page,
   * where the real claim flow lives.
   */
  onClaim?: () => void
  /** Optional badge rendered over the media (e.g. "Service"). */
  badge?: string
  /** Optional href override; if omitted, computed from kind + id. */
  href?: string
  mode?: ListingMode
  /** "owned" mode: invoked when the edit icon is clicked. */
  onEdit?: () => void
  /** "browse" mode: slot for a favorite button (FavoriteRoot, etc.). */
  favoriteSlot?: React.ReactNode
  /** "is-favorited" variant: slot for the bottom-right options menu. */
  optionsSlot?: React.ReactNode
  /**
   * Card shape. "grid" is the default portrait card; "list" is the wide
   * landscape row with the media on the left, used by list-view toggles.
   */
  layout?: "grid" | "list"
  /** Search pages can opt into the jobs-specific landscape treatment. */
  cardVariant?: ListingCardVariant
}

interface TalentCardProps {
  kind: "talent"
  id: string
  username: string
  name?: string
  handle?: string
  role?: string
  photo?: string
  rate?: string
  experience?: string
  country?: string
  localTime?: string
  rating?: number
  projects?: number
  allStars?: boolean
  skills?: string[]
  href?: string
  favoriteSlot?: React.ReactNode
  isFavorited?: boolean
  onFavoriteChange?: (favorited: boolean) => void
  showOptionsMenu?: boolean
  onRemove?: () => void
}

interface TeamCardProps {
  kind: "team"
  id: string
  name: string
  handle?: string
  tagline?: string
  experience?: string
  rate?: string
  locations?: string
  rating?: number
  projectCount?: number
  skills?: string[]
  memberAvatars?: string[]
  /** Logo URLs rendered in the "Previous clients" row. */
  previousClientLogos?: string[]
  href?: string
  favoriteSlot?: React.ReactNode
}

export type ListingCardProps =
  | ProjectLikeProps
  | TalentCardProps
  | TeamCardProps

/* ─── Master dispatch ──────────────────────────────────────────────────── */


export function ListingCard(props: ListingCardProps) {
  if (props.kind === "talent") {
    const href = props.href ?? talentProfileUrl(props.username)
    return (
      <TalentSearchCard
        id={props.id}
        name={props.name}
        handle={props.handle}
        role={props.role}
        photo={props.photo}
        rate={props.rate}
        experience={props.experience}
        country={props.country}
        localTime={props.localTime}
        rating={props.rating}
        projects={props.projects}
        allStars={props.allStars}
        skills={props.skills}
        profileHref={href}
        favoriteSlot={props.favoriteSlot}
        isFavorited={props.isFavorited}
        onFavoriteChange={props.onFavoriteChange}
        showOptionsMenu={props.showOptionsMenu}
        onRemove={props.onRemove}
      />
    )
  }

  if (props.kind === "team") {
    return <TeamListingCard {...props} />
  }

  return <ProjectListingCard {...props} />
}

/* ─── Project / Service card ──────────────────────────────────────────── */

function ProjectListingCard({
  kind,
  id,
  title,
  description,
  mediaUrl,
  budget,
  duration,
  rating,
  reviewCount,
  status,
  collaborators,
  avatarsSlot,
  badge,
  href,
  mode = "browse",
  onEdit,
  onClaim,
  favoriteSlot,
  optionsSlot,
  layout = "grid",
  cardVariant = "default",
}: ProjectLikeProps) {
  // Listing descriptions are authored in the rich-text editor and stored as
  // HTML. Cards render their excerpt as a JSX text child, which React escapes
  // — so without flattening it first the tags show up on screen as literal
  // text. Detail pages still render the real markup.
  const plainDescription = plainTextFromRichTextHtml(description)
  const { user } = useAuth()
  // The unclaimed-team empty state is a talent-facing call to action. Clients
  // and signed-out visitors just don't see the row until somebody owns it.
  const isTalent = isTalentAccount(user)
  const hasTeam = !!collaborators && collaborators.length > 0
  const computedHref =
    href ??
    (cardVariant === "job" || cardVariant === "job-grid"
      ? jobDetailsUrl(id)
      : mode === "owned" && status && status !== "Active"
        ? `/publish-project?type=${kind}&draftId=${id}`
        : kind === "service"
          ? serviceDetailsUrl(id)
          : projectDetailsUrl(id))
  const badgeText = kind === "service" ? "Service" : badge?.trim()
  // Strip any lead-in the data already carries ("Starting at $50,000",
  // "From $50,000 budget") so the card owns the wording, not the content.
  const LEAD_IN = /^\s*(starting\s+(at|from)|starts?\s+(at|from)|from|as\s+low\s+as)\s*/i

  const budgetText = (() => {
    const value = String(budget ?? "")
      .replace(LEAD_IN, "")
      .replace(/\s*\/\s*(hr|hours?|hourly|mo|months?|monthly|wk|weeks?|yr|years?)\s*$/i, "")
      .replace(/\s+budget\s*$/i, "")
      .trim()
    // Figma 8:9378 shows a single figure, not a range. If the data hands us
    // "$500 - $3,000", show the starting price so the format stays fixed.
    const range = value.match(
      /^\$?\s*([\d.,]+)\s*(?:–|—|-|to)\s*\$?\s*([\d.,]+)$/i
    )
    const single = range ? range[1] : value

    const numericValue = Number(single.replace(/[$,\s]/g, ""))
    return single && !Number.isNaN(numericValue)
      ? `$${numericValue.toLocaleString()}`
      : single
  })()

  // Locked timeline format. Units: hours, days, weeks, months.
  // Content supplies the number and unit; the card owns the wording, the
  // casing and the singular/plural, so changing content cannot change format.
  //   "12 weeks" | "Starting from 12 Weeks" | "12 wks" -> "Starting from 12 weeks"
  //   "1 month"                                        -> "Starting from 1 month"
  // Anything non-numeric ("Ongoing", "Full-Time") passes through unprefixed.
  const durationText = (() => {
    const raw = String(duration ?? "")
      .replace(LEAD_IN, "")
      .trim()
    if (!raw) return ""

    const match = raw.match(/^(\d+(?:\.\d+)?)\s*(hours?|hrs?|days?|weeks?|wks?|months?|mos?)\b/i)
    if (!match) return raw

    const amount = Number(match[1])
    const unit = match[2].toLowerCase().replace(/s$/, "")
    const canonical =
      unit === "hr" || unit === "hour"
        ? "hour"
        : unit === "wk" || unit === "week"
          ? "week"
          : unit === "mo" || unit === "month"
            ? "month"
            : "day"

    return `Starting from ${amount} ${canonical}${amount === 1 ? "" : "s"}`
  })()
  const budgetSuffix =
    budgetText && kind === "service"
      ? "/month"
      : budgetText && kind === "project"
        ? " budget"
        : ""

  const getStableVariantIndex = (value: string, total: number) => {
    let hash = 0
    for (const char of value) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    }
    return hash % total
  }

  // Jobs search reuses the shared ListingCard entry point, but swaps to this
  // grid layout when the shared search toggle is in grid mode.
  if (cardVariant === "job-grid") {
    const jobDescription =
      plainDescription ||
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."
    const primarySkills = ["Visual Design", "Tailwind CSS", "Next.js"]
    const secondarySkills = ["Wireframing", "Figma"]
    const gridVariantIndex = getStableVariantIndex(id, 4)
    const earningsVariantIndex = getStableVariantIndex(`${id}-earnings`, 3)
    const showPaymentVerified = gridVariantIndex === 1 || gridVariantIndex === 3
    const showNdaRequired = gridVariantIndex === 2 || gridVariantIndex === 3
    const showServiceBadge = gridVariantIndex === 0 || gridVariantIndex === 3

    return (
      <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] ">
        <div className="flex items-start justify-between gap-4">
          <NextLink
            href={computedHref}
            className="max-w-[195px] line-clamp-2 text-[16px] font-bold leading-normal text-dark-blue-400 focus-visible:outline-none hover:underline"
          >
            {title || "The Ultimate Mobile App Experience"}
          </NextLink>

          <div className="shrink-0 self-start text-right">
            {earningsVariantIndex === 0 && (
              <>
                <div className="text-[18px] font-bold leading-7 text-dark-blue-400">
                  $90,200
                </div>
                <div className="text-[13px] font-light leading-5 text-gray-500">
                  Earnings Opportunity
                </div>
              </>
            )}

            {earningsVariantIndex === 1 && (
              <div className="inline-flex items-center justify-end gap-2 pt-1 text-xs font-medium leading-[18px] text-dark-blue-400">
                <HelpCircle className="size-[14px] shrink-0 text-gray-400" />
                <span>Earnings Unavailable</span>
              </div>
            )}

            {earningsVariantIndex === 2 && (
              <>
                <div className="text-[18px] font-bold leading-7 text-dark-blue-400">
                  $90,200/mo
                </div>
                <div className="text-[13px] font-light leading-5 text-gray-500">
                  Earnings Opportunity
                </div>
              </>
            )}
          </div>
        </div>

        {(showPaymentVerified || showNdaRequired) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {showPaymentVerified && (
              <Button
                type="button"
                variant="outlined"
                visual="gray"
                size="sm"
                className="h-auto rounded-[5px] px-3 py-1 text-xs font-semibold leading-[18px] text-dark-blue-400 shadow-none"
                leftIcon={
                  <DollarSign className="size-[14px] text-success-600" />
                }
              >
                Payment Verified
              </Button>
            )}

            {showNdaRequired && (
              <Button
                type="button"
                variant="outlined"
                visual="gray"
                size="sm"
                className="h-auto rounded-[5px] px-3 py-1 text-xs font-semibold leading-[18px] text-dark-blue-400 shadow-none"
                leftIcon={<File02 className="size-[14px] text-primary-500" />}
              >
                NDA Required
              </Button>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-medium leading-5 text-dark-blue-400">
            1 matching role
          </span>
          <NextLink
            href={computedHref}
            className="text-sm font-semibold leading-5 text-primary-500 focus-visible:outline-none hover:underline"
          >
            UX Researcher
          </NextLink>
        </div>

        <p className="mt-4 line-clamp-2 text-sm font-light leading-normal text-dark-blue-400">
          {jobDescription}
        </p>

        <div className="mt-auto pt-6">
          <div className="text-[13px] font-medium leading-5 text-dark-blue-400">
            2 of 9 skills match
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {primarySkills.map((skill, index) => (
              <Badge
                key={skill}
                className="gap-x-1.5 bg-gray-100 text-dark-blue-400"
                visual="gray"
              >
                {index < 2 && <Check className="size-3.5 text-primary-500" />}
                {skill}
              </Badge>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {secondarySkills.map((skill) => (
              <Badge
                key={skill}
                className="bg-gray-100 text-dark-blue-400"
                visual="gray"
              >
                {skill}
              </Badge>
            ))}
            <Button
              type="button"
              variant="link"
              visual="gray"
              className="font-medium text-dark-blue-400 no-underline hover:no-underline"
            >
              + 10 more
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outlined"
                visual="gray"
                size="sm"
                className="h-auto rounded-full px-3 py-1 text-xs font-semibold leading-[18px] text-dark-blue-400 shadow-none"
                leftIcon={<File02 className="size-[14px] text-gray-400" />}
              >
                Mobile Application
              </Button>

              {showServiceBadge && (
                <Button
                  type="button"
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className="h-auto rounded-[5px] px-3 py-1 text-xs font-semibold leading-[18px] text-primary-500 shadow-none"
                  leftIcon={<RefreshCw className="size-[14px]" />}
                >
                  Service
                </Button>
              )}
            </div>

            <IconButton
              variant="ghost"
              visual="gray"
              size="sm"
              className="h-auto w-auto p-0 text-gray-300 hover:bg-transparent hover:text-gray-400 focus:bg-transparent"
            >
              <Star className="size-[18px]" />
            </IconButton>
          </div>
        </div>
      </article>
    )
  }

  // Jobs search reuses the shared ListingCard entry point, but swaps to this
  // landscape layout so /find-jobs can evolve independently from project cards.
  if (cardVariant === "job") {
    const jobDescription =
      plainDescription ||
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum."
    const jobSkills = ["Visual Design", "Tailwind CSS", "Next.js", "E-commerce"]

    return (
      <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] ">
        <div className="p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <NextLink
                  href={computedHref}
                  className="truncate text-base font-bold leading-normal text-dark-blue-400 focus-visible:outline-none hover:underline"
                >
                  {title || "Corporate Dashboard Project"}
                </NextLink>

                <span className="text-sm leading-5 text-gray-500">
                  2 days ago
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] font-medium leading-5 text-dark-blue-400">
                  1 matching role
                </span>
                <NextLink
                  href={computedHref}
                  className="text-sm font-semibold leading-5 text-primary-500 focus-visible:outline-none hover:underline"
                >
                  UX Researcher
                </NextLink>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-5">
              <Button
                type="button"
                variant="outlined"
                visual="gray"
                size="sm"
                className="h-auto rounded-full px-3 py-1 text-xs font-semibold leading-[18px] text-dark-blue-400 shadow-none"
                leftIcon={<File02 className="size-[14px] text-gray-400" />}
              >
                Mobile Application
              </Button>

              <div className="inline-flex items-center gap-x-2 text-xs font-medium leading-[18px] text-dark-blue-400">
                <HelpCircle className="size-[14px] text-gray-400" />
                <span>Earnings Unavailable</span>
              </div>
            </div>
          </div>

          <p className="mt-4 line-clamp-2 text-sm font-light leading-normal text-dark-blue-400">
            {jobDescription}
          </p>

          <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="mr-2 text-[13px] font-medium leading-5 text-dark-blue-400">
                2 of 9 skills match
              </span>

              {jobSkills.map((skill, index) => (
                <Badge
                  key={skill}
                  className="gap-x-1.5 bg-gray-100 text-dark-blue-400"
                  visual="gray"
                >
                  {index < 2 && <Check className="size-3.5 text-primary-500" />}
                  {skill}
                </Badge>
              ))}

              <Button
                type="button"
                variant="link"
                visual="gray"
                className="font-medium text-dark-blue-400 no-underline hover:no-underline"
              >
                + 10 more
              </Button>
            </div>

            <Button
              type="button"
              variant="outlined"
              visual="gray"
              size="sm"
              className="h-auto shrink-0 px-3 py-1 text-xs font-semibold leading-[18px] text-primary-500 shadow-none"
              leftIcon={<RefreshCw className="size-[14px]" />}
            >
              Service
            </Button>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 md:h-11 md:overflow-x-auto md:py-0">
          <div className="flex min-h-5 flex-col gap-3 text-[13px] leading-5 md:h-full md:w-full md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-0">
            <div className="flex items-center gap-x-2 whitespace-nowrap md:shrink-0">
              <span className="font-light text-gray-500">Open Roles</span>
              <span className="font-bold text-dark-blue-400">7</span>
            </div>

            <span className="hidden h-5 w-px shrink-0 bg-gray-200 md:block" />

            <div className="flex items-center gap-x-2 whitespace-nowrap md:shrink-0">
              <span className="font-light text-gray-500">Duration</span>
              <span className="font-bold text-dark-blue-400">Ongoing</span>
            </div>

            <span className="hidden h-5 w-px shrink-0 bg-gray-200 md:block" />

            <div className="flex items-center gap-x-2 whitespace-nowrap md:shrink-0">
              <span className="font-light text-gray-500">Work Schedule</span>
              <span className="font-bold text-dark-blue-400">Full-Time</span>
            </div>

            <span className="hidden h-5 w-px shrink-0 bg-gray-200 md:block" />

            <div className="flex items-center gap-x-2 whitespace-nowrap md:shrink-0">
              <span className="font-light text-gray-500">Client Rating</span>
              <Star className="size-4 text-gray-400" />
              <span className="font-bold text-dark-blue-400">4.8</span>
            </div>

            <span className="hidden h-5 w-px shrink-0 bg-gray-200 md:block" />

            <DropdownMenu>
              <div className="flex items-center whitespace-nowrap md:shrink-0">
                <Button
                  type="button"
                  variant="link"
                  visual="gray"
                  size="sm"
                  className="h-auto gap-x-1.5 px-0 py-0 text-[13px] font-semibold leading-5 text-dark-blue-400 hover:text-dark-blue-400"
                  leftIcon={<Star className="size-[18px] text-gray-300" />}
                >
                  Save
                </Button>

                <DropdownMenuTrigger asChild>
                  <IconButton
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    className="h-auto w-auto p-0 text-gray-500 hover:bg-transparent focus:bg-transparent"
                  >
                    <ChevronDown className="size-4" />
                  </IconButton>
                </DropdownMenuTrigger>
              </div>

              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuRadioGroup value="">
                  <DropdownMenuRadioTrigger value="digital-marketing">
                    Digital Marketing
                  </DropdownMenuRadioTrigger>
                  <DropdownMenuRadioTrigger value="customer-service">
                    Customer Service
                  </DropdownMenuRadioTrigger>
                  <DropdownMenuRadioTrigger value="email-marketing">
                    Email Marketing
                  </DropdownMenuRadioTrigger>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </article>
    )
  }

  // List layout — Figma 13111-48107. Media 284px on the left, content right:
  // title + description with the options menu top-right, the team below, then
  // duration/budget on one line with the rating pushed to the far right.
  if (layout === "list") {
    return (
      <article className="flex w-full items-start overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <NextLink
          href={computedHref}
          className="relative w-[284px] shrink-0 self-stretch overflow-hidden rounded-l-lg border-b border-black/15 bg-[#fbfbfb] focus-visible:outline-none"
        >
          {mediaUrl ? (
            <NextImage
              className="object-cover"
              src={mediaUrl}
              alt={title}
              fill
              sizes="284px"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <Briefcase className="size-10 text-gray-300" />
            </span>
          )}
        </NextLink>

        <div className="flex min-w-0 flex-1 flex-col gap-y-5 p-5">
          <div className="flex flex-col gap-y-3.5">
            <div className="flex items-start gap-x-6">
              <div className="flex min-w-0 flex-1 flex-col gap-y-3 text-dark-blue-400">
                <NextLink
                  href={computedHref}
                  className="text-base font-bold leading-normal hover:underline focus-visible:outline-none"
                >
                  {title}
                </NextLink>
                {plainDescription && (
                  <p className="line-clamp-2 text-sm font-light leading-normal">
                    {plainDescription}
                  </p>
                )}
              </div>

              {cardVariant === "is-favorited" && optionsSlot ? (
                <span
                  className="inline-flex h-6 shrink-0 items-center"
                  data-dropdown-zone
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  {optionsSlot}
                </span>
              ) : null}
            </div>

            {avatarsSlot ??
              (hasTeam ? (
                <AvatarGroup
                  max={5}
                  size="sm"
                  excess
                  excessClassName="border-gray-300 text-gray-500"
                >
                  {collaborators.map((src, i) => (
                    <Avatar
                      key={i}
                      size="sm"
                      className="border-2 border-white hover:ring-0 active:ring-0"
                    >
                      <AvatarImage src={src} alt="Collaborator" />
                      <AvatarFallback />
                    </Avatar>
                  ))}
                </AvatarGroup>
              ) : null)}
          </div>

          <div className="flex items-end justify-between gap-x-6">
            <div className="flex items-center gap-x-6">
              {kind !== "service" && durationText && (
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] shrink-0 text-primary-500" />
                  <span className="text-sm font-medium leading-normal text-dark-blue-400">
                    {durationText}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-x-[6.4px]">
                <Money className="size-[18px] shrink-0 text-primary-500" />
                <span className="flex items-center text-sm font-medium leading-normal text-dark-blue-400">
                  {budgetText}
                  {kind === "service" ? (
                    <span className="text-center text-xs font-light leading-normal">
                      {budgetSuffix}
                    </span>
                  ) : (
                    budgetSuffix
                  )}
                </span>
              </div>
            </div>

            {typeof rating === "number" && (
              <div className="inline-flex shrink-0 items-center gap-x-1">
                <Star className="size-[15px] fill-primary-500 text-primary-500" />
                <span className="inline-flex items-center gap-x-1 text-sm font-medium leading-normal text-dark-blue-400">
                  {rating.toFixed(1)}{" "}
                  {typeof reviewCount === "number" && (
                    <span className="font-light">({reviewCount})</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] ">
      <NextLink
        href={computedHref}
        className="block focus-visible:outline-none group/card"
      >
        <div className="h-[140px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
          {mediaUrl ? (
            <NextImage
              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
              src={mediaUrl}
              alt={title}
              fill
              sizes="33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <Briefcase className="size-10 text-gray-300" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
            {badgeText ? (
              <span className="inline-flex max-w-[60%] items-center gap-1 truncate rounded-[5px] bg-black/[.57] px-1.5 py-1 text-[10px] font-bold text-white shadow">
                {kind === "service" && (
                  <RefreshCw className="size-3 shrink-0 text-[#98B6FF]" />
                )}
                <span className="truncate">{badgeText}</span>
              </span>
            ) : (
              <span />
            )}

            {mode !== "owned" &&
            cardVariant !== "is-favorited" &&
            favoriteSlot ? (
              <span
                className="pointer-events-auto inline-flex shrink-0"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                {favoriteSlot}
              </span>
            ) : (
              <span />
            )}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-x-3">
          <span className="line-clamp-2 min-w-0 flex-auto text-base font-bold leading-normal text-dark-blue-400">
            <span className="hover:underline">{title}</span>
          </span>

          {mode === "owned" && status && status !== "Active" && (
            <span
              className={cn(
                "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                status === "In Review"
                  ? "bg-amber-100 text-amber-700"
                  : status === "Needs Update"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
              )}
            >
              {status}
            </span>
          )}

          {/* A rating is an average of reviews, so with zero reviews there is
              nothing to average. Hide the star, the score and the counter
              until a review actually exists.
              An unclaimed listing has never been delivered either, so any
              review count on it is not real. Both conditions must hold. */}
          {hasTeam &&
            typeof reviewCount === "number" &&
            reviewCount > 0 &&
            typeof rating === "number" && (
            <div className="inline-flex shrink-0 items-center gap-x-1">
              <Star className="size-[15px] text-primary-500 fill-primary-500" />
              <span className="inline-flex items-center gap-x-1 text-sm font-medium leading-normal text-dark-blue-400">
                {rating.toFixed(1)}{" "}
                {typeof reviewCount === "number" && (
                  <span className="font-light">({reviewCount})</span>
                )}
              </span>
            </div>
          )}
        </div>

        {plainDescription && (
          <p className="mt-3 line-clamp-3 text-sm font-light leading-normal text-dark-blue-400">
            {plainDescription}
          </p>
        )}

        <div className="mt-[14px] flex flex-col gap-y-3">
          {kind !== "service" && durationText && (
            <div className="flex items-center gap-x-[6.4px]">
              <Clock className="size-[18px] shrink-0 text-primary-500" />
              <span className="text-sm font-medium leading-normal text-dark-blue-400">
                {durationText}
              </span>
            </div>
          )}

          <div className="flex items-center gap-x-[6.4px]">
            <Money className="size-[18px] shrink-0 text-primary-500" />
            <span className="flex items-center text-sm font-medium leading-normal text-dark-blue-400">
              {budgetText}
              {kind === "service" ? (
                <span className="text-center text-xs font-light leading-normal">
                  {budgetSuffix}
                </span>
              ) : (
                budgetSuffix
              )}
            </span>
          </div>
        </div>
      </NextLink>

      <div className="mt-auto pt-5 flex items-end justify-between">
        {avatarsSlot ??
          (!hasTeam ? (
            isTalent ? (
              <NoTeamAssigned
                kind={kind === "service" ? "service" : "project"}
                onClaim={
                onClaim ??
                (kind === "project" ? () => claimProject(id) : undefined)
              }
              // /my-listings/:id is the in-line editor (edit in place with a
              // client-view preview). /edit-listing/:id is the full edit flow.
              editHref={`/my-listings/${id}`}
              />
            ) : (
              <span />
            )
          ) : (
          <AvatarGroup
            max={5}
            size="sm"
            excess
            excessClassName="border-gray-300 text-gray-500"
          >
            {collaborators.map((src, i) => (
              <Avatar
                key={i}
                size="sm"
                className="border-2 border-white hover:ring-0 active:ring-0"
              >
                <AvatarImage src={src} alt="Collaborator" />
                <AvatarFallback />
              </Avatar>
            ))}
          </AvatarGroup>
          ))}

        {cardVariant === "is-favorited" && optionsSlot ? (
          <span
            className="ml-auto inline-flex shrink-0"
            data-dropdown-zone
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            {optionsSlot}
          </span>
        ) : mode === "owned" ? (
          <IconButton
            className="rounded-full text-gray-400 hover:text-gray-800"
            visual="gray"
            variant="ghost"
            onClick={onEdit}
          >
            <Edit03 className="size-4" />
          </IconButton>
        ) : null}
      </div>
    </article>
  )
}

/* ─── Team card (rich) ────────────────────────────────────────────────── */

function TeamListingCard({
  id,
  name,
  handle,
  tagline,
  experience,
  rate,
  locations,
  rating,
  projectCount,
  skills,
  memberAvatars,
  previousClientLogos,
  href,
  favoriteSlot,
}: TeamCardProps) {
  const computedHref = href ?? teamDetailsUrl(id)
  const avatars =
    memberAvatars && memberAvatars.length > 0 ? memberAvatars : ["/woman.jpg"]

  return (
    <article className="h-full flex flex-col p-5 border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg bg-white ">
      <div className="flex items-start justify-between">
        <AvatarGroup
          max={3}
          size="md"
          excess
          excessClassName="border-gray-300 text-gray-500"
        >
          {avatars.map((src, i) => (
            <Avatar
              key={i}
              size="md"
              className="border-2 border-white hover:ring-0 active:ring-0"
            >
              <AvatarImage src={src} alt="Team member" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
        {favoriteSlot}
      </div>

      {rate && (
        <div className="mt-5 flex items-center">
          <span className="text-sm font-bold text-dark-blue-400 leading-none">
            {rate}
          </span>
        </div>
      )}

      <div className="mt-5">
        <NextLink
          href={computedHref}
          className="focus-visible:outline-none text-base leading-none text-dark-blue-400 font-bold hover:underline"
        >
          {name}
          {handle && (
            <span className="font-light text-gray-500"> {handle}</span>
          )}
        </NextLink>

        {tagline && (
          <h3 className="mt-0.5 text-xs font-medium text-dark-blue-400 leading-none">
            {tagline}
          </h3>
        )}

        {experience && (
          <p className="mt-2 text-[11px] font-light leading-none text-dark-blue-400">
            {experience}
          </p>
        )}

        {locations && (
          <div className="mt-3.5 flex items-center gap-x-1">
            <MarkerPin02 className="size-3 text-gray-500" />
            <span className="leading-4 text-[10px] font-medium text-gray-500">
              {locations}
            </span>
          </div>
        )}

        {(typeof rating === "number" || typeof projectCount === "number") && (
          <div className="mt-3.5 flex items-center gap-x-2">
            {typeof rating === "number" && (
              <div className="flex items-center gap-x-2">
                <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-[#F2F4F7] shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                  <div className="flex items-center gap-x-[3px]">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star
                        key={k}
                        className="size-3 text-primary-500 fill-primary-500 shrink-0"
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold leading-none text-dark-blue-400">
                    {rating.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
            {typeof projectCount === "number" && (
              <span className="text-xs font-semibold leading-none text-dark-blue-400">
                {projectCount} {projectCount === 1 ? "Project" : "Projects"}
              </span>
            )}
          </div>
        )}

        {skills && skills.length > 0 && (
          <div className="mt-5 flex gap-2 flex-wrap">
            {skills.map((skill) => (
              <Badge key={skill} className="bg-transparent" visual="gray">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {previousClientLogos && previousClientLogos.length > 0 && (
          <div className="mt-5">
            <span className="block text-[11px] font-light text-dark-blue-400">
              Previous clients
            </span>
            <div className="mt-2 flex items-center flex-wrap gap-3">
              {previousClientLogos.map((logo, i) => (
                <div
                  key={`${logo}-${i}`}
                  className="size-[25px] rounded-full shrink-0 relative bg-gray-50 overflow-hidden flex items-center justify-center"
                >
                  <img
                    src={logo}
                    alt="Previous client"
                    width={25}
                    height={25}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
