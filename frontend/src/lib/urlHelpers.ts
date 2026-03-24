/**
 * URL helpers for project and service detail pages.
 *
 * Doc-compliant pattern: /c/:l1/projects/:slug-:shortId
 *   where shortId = first 8 chars of the UUID
 */

/** Extract the UUID prefix (shortId) appended after the last `-` in a slug-id combo */
export function extractShortIdFromSlug(slugWithId: string): string {
  const parts = slugWithId.split('-')
  return parts[parts.length - 1]
}

/** Extract the slug portion (everything before the final shortId segment) */
export function extractSlugFromParam(slugWithId: string): string {
  const parts = slugWithId.split('-')
  return parts.slice(0, -1).join('-')
}

/**
 * Build a project detail URL.
 * Pattern: /c/{category}/projects/{slug}-{shortId}
 */
export function buildProjectUrl(
  category: string,
  slug: string,
  id: string,
): string {
  const shortId = id.split('-')[0] // first 8 hex chars of UUID
  return `/c/${category}/projects/${slug}-${shortId}`
}

/**
 * Build a service detail URL.
 * Pattern: /c/{category}/services/{slug}-{shortId}
 */
export function buildServiceUrl(
  category: string,
  slug: string,
  id: string,
): string {
  const shortId = id.split('-')[0]
  return `/c/${category}/services/${slug}-${shortId}`
}

export function parseCategoryParams(params: { category?: string[] }) {
  const parts = (params.category ?? []).map(String)
  if (parts.length < 1 || parts.length > 3) throw new Error('Invalid category depth')
  const [l1, l2, l3] = parts
  return { l1, l2, l3, slugPath: parts.filter(Boolean) as string[] }
}
