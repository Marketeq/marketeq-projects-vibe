/**
 * Shared favorites header pieces.
 *
 * The tab set and the layout toggle's styling live here so the groups index
 * and the group detail header cannot drift into showing two different ones.
 */
export const FAVORITE_TABS = [
  "Projects",
  "Services",
  "Talent",
  "Teams",
  "Jobs",
] as const

export type FavoriteTab = (typeof FAVORITE_TABS)[number]

export const isFavoriteTab = (value: string): value is FavoriteTab =>
  (FAVORITE_TABS as readonly string[]).includes(value)

/**
 * Grid / list toggle styling from Figma 13111-46360: a 5px bordered pair of
 * 40px squares, the active one white against gray. Applied as className
 * overrides on the design system ToggleGroup rather than a second component,
 * and defined once so both favorites screens render the same control.
 */
export const FAVORITES_LAYOUT_TOGGLE_ROOT =
  "gap-x-0 overflow-hidden rounded-[5px] border-gray-200 bg-white p-0"

export const FAVORITES_LAYOUT_TOGGLE_ITEM =
  "size-10 rounded-none bg-gray-100 px-0 data-[state=on]:bg-white data-[state=on]:shadow-none"
