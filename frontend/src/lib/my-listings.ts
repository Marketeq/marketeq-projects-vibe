"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ProjectAPI } from "@/service/http/project"

export const MY_LISTING_TYPES = ["project", "service"] as const

export type MyListingType = (typeof MY_LISTING_TYPES)[number]

/**
 * Every status a listing can hold, in the order the filter menu shows them.
 * The type is derived from this array so the two can never drift apart —
 * a status that isn't listed here cannot be filtered for, and a filter option
 * that isn't a real status won't compile.
 */
export const MY_LISTING_STATUSES = [
  "Active",
  "Draft",
  "In Review",
  "Needs Update",
  "Paused",
  "Completed",
] as const

export type MyListingStatus = (typeof MY_LISTING_STATUSES)[number]

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
  datePublished?: string | null
  teamAvatars?: string[]
  /** QA-195/PMCM-403: unresolved required-field validation error, computed
   * server-side (getMyProjects) regardless of status — true even for a
   * Published/Active listing whose content was edited below what's
   * required after it went live. */
  hasValidationError?: boolean
}

export const MY_LISTINGS_STORAGE_KEY = "marketeq-project-drafts"

export const FALLBACK_IMAGES = [
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

export interface SeedListingData extends MyListing {
  /** The deliverable type shown in the Project Type dropdown (e.g. "Web App", "Mobile App") */
  projectType?: string
}

export const TEAM_SEED_LISTINGS: SeedListingData[] = [
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
    projectType: "Web App",
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
    projectType: "Website",
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
    projectType: "Cloud Application",
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
    projectType: "Digital Marketing",
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
    projectType: "Mobile App",
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
    projectType: "Website",
  },
]

