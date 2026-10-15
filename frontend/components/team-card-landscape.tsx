"use client"

/**
 * Team list-row (landscape) card — Figma Component 1035.
 *
 * Source of truth:
 *   card   https://www.figma.com/design/OXmLCzzRZARva9RiPm4Qsp/...?node-id=13290-20976
 *   avatar https://www.figma.com/design/WcQWbeGlH4CdW1R1o9F0Ca/...?node-id=13491-46526
 *
 * The shared ListingCard has no list/landscape layout for teams — TeamCardProps
 * carries no `layout` or `cardVariant` field — so this is the master team row.
 * Pair it with ListingCard kind="team" for grid view.
 *
 * Every measurement below is taken from Dev Mode, so the odd values (15.24px,
 * 23.714px, 3.032px, the 0.571px/1.142px shadow) are exact and deliberate —
 * do not round them to the nearest Tailwind step.
 *
 * The options trigger is a circle so its hover fill reads round; everything
 * else keeps the Dev Mode geometry.
 *
 * The card itself has no hover state. Hovers are limited to the team name
 * (underline) and the footer skill links, which lift from 60% to full opacity.
 */
import { teamDetailsUrl } from "@/src/lib/listing-urls"
import { cn } from "@/utils/functions"
import { DotsHorizontal, MarkerPin02, Star } from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
} from "@/components/ui"

/**
 * The avatar cluster is a master component with one variant per member count:
 * a 2-member cluster measures 82×61, a 6-member one 128×140, and the overflow
 * variant 140×140. Each avatar is exactly 50×50, and the seats below are the
 * Dev Mode offsets within each variant's own bounds.
 *
 * The frame the cluster sits in is always 140×140, and the cluster is anchored
 * BOTTOM-LEFT inside it (Figma 13491:46526 — `flex items-end`, and `flex-col
 * items-start justify-end` for the two-member variant). It is neither centred
 * nor top-left: smaller clusters grow up and to the right out of that corner,
 * so every row's avatars share one baseline.
 */
const AVATAR_SIZE = 50
/** The cluster always occupies this box, whatever the member count. */
const AVATAR_FRAME = "size-[140px]"

type AvatarCluster = {
  width: number
  height: number
  seats: Array<{ left: number; top: number }>
}

const AVATAR_CLUSTERS: Record<number, AvatarCluster> = {
  1: { width: 50, height: 50, seats: [{ left: 0, top: 0 }] },
  2: {
    width: 82,
    height: 61,
    seats: [
      { left: 0, top: 0 },
      { left: 32, top: 11 },
    ],
  },
  3: {
    width: 95,
    height: 96,
    seats: [
      { left: 0, top: 0 },
      { left: 13, top: 35 },
      { left: 45, top: 46 },
    ],
  },
  4: {
    width: 95,
    height: 126,
    seats: [
      { left: 14, top: 0 },
      { left: 0, top: 30 },
      { left: 13, top: 65 },
      { left: 45, top: 76 },
    ],
  },
  5: {
    width: 95,
    height: 140,
    seats: [
      { left: 45, top: 0 },
      { left: 14, top: 14 },
      { left: 0, top: 44 },
      { left: 13, top: 79 },
      { left: 45, top: 90 },
    ],
  },
  6: {
    width: 128,
    height: 140,
    seats: [
      { left: 78, top: 14 },
      { left: 45, top: 0 },
      { left: 14, top: 14 },
      { left: 0, top: 44 },
      { left: 13, top: 79 },
      { left: 45, top: 90 },
    ],
  },
}

/**
 * The overflow variant keeps the 6-avatar seats but widens the frame to 140 to
 * seat the "+N" bubble on the right.
 */
const AVATAR_CLUSTER_WITH_OVERFLOW: AvatarCluster = {
  width: 140,
  height: 140,
  seats: AVATAR_CLUSTERS[6].seats,
}
const AVATAR_OVERFLOW_SEAT = { left: 90, top: 44 }
const MAX_AVATAR_SEATS = 6

