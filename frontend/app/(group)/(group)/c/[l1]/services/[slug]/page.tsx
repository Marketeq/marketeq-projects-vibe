"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * Route: /c/:l1/services/:slug-:shortId
 *
 * Redirects to the unified project-details page (services use the
 * same layout as projects but with recurring scope / monthly pricing).
 */
export default function ServiceDetailRoute() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const slug = params.slug as string
    if (slug) {
      router.replace(`/project-details/${slug}`)
    }
  }, [params.slug, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  )
}
