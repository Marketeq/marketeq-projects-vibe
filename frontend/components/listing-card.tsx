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
import { cn } from "@/utils/functions"
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
  Users,
} from "@blend-metrics/icons"
import { Money } from "@/components/money"
import { NextImage } from "@/components/next-image"
import { NextLink } from "@/components/next-link"
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
export type ListingCardVariant = "default" | "job" | "job-grid"

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
  /** Optional badge rendered over the media (e.g. "Service"). */
  badge?: string
  /** Optional href override; if omitted, computed from kind + id. */
  href?: string
  mode?: ListingMode
  /** "owned" mode: invoked when the edit icon is clicked. */
  onEdit?: () => void
  /** "browse" mode: slot for a favorite button (FavoriteRoot, etc.). */
  favoriteSlot?: React.ReactNode
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
  favoriteSlot,
  cardVariant = "default",
}: ProjectLikeProps) {
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
  const budgetText = (() => {
    const value = String(budget ?? "")
      .replace(/\s*\/\s*(hr|hour|month)\s*$/i, "")
      .replace(/\s+budget\s*$/i, "")
    const numericValue = Number(value.replace(/[$,\s]/g, ""))
    return value && !Number.isNaN(numericValue)
      ? `$${numericValue.toLocaleString()}`
      : value
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
      description ||
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."
    const primarySkills = ["Visual Design", "Tailwind CSS", "Next.js"]
    const secondarySkills = ["Wireframing", "Figma"]
    const gridVariantIndex = getStableVariantIndex(id, 4)
    const earningsVariantIndex = getStableVariantIndex(`${id}-earnings`, 3)
    const showPaymentVerified = gridVariantIndex === 1 || gridVariantIndex === 3
    const showNdaRequired = gridVariantIndex === 2 || gridVariantIndex === 3
    const showServiceBadge = gridVariantIndex === 0 || gridVariantIndex === 3

    return (
      <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200 ">
        <div className="flex items-start justify-between gap-4">
          <NextLink
            href={computedHref}
            className="max-w-[195px] text-[16px] font-bold leading-normal text-dark-blue-400 focus-visible:outline-none hover:underline"
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

        <p className="mt-4 text-sm font-light leading-normal text-dark-blue-400">
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
      description ||
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum."
    const jobSkills = ["Visual Design", "Tailwind CSS", "Next.js", "E-commerce"]

    return (
      <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200 ">
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

          <p className="mt-4 text-sm font-light leading-normal text-dark-blue-400">
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

  return (
    <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200 ">
      <NextLink
        href={computedHref}
        className="block focus-visible:outline-none group/card"
      >
        <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
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
          {badgeText && (
            <span className="absolute top-2 right-2 inline-flex max-w-[60%] items-center gap-1 truncate rounded-md bg-[#00000091] px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              {kind === "service" && (
                <RefreshCw className="size-3 shrink-0 text-[#98B6FF]" />
              )}
              <span className="truncate">{badgeText}</span>
            </span>
          )}
        </div>

        <div className="mt-3 flex items-start gap-x-3">
          <span className="line-clamp-2 min-w-0 flex-auto text-base font-bold leading-tight text-dark-blue-400">
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

          {typeof rating === "number" && (
            <div className="inline-flex shrink-0 items-center gap-x-1">
              <Star className="size-[15px] text-primary-500 fill-primary-500" />
              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                {rating.toFixed(1)}{" "}
                {typeof reviewCount === "number" && (
                  <span className="font-extralight">({reviewCount})</span>
                )}
              </span>
            </div>
          )}
        </div>

        {description && (
          <p className="mt-3 line-clamp-3 text-sm leading-[1.4] font-extralight text-dark-blue-400">
            {description}
          </p>
        )}

        <div className="mt-[14.5px] flex flex-col gap-y-3">
          {duration && (
            <div className="flex items-center gap-x-[6.4px]">
              <Clock className="size-[18px] shrink-0 text-primary-500" />
              <span className="font-medium text-sm leading-none text-dark-blue-400">
                {duration}
              </span>
            </div>
          )}

          <div className="flex items-center gap-x-[6.4px]">
            <Money className="size-[18px] shrink-0 text-primary-500" />
            <span className="font-medium text-sm leading-none text-dark-blue-400">
              {budgetText}
              {kind === "service" && budgetSuffix ? (
                <span className="text-[10px] font-light leading-none">
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
        {avatarsSlot ?? (
          <AvatarGroup
            max={5}
            size="sm"
            excess
            excessClassName="border-gray-300 text-gray-500"
          >
            {(collaborators && collaborators.length > 0
              ? collaborators
              : ["/woman.jpg"]
            ).map((src, i) => (
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
        )}

        {mode === "owned" ? (
          <IconButton
            className="rounded-full text-gray-400 hover:text-gray-800"
            visual="gray"
            variant="ghost"
            onClick={onEdit}
          >
            <Edit03 className="size-4" />
          </IconButton>
        ) : (
          favoriteSlot
        )}
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
    <article className="h-full flex flex-col p-5 border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg bg-white hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200 ">
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
