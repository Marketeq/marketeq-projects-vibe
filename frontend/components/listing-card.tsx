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

import { Briefcase, Clock, Edit03, MarkerPin02, Star, Users } from "@blend-metrics/icons"
import { Badge } from "@/components/ui"
import { Money } from "@/components/money"
import { NextImage } from "@/components/next-image"
import { NextLink } from "@/components/next-link"
import {
  projectDetailsUrl,
  serviceDetailsUrl,
  talentProfileUrl,
  teamDetailsUrl,
} from "@/src/lib/listing-urls"
import { cn } from "@/utils/functions"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  IconButton,
} from "@/components/ui"
import { TalentSearchCard } from "@/components/talent-search-card"

/* ─── Types ────────────────────────────────────────────────────────────── */

export type ListingStatus =
  | "Active"
  | "Draft"
  | "Paused"
  | "Completed"
  | "In Review"
  | "Needs Update"

export type ListingMode = "browse" | "owned"

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
}: ProjectLikeProps) {
  const computedHref =
    href ??
    (mode === "owned" && status && status !== "Active"
      ? `/publish-project?type=${kind}&draftId=${id}`
      : kind === "service"
        ? serviceDetailsUrl(id)
        : projectDetailsUrl(id))

  return (
    <article className="h-full flex flex-col p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
          {badge?.trim() && (
            <span className="absolute top-2 right-2 inline-flex max-w-[60%] items-center truncate rounded-md bg-dark-blue-400/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-start gap-x-3">
          <span className="font-bold flex-auto text-base leading-none text-dark-blue-400 group-hover/card:underline">
            {title}
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
            <div className="inline-flex items-center gap-x-1">
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
          <p className="mt-3 text-sm leading-[1.4] font-extralight text-dark-blue-400 line-clamp-2">
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
              {budget}
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
                <AvatarFallback>·</AvatarFallback>
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
    memberAvatars && memberAvatars.length > 0
      ? memberAvatars
      : ["/woman.jpg"]

  return (
    <article className="h-full flex flex-col p-5 border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg bg-white">
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
                <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                  <div className="flex items-center gap-x-[3px]">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star
                        key={k}
                        className="size-3 text-primary-500 fill-primary-500 shrink-0"
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs font-semibold leading-none text-dark-blue-400">
                  {rating.toFixed(1)}
                </span>
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
