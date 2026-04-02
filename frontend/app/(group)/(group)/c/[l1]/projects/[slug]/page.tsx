"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Route: /c/:l1/projects/:slug-:shortId
 *
 * This page redirects to the unified project-details page,
 * preserving the slug parameter so it can fetch from the listings API.
 */
export default function ProjectDetailRoute() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const slug = params.slug as string
    if (slug) {
      // Redirect to the existing project-details page which handles data fetching
      router.replace(`/project-details/${slug}`)
    }
  }, [params.slug, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  )
}
