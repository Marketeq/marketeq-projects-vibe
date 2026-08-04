export type SortFieldValue =
  | "rating"
  | "created_at"
  | "hourly_rate"
  | "budget"
  | "price_range"

export interface SortSelection {
  field: SortFieldValue
  direction: "asc" | "desc"
}

export interface SortOption {
  id: string
  label: string
  /** undefined => Featured/Best Match (no sort override sent to the API) */
  selection?: SortSelection
}

// Category-specific label + field for the price-like option.
const PRICE_LIKE: Record<string, { label: string; field: SortFieldValue }> = {
  talent: { label: "Rate", field: "hourly_rate" },
  teams: { label: "Rate", field: "hourly_rate" },
  projects: { label: "Budget", field: "budget" },
  services: { label: "Budget", field: "price_range" },
}

export function getSortOptions(category: string): SortOption[] {
  const base: SortOption[] = [
    { id: "featured", label: "Featured" },
    { id: "best-match", label: "Best Match" },
    { id: "best-sellers", label: "Best Sellers" },
    {
      id: "top-rated",
      label: "Top Rated",
      selection: { field: "rating", direction: "desc" },
    },
    {
      id: "most-recent",
      label: "Most Recent",
      selection: { field: "created_at", direction: "desc" },
    },
  ]

  const priceLike = PRICE_LIKE[category]
  if (!priceLike) return base

  return [
    ...base,
    {
      id: "rate-asc",
      label: `${priceLike.label} Low to High`,
      selection: { field: priceLike.field, direction: "asc" },
    },
    {
      id: "rate-desc",
      label: `${priceLike.label} High to Low`,
      selection: { field: priceLike.field, direction: "desc" },
    },
  ]
}
