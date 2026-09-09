"use client"

/**
 * Tab counts for the favorites area.
 *
 * The header tabs appear on both the groups index and every group page, and
 * they showed the same numbers, so each screen was fetching them again on
 * every navigation. This provider sits on the favorites layout, which stays
 * mounted while you move between those screens, so the counts are fetched
 * once and reused.
 *
 * The index already loads its groups for its own content, so it publishes the
 * counts it derived instead of paying for a second request; the fetch here
 * only runs when nothing has published them yet.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"
import { getAllFavoritesGrouped } from "@/src/lib/api/favorites"

export type FavoriteTabCounts = Record<string, number>

type FavoriteCountsValue = {
  counts: FavoriteTabCounts
  /** Called by a screen that has already loaded the underlying groups. */
  publishCounts: (counts: FavoriteTabCounts) => void
  /** Fetches once for screens that have no groups of their own. */
  ensureCounts: () => void
}

const FavoriteCountsContext = createContext<FavoriteCountsValue | null>(null)

export function FavoriteCountsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [counts, setCounts] = useState<FavoriteTabCounts>({})
  const loaded = useRef(false)

  const publishCounts = useCallback((next: FavoriteTabCounts) => {
    loaded.current = true
    setCounts(next)
  }, [])

  const ensureCounts = useCallback(() => {
    if (loaded.current) return
    loaded.current = true
    ;(async () => {
      const [projects, services] = await Promise.all([
        getAllFavoritesGrouped("project"),
        getAllFavoritesGrouped("service"),
      ])
      setCounts({
        Projects: projects.flatMap((g) => g.favorites ?? []).length,
        Services: services.flatMap((g) => g.favorites ?? []).length,
      })
    })()
  }, [])

  const value = useMemo(
    () => ({ counts, publishCounts, ensureCounts }),
    [counts, publishCounts, ensureCounts]
  )

  return (
    <FavoriteCountsContext.Provider value={value}>
      {children}
    </FavoriteCountsContext.Provider>
  )
}

export function useFavoriteCounts(): FavoriteCountsValue {
  const ctx = useContext(FavoriteCountsContext)
  if (!ctx) {
    // Rendered outside the favorites layout — no counts, no crash.
    return { counts: {}, publishCounts: () => {}, ensureCounts: () => {} }
  }
  return ctx
}
