"use client"

/**
 * ListingCardCompact — master compact card for list/grid views.
 *
 * Small horizontal layout used in "Recently Viewed", "Newest Additions",
 * "Most Popular" sections on the homepage and elsewhere:
 *
 *   [ 100px thumb ]  Title
 *                    Short description (2 lines max)
 *                    Budget · Duration
 *
 * Both the thumbnail and the title link to the project/service details
 * page, computed from `kind + id + slug` via listing-urls helpers. The
 * thumbnail zooms on hover to match the behavior of the larger
 * ListingCard for visual consistency.
 */

import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { projectDetailsUrl, serviceDetailsUrl } from "@/src/lib/listing-urls"
import { Briefcase } from "@blend-metrics/icons"

export interface ListingCardCompactProps {
  kind: "project" | "service"
  id: string
  /** URL slug; if provided we build a `/project-details/{slug}-{shortId}` link */
  slug?: string
  title: string
  description?: string
  mediaUrl?: string
  budget?: string
  duration?: string
  /** Optional href override; if omitted, computed from kind + slug + id. */
  href?: string
}

export function ListingCardCompact({
  kind,
  id,
  slug,
  title,
  description,
  mediaUrl,
  budget,
  duration,
  href,
}: ListingCardCompactProps) {
  const computedHref =
    href ??
    (kind === "service"
      ? serviceDetailsUrl(slug ?? id, slug ? id : undefined)
      : projectDetailsUrl(slug ?? id, slug ? id : undefined))

  return (
    <article className="flex items-start gap-x-6">
      <NextLink
        href={computedHref}
        className="relative size-[100px] overflow-hidden rounded-lg shrink-0 block focus-visible:outline-none group/thumb"
        aria-label={title}
      >
        {mediaUrl ? (
          <NextImage
            className="object-cover group-hover/thumb:scale-150 transition [transition-duration:3000ms]"
            src={mediaUrl}
            alt={title}
            sizes="25vw"
            fill
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <Briefcase className="size-6 text-gray-300" />
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
