import { Access, FieldAccess } from 'payload/types';

type UserDoc = {
  id: string;
  role?: string;
  userType?: string;
};

// ── Role checks ──

export const isAdmin: Access = ({ req: { user } }) => {
  return (user as UserDoc)?.role === 'admin';
};

export const isAdminOrDeveloper: Access = ({ req: { user } }) => {
  const role = (user as UserDoc)?.role;
  return role === 'admin' || role === 'developer';
};

export const isContentEditorOrAbove: Access = ({ req: { user } }) => {
  const role = (user as UserDoc)?.role;
  return role === 'admin' || role === 'developer' || role === 'content_editor';
};

/**
 * Author can only see/edit their own documents.
 * Editor+ gets full access.
 */
export const isAuthorOfDocument: Access = ({ req: { user } }) => {
  const u = user as UserDoc;
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

export const isAdminField: FieldAccess = ({ req: { user } }) => {
  return (user as UserDoc)?.role === 'admin';
};

export const isAdminOrDeveloperField: FieldAccess = ({ req: { user } }) => {
  const role = (user as UserDoc)?.role;
  return role === 'admin' || role === 'developer';
};
