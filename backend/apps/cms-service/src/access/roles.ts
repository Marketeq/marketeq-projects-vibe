import { Access, FieldAccess } from 'payload/types';
import { timingSafeEqual } from 'crypto';

type UserDoc = {
  id: string;
  role?: string;
  userType?: string;
};

// Service-to-service auth per CS-04 §Auth. Internal services pass
// `Authorization: API-Key <CMS_API_KEY>` and are treated as an admin
// sync-bot — this is the only write path for microservices that don't
// hold a human admin JWT (e.g. category-service pushing user-generated
// subcategories). Shared secret lives in CMS_API_KEY and is scoped to
// the private backend network.
function hasValidCmsApiKey(req: unknown): boolean {
  const configured = process.env.CMS_API_KEY;
  if (!configured) return false;
  const headers = (req as { headers?: Record<string, unknown> } | null | undefined)?.headers;
  const header = headers?.['authorization'];
  if (typeof header !== 'string') return false;
  const match = header.match(/^API-Key\s+(.+)$/);
  if (!match) return false;
  const provided = match[1];
  if (provided.length !== configured.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(configured));
  } catch {
    return false;
  }
}

// ── Role checks ──

export const isAdmin: Access = ({ req }) => {
  if (hasValidCmsApiKey(req)) return true;
  return (req.user as UserDoc)?.role === 'admin';
};

export const isAdminOrDeveloper: Access = ({ req }) => {
  if (hasValidCmsApiKey(req)) return true;
  const role = (req.user as UserDoc)?.role;
  return role === 'admin' || role === 'developer';
};

export const isContentEditorOrAbove: Access = ({ req }) => {
  if (hasValidCmsApiKey(req)) return true;
  const role = (req.user as UserDoc)?.role;
  return role === 'admin' || role === 'developer' || role === 'content_editor';
};

/**
 * Author can only see/edit their own documents.
 * Editor+ gets full access.
 */
export const isAuthorOfDocument: Access = ({ req, id }) => {
  if (hasValidCmsApiKey(req)) return true;
  const u = req.user as UserDoc;
  if (!u) return false;

  const role = u.role;
  if (role === 'admin' || role === 'developer' || role === 'content_editor') {
    return true;
  }

  if (role === 'author') {
    return {
      author: {
        equals: u.id,
      },
    };
  }

  return false;
};

/**
 * Public read for published content; privileged users see all.
 */
export const isPublished: Access = ({ req: { user } }) => {
  const u = user as UserDoc;
  const role = u?.role;

  if (role === 'admin' || role === 'developer' || role === 'content_editor') {
    return true;
  }

  return {
    status: {
      equals: 'published',
    },
  };
};

// ── Field-level access ──

export const isAdminField: FieldAccess = ({ req }) => {
  if (hasValidCmsApiKey(req)) return true;
  return (req.user as UserDoc)?.role === 'admin';
};

export const isAdminOrDeveloperField: FieldAccess = ({ req }) => {
  if (hasValidCmsApiKey(req)) return true;
  const role = (req.user as UserDoc)?.role;
  return role === 'admin' || role === 'developer';
};

/**
 * Editor or above — content_editor, developer, admin.
 * Used for collections where editors should be able to create/update.
 */
export const isEditor: Access = ({ req }) => {
  if (hasValidCmsApiKey(req)) return true;
  const role = (req.user as UserDoc)?.role;
  return role === 'admin' || role === 'developer' || role === 'content_editor';
};

/**
 * Public read for published content; CMS users (any role) see all statuses.
 * Falls back to a where-clause for unauthenticated / non-CMS visitors.
 */
export const readPublishedOrCmsUser: Access = ({ req }) => {
  if (hasValidCmsApiKey(req)) return true;
  const u = req.user as UserDoc;
  const role = u?.role;

  if (role === 'admin' || role === 'developer' || role === 'content_editor' || role === 'author') {
    return true;
  }

  return {
    _status: {
      equals: 'published',
    },
  };
};
