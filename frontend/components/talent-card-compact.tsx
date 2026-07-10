"use client"

/**
 * TalentCardCompact — horizontal compact talent card.
 *
 * Uses the exact same text elements and classes from TalentSearchCard
 * in a horizontal layout with a 100×100 round avatar.
 *
 *   [ 100×100 avatar ]  Name @handle
 *                        Role
 *                        Experience
 *                        $Rate/hr  · 📍 Country
 */
import { talentProfileUrl } from "@/src/lib/listing-urls"
import { MarkerPin02, User } from "@blend-metrics/icons"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"

export interface TalentCardCompactProps {
  id: string
  username?: string
  name?: string
  handle?: string
  role?: string
  photo?: string
  rate?: string
  experience?: string
  country?: string
  href?: string
}

export function TalentCardCompact({
  id,
  username,
  name,
  handle,
  role,
  photo,
  rate,
  experience,
  country,
  href,
}: TalentCardCompactProps) {
  const computedHref = href ?? talentProfileUrl(username ?? id)

  return (
    <article className="flex items-center gap-x-6">
      <NextLink
        href={computedHref}
        className="relative size-[100px] overflow-hidden rounded-full shrink-0 block focus-visible:outline-none"
        aria-label={name || role || "Talent profile"}
      >
        {photo ? (
          <NextImage
            className="object-cover w-[100px] h-[100px]"
            src={photo}
            alt={name || "Talent"}
            width={100}
            height={100}
            sizes="100px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <User className="size-6 text-gray-300" />
          </div>
        )}
      </NextLink>

      <div className="min-w-0">
        <NextLink href={computedHref} className="block hover:underline">
          <h1 className="text-sm font-bold leading-none text-dark-blue-400">
            {name}{" "}
            {handle && (
              <span className="text-[12px] text-gray-500 leading-none font-light">
                {handle}
              </span>
            )}
          </h1>
        </NextLink>

        {role && (
          <h2 className="text-[12px] text-dark-blue-400 leading-none font-medium mt-0.5">
            {role}
          </h2>
        )}

        {experience && (
          <p className="text-[11px] text-dark-blue-400 leading-none font-light mt-2">
            {experience}
          </p>
        )}

        {(rate || country) && (
          <div className="flex items-center gap-x-3 mt-3.5">
            {rate && (
              <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                {rate}
                <span className="text-[10px] leading-none font-light">/hr</span>
              </h1>
            )}
            {country && (
              <div className="flex items-center text-gray-500 gap-x-1">
                <MarkerPin02 className="size-3" />
                <p className="text-[10px] leading-5 font-semibold">{country}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
