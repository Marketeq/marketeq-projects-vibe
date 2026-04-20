/**
 * Shared category-page banner. Reuses the same blue multi-stop overlay,
 * vignette, and staggered text-reveal animations from the home page hero
 * (`(group)/(group)/page.tsx`) so every browse / category / entity-list
 * page has a consistent look and feel.
 *
 * Single-image (not a carousel) — category pages don't rotate.
 */
"use client"

import * as React from "react"
import NextImage from "next/image"

interface CategoryBannerProps {
  image: string
  alt: string
  title: string
  description?: string
  /** Breadcrumb row rendered above the title. */
  breadcrumbs?: React.ReactNode
  /** Optional CTA / actions row rendered below the description. */
  actions?: React.ReactNode
  /** Container height. Defaults to 227px to match the existing layouts. */
  heightClassName?: string
}

export function CategoryBanner({
  image,
  alt,
  title,
  description,
  breadcrumbs,
  actions,
  heightClassName = "h-[227px]",
}: CategoryBannerProps) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden isolate ${heightClassName}`}
    >
      <NextImage
        src={image}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
        priority
        unoptimized
      />

      {/* Same multi-stop blue overlay used by the home hero — darker on the
          right where the text sits, fading toward the left. */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(11,28,58,0.35)_0%,rgba(11,28,58,0.55)_45%,rgba(11,28,58,0.78)_100%)]" />
      {/* Soft vignette to anchor the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)_100%)] pointer-events-none" />

      {/* Content with the same staggered reveal as the home hero. */}
      <div className="absolute inset-0 p-6 flex flex-col">
        {breadcrumbs && (
          <div className="cb-reveal cb-reveal-eyebrow">{breadcrumbs}</div>
        )}

        <div className="mt-[50px] px-[50px]">
          <h1 className="cb-reveal cb-reveal-title text-[36px] font-bold leading-none text-white">
            {title}
          </h1>
          {description && (
            <p className="cb-reveal cb-reveal-desc text-xl mt-3 leading-none text-white/90">
              {description}
            </p>
          )}
          {actions && (
            <div className="cb-reveal cb-reveal-cta mt-6">{actions}</div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes cb-reveal-up {
          0% {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
          }
        }
        :global(.cb-reveal) {
          animation: cb-reveal-up 900ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
        :global(.cb-reveal-eyebrow) {
          animation-delay: 80ms;
        }
        :global(.cb-reveal-title) {
          animation-delay: 160ms;
        }
        :global(.cb-reveal-desc) {
          animation-delay: 260ms;
        }
        :global(.cb-reveal-cta) {
          animation-delay: 380ms;
        }
      `}</style>
    </div>
  )
}
