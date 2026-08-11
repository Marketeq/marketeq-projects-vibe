"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  addFavorite,
  findFavoriteByItemId,
  removeFavorite,
} from "@/src/lib/api/favorites"
import {
  Check,
  Copy,
  Edit03,
  MarkerPin02,
  MoreHorizontal,
  Star,
  Star01,
  Star02,
  Trash2,
} from "@blend-metrics/icons"
import NextImage from "./next-image"
import NextLink from "./next-link"
import {
  Button,
  CircularProgress,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui"

const defaultSkills = [
  "UX Research",
  "Web Design",
  "Web Design",
  "Content Design",
  "Frontend Development",
  "Service Design",
  "Marketing Design",
  "Motion Design",
  "Interaction Design",
  "Prototyping",
  "User Testing",
  "Figma",
]

interface TalentSearchCardProps {
  id?: string
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
  profileHref?: string
  isFavorited?: boolean
  onFavoriteChange?: (favorited: boolean) => void
  imageLoading?: "lazy" | "eager"
  /** When true, replaces favorite icon with an options menu (for saved/favorites views) */
  showOptionsMenu?: boolean
  onRemove?: () => void
  variant?: "card" | "compact"
  matchScore?: number
  availability?: string
  level?: string
}

/**
 * Measures how many skill labels fit in the container
 * while always reserving 8px gap + "More..." width at the end.
 */
function useVisibleSkills(skills: string[]) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(skills.length)

  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    const GAP = 8 // gap-x-2
    const PAD = 32 // px-4 each side

    // Measure "More..." span (last child)
    const children = Array.from(el.children) as HTMLElement[]
    const moreEl = children[children.length - 1]
    const moreWidth = moreEl.offsetWidth
    const available = el.offsetWidth - PAD

    let used = 0
    let count = 0

    for (let i = 0; i < skills.length; i++) {
      const child = children[i]
      if (!child) break
      const w = child.scrollWidth
      const next = used + (count > 0 ? GAP : 0) + w
      // Always reserve space for gap + "More..."
      if (next + GAP + moreWidth > available && count > 0) break
      used = next
      count++
    }

    setVisibleCount(count)
  }, [skills])

  useEffect(() => {
    measure()
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  return { containerRef, visibleCount }
}

export const TalentSearchCard = ({
  id,
  name = "Ngozi",
  handle = "@BlueberryBelle",
  role = "Marketing Technologist",
  photo = "/man.jpg",
  rate = "$85 - $120",
  experience = "5 years of experience",
  country = "Australia",
  localTime = "7:30pm local time",
  rating = 4.7,
  projects = 2,
  allStars = true,
  skills: skillsList = defaultSkills,
  profileHref = "#",
  isFavorited = false,
  onFavoriteChange,
  imageLoading = "lazy",
  showOptionsMenu = false,
  onRemove,
  variant = "card",
  matchScore,
  availability,
  level,
}: TalentSearchCardProps) => {
  const { containerRef, visibleCount } = useVisibleSkills(skillsList)
  const normalizedMatchScore =
    typeof matchScore === "number"
      ? Math.max(0, Math.min(100, Math.round(matchScore)))
      : undefined

  if (variant === "compact") {
    const visibleSkills = skillsList.slice(0, 3)
    const hiddenSkillCount = Math.max(
      0,
      skillsList.length - visibleSkills.length
    )
    const compactRate = rate.split("-")[0]?.trim() || rate.trim()
    const compactRating = Number.isFinite(rating) ? rating : 0
    const roundedRating = Math.round(compactRating)
    const hasRatingSummary = compactRating > 0 || projects > 0

    return (
      <article className="border-b border-gray-200 bg-white py-5">
        <div className="grid min-w-0 grid-cols-[118px_minmax(0,1fr)_auto] items-start gap-5">
          <div className="flex w-[118px] shrink-0 flex-col items-center justify-start">
            <NextLink
              href={profileHref}
              className="relative block h-[84px] w-[84px] rounded-full"
            >
              {typeof normalizedMatchScore === "number" ? (
                <CircularProgress
                  aria-label={`${normalizedMatchScore}% match`}
                  className="absolute inset-0"
                  size={84}
                  strokeWidth={4}
                  value={normalizedMatchScore}
                  trackClassName="stroke-gray-100"
                />
              ) : null}
              <span className="absolute inset-[4px] overflow-hidden rounded-full bg-gray-100">
                {photo ? (
                  <NextImage
                    src={photo}
                    sizes="76px"
                    fill
                    loading={imageLoading}
                    className="object-cover"
                    alt={name}
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[24px] font-bold text-dark-blue-400">
                    {name.charAt(0)}
                  </span>
                )}
              </span>
              {typeof normalizedMatchScore !== "number" ? (
                <span className="absolute inset-0 rounded-full border-[4px] border-gray-100" />
              ) : null}
            </NextLink>

            {typeof normalizedMatchScore === "number" ? (
              <span className="mt-2 text-[11px] font-semibold leading-normal text-dark-blue-400">
                {normalizedMatchScore}% match
              </span>
            ) : null}
          </div>

          <div className="min-w-0">
            <NextLink
              href={profileHref}
              className="flex flex-wrap items-center gap-x-1 gap-y-1 hover:underline"
            >
              <span className="text-[13px] font-bold leading-none text-dark-blue-400">
                {name}
              </span>
              <span className="text-[13px] font-light leading-none text-gray-500">
                {handle}
              </span>
            </NextLink>

            <div className="mt-1 text-[12px] font-semibold leading-normal text-dark-blue-400">
              {role}
            </div>
            {experience ? (
              <div className="mt-0.5 text-[11px] font-light leading-normal text-gray-500">
                {experience}
              </div>
            ) : null}

            {hasRatingSummary ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {compactRating > 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold leading-none text-dark-blue-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={
                          star <= roundedRating
                            ? "size-3 fill-dark-blue-400 text-dark-blue-400"
                            : "size-3 fill-gray-200 text-gray-200"
                        }
                      />
                    ))}
                    {compactRating.toFixed(2)}
                  </span>
                ) : null}
                {projects > 0 ? (
                  <span className="text-[11px] font-semibold leading-none text-dark-blue-400">
                    {projects} projects
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-2">
              {typeof normalizedMatchScore !== "number" ||
              normalizedMatchScore >= 80 ? (
                <span className="rounded-[5px] border border-gray-200 bg-white px-2 py-[3px] text-[12px] font-semibold leading-5 text-dark-blue-400">
                  Top Match
                </span>
              ) : null}
              {availability ? (
                <span className="rounded-[5px] border border-gray-200 bg-white px-2 py-[3px] text-[12px] font-semibold leading-5 text-dark-blue-400">
                  {availability}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
              {compactRate ? (
                <span className="shrink-0 whitespace-nowrap text-dark-blue-400">
                  <span className="text-[18px] font-bold leading-none">
                    {compactRate}
                  </span>
                  <span className="text-[12px] font-light leading-none">
                    /hr
                  </span>
                </span>
              ) : null}
              {skillsList.length > 0 ? (
                <span className="shrink-0 whitespace-nowrap text-[12px] font-semibold leading-normal text-dark-blue-400">
                  {skillsList.length} Matching Skills
                </span>
              ) : null}
              {visibleSkills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-semibold leading-5 text-gray-500"
                >
                  {skill}
                </span>
              ))}
              {hiddenSkillCount > 0 ? (
                <span className="flex basis-full">
                  <NextLink
                    href={profileHref ? `${profileHref}#skills` : "#"}
                    className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-semibold leading-5 text-dark-blue-400 hover:underline"
                  >
                    + {hiddenSkillCount} More...
                  </NextLink>
                </span>
              ) : null}
            </div>
          </div>

          {level || country ? (
            <div className="mt-1 flex shrink-0 items-center gap-2">
              {level ? (
                <span className="rounded-[5px] border border-gray-200 bg-white px-2 py-[3px] text-[12px] font-semibold leading-5 text-dark-blue-400">
                  {level}
                </span>
              ) : null}
              {country ? (
                <span className="rounded-[5px] border border-gray-200 bg-white px-2 py-[3px] text-[12px] font-semibold leading-5 text-dark-blue-400">
                  {country}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    )
  }

  return (
    <article className="bg-white border rounded-[6px] border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] overflow-hidden flex flex-col">
      <div className="p-5">
        <div className="relative">
          <NextLink href={profileHref} className="block">
            <div className="relative h-[140px] overflow-hidden rounded-[6px] group">
              <NextImage
                src={photo}
                sizes="25vw"
                fill
                loading={imageLoading}
                className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                alt={name}
              />
            </div>
          </NextLink>
          <div className="flex items-center absolute px-2.5 pt-2.5 justify-between top-0 inset-x-0 pointer-events-none">
            {allStars ? (
              <div className="font-bold rounded-[5px] py-0.5 px-1.5 bg-black/[.57] inline-flex items-center gap-x-1 text-white text-[10px]">
                <Star02 /> All Stars
              </div>
            ) : (
              <div />
            )}

            {showOptionsMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="pointer-events-auto size-5 inline-flex items-center justify-center text-white hover:text-gray-200 focus-visible:outline-none">
                    <MoreHorizontal className="size-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[165px]">
                  <DropdownMenuItem>
                    <Edit03 className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem visual="destructive" onClick={onRemove}>
                    <Trash2 className="h-4 w-4" /> Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Star01 className="size-5 text-white" />
            )}
          </div>

          <div className="absolute grid rounded-full shrink-0 border-[2.53px] bg-white size-[29.53px] -left-[7px] -bottom-1 border-white">
            <div className="bg-success-500 flex items-center justify-center rounded-full text-white">
              <Check className="size-[13.97px]" />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <h1 className="text-sm font-bold leading-none text-dark-blue-400">
            {rate}
            <span className="text-[10px] leading-none font-light">/hr</span>
          </h1>

          <NextLink href={profileHref} className="block mt-3 hover:underline">
            <h1 className="text-sm font-bold leading-none text-dark-blue-400">
              {name}{" "}
              <span className="text-[12px] text-gray-500 leading-none font-light">
                {handle}
              </span>
            </h1>
          </NextLink>
          <h2 className="text-[12px] text-dark-blue-400 leading-none font-medium mt-0.5">
            {role}
          </h2>
          <p className="text-[11px] text-dark-blue-400 leading-none font-light mt-2">
            {experience}
          </p>
          <div className="flex items-center text-gray-500 gap-x-1 mt-3.5">
            <MarkerPin02 className="size-3" />
            <p className="text-[10px] leading-5 font-semibold">
              {country} <span className="font-light">({localTime})</span>
            </p>
          </div>

          <div className="mt-3.5 flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              <div className="flex items-center gap-x-2">
                <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                  <div className="flex items-center gap-x-[3px]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`size-3 shrink-0 ${
                          i <= Math.round(rating)
                            ? "text-primary-500 fill-primary-500"
                            : "text-gray-200 fill-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs font-semibold leading-none text-dark-blue-400">
                  {rating}
                </span>
              </div>
              <span className="text-xs font-semibold leading-none text-dark-blue-400">
                {projects} Projects
              </span>
            </div>

            {!showOptionsMenu && (
              <FavoriteRoot
                value={isFavorited}
                onValueChange={async (pressed) => {
                  if (pressed) {
                    onFavoriteChange?.(true)
                    if (id) {
                      const result = await addFavorite({
                        type: "talent",
                        itemId: String(id),
                      })
                      if (!result) {
                        onFavoriteChange?.(false)
                      }
                    }
                  } else {
                    onFavoriteChange?.(false)
                    if (id) {
                      const favorite = await findFavoriteByItemId(String(id))
                      if (favorite) {
                        const success = await removeFavorite(favorite.id)
                        if (!success) {
                          onFavoriteChange?.(true)
                        }
                      }
                    }
                  }
                }}
              >
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
            )}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="mt-auto px-4 py-2.5 flex flex-wrap gap-x-2 gap-y-1 border-t border-gray-200 bg-[#122A4B]/[.02] items-center"
      >
        {skillsList.map((skill, index) => (
          <span
            key={index}
            className="text-xs leading-5 font-semibold text-gray-500/60 hover:text-gray-500 cursor-pointer whitespace-nowrap"
            style={
              index >= visibleCount
                ? {
                    position: "absolute",
                    visibility: "hidden",
                    pointerEvents: "none",
                  }
                : undefined
            }
          >
            {skill}
          </span>
        ))}
        <NextLink
          href={profileHref ? `${profileHref}#skills` : "#"}
          className="text-xs leading-5 font-bold text-gray-500/60 hover:text-gray-500 hover:underline cursor-pointer whitespace-nowrap"
        >
          More...
        </NextLink>
      </div>
    </article>
  )
}
