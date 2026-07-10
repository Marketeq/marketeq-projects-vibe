"use client"

/**
 * TalentCardCompact — copy of ListingCardCompact with a profile avatar.
 *
 * Identical to ListingCardCompact except:
 * - The 100×100 thumbnail is a profile avatar (no hover zoom effect).
 * - Falls back to a User icon instead of a Briefcase icon.
 *
 * Layout unchanged:
 *   [ 100×100 avatar ]  Title
 *                        Short description (2 lines max)
 *                        Budget · Duration
 */
import { talentProfileUrl } from "@/src/lib/listing-urls"
import { User } from "@blend-metrics/icons"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"

export interface TalentCardCompactProps {
  id: string
  username?: string
  title: string
  description?: string
  photo?: string
  budget?: string
  duration?: string
  href?: string
}

export function TalentCardCompact({
  id,
  username,
  title,
  description,
  photo,
  budget,
  duration,
  href,
}: TalentCardCompactProps) {
  const computedHref = href ?? talentProfileUrl(username ?? id)

  return (
    <article className="flex items-start gap-x-6">
      <NextLink
        href={computedHref}
        className="relative size-[100px] overflow-hidden rounded-full shrink-0 block focus-visible:outline-none"
        aria-label={title}
      >
        {photo ? (
          <NextImage
            className="object-cover w-[100px] h-[100px]"
            src={photo}
            alt={title}
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

      <div className="pr-[45.54px] min-w-0">
        <NextLink
          href={computedHref}
          className="focus-visible:outline-none block"
        >
          <h1 className="cursor-pointer hover:underline transition duration-300 text-base font-bold leading-tight line-clamp-2 text-dark-blue-400">
            {title}
          </h1>
        </NextLink>

        {description && (
          <p className="mt-2 text-sm font-light text-dark-blue-400 line-clamp-2">
            {description}
          </p>
        )}

        {(budget || duration) && (
          <div className="mt-3 flex items-center gap-x-3">
            {budget && (
              <span className="text-sm font-medium leading-none text-dark-blue-400">
                {budget}
              </span>
            )}
            {budget && duration && (
              <span className="inline-block shrink-0 rounded-full size-1 bg-gray-300" />
            )}
            {duration && (
              <span className="text-sm font-medium leading-none text-dark-blue-400">
                {duration}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
