/**
 * Centralized URL helpers for all listing detail pages.
 *
 * Use these everywhere a card/link navigates to a listing detail page so that
 * if the routing ever changes we only need to update one place.
 */

export { buildProjectUrl, buildServiceUrl } from "./urlHelpers"

/**
 * Project listing/details page (direct, non-category URL).
 *
 * Canonical format: /project-details/{slug}-{shortId}
 * where shortId = first 8 chars of the project UUID.
 *
 * - Pass both `slug` and `id` for real projects (recommended).
 * - Pass `id` only (as a plain string) for draft listings that don't
 *   yet have a slug — the page will handle it as a direct ID lookup.
 */
export function projectDetailsUrl(slugOrId: string, id?: string): string {
  if (id) {
    const shortId = id.split("-")[0]
    return `/project-details/${slugOrId}-${shortId}`
  }
  return `/project-details/${slugOrId}`
}

/**
 * Service listing/details page. Services currently redirect to the unified
 * project-details page, so this maps to the same route.
 */
export function serviceDetailsUrl(slugOrId: string, id?: string): string {
  return projectDetailsUrl(slugOrId, id)
}

/**
 * Job listing/details page.
 *
 * Jobs currently use a dedicated details surface so the search experience can
 * diverge from the existing project/service details flow without changing the
 * shared project routes.
 */
export function jobDetailsUrl(slugOrId: string): string {
  return `/job-details/${slugOrId}`
}

/**
 * Talent profile page. Uses username query param to match the existing
 * talent-profile page implementation.
 */
export function talentProfileUrl(username: string): string {
  return `/talent-profile?username=${encodeURIComponent(username)}`
}

/**
 * Team profile page. Mirrors the talent-profile pattern by using a query
 * param so all team cards in the master ListingCard component land on the
 * same route.
 */
export function teamDetailsUrl(id: string): string {
  return `/team-profile?teamId=${encodeURIComponent(id)}`
}

/**
 * Edit route for an owned project draft / listing.
 */
export function editProjectListingUrl(draftId: string): string {
  return `/my-listings/${draftId}`
}

/**
 * Favorites group page.
 *
 * The group name rides in the path so a shared link reads as
 * `/favorites/development-403d883e-…` rather than a bare UUID, following the
 * same slug-plus-id shape as `projectDetailsUrl`. The full id is kept intact
 * so lookups still work, and `favoriteGroupIdFromParam` reverses it.
 *
 * `name` and `type` stay on the query string as display hints; the page falls
 * back to the slug when they are missing, so a trimmed link still reads right.
 */
export function favoriteGroupUrl(
  groupId: string,
  groupName: string,
  type: string
): string {
  const slug = groupName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const segment = slug ? `${slug}--${groupId}` : groupId
  return `/favorites/${segment}?name=${encodeURIComponent(groupName)}&type=${type}`
}

/** The group id from a `{slug}--{id}` path segment, or the segment itself. */
export function favoriteGroupIdFromParam(segment: string): string {
  const marker = segment.lastIndexOf("--")
  return marker === -1 ? segment : segment.slice(marker + 2)
}

/** The display name implied by a `{slug}--{id}` segment, when no name param. */
export function favoriteGroupNameFromParam(segment: string): string {
  const marker = segment.lastIndexOf("--")
  if (marker <= 0) return ""
  return segment
    .slice(0, marker)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
