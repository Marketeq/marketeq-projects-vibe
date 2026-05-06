"use client"

import { useCallback, useEffect, useState } from "react"
import { ProjectAPI } from "@/service/http/project"
import { ensureDevAuth } from "@/src/lib/api/dev-login"

export type MyListingType = "project" | "service"

export type MyListingStatus =
  | "Active"
  | "Draft"
  | "Paused"
  | "Completed"
  | "In Review"
  | "Needs Update"

export interface MyListing {
  id: string
  title: string
  type: MyListingType
  status: MyListingStatus
  category: string
  description?: string
  budget: string
  duration?: string
  rating?: number
  reviewCount?: number
  mediaUrl?: string
  updatedAt?: string
}

export const MY_LISTINGS_STORAGE_KEY = "marketeq-project-drafts"

const FALLBACK_IMAGES = [
  "/my-listings-thumbnails/project-thumbnail-0.png",
  "/my-listings-thumbnails/project-thumbnail-1.png",
  "/my-listings-thumbnails/project-thumbnail-2.png",
  "/my-listings-thumbnails/project-thumbnail-3.png",
  "/my-listings-thumbnails/project-thumbnail-4.png",
  "/my-listings-thumbnails/project-thumbnail-5.png",
  "/my-listings-thumbnails/project-thumbnail-6.png",
  "/my-listings-thumbnails/project-thumbnail-7.png",
  "/my-listings-thumbnails/project-thumbnail-8.png",
  "/my-listings-thumbnails/project-thumbnail-9.png",
]

const FALLBACK_TITLES = [
  "Cross-Functional Delivery Squad",
  "Full-Stack Product Pod",
  "Design + Engineering Sprint Team",
  "Growth & Marketing Retainer Team",
  "Mobile App Delivery Squad",
  "AI Integration Team",
  "DevOps & Platform Engineering Pod",
  "Brand & Website Sprint Team",
]

const TEAM_SEED_LISTINGS: MyListing[] = [
  {
    id: "seed-team-product-launch",
    title: "Cross-Functional Product Launch Squad",
    type: "project",
    status: "Active",
    category: "Product",
    description:
      "Assemble a PM, designer, full-stack devs, and growth marketer to take a SaaS product from beta to public launch in 10 weeks.",
    budget: "$45,000 budget",
    duration: "10 week engagement",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-0.png",
  },
  {
    id: "seed-team-design-system",
    title: "Design System & Component Library Pod",
    type: "project",
    status: "Active",
    category: "Design",
    description:
      "A 4-person team of product designers and frontend engineers builds a Figma design system + React component library for your brand.",
    budget: "$28,000 budget",
    duration: "8 week engagement",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-1.png",
  },
  {
    id: "seed-team-ai-integration",
    title: "AI Integration & ML Ops Team",
    type: "project",
    status: "Active",
    category: "AI / ML",
    description:
      "ML engineers, data scientists, and a backend lead integrate an LLM workflow into your product with evals, guardrails, and observability.",
    budget: "$62,000 budget",
    duration: "12 week engagement",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-2.png",
  },
  {
    id: "seed-team-growth-retainer",
    title: "Full-Stack Growth Marketing Retainer",
    type: "service",
    status: "Active",
    category: "Marketing",
    description:
      "A growth lead, paid media specialist, content strategist, and SEO engineer run your acquisition funnel end-to-end each month.",
    budget: "$12,500 / month",
    duration: "Rolling monthly retainer",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-3.png",
  },
  {
    id: "seed-team-mobile-app",
    title: "iOS + Android App Delivery Team",
    type: "service",
    status: "Active",
    category: "Mobile",
    description:
      "A shipped-together pod of iOS, Android, and backend engineers (plus a QA lead) delivers new app features on a 2-week sprint cadence.",
    budget: "$18,000 / sprint",
    duration: "2 week sprints",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-4.png",
  },
  {
    id: "seed-team-brand-sprint",
    title: "Brand Identity & Website Sprint Team",
    type: "service",
    status: "Active",
    category: "Branding",
    description:
      "A brand strategist, visual designer, copywriter, and webflow developer deliver a full brand refresh and marketing site in 6 weeks.",
    budget: "$22,000 flat",
    duration: "6 week sprint",
    mediaUrl: "/my-listings-thumbnails/project-thumbnail-5.png",
  },
]

function pickFromList<T>(list: T[], key: string): T {
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return list[Math.abs(hash) % list.length]
}

function formatBudget(projectInfo: Record<string, any>): string {
  if (projectInfo.budget) {
    return `$${Number(projectInfo.budget).toLocaleString()} budget`
  }
  if (projectInfo.priceMin && projectInfo.priceMax) {
    return `$${Number(projectInfo.priceMin).toLocaleString()} - $${Number(
      projectInfo.priceMax
    ).toLocaleString()}`
  }
  if (projectInfo.priceMin) {
    return `From $${Number(projectInfo.priceMin).toLocaleString()}`
  }
  return "Budget TBD"
}

function formatDuration(projectInfo: Record<string, any>): string {
  if (projectInfo.duration) return `${projectInfo.duration}`
  if (projectInfo.durationWeeks) {
    return `Starting from ${projectInfo.durationWeeks} weeks`
  }
  if (projectInfo.deliveryDays) {
    return `${projectInfo.deliveryDays} day delivery`
  }
  return "Flexible timeline"
}

