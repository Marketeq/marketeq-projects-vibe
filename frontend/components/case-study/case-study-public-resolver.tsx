"use client"

import { useEffect, useState } from "react"
import {
  getCaseStudyBySlug,
  type CaseStudy,
} from "@/lib/hooks/use-case-study-store"
import { regionsToSchemaJson } from "@/lib/case-study-mapper"
import {
  DEMO_BREADCRUMB,
  DEMO_PRICING,
  DEMO_PROJECT,
  DEMO_RECENTLY_VIEWED,
  DEMO_RECOMMENDED_PROJECTS,
  DEMO_RELATED_SEARCHES,
  DEMO_SIMILAR_PROJECTS,
  DEMO_TEAM,
  DEMO_USER,
} from "@/lib/case-study-public-demo-data"
import { PublicViewPage } from "./public-view-page"

/**
 * Client-side slug resolution for /case-studies/[slug]. Locally-published
 * case studies only exist in this browser's localStorage (see
 * lib/hooks/use-case-study-store.ts) — there's no backend record to fetch
 * server-side, so resolution has to happen after mount. The marketplace
 * chrome around the case study (pricing, team, similar projects, etc.) has
 * no backing data model yet, so it's always demo content regardless of
 * whether the case study itself resolves to a real one.
 */
export function CaseStudyPublicResolver({ slug }: { slug: string }) {
  const [status, setStatus] = useState<"loading" | "found" | "not-found">(
    "loading"
  )
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null)

  useEffect(() => {
    const cs = getCaseStudyBySlug(slug)
    if (cs && cs.status === "published") {
      setCaseStudy(cs)
      setStatus("found")
    } else {
      setStatus("not-found")
    }
  }, [slug])

  if (status === "loading") {
    return <div className="min-h-screen" />
  }

  if (status === "not-found" || !caseStudy) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-dark-blue-400">
          Case study not found
        </h1>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          This case study doesn&apos;t exist, or hasn&apos;t been published
          yet on this device.
        </p>
      </div>
    )
  }

  const blocks = regionsToSchemaJson(caseStudy.sections).blocks

  return (
    <PublicViewPage
      breadcrumb={DEMO_BREADCRUMB}
      project={{ ...DEMO_PROJECT, title: caseStudy.title }}
      pricing={DEMO_PRICING}
      team={DEMO_TEAM}
      user={DEMO_USER}
      caseStudyBlocks={blocks}
      similarProjects={DEMO_SIMILAR_PROJECTS}
      recommendedProjects={DEMO_RECOMMENDED_PROJECTS}
      recentlyViewed={DEMO_RECENTLY_VIEWED}
      relatedSearches={DEMO_RELATED_SEARCHES}
    />
  )
}
