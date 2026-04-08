/**
 * Centralized URL helpers for all listing detail pages.
 *
 * Use these everywhere a card/link navigates to a listing detail page so that
 * if the routing ever changes we only need to update one place.
 */

export { buildProjectUrl, buildServiceUrl } from "./urlHelpers"

/**
 * Project detail page (direct, non-category URL).
 * Used from my-listings, favorites, dashboards, etc.
 */
export function projectDetailsUrl(id: string): string {
  return `/project-details/${id}`
}

/**
 * Service detail page. Services currently redirect to the unified
 * project-details page, so this intentionally maps to the same route.
 */
export function serviceDetailsUrl(id: string): string {
  return `/project-details/${id}`
}

/**
 * Talent profile page. Uses username query param to match the existing
 * talent-profile page implementation.
 */
export function talentProfileUrl(username: string): string {
  return `/talent-profile?username=${encodeURIComponent(username)}`
}

/**
 * Team detail page. The page does not yet exist in the app — this helper
 * defines the canonical route so all cards link consistently once it lands.
 */
export function teamDetailsUrl(id: string): string {
  return `/team-details/${id}`
}

/**
 * Edit route for an owned project draft / listing.
 */
export function editProjectListingUrl(draftId: string): string {
  return `/publish-project?type=project&draftId=${draftId}`
}