function TeamAvatarLoop({
  avatars,
  memberCount,
}: {
  avatars: string[]
  memberCount?: number
}) {
  const shown = avatars.slice(0, MAX_AVATAR_SEATS)
  // The master component has one variant per avatar count, and the "+N" bubble
  // exists only on the six-avatar variant. So the layout is chosen by how many
  // avatars are actually drawn -- filling six seats with four images left the
  // bottom-left corner empty and pushed the cluster to the top right.
  const total = Math.max(memberCount ?? avatars.length, shown.length)
  const overflow = shown.length === MAX_AVATAR_SEATS ? total - shown.length : 0
  const cluster =
    overflow > 0
      ? AVATAR_CLUSTER_WITH_OVERFLOW
      : (AVATAR_CLUSTERS[shown.length] ?? AVATAR_CLUSTERS[1])

  return (
    <div className={cn("relative shrink-0", AVATAR_FRAME)}>
      <div
        className="absolute bottom-0 left-0"
        style={{ width: cluster.width, height: cluster.height }}
      >
        {shown.map((src, i) => (
          <div
            key={i}
            className="absolute overflow-hidden rounded-full border-2 border-white"
            style={{
              left: cluster.seats[i].left,
              top: cluster.seats[i].top,
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
            }}
          >
            <img
              src={src}
              alt="Team member"
              className="size-full object-cover"
            />
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="absolute flex items-center justify-center rounded-[200px] border-2 border-gray-300 bg-white text-center text-[15.24px] font-medium leading-[23.714px] text-gray-500"
            style={{
              left: AVATAR_OVERFLOW_SEAT.left,
              top: AVATAR_OVERFLOW_SEAT.top,
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
            }}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  )
}

export interface TeamCardLandscapeProps {
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
  /** Whole-roster size, used for the "+N" bubble when it exceeds the avatars given. */
  memberCount?: number
  /** Logo URLs rendered in the "Previous clients" row. */
  previousClientLogos?: string[]
  href?: string
  isSaved?: boolean
  onSaveClick?: () => void
  /** Owners get manage actions; members get join/leave ones. */
  isOwner?: boolean
  /** Only rendered when supplied, so a card with no handler shows no dead item. */
  onLeaveClick?: () => void
}

export function TeamCardLandscape({
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
  memberCount,
  previousClientLogos,
  href,
  isSaved,
  onSaveClick,
  isOwner,
  onLeaveClick,
}: TeamCardLandscapeProps) {
  const computedHref = href ?? teamDetailsUrl(id)

  // Copying the link needs no backend, so it works the same on every surface
  // this row appears on.
  const onShare = () => {
    if (typeof window === "undefined") return
    void navigator.clipboard?.writeText(
      new URL(computedHref, window.location.origin).toString()
    )
  }
  const avatars =
    memberAvatars && memberAvatars.length > 0 ? memberAvatars : ["/woman.jpg"]

  return (
    <article className="flex w-full flex-col gap-px rounded-lg border border-gray-200 bg-white drop-shadow-[0px_2px_2.5px_rgba(0,0,0,0.04)]">
      <div className="flex w-full flex-col items-center p-4 md:p-6">
        <div className="flex w-full items-start gap-3 md:gap-10">
          <TeamAvatarLoop avatars={avatars} memberCount={memberCount} />

          <div className="flex min-w-0 flex-1 items-start justify-between">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
              <div className="flex w-full flex-col items-start gap-2 text-dark-blue-400">
                <div className="flex w-full flex-col items-start gap-1">
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <NextLink
                      href={computedHref}
                      className="text-lg font-bold leading-normal hover:underline focus-visible:outline-none md:text-[22px]"
                    >
                      {name}
                    </NextLink>
                    {handle && (
                      <span className="text-sm font-light leading-normal md:text-xl">
                        {handle}
                      </span>
                    )}
                  </div>
                  {tagline && (
                    <h3 className="w-full overflow-hidden text-ellipsis text-sm font-medium capitalize leading-normal md:text-lg">
                      {tagline}
                    </h3>
                  )}
                </div>
                {experience && (
                  <p className="overflow-hidden text-ellipsis text-sm font-light leading-normal">
                    {experience}
                  </p>
                )}
              </div>

              {locations && (
                <div className="flex items-center gap-1.5">
                  <MarkerPin02 className="size-3.5 shrink-0 text-gray-500" />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-center text-xs font-semibold leading-4 text-gray-500">
                    {locations}
                  </span>
                </div>
              )}

              {(typeof rating === "number" ||
                typeof projectCount === "number") && (
                <div className="flex w-full items-center gap-2">
                  {typeof rating === "number" && (
                    <div className="flex items-center justify-center gap-x-[5px] overflow-clip rounded-[3.032px] bg-gray-100 px-1.5 py-[3px] shadow-[0px_0.571px_1.142px_0px_rgba(16,24,40,0.05)]">
                      <div className="flex items-center gap-x-[3px]">
                        {Array.from({ length: 5 }).map((_, k) => (
                          <Star
                            key={k}
                            className="size-3 shrink-0 fill-primary-500 text-primary-500"
                          />
                        ))}
                      </div>
                      <span className="text-center text-xs font-semibold leading-normal text-dark-blue-400">
                        {rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {typeof projectCount === "number" && (
                    <div className="flex items-center gap-x-0.5 whitespace-nowrap text-xs font-medium leading-normal text-dark-blue-400">
                      <span>{projectCount}</span>
                      <span>{projectCount === 1 ? "review" : "reviews"}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton
                    variant="ghost"
                    visual="gray"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full p-0 text-gray-500"
                    aria-label={`Options for ${name}`}
                  >
                    <DotsHorizontal className="h-5 w-[21.667px]" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom">
                  {isOwner ? (
                    <>
                      <DropdownMenuItem>
                        <NextLink className="w-full" href={computedHref}>
                          Edit team
                        </NextLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <NextLink
                          className="w-full"
                          href={`${computedHref}#members`}
                        >
                          Manage members
                        </NextLink>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem>
                      <NextLink className="w-full" href={computedHref}>
                        View team profile
                      </NextLink>
                    </DropdownMenuItem>
                  )}
                  {onSaveClick && (
                    <DropdownMenuItem onClick={onSaveClick}>
                      {isSaved ? "Remove from saved" : "Save team"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onShare}>
                    Copy team link
                  </DropdownMenuItem>
                  {!isOwner && onLeaveClick && (
                    <DropdownMenuItem onClick={onLeaveClick}>
                      Leave team
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {previousClientLogos && previousClientLogos.length > 0 && (
                <div className="flex flex-col items-start gap-2">
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-light leading-normal text-dark-blue-400">
                    Previous clients
                  </span>
                  <div className="flex h-7 w-full items-center gap-3">
                    {previousClientLogos.map((logo, i) => (
                      <div
                        key={`${logo}-${i}`}
                        className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-50"
                      >
                        <img
                          src={logo}
                          alt="Previous client"
                          width={28}
                          height={28}
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
          </div>
        </div>
      </div>

      {(rate || (skills && skills.length > 0)) && (
        <div className="flex min-h-[49px] w-full flex-wrap content-between items-center gap-x-[30px] overflow-clip border-t border-gray-200 bg-[rgba(18,42,75,0.02)] px-4 py-3 md:h-[49px] md:px-6">
          {rate &&
            (() => {
              const rateSuffixMatch = rate.match(/^(.*?)(\/\w+)$/)
              const rateValue = rateSuffixMatch ? rateSuffixMatch[1] : rate
              const rateSuffix = rateSuffixMatch ? rateSuffixMatch[2] : null
              return (
                <div className="flex w-[150px] items-center gap-2 whitespace-nowrap text-center text-dark-blue-400">
                  <span className="text-sm font-light leading-normal">
                    Rate
                  </span>
                  <span className="text-lg font-bold leading-normal">
                    {rateValue}
                    {rateSuffix && (
                      <span className="text-xs font-light leading-normal">
                        {rateSuffix}
                      </span>
                    )}
                  </span>
                </div>
              )
            })()}
          {skills && skills.length > 0 && (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="whitespace-nowrap text-center text-sm font-bold leading-5 text-dark-blue-400">
                Team Skills
              </span>
              {/* The skill list fills the rest of the row so "More..." is pushed
                  out to the far corner rather than trailing the last skill. */}
              <div className="flex min-w-0 flex-1 items-center gap-3 overflow-clip">
                {skills.map((skill) => (
                  <NextLink
                    key={skill}
                    href={`/search?q=${encodeURIComponent(skill)}&category=teams`}
                    className="flex h-3 items-center justify-center overflow-clip whitespace-nowrap text-center text-xs font-semibold leading-5 text-gray-500 opacity-60 motion-safe:transition-opacity hover:opacity-100"
                  >
                    {skill}
                  </NextLink>
                ))}
                <NextLink
                  href={`${computedHref}#skills`}
                  className="ml-auto flex h-3 shrink-0 items-center justify-center whitespace-nowrap text-center text-xs font-bold leading-5 text-gray-500 motion-safe:transition-opacity hover:opacity-80"
                >
                  More...
                </NextLink>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
