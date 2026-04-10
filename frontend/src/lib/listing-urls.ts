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
  return `/publish-project?type=project&draftId=${draftId}`
}