export function pickFromList<T>(list: T[], key: string): T {
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

// QA-201/PMCM-403: this used to catch its own errors and return `[]`,
// making a failed request indistinguishable from a genuinely empty
// account — the dashboard would silently render "you haven't created any
// listings yet" (or nothing, once seeds were already migrated) instead of
// telling the user anything failed. Errors now propagate to the caller,
// which is what lets useMyListings tell the two cases apart and show a
// real error state instead of a misleading empty one.
async function fetchBackendListings(): Promise<MyListing[]> {
  const res = await ProjectAPI.GetMyProjects()
  const projects = res?.data ?? []
  if (!Array.isArray(projects)) return []
  return projects.map((p: any) => ({
    id: p.id,
    title: p.title && p.title.trim().length > 0 ? p.title : "Untitled",
    type: (p.listingType === "service"
      ? "service"
      : "project") as MyListingType,
    status: (p.status === "published"
      ? "Active"
      : p.status === "in_review"
        ? "In Review"
        : "Draft") as MyListingStatus,
    category: p.categories?.[0] || "Uncategorized",
    description: p.shortDescription || p.fullDescription,
    mediaUrl:
      p.mediaUrls?.[0] ||
      (Array.isArray(p.media)
        ? p.media[0]?.featuredImage
        : p.media?.featuredImage) ||
      undefined,
    budget: p.budget
      ? `$${Number(p.budget).toLocaleString()} budget`
      : "Budget TBD",
    updatedAt: p.updatedAt || p.createdAt,
    datePublished: p.projectDatePublished ?? null,
    teamAvatars: Array.isArray(p.teamAvatars) ? p.teamAvatars : [],
    hasValidationError: Boolean(p.hasValidationError),
  }))
}

const SEED_MIGRATED_KEY = "marketeq-seed-listings-migrated"

function parseBudgetNumber(budget: string): number | null {
  const match = budget.replace(/,/g, "").match(/\$?([\d.]+)/)
  return match ? Number(match[1]) : null
}

async function ensureSeedListingsInBackend(): Promise<void> {
  if (typeof window === "undefined") return
  const migrated = localStorage.getItem(SEED_MIGRATED_KEY)
  if (migrated === "true") return

  try {
    // Fetch existing backend listings to find already-migrated seeds
    const existingRes = await ProjectAPI.GetMyProjects()
    const existing = existingRes?.data ?? []
    const existingTitles = new Set(
      existing.map((p: any) => (p.title || "").trim())
    )

    for (const seed of TEAM_SEED_LISTINGS) {
      try {
        const budgetNum = parseBudgetNumber(seed.budget)
        const payload = {
          title: seed.title,
          shortDescription: seed.description || "",
          fullDescription: seed.description || "",
          listingType: seed.projectType || "Website",
          categories: seed.category ? [seed.category] : [],
          budget: budgetNum ?? undefined,
        } as any

        // If a draft with this title already exists, update it
        const match = existing.find(
          (p: any) => (p.title || "").trim() === seed.title.trim()
        )
        if (match) {
          await ProjectAPI.UpdateProjectDraft(match.id, payload)
        } else if (!existingTitles.has(seed.title.trim())) {
          await ProjectAPI.CreateProjectDraft(payload)
        }
      } catch {
        // ignore individual failures
      }
    }
    localStorage.setItem(SEED_MIGRATED_KEY, "true")
  } catch {
    // auth or network failure — will retry next load
  }
}

export function useMyListings() {
  const [listings, setListings] = useState<MyListing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // QA-201/PMCM-403: distinct from isLoading/listings.length===0 — true only
  // when the backend fetch itself failed, so the dashboard can tell "you
  // have no listings" apart from "your listings failed to load".
  const [hasError, setHasError] = useState(false)
  // QA-201/PMCM-403: the mount effect and the window-focus listener below
  // both call refreshListings with the same stable reference — if the
  // window regains focus while the mount-triggered call is still in
  // flight (e.g. tabbing away and back right after landing on the page),
  // two overlapping calls race, and without this guard an earlier, slower
  // call resolving after a later, faster one would overwrite its result —
  // including overwriting a real success with a stale failure. Only the
  // most recently started call is allowed to commit state.
  const requestIdRef = useRef(0)

  const refreshListings = useCallback(async () => {
    const requestId = ++requestIdRef.current
    try {
      setIsLoading(true)
      setHasError(false)
      // Ensure seed listings exist in the backend on first load
      await ensureSeedListingsInBackend()
      const [backendListings, localDrafts] = await Promise.all([
        fetchBackendListings(),
        Promise.resolve(normalizeDraftsFromStorage()),
      ])
      if (requestId !== requestIdRef.current) return
      // Backend listings take priority; only show local drafts that
      // don't have a matching backend entry (by id)
      const backendIds = new Set(backendListings.map((l) => l.id))
      const uniqueLocalDrafts = localDrafts.filter((l) => !backendIds.has(l.id))
      // Check if seed listings have been migrated — if so, they'll be
      // in backendListings and we don't need the static ones
      const seedMigrated = localStorage.getItem(SEED_MIGRATED_KEY) === "true"
      setListings(
        [
          ...backendListings,
          ...uniqueLocalDrafts,
          ...(seedMigrated ? [] : TEAM_SEED_LISTINGS),
        ].sort(compareListingsByRecentActivity)
      )
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      console.error("Failed to fetch listings:", error)
      // QA-201/PMCM-403: surface the failure rather than silently rendering
      // the same "no listings" state a genuinely empty account would show.
      // Local drafts still fill in below it so in-progress work isn't
      // hidden by the error state. Not getMyListings(): that always appends
      // TEAM_SEED_LISTINGS, which would render six sample listings as the
      // user's own and keep the error state from ever showing. Same merge
      // as the success path, with an empty backend list.
      setHasError(true)
      const seedMigrated = localStorage.getItem(SEED_MIGRATED_KEY) === "true"
      setListings(
        [
          ...normalizeDraftsFromStorage(),
          ...(seedMigrated ? [] : TEAM_SEED_LISTINGS),
        ].sort(compareListingsByRecentActivity)
      )
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshListings()
  }, [refreshListings])

  useEffect(() => {
    const onFocus = () => {
      refreshListings()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshListings])

  return { listings, isLoading, hasError, refreshListings }
}
