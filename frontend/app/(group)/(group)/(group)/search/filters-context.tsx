"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from "react"

export type FilterValue = string | number | string[] | undefined

export type FiltersState = Record<string, FilterValue>

type FiltersContextValue = {
  filters: FiltersState
  setFilter: (key: string, value: FilterValue) => void
  toggleValue: (key: string, value: string) => void
  clearKey: (key: string) => void
  clearAll: () => void
}

const FiltersContext = createContext<FiltersContextValue | null>(null)

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FiltersState>({})

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters((prev) => {
      const isEmpty =
        value === undefined || value === "" || (Array.isArray(value) && value.length === 0)
      if (isEmpty) {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const toggleValue = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : []
      const exists = current.includes(value)
      const nextArr = exists
        ? current.filter((item) => item !== value)
        : [...current, value]
      const next = { ...prev }
      if (nextArr.length === 0) delete next[key]
      else next[key] = nextArr
      return next
    })
  }, [])

  const clearKey = useCallback((key: string) => {
    setFilters((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const clearAll = useCallback(() => setFilters({}), [])

  const value = useMemo<FiltersContextValue>(
    () => ({ filters, setFilter, toggleValue, clearKey, clearAll }),
    [filters, setFilter, toggleValue, clearKey, clearAll]
  )

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

export function useFilters() {
  const ctx = useContext(FiltersContext)
  if (!ctx) {
    throw new Error("useFilters must be used within a FiltersProvider")
  }
  return ctx
}

export function useFilterArray(key: string): string[] {
  const { filters } = useFilters()
  const value = filters[key]
  return Array.isArray(value) ? value : []
}

export function useFilterString(key: string): string {
  const { filters } = useFilters()
  const value = filters[key]
  if (Array.isArray(value)) return value[value.length - 1] ?? ""
  return typeof value === "string" ? value : ""
}

/* ─── Backend field allowlist ───────────────────────────────────────────
 * Only keys that correspond to a real SearchFiltersDto field on the
 * search-service are forwarded to the API. Filter groups wired to any
 * other key still update instantly in the UI (badges, checked state) but
 * are intentionally not sent to the backend, since there is no facet for
 * them to match against.
 */
const ARRAY_FIELDS = new Set([
  "skills",
  "location",
  "tags",
  "industries",
  "job_title",
  "experience_level",
  "team_size_range",
  "languages",
  "project_duration_range",
  "technologies",
  "additional_tags",
  "availability",
  "category",
  "subcategory",
  "project_category",
  "project_subcategory",
  "project_type",
  "service_category",
  "service_subcategory",
  "pricing_model",
])

// `industry` (singular) is a separate legacy field only ever set via the
// flat `?industry=` URL shortcut, never by sidebar multi-select UI — unlike
// the fields above, which all have multi-select checkbox/badge widgets and
// must stay arrays so multiple selections OR together instead of the last
// click silently overwriting the previous ones.
const SINGULAR_FIELDS = new Set(["industry"])

const NUMERIC_FIELDS = new Set([
  "hourly_rate_min",
  "hourly_rate_max",
  "rating_min",
  "projects_completed_min",
  "projects_completed_max",
  "client_success_rate_min",
  "budget_min",
  "budget_max",
  "price_min",
  "price_max",
])

export function buildSearchFiltersPayload(
  filters: FiltersState
): Record<string, string[] | string | number> {
  const payload: Record<string, string[] | string | number> = {}

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue

    if (ARRAY_FIELDS.has(key)) {
      const arr = Array.isArray(value) ? value : [String(value)]
      if (arr.length) payload[key] = arr
      continue
    }

    if (SINGULAR_FIELDS.has(key)) {
      const single = Array.isArray(value) ? value[value.length - 1] : value
      if (single) payload[key] = single
      continue
    }

    if (NUMERIC_FIELDS.has(key)) {
      const raw = Array.isArray(value) ? value[0] : value
      if (raw === "" || raw === undefined) continue
      const num = typeof raw === "number" ? raw : Number(raw)
      if (!Number.isNaN(num)) payload[key] = num
    }
  }

  return payload
}
