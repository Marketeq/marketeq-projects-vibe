# CS-06 — Permissions & Access Control

**Service:** cms-service | **Powered by:** Payload CMS

> **Purpose:** Full role definitions, all access control functions in `src/access/`, field-level access rules per collection, and admin panel role enforcement.
> **Prerequisites:** CS-03 (collections & globals).

---

## 1. Role Definitions

| Role | Slug | Permissions |
|---|---|---|
| **Admin** | `admin` | Full CRUD on all collections, globals, users, orders, AdminConfig, and admin features. Can manage all other users and their roles. |
| **Developer** | `developer` | Full read/write on all collections and globals. Cannot delete users or orders. No access to AdminConfig. Intended for backend engineers. |
| **Content Editor** | `content_editor` | Read/write on BlogPosts, HelpArticles, Announcements, Testimonials, LandingPages, Media, SiteSettings, HomepageBanner. Read-only on Listings and Categories. No access to Users, Orders, FeatureFlags, AdminConfig. Cannot publish Announcements. |
| **Author** | `author` | Write access to own BlogPosts and HelpArticles only. Status locked to draft — cannot publish. No access to any other collection or global. |

---

## 2. roles.ts — All Access Functions

**File location:** `apps/cms-service/src/access/roles.ts`

```typescript
import { Access } from 'payload/types';

export type UserRole = 'admin' | 'developer' | 'content_editor' | 'author';

// Grants access only to the admin role.
export const isAdmin: Access = ({ req: { user } }) =>
  user?.role === 'admin';

// Grants access to admin and developer roles.
export const isAdminOrDeveloper: Access = ({ req: { user } }) =>
  ['admin', 'developer'].includes(user?.role);

// Grants access to admin, developer, and content_editor roles.
export const isContentEditorOrAbove: Access = ({ req: { user } }) =>
  ['admin', 'developer', 'content_editor'].includes(user?.role);

// Admin, Developer, and Content Editor have full access.
// Author can only access documents where author === their user ID.
export const isAuthorOfDocument: Access = ({ req: { user }, id }) => {
  if (['admin', 'developer', 'content_editor'].includes(user?.role)) return true;
  if (user?.role === 'author') return { author: { equals: user.id } };
  return false;
};

// Controls public-facing read access — only published documents
// are visible to unauthenticated or low-privilege users.
export const isPublished: Access = ({ req: { user } }) => {
  if (user && ['admin', 'developer', 'content_editor'].includes(user.role)) {
    return true;  // Privileged users see all statuses
  }
  return { status: { equals: 'published' } };
};
```

---

## 3. Access Rules Per Collection

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| Listings | Public | Admin / Dev | Editor+ | Admin only |
| Users | Admin / Dev | Admin only | Admin only | Admin only |
| Orders | Admin / Dev | Admin / Dev | Admin / Dev | Admin only |
| Categories | Public | Admin / Dev | Admin / Dev | Admin only |
| BlogPosts | Editor+ / own* | Author+ | Author (own) | Admin only |
| HelpArticles | Editor+ / own* | Author+ | Author (own) | Admin only |
| Announcements | Editor+ | Editor+ | Editor+ | Admin only |
| FeatureFlags | Admin / Dev | Admin / Dev | Admin / Dev | Admin / Dev |
| Media | Public | Editor+ | Editor+ | Editor+ |
| Testimonials | Public | Editor+ | Editor+ | Admin only |
| LandingPages | Public | Editor+ | Editor+ | Admin only |

*Author role sees only their own documents in list view.*

---

## 4. Global Access Rules

| Global | Read | Update |
|---|---|---|
| SiteSettings | Public | Content Editor and above |
| HomepageBanner | Public | Content Editor and above |
| AdminConfig | Admin only | Admin only — Developer/Editor/Author: HTTP 403 |

---

## 5. Field-Level Access — Key Rules

### Users Collection
- **role field:** only visible in the admin form when `userType === 'admin'`. Enforced by Payload `admin.condition`.
- **notes field:** present in API responses for Admin and Developer only. Content Editor and Author receive this field as `undefined`.

### Listings Collection
- **featuredOrder:** only visible in the form when `featured === true`. Enforced by `admin.condition`.
- **editorialLabel:** writable by Content Editor and above.

### BlogPosts / HelpArticles — Author Restriction
- Author-role users can only see and edit documents where `author === their own user ID`.
- Attempting to access another Author's document returns HTTP 403 from `isAuthorOfDocument`.
- Status field is effectively locked to `'draft'` for Authors — attempting to set `status = 'published'` returns HTTP 403.

### AdminConfig — Developer Exclusion
- AdminConfig access is set to `isAdmin` on both read and update. Developer role receives HTTP 403.
- AdminConfig is hidden from the admin panel sidebar for Developer, Content Editor, and Author roles via Payload's `admin.hidden` configuration.

---

## 6. Admin Panel Role Enforcement

Payload enforces access control at two levels: API (HTTP 403 for unauthorised requests) and admin panel (UI elements are hidden based on role). Both must be correct — hiding UI is not a substitute for API-level enforcement.

```typescript
// Example: Hiding AdminConfig from the sidebar for non-admin roles
export const AdminConfig: GlobalConfig = {
  slug: 'admin-config',
  admin: {
    // hidden accepts a function that receives the user and returns boolean
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: { read: isAdmin, update: isAdmin },
  fields: [ ... ],
};
```

---

## 7. Verification

- Log in as each role (Admin, Developer, Content Editor, Author) and confirm the correct collections and globals are visible in the sidebar.
- As Developer, attempt to access `/api/globals/admin-config` — confirm HTTP 403.
- As Author, attempt to update another Author's blog post — confirm HTTP 403.
- As Content Editor, attempt to set an announcement status to `'published'` — confirm HTTP 403.
- As Admin, confirm full access to all collections, globals, and AdminConfig.
- **References:** CS-03 (collection schemas), CS-07 (admin features guide).
