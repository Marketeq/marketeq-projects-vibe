// PMCM-402/X2: signed-out visitors have no account to sync recently-viewed
// listings to (POST /v1/recently-viewed/:projectId is JwtAuthGuard'd, see
// backend/apps/listings-service/src/recently-viewed/recently-viewed.controller.ts),
// so their history lives here, in the browser only, until they sign in.
// Shape mirrors RecentlyViewedService.getRecentlyViewed's response exactly
// (backend/apps/listings-service/src/recently-viewed/recently-viewed.service.ts)
// so project-discovery-sections.tsx can render either source identically.
export interface GuestRecentlyViewedEntry {
  id: string
  slug: string
  title: string
  shortDescription: string | null
  thumbnail: string | null
  budget: number | null
  duration: string | null
  viewedAt: string
}

const STORAGE_KEY = "guest_recently_viewed"
// Matches RecentlyViewedService.getRecentlyViewed's default `limit = 9`.
const MAX_ENTRIES = 9

export function getGuestRecentlyViewed(): GuestRecentlyViewedEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addGuestRecentlyViewed(entry: GuestRecentlyViewedEntry): void {
  try {
    const existing = getGuestRecentlyViewed().filter((e) => e.id !== entry.id)
    const next = [entry, ...existing].slice(0, MAX_ENTRIES)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable (private browsing, quota, disabled) — guest
    // history is a convenience, never a hard requirement.
  }
}

export function clearGuestRecentlyViewed(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
