"use client"

import { useCallback, useEffect, useState } from "react"
import { getId } from "@/utils/functions"
import type { CaseStudyBlockType, EditorRegion } from "@/lib/case-study-mapper"

/**
 * Frontend-only persistence for case studies. Portfolio-service's
 * /case-studies endpoints aren't reliably reachable yet (no api-gateway
 * route, service not always running locally), so the whole create → edit →
 * save → publish → dashboard → public-view loop is backed by localStorage
 * instead of the network. Nothing here talks to the backend.
 */

export type CaseStudyStatus = "draft" | "published" | "hidden"

export interface CaseStudy {
  id: string
  title: string
  slug: string
  description: string
  sections: EditorRegion[]
  status: CaseStudyStatus
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  thumbnail: string | null
  /** Explicitly chosen in the Publish dialog — takes priority over the
   *  section-derived `thumbnail` fallback below when set. */
  coverImage: string | null
  skills: string[]
}

const INDEX_KEY = "case-studies:index"
const itemKey = (id: string) => `case-studies-${id}`

const isBrowser = () => typeof window !== "undefined"

function readIndex(): string[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(INDEX_KEY)
    const ids = raw ? (JSON.parse(raw) as string[]) : []
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

function writeIndex(ids: string[]) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
  } catch {
    // storage full / disabled — nothing we can do locally, fail silently
  }
}

export function slugify(value: string): string {
  const base = (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
  return base || "untitled"
}

function firstThumbnail(sections: EditorRegion[]): string | null {
  for (const section of sections) {
    const data = (section.data ?? {}) as Record<string, unknown>
    if (typeof data.imageUrl === "string" && data.imageUrl) return data.imageUrl
    if (typeof data.url === "string" && data.url) return data.url
    if (typeof data.posterUrl === "string" && data.posterUrl) return data.posterUrl
    if (Array.isArray(data.images)) {
      const first = data.images[0]
      if (typeof first === "string" && first) return first
      if (
        first &&
        typeof first === "object" &&
        typeof (first as { url?: unknown }).url === "string" &&
        (first as { url: string }).url
      ) {
        return (first as { url: string }).url
      }
    }
  }
  return null
}

export function getAllCaseStudies(): CaseStudy[] {
  return readIndex()
    .map((id) => getCaseStudy(id))
    .filter((cs): cs is CaseStudy => Boolean(cs))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export function getCaseStudy(id: string): CaseStudy | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(itemKey(id))
    return raw ? (JSON.parse(raw) as CaseStudy) : null
  } catch {
    return null
  }
}

export function getCaseStudyBySlug(slug: string): CaseStudy | null {
  return getAllCaseStudies().find((cs) => cs.slug === slug) ?? null
}

function uniqueSlug(base: string, excludeId?: string): string {
  const taken = new Set(
    getAllCaseStudies()
      .filter((cs) => cs.id !== excludeId)
      .map((cs) => cs.slug)
  )
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i += 1
  return `${base}-${i}`
}

export function saveCaseStudy(
  data: Partial<Omit<CaseStudy, "id">> & { id: string }
): CaseStudy {
  const existing = getCaseStudy(data.id)
  const now = new Date().toISOString()
  const title = data.title ?? existing?.title ?? "Untitled Case Study"
  const sections = data.sections ?? existing?.sections ?? []
  const keepSlug = existing && existing.title === title ? existing.slug : undefined
  const coverImage =
    data.coverImage !== undefined ? data.coverImage : existing?.coverImage ?? null

  const merged: CaseStudy = {
    id: data.id,
    title,
    slug: keepSlug ?? uniqueSlug(slugify(data.slug ?? title), data.id),
    description: data.description ?? existing?.description ?? "",
    sections,
    status: data.status ?? existing?.status ?? "draft",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt:
      data.publishedAt !== undefined ? data.publishedAt : existing?.publishedAt ?? null,
    coverImage,
    skills: data.skills ?? existing?.skills ?? [],
    thumbnail: coverImage ?? firstThumbnail(sections),
  }

  if (isBrowser()) {
    try {
      window.localStorage.setItem(itemKey(merged.id), JSON.stringify(merged))
      const ids = readIndex()
      if (!ids.includes(merged.id)) writeIndex([...ids, merged.id])
    } catch {
      // ignore — local-only persistence, nothing to surface to the user
    }
  }

  return merged
}

export function deleteCaseStudy(id: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(itemKey(id))
    writeIndex(readIndex().filter((existingId) => existingId !== id))
  } catch {
    // ignore
  }
}

export function publishCaseStudy(id: string): CaseStudy | null {
  const cs = getCaseStudy(id)
  if (!cs) return null
  return saveCaseStudy({
    ...cs,
    status: "published",
    publishedAt: new Date().toISOString(),
  })
}

/** Toggles a published case study out of public view (and back). Draft case
 *  studies are never public to begin with, so this only flips between
 *  "published" and "hidden" — it leaves "draft" alone. */
export function toggleCaseStudyVisibility(id: string): CaseStudy | null {
  const cs = getCaseStudy(id)
  if (!cs || cs.status === "draft") return cs
  return saveCaseStudy({
    ...cs,
    status: cs.status === "hidden" ? "published" : "hidden",
  })
}

export function createCaseStudy(title = "Untitled Case Study"): CaseStudy {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `cs_${Date.now()}_${Math.random().toString(36).slice(2)}`
  return saveCaseStudy({ id, title, sections: [], status: "draft" })
}

export function addSection(
  sections: EditorRegion[],
  region: CaseStudyBlockType
): EditorRegion[] {
  return [...sections, { id: getId(), region }]
}

/** Reactive wrapper for components that list/mutate case studies (the dashboard, profile tab). */
export function useCaseStudyStore() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])

  const refresh = useCallback(() => {
    setCaseStudies(getAllCaseStudies())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    caseStudies,
    refresh,
    getCaseStudy,
    getCaseStudyBySlug,
    createCaseStudy: (title?: string) => {
      const cs = createCaseStudy(title)
      refresh()
      return cs
    },
    saveCaseStudy: (data: Parameters<typeof saveCaseStudy>[0]) => {
      const cs = saveCaseStudy(data)
      refresh()
      return cs
    },
    deleteCaseStudy: (id: string) => {
      deleteCaseStudy(id)
      refresh()
    },
    toggleCaseStudyVisibility: (id: string) => {
      const cs = toggleCaseStudyVisibility(id)
      refresh()
      return cs
    },
    publishCaseStudy: (id: string) => {
      const cs = publishCaseStudy(id)
      refresh()
      return cs
    },
  }
}
