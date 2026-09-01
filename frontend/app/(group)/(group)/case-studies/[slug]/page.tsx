import type { Metadata } from "next"
import { CaseStudyPublicResolver } from "@/components/case-study/case-study-public-resolver"

export async function generateMetadata(): Promise<Metadata> {
  // The real title is only known after CaseStudyPublicResolver fetches the
  // case study client-side (portfolio-service has no server-side-fetchable
  // route usable from a Next.js server component here), not in this function.
  return { title: "Case Study — Marketeq" }
}

/**
 * The marketplace-context chrome around a published case study (pricing,
 * team, similar/recommended projects, category grid, related searches,
 * recently viewed, CTA banner) has no backing API yet — a case study
 * (portfolio-service) isn't linked to a marketplace project (listings
 * -service) anywhere in the data model today. Rather than fabricate that
 * link, that surrounding chrome renders from a shared demo data set; only
 * the actual case-study title/blocks are real (fetched from
 * portfolio-service's public endpoint — see
 * components/case-study/case-study-public-resolver.tsx).
 */
export default async function CaseStudyPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return <CaseStudyPublicResolver slug={slug} />
}
