"use client"

/**
 * Shared fetcher + hook for the homepage featured projects list.
 *
 * Every carousel / grid section on the homepage needs the same list of
 * real projects, so we dedupe the network request at the module level —
 * the first caller kicks off a single fetch and every subsequent caller
 * (in the same page load) reuses the cached promise.
 */
import { useEffect, useState } from "react"
import { getPublicApiUrl } from "@/lib/runtime-urls"

export interface FeaturedProject {
  id: string
  slug: string
  title: string
  summary?: string
  description?: string
  role?: string
  category?: string
  mediaUrls?: string[]
}

let cache: Promise<FeaturedProject[]> | null = null

function fetchFeaturedProjects(): Promise<FeaturedProject[]> {
  if (cache) return cache
  const apiBase = getPublicApiUrl() || "http://localhost:4000"
  cache = (async () => {
    try {
      const res = await fetch(`${apiBase}/v1/projects`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? (data as FeaturedProject[]) : []
    } catch {
      return []
    }
  })()
  return cache
}

export function useFeaturedProjects(): {
  projects: FeaturedProject[]
  isLoading: boolean
} {
  const [projects, setProjects] = useState<FeaturedProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    fetchFeaturedProjects().then((list) => {
      if (cancelled) return
      setProjects(list)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return { projects, isLoading }
}
