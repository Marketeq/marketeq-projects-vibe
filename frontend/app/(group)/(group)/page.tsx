import { cache } from "react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import type { HomepagePayload } from "@/types/homepage"
import { getServerBackendUrl } from "@/lib/runtime-urls"
// MVP: use talent-only homepage
import { HomepageMvpClient as HomepageClient } from "./homepage-mvp"
// Original: import { HomepageClient } from "./homepage-client"

const HOMEPAGE_BASE = getServerBackendUrl() || "http://localhost:4000"

const fetchHomepage = cache(async (): Promise<HomepagePayload | null> => {
  try {
    const cookieStore = await cookies()
    const variant = cookieStore.get("mktq_hp_variant")?.value ?? ""

    const res = await fetch(`${HOMEPAGE_BASE}/homepage`, {
      headers: variant ? { Cookie: `mktq_hp_variant=${variant}` } : {},
      next: { revalidate: 60 },
    })

    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchHomepage()
  if (!data?.seo) return { title: "Marketeq" }

  return {
    title: data.seo.metaTitle,
    description: data.seo.metaDescription,
    ...(data.seo.canonical && {
      alternates: { canonical: data.seo.canonical },
    }),
    ...(data.seo.ogImage && {
      openGraph: { images: [data.seo.ogImage] },
    }),
    ...(data.seo.noindex && {
      robots: { index: false, follow: false },
    }),
  }
}

export default async function Marketplace() {
  const data = await fetchHomepage()

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          Homepage unavailable. Please try again later.
        </p>
      </div>
    )
  }

  return <HomepageClient data={data} />
}
