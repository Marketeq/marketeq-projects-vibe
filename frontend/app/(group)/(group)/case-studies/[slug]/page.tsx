import type { Metadata } from "next"
import { CaseStudyPublicResolver } from "@/components/case-study/case-study-public-resolver"

export async function generateMetadata(): Promise<Metadata> {
  // The title for a locally-published case study is only known client-side
  // (localStorage) — resolved by CaseStudyPublicResolver, not here.
  return { title: "Case Study — Marketeq" }
}

/**
 * The marketplace-context chrome around a published case study (pricing,
 * team, similar/recommended projects, category grid, related searches,
 * recently viewed, CTA banner) has no backing API yet — a case study
 * (portfolio-service) isn't linked to a marketplace project (listings
 * -service) anywhere in the data model today. Rather than fabricate that
 * link, that surrounding chrome renders from a shared demo data set; only
 * the actual case-study title/blocks are real (see
 * components/case-study/case-study-public-resolver.tsx).
 *
 * Real case studies are stored client-side only (localStorage, see
 * lib/hooks/use-case-study-store.ts) — there is no reliable backend to fetch
 * them from server-side, so slug resolution happens in the browser via
 * CaseStudyPublicResolver.
 */
export default async function CaseStudyPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return <CaseStudyPublicResolver slug={slug} />
}
