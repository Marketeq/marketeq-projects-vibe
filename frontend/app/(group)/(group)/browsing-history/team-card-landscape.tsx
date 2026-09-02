"use client"

/**
 * Browsing History-only Team list-row card.
 *
 * The shared TeamListingCard (frontend/components/listing-card.tsx) has no
 * list/landscape layout at all — TeamCardProps carries no `layout` or
 * `cardVariant` field, so there is no way to get this row treatment from the
 * shared component without modifying it. Per the approved appearance
 * (Figma Component 1035), this local component recreates just that row.
 * Used only on the Browsing History page's list view; the grid view still
 * uses the real shared ListingCard unmodified.
 */
import { cn } from "@/utils/functions"
import { teamDetailsUrl } from "@/src/lib/listing-urls"
import { ChevronDown, MarkerPin02, Star } from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuTrigger,
  IconButton,
} from "@/components/ui"

const TEAM_AVATAR_LOOP_POSITIONS = [
  { top: "10%", right: "8.57%", bottom: "54.29%", left: "55.71%" },
  { top: "0%", right: "32.14%", bottom: "64.29%", left: "32.14%" },
  { top: "10%", right: "54.29%", bottom: "54.29%", left: "10%" },
  { top: "31.43%", right: "64.29%", bottom: "32.86%", left: "0%" },
  { top: "56.43%", right: "55%", bottom: "7.86%", left: "9.29%" },
  { top: "64.29%", right: "32.14%", bottom: "0%", left: "32.14%" },
]
const TEAM_AVATAR_LOOP_OVERFLOW_POSITION = {
  top: "31.43%",
  right: "0%",
  bottom: "32.86%",
  left: "64.29%",
}

function TeamAvatarLoop({ avatars }: { avatars: string[] }) {
  const shown = avatars.slice(0, TEAM_AVATAR_LOOP_POSITIONS.length)
  const overflow = avatars.length - shown.length

  return (
    <div className="relative size-[140px] shrink-0">
      {shown.map((src, i) => (
        <div
          key={i}
          className="absolute overflow-hidden rounded-full border-2 border-white"
          style={TEAM_AVATAR_LOOP_POSITIONS[i]}
        >
          <img src={src} alt="Team member" className="size-full object-cover" />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="absolute flex items-center justify-center rounded-full border-2 border-[#d0d5dd] bg-white text-[14px] font-medium leading-[22px] text-gray-500"
          style={TEAM_AVATAR_LOOP_OVERFLOW_POSITION}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

interface BrowsingHistoryTeamCardLandscapeProps {
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
  previousClientLogos?: string[]
  href?: string
  isSaved?: boolean
  onSaveClick?: () => void
}

export function BrowsingHistoryTeamCardLandscape({
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
  isSaved,
  onSaveClick,
}: BrowsingHistoryTeamCardLandscapeProps) {
  const computedHref = href ?? teamDetailsUrl(id)
  const avatars =
    memberAvatars && memberAvatars.length > 0 ? memberAvatars : ["/woman.jpg"]

  return (
    <article className="flex h-[238px] w-full flex-col overflow-hidden rounded-lg border border-[#eaecf0] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200">
      <div className="flex h-[188px] gap-10 p-6">
        <TeamAvatarLoop avatars={avatars} />

        <div className="flex min-w-0 flex-1 items-start justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <NextLink
                    href={computedHref}
                    className="text-[22px] font-bold leading-none text-dark-blue-400 hover:underline focus-visible:outline-none"
                  >
                    {name}
                  </NextLink>
                  {handle && (
                    <span className="text-xl font-light leading-none text-gray-500">
                      {handle}
                    </span>
                  )}
                </div>
                {tagline && (
                  <h3 className="text-lg font-medium capitalize leading-normal text-dark-blue-400">
                    {tagline}
                  </h3>
                )}
              </div>

              {experience && (
                <p className="text-sm font-light leading-normal text-dark-blue-400">
                  {experience}
                </p>
              )}
            </div>

            {locations && (
              <div className="flex items-center gap-1.5">
                <MarkerPin02 className="size-3.5 shrink-0 text-gray-500" />
                <span className="text-xs font-semibold leading-4 text-gray-500">
                  {locations}
                </span>
              </div>
            )}

            {(typeof rating === "number" ||
              typeof projectCount === "number") && (
              <div className="flex items-center gap-2">
                {typeof rating === "number" && (
                  <div className="flex items-center gap-x-[5px] rounded-[3.03px] bg-[#F2F4F7] px-1.5 py-[3px] shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                    <div className="flex items-center gap-x-[3px]">
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star
                          key={k}
                          className="size-3 shrink-0 fill-primary-500 text-primary-500"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold leading-none text-dark-blue-400">
                      {rating.toFixed(1)}
                    </span>
                  </div>
                )}
                {typeof projectCount === "number" && (
                  <span className="font-[Roboto] text-xs font-medium leading-none text-dark-blue-400">
                    {projectCount} {projectCount === 1 ? "review" : "reviews"}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
            <div className="flex items-stretch overflow-hidden rounded-[5px] border-2 border-gray-300 shadow-xs">
              <Button
                type="button"
                variant="outlined"
                visual="gray"
                className="h-10 gap-x-2 rounded-none border-0 border-r border-gray-300 px-4 text-sm font-bold text-gray-700 shadow-none"
                onClick={onSaveClick}
                aria-pressed={isSaved}
                leftIcon={
                  <Star
                    className={cn(
                      "size-5",
                      isSaved
                        ? "fill-primary-500 text-primary-500"
                        : "text-gray-300"
                    )}
                  />
                }
              >
                Save
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton
                    variant="outlined"
                    visual="gray"
                    className="h-10 w-11 rounded-none border-0 text-gray-500 shadow-none"
                  >
                    <ChevronDown className="size-5" />
                  </IconButton>
                </DropdownMenuTrigger>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {previousClientLogos && previousClientLogos.length > 0 && (
              <div className="flex flex-col items-end gap-2">
                <span className="whitespace-nowrap text-[11px] font-light text-dark-blue-400">
                  Previous clients
                </span>
                <div className="flex items-center gap-3">
                  {previousClientLogos.map((logo, i) => (
                    <div
                      key={`${logo}-${i}`}
                      className="relative flex size-[28px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-50"
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

      {(rate || (skills && skills.length > 0)) && (
        <div className="flex h-[49px] flex-wrap items-center gap-x-[30px] gap-y-2 border-t border-[#eaecf0] bg-[rgba(18,42,75,0.02)] px-6 py-3">
          {rate &&
            (() => {
              const rateSuffixMatch = rate.match(/^(.*?)(\/\w+)$/)
              const rateValue = rateSuffixMatch ? rateSuffixMatch[1] : rate
              const rateSuffix = rateSuffixMatch ? rateSuffixMatch[2] : null
              return (
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-sm font-light text-dark-blue-400">
                    Rate
                  </span>
                  <span className="text-lg font-bold text-dark-blue-400">
                    {rateValue}
                    {rateSuffix && (
                      <span className="text-xs font-light">{rateSuffix}</span>
                    )}
                  </span>
                </div>
              )
            })()}
          {skills && skills.length > 0 && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <span className="whitespace-nowrap text-sm font-bold text-dark-blue-400">
                Team Skills
              </span>
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs font-semibold text-gray-500 opacity-60"
                >
                  {skill}
                </span>
              ))}
              <NextLink
                href={`${computedHref}#skills`}
                className="whitespace-nowrap text-xs font-bold text-gray-500 hover:underline"
              >
                More...
              </NextLink>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
