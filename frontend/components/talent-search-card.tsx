"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  MarkerPin02,
  Star,
  Star01,
  Star02,
} from "@blend-metrics/icons"
import {
  addFavorite,
  findFavoriteByItemId,
  removeFavorite,
} from "@/src/lib/api/favorites"
import NextImage from "./next-image"
import NextLink from "./next-link"
import {
  Button,
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
}: TalentSearchCardProps) => {
  const { containerRef, visibleCount } = useVisibleSkills(skillsList)

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

            <Star01 className="size-5 text-white" />
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
              {country}{" "}
              <span className="font-light">({localTime})</span>
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
            className="text-[10px] leading-5 font-semibold text-gray-500/60 hover:text-gray-500 cursor-pointer whitespace-nowrap"
            style={index >= visibleCount ? { position: "absolute", visibility: "hidden", pointerEvents: "none" } : undefined}
          >
            {skill}
          </span>
        ))}
        <span className="text-[10px] leading-5 font-bold text-gray-500/60 hover:text-gray-500 cursor-pointer whitespace-nowrap">
          More...
        </span>
      </div>
    </article>
  )
}
