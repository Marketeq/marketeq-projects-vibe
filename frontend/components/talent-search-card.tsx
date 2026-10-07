"use client"

import type { ReactNode } from "react"
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
  Stars02,
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
  favoriteSlot?: ReactNode
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

    const GAP = 8 // gap-2
    const PAD = 24 // p-[12px] each side

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
  favoriteSlot,
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

  const handleFavoriteToggle = useCallback(
    async (pressed: boolean) => {
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
    },
    [id, onFavoriteChange]
  )

  return (
    <article className="bg-white border border-[#eaecf0] drop-shadow-[0px_2px_2.5px_rgba(0,0,0,0.04)] flex flex-col items-start rounded-[6px] h-full">
      <div className="flex flex-col gap-[12px] items-start p-[20px] w-full relative">
        <div className="relative w-full">
          <NextLink href={profileHref} className="block">
            <div className="relative h-[140px] overflow-hidden rounded-[6px] w-full group">
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
          <div className="flex items-center absolute px-2.5 pt-[11px] justify-between top-0 inset-x-0 pointer-events-none">
            {allStars ? (
              <div className="bg-[rgba(0,0,0,0.57)] flex gap-[4px] items-center justify-center px-[6px] py-[4px] rounded-[5px] font-bold text-[10px] text-white">
                <Stars02 className="size-[10.8px]" /> All Stars
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
              <span className="pointer-events-auto inline-block">
                {favoriteSlot ?? (
                  <FavoriteRoot
                    value={isFavorited}
                    onValueChange={handleFavoriteToggle}
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
              </span>
            )}
          </div>

          <div className="absolute bg-[#12b76a] border-[2.531px] border-white flex items-center justify-center overflow-clip p-[6.517px] rounded-[14.5px] left-[-7px] -bottom-1">
            <Check className="size-[13.966px] text-white" />
          </div>
        </div>

        <div className="flex items-center text-[#22376b] text-center whitespace-nowrap">
          <span className="flex items-start font-bold text-[14px]">
            {rate}
          </span>
          <span className="font-light text-[10px]">/hr</span>
        </div>

        <div className="flex flex-col gap-[14px] items-start w-full">
          <div className="flex flex-col gap-[8px] items-center text-[#22376b] whitespace-nowrap w-full">
            <div className="flex flex-col gap-[2px] items-start w-full">
              <NextLink href={profileHref} className="flex gap-[2px] items-center text-center hover:underline">
                <span className="font-bold text-[14px]">
                  {name}
                </span>
                <span className="flex items-center font-light text-[12px]">
                  {handle}
                </span>
              </NextLink>
              <p className="capitalize font-medium min-w-full overflow-hidden text-[12px] text-ellipsis w-[min-content]">
                {role}
              </p>
            </div>
            <div className="flex gap-[2px] items-start font-light text-[11px] w-full">
              <span className="overflow-hidden text-ellipsis">{experience}</span>
            </div>
          </div>

          <div className="flex gap-[4px] items-center overflow-clip w-full">
            <MarkerPin02 className="size-[12px] shrink-0 text-[#667085]" />
            <div className="flex gap-[2px] items-center text-[#667085] text-[10px] text-center whitespace-nowrap">
              <span className="font-semibold leading-[16px]">{country}</span>
              <span className="font-light leading-[16px]">({localTime})</span>
            </div>
          </div>

          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[#f2f4f7] flex gap-[5px] items-center justify-center overflow-clip px-[6px] py-[3px] rounded-[3.032px] shadow-[0px_0.571px_1.142px_0px_rgba(16,24,40,0.05)]">
              <div className="flex gap-[3px] items-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`size-[12px] shrink-0 ${
                      i <= Math.round(rating)
                        ? "text-primary-500 fill-primary-500"
                        : "text-gray-200 fill-gray-200"
                    }`}
                  />
                ))}
              </div>
              <span className="font-semibold text-[#22376b] text-[12px] text-center whitespace-nowrap">
                {rating}
              </span>
            </div>
            <span className="font-medium text-[#22376b] text-[12px] whitespace-nowrap">
              {projects} {projects === 1 ? "review" : "reviews"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[rgba(18,42,75,0.02)] border-t border-[#eaecf0] flex flex-col items-start p-[12px] mt-auto w-full">
        <div className="content-start flex flex-wrap gap-[8px] h-[52px] items-start overflow-clip relative w-full">
          {skillsList.map((skill, index) => (
            <span
              key={index}
              className="flex h-[12px] items-center justify-center opacity-60 overflow-clip text-[10px] leading-[20px] font-semibold text-[#667085] text-center whitespace-nowrap capitalize cursor-pointer hover:opacity-100"
            >
              {skill}
            </span>
          ))}
          <NextLink
            href={profileHref ? `${profileHref}#skills` : "#"}
            className="absolute bottom-0 right-0 flex h-[12px] items-center justify-center overflow-clip text-[10px] leading-[20px] font-bold text-[#667085] text-center whitespace-nowrap hover:underline cursor-pointer"
          >
            More...
          </NextLink>
        </div>
      </div>
    </article>
  )
}