function normalizeDraftsFromStorage(): MyListing[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(MY_LISTINGS_STORAGE_KEY)
    const drafts = raw ? JSON.parse(raw) : {}

    return Object.keys(drafts).map((key) => {
      const draft = drafts[key]
      const info = draft?.projectInfo ?? {}
      const scope = draft?.projectScope ?? []
      const firstCategory =
        info?.category?.[0]?.category ||
        (Array.isArray(info?.categories) ? info.categories[0] : "") ||
        "Uncategorized"
      const status: MyListingStatus =
        draft?.status === "published"
          ? "Active"
          : draft?.status === "in_review"
            ? "In Review"
            : draft?.status === "needs_update"
              ? "Needs Update"
              : "Draft"
      const draftId = draft?.id || key
      const mediaUrl =
        draft?.media?.featuredImageUrl ||
        draft?.media?.coverImageUrl ||
        pickFromList(FALLBACK_IMAGES, draftId)
      const title =
        info?.title && info.title.trim().length > 0
          ? info.title
          : pickFromList(FALLBACK_TITLES, draftId)

      return {
        id: draftId,
        title,
        type: "project" as const,
        status,
        category: firstCategory,
        description: info?.shortDescription || info?.fullDescription,
        mediaUrl,
        budget: formatBudget(info),
        duration: formatDuration({
          duration: scope?.[0]?.rows?.[0]?.duration
            ? `${scope[0].rows[0].duration.value ?? ""} ${scope[0].rows[0].duration.type ?? ""}`.trim()
            : undefined,
        }),
        updatedAt: draft?.savedAt,
      }
    })
  } catch (error) {
    console.error("Failed to read drafts:", error)
    return []
  }
}

function getActivityTimestamp(iso?: string): number | null {
  if (!iso) return null
  const timestamp = new Date(iso).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function compareListingsByRecentActivity(
  a: Pick<MyListing, "updatedAt">,
  b: Pick<MyListing, "updatedAt">
) {
  const aTimestamp = getActivityTimestamp(a.updatedAt)
  const bTimestamp = getActivityTimestamp(b.updatedAt)

  if (aTimestamp === bTimestamp) return 0
  if (aTimestamp === null) return 1
  if (bTimestamp === null) return -1
  return bTimestamp - aTimestamp
}

export function getMyListings(): MyListing[] {
  return [...normalizeDraftsFromStorage(), ...TEAM_SEED_LISTINGS].sort(
    compareListingsByRecentActivity
  )
}

export function statusToBadgeVisual(
  status: MyListingStatus
): "success" | "warning" | "gray" | "primary" {
  switch (status) {
    case "Active":
      return "success"
    case "In Review":
    case "Needs Update":
      return "warning"
    case "Draft":
    case "Paused":
    case "Completed":
    default:
      return "gray"
  }
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return "No activity yet"
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "No activity yet"

  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`

  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export function formatActivityDate(iso?: string): string {
  if (!iso) return "No activity yet"

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "No activity yet"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

async function fetchBackendListings(): Promise<MyListing[]> {
  try {
    await ensureDevAuth()
    const res = await ProjectAPI.GetMyProjects()
    const projects = res?.data ?? []
    if (!Array.isArray(projects)) return []
    return projects.map((p: any) => ({
      id: p.id,
      title: p.title && p.title.trim().length > 0 ? p.title : "Untitled",
      type: (p.listingType === "service" ? "service" : "project") as MyListingType,
      status: (p.status === "published"
        ? "Active"
        : p.status === "in_review"
          ? "In Review"
          : "Draft") as MyListingStatus,
      category: p.categories?.[0] || "Uncategorized",
      description: p.shortDescription || p.fullDescription,
      mediaUrl: p.media?.featuredImage || pickFromList(FALLBACK_IMAGES, p.id),
      budget: p.budget ? `$${Number(p.budget).toLocaleString()} budget` : "Budget TBD",
      updatedAt: p.updatedAt || p.createdAt,
    }))
  } catch (err) {
    console.error("Failed to fetch backend listings:", err)
    return []
  }
}

export function useMyListings() {
  const [listings, setListings] = useState<MyListing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshListings = useCallback(async () => {
    try {
      setIsLoading(true)
      const [backendListings, localDrafts] = await Promise.all([
        fetchBackendListings(),
        Promise.resolve(normalizeDraftsFromStorage()),
      ])
      // Backend listings take priority; only show local drafts that
      // don't have a matching backend entry (by id)
      const backendIds = new Set(backendListings.map((l) => l.id))
      const uniqueLocalDrafts = localDrafts.filter((l) => !backendIds.has(l.id))
      setListings(
        [...backendListings, ...uniqueLocalDrafts, ...TEAM_SEED_LISTINGS].sort(
          compareListingsByRecentActivity
        )
      )
    } catch (error) {
      console.error("Failed to fetch listings:", error)
      // Fallback to local-only
      setListings(getMyListings())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshListings()
  }, [refreshListings])

  useEffect(() => {
    const onFocus = () => { refreshListings() }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshListings])

  return { listings, isLoading, refreshListings }
}
