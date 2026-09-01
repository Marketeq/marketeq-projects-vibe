/**
 * The favorites tab set — one list, shared by the groups index and the group
 * detail header, so the two screens cannot drift into showing different tabs.
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
