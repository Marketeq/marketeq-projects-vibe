import type { Access } from 'payload'

/**
 * Role helpers for Payload access control.
 *
 * Per CS-06 (Permissions & Access Control), cms-service users have one of:
 *   - admin
 *   - developer        (treated as admin in non-prod)
 *   - content_editor   (CRUD on content collections, cannot publish)
 *   - author           (drafts only on their own content)
 *
 * These helpers compose into collection-level `access` configs.
 */

type Role = 'admin' | 'developer' | 'content_editor' | 'author'

const hasRole = (user: unknown, ...roles: Role[]): boolean => {
  if (!user || typeof user !== 'object') return false
  const role = (user as { role?: string }).role
  return typeof role === 'string' && roles.includes(role as Role)
}

/** Anyone with a CMS account. */
export const isCmsUser: Access = ({ req: { user } }) => Boolean(user)

/** Admin or developer. */
export const isAdmin: Access = ({ req: { user } }) =>
  hasRole(user, 'admin', 'developer')

/** Admin, developer, or content_editor. Can create/update content. */
export const isEditor: Access = ({ req: { user } }) =>
  hasRole(user, 'admin', 'developer', 'content_editor')

/** Anyone authenticated who is at least an author. */
export const isAuthorOrAbove: Access = ({ req: { user } }) =>
  hasRole(user, 'admin', 'developer', 'content_editor', 'author')

/**
 * Public read access scoped to published documents only.
 * Authenticated CMS staff can read drafts as well.
 */
export const readPublishedOrCmsUser: Access = ({ req: { user } }) => {
  if (user) return true
  return {
    _status: { equals: 'published' },
  }
}
