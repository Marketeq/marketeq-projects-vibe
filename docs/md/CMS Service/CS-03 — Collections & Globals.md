# CS-03 — Collections & Globals

**Service:** cms-service | **Powered by:** Payload CMS

> **Purpose:** Full TypeScript schema definitions for every Payload collection (11) and global (3). Includes all fields, access rules, hooks, and option values.
> **Prerequisites:** CS-02 (folder structure), CS-06 (access control details).

---

## 1. Access Imports (used across all collections)

```typescript
import {
  isAdmin,
  isAdminOrDeveloper,
  isContentEditorOrAbove,
  isAuthorOfDocument,
  isPublished,
} from '../access/roles';
```

---

## 2. Listings.ts

The CMS-managed editorial view of all five listing types. Stores featured status, editorial labels, and promotional copy that complement the transactional record owned by listings-service.

```typescript
// apps/cms-service/src/collections/Listings.ts
import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper, isContentEditorOrAbove } from '../access/roles';

export const Listings: CollectionConfig = {
  slug: 'listings',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'listingType', 'status', 'featured'],
  },
  access: {
    read:   () => true,
    create: isAdminOrDeveloper,
    update: isContentEditorOrAbove,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'sourceId', type: 'text', required: true, unique: true, index: true,
      admin: { description: 'UUID of the listing record in listings-service.' },
    },
    {
      name: 'listingType', type: 'select', required: true,
      options: ['project', 'service', 'team', 'talent', 'job'],
    },
    { name: 'title',   type: 'text', required: true },
    { name: 'slug',    type: 'text', required: true, unique: true, index: true },
    { name: 'excerpt', type: 'textarea', maxLength: 300 },
    {
      name: 'featured', type: 'checkbox', defaultValue: false,
      admin: { description: 'Pin to featured section on homepage and marketplace.' },
    },
    {
      name: 'featuredOrder', type: 'number',
      admin: { condition: (data) => data.featured },
    },
    {
      name: 'editorialLabel', type: 'select', defaultValue: 'none',
      options: ['top_pick', 'new', 'trending', 'staff_pick', 'none'],
    },
    { name: 'category',    type: 'relationship', relationTo: 'categories' },
    { name: 'coverImage',  type: 'upload',       relationTo: 'media' },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'draft',
      options: ['draft', 'published', 'archived'],
    },
    { name: 'publishedAt', type: 'date' },
  ],
};
```

---

## 3. Users.ts

The Payload admin panel user store and CMS identity index. `auth: true` enables Payload JWT authentication for admin panel login.

```typescript
// apps/cms-service/src/collections/Users.ts
import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper } from '../access/roles';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,  // Enables Payload JWT auth for admin panel login
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'userType', 'role', 'status'],
  },
  access: {
    read:   isAdminOrDeveloper,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'sourceId', type: 'text', unique: true, index: true,
      admin: { description: 'UUID from user-service / auth-service.' },
    },
    { name: 'name',  type: 'text',  required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'userType', type: 'select', required: true,
      options: ['client', 'talent', 'admin'],
    },
    {
      name: 'role', type: 'select',
      options: ['admin', 'developer', 'content_editor', 'author'],
      admin: {
        condition: (data) => data.userType === 'admin',
        description: 'CMS admin panel role. Only applies to admin-type users.',
      },
    },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    {
      name: 'status', type: 'select', defaultValue: 'active',
      options: ['active', 'suspended', 'deleted'],
    },
    { name: 'verifiedAt', type: 'date' },
    {
      name: 'notes', type: 'textarea',
      admin: { description: 'Internal admin notes. Never shown to the user.' },
    },
  ],
};
```

---

## 4. Orders.ts

Records every order placed on the platform. Written via `contract.activated` RabbitMQ event from contracts-service.

```typescript
// apps/cms-service/src/collections/Orders.ts
import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper } from '../access/roles';

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'client', 'listing', 'orderType', 'status', 'createdAt'],
  },
  access: {
    read:   isAdminOrDeveloper,
    create: isAdminOrDeveloper,  // Written by order sync from contracts-service
    update: isAdminOrDeveloper,
    delete: isAdmin,
  },
  fields: [
    { name: 'orderNumber', type: 'text', required: true, unique: true, index: true },
    {
      name: 'sourceId', type: 'text', index: true,
      admin: { description: 'Contract or transaction ID from contracts-service.' },
    },
    { name: 'client',  type: 'relationship', relationTo: 'users', required: true },
    { name: 'talent',  type: 'relationship', relationTo: 'users' },
    { name: 'listing', type: 'relationship', relationTo: 'listings' },
    {
      name: 'orderType', type: 'select', required: true,
      options: ['project', 'service', 'team', 'talent', 'job'],
    },
    {
      name: 'totalAmount', type: 'number',
      admin: { description: 'Amount in USD cents.' },
    },
    { name: 'currency', type: 'text', defaultValue: 'USD' },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'pending',
      options: ['pending', 'active', 'completed', 'disputed', 'cancelled'],
    },
    { name: 'notes',     type: 'textarea' },
    { name: 'startDate', type: 'date' },
    { name: 'endDate',   type: 'date' },
  ],
};
```

---

## 5. Categories.ts

Canonical source of truth for all platform listing categories. `afterChange` and `afterDelete` hooks publish RabbitMQ events via `CmsEventPublisher`. See CS-05 for full CategorySyncModule implementation.

```typescript
// apps/cms-service/src/collections/Categories.ts
import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper } from '../access/roles';
import {
  syncCategoryToService,
  deleteCategoryFromService,
} from '../hooks/afterChange/syncCategories';

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'parent', 'listingTypes', 'status'],
  },
  access: {
    read:   () => true,
    create: isAdminOrDeveloper,
    update: isAdminOrDeveloper,
    delete: isAdmin,
  },
  fields: [
    { name: 'name',        type: 'text',     required: true },
    { name: 'slug',        type: 'text',     required: true, unique: true, index: true },
    { name: 'description', type: 'textarea' },
    { name: 'icon',        type: 'upload',   relationTo: 'media' },
    { name: 'parent',      type: 'relationship', relationTo: 'categories', hasMany: false },
    {
      name: 'listingTypes', type: 'select', hasMany: true,
      options: ['project', 'service', 'team', 'talent', 'job'],
    },
    {
      name: 'status', type: 'select', defaultValue: 'active',
      options: ['active', 'inactive'],
    },
    { name: 'sortOrder',         type: 'number' },
    { name: 'algoliaFacetOrder', type: 'number' },
  ],
  hooks: {
    afterChange: [syncCategoryToService],
    afterDelete: [deleteCategoryFromService],
  },
};
```

---

## 6. Content Collections

### 6.1 BlogPosts.ts

```typescript
// apps/cms-service/src/collections/BlogPosts.ts
export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'author', 'publishedAt'] },
  access: {
    read:   isContentEditorOrAbove,
    create: isAuthorOfDocument,
    update: isAuthorOfDocument,
    delete: isAdmin,
  },
  fields: [
    { name: 'title',      type: 'text',         required: true },
    { name: 'slug',       type: 'text',         required: true, unique: true, index: true },
    { name: 'body',       type: 'richText' },
    { name: 'author',     type: 'relationship', relationTo: 'users' },
    { name: 'coverImage', type: 'upload',       relationTo: 'media' },
    { name: 'category',   type: 'relationship', relationTo: 'categories' },
    { name: 'tags',       type: 'array', fields: [{ name: 'tag', type: 'text' }] },
    {
      name: 'status', type: 'select', defaultValue: 'draft',
      options: ['draft', 'published', 'archived'],
    },
    { name: 'publishedAt', type: 'date' },
  ],
};
```

### 6.2 HelpArticles.ts

```typescript
// apps/cms-service/src/collections/HelpArticles.ts
export const HelpArticles: CollectionConfig = {
  slug: 'help-articles',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'topic', 'status'] },
  access: {
    read:   isContentEditorOrAbove,
    create: isAuthorOfDocument,
    update: isAuthorOfDocument,
    delete: isAdmin,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug',  type: 'text', required: true, unique: true, index: true },
    { name: 'body',  type: 'richText' },
    {
      name: 'topic', type: 'select',
      options: ['getting-started', 'billing', 'contracts', 'account', 'marketplace', 'other'],
    },
    {
      name: 'helpfulCount', type: 'number', defaultValue: 0,
      admin: { readOnly: true, description: 'Managed by external service.' },
    },
    { name: 'relatedArticles', type: 'relationship', relationTo: 'help-articles', hasMany: true },
    {
      name: 'status', type: 'select', defaultValue: 'draft',
      options: ['draft', 'published', 'archived'],
    },
  ],
};
```

### 6.3 Announcements.ts

```typescript
// apps/cms-service/src/collections/Announcements.ts
export const Announcements: CollectionConfig = {
  slug: 'announcements',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'audience', 'status', 'startDate'] },
  access: {
    read:   isContentEditorOrAbove,
    create: isContentEditorOrAbove,
    update: isContentEditorOrAbove,
    delete: isAdmin,
  },
  fields: [
    { name: 'title',    type: 'text',     required: true },
    { name: 'message',  type: 'richText' },
    {
      name: 'audience', type: 'select',
      options: ['all', 'clients', 'talent', 'admins'],
    },
    { name: 'startDate', type: 'date' },
    { name: 'endDate',   type: 'date' },
    { name: 'ctaLabel',  type: 'text' },
    { name: 'ctaUrl',    type: 'text' },
    { name: 'priority',  type: 'number', defaultValue: 0 },
    {
      name: 'status', type: 'select', defaultValue: 'draft',
      options: ['draft', 'published', 'archived'],
    },
  ],
};
```

### 6.4 FeatureFlags.ts

```typescript
// apps/cms-service/src/collections/FeatureFlags.ts
export const FeatureFlags: CollectionConfig = {
  slug: 'feature-flags',
  admin: { useAsTitle: 'key', defaultColumns: ['key', 'enabled', 'rolloutPercentage'] },
  access: {
    read:   isAdminOrDeveloper,
    create: isAdminOrDeveloper,
    update: isAdminOrDeveloper,
    delete: isAdminOrDeveloper,
  },
  fields: [
    { name: 'key',               type: 'text',     required: true, unique: true, index: true },
    { name: 'enabled',           type: 'checkbox', defaultValue: false },
    { name: 'description',       type: 'textarea' },
    { name: 'rolloutPercentage', type: 'number',   min: 0, max: 100, defaultValue: 100 },
  ],
};
```

### 6.5 Media.ts

```typescript
// apps/cms-service/src/collections/Media.ts
export const Media: CollectionConfig = {
  slug: 'media',
  upload: { staticURL: '/media', staticDir: 'media' },  // overridden by r2Storage plugin
  admin: { defaultColumns: ['filename', 'alt', 'mimeType', 'updatedAt'] },
  access: {
    read:   () => true,
    create: isContentEditorOrAbove,
    update: isContentEditorOrAbove,
    delete: isContentEditorOrAbove,
  },
  fields: [
    { name: 'alt',     type: 'text' },
    { name: 'caption', type: 'text' },
    { name: 'credit',  type: 'text' },
  ],
};
```

### 6.6 Testimonials.ts

```typescript
// apps/cms-service/src/collections/Testimonials.ts
export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  admin: { useAsTitle: 'authorName', defaultColumns: ['authorName', 'rating', 'featured', 'status'] },
  access: { read: () => true, create: isContentEditorOrAbove, update: isContentEditorOrAbove, delete: isAdmin },
  fields: [
    { name: 'authorName',    type: 'text', required: true },
    { name: 'authorTitle',   type: 'text' },
    { name: 'authorCompany', type: 'text' },
    { name: 'avatar',        type: 'upload', relationTo: 'media' },
    { name: 'quote',         type: 'textarea' },
    { name: 'rating',        type: 'number', min: 1, max: 5 },
    { name: 'featured',      type: 'checkbox', defaultValue: false },
    {
      name: 'status', type: 'select', defaultValue: 'draft',
      options: ['draft', 'published', 'archived'],
    },
  ],
};
```

### 6.7 LandingPages.ts

```typescript
// apps/cms-service/src/collections/LandingPages.ts
export const LandingPages: CollectionConfig = {
  slug: 'landing-pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'status'] },
  access: { read: () => true, create: isContentEditorOrAbove, update: isContentEditorOrAbove, delete: isAdmin },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug',  type: 'text', required: true, unique: true, index: true },
    {
      name: 'hero', type: 'group', fields: [
        { name: 'headline',    type: 'text' },
        { name: 'subheadline', type: 'text' },
        { name: 'ctaLabel',    type: 'text' },
        { name: 'ctaUrl',      type: 'text' },
      ],
    },
    {
      name: 'sections', type: 'array', fields: [
        { name: 'blockType', type: 'select', options: ['text', 'image', 'cta', 'features', 'testimonials'] },
        { name: 'content',   type: 'richText' },
        { name: 'image',     type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'status', type: 'select', defaultValue: 'draft',
      options: ['draft', 'published', 'archived'],
    },
  ],
};
```

---

## 7. Globals

### 7.1 SiteSettings.ts

```typescript
// apps/cms-service/src/globals/SiteSettings.ts
import { GlobalConfig } from 'payload/types';
import { isContentEditorOrAbove } from '../access/roles';

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: { read: () => true, update: isContentEditorOrAbove },
  fields: [
    { name: 'platformName',          type: 'text' },
    { name: 'supportEmail',          type: 'email' },
    {
      name: 'socialLinks', type: 'group', fields: [
        { name: 'twitter',   type: 'text' },
        { name: 'linkedin',  type: 'text' },
        { name: 'instagram', type: 'text' },
        { name: 'facebook',  type: 'text' },
      ],
    },
    { name: 'defaultSeoTitle',       type: 'text',     maxLength: 60 },
    { name: 'defaultSeoDescription', type: 'textarea', maxLength: 160 },
    { name: 'cookieConsentCopy',     type: 'textarea' },
    { name: 'termsUrl',              type: 'text' },
    { name: 'privacyUrl',            type: 'text' },
  ],
};
```

### 7.2 HomepageBanner.ts

```typescript
// apps/cms-service/src/globals/HomepageBanner.ts
import { GlobalConfig } from 'payload/types';
import { isContentEditorOrAbove } from '../access/roles';

export const HomepageBanner: GlobalConfig = {
  slug: 'homepage-banner',
  access: { read: () => true, update: isContentEditorOrAbove },
  fields: [
    { name: 'enabled',   type: 'checkbox', defaultValue: false },
    { name: 'message',   type: 'textarea' },
    { name: 'ctaLabel',  type: 'text' },
    { name: 'ctaUrl',    type: 'text' },
    { name: 'expiresAt', type: 'date' },
    {
      name: 'bannerType', type: 'select', defaultValue: 'info',
      options: ['info', 'promo', 'warning'],
    },
  ],
};
```

### 7.3 AdminConfig.ts

```typescript
// apps/cms-service/src/globals/AdminConfig.ts
import { GlobalConfig } from 'payload/types';
import { isAdmin } from '../access/roles';

export const AdminConfig: GlobalConfig = {
  slug: 'admin-config',
  // Admin only — Developers, Content Editors, and Authors have no access
  access: { read: isAdmin, update: isAdmin },
  admin: {
    hidden: ({ user }) => user?.role !== 'admin',
  },
  fields: [
    {
      name: 'maintenanceMode', type: 'checkbox', defaultValue: false,
      admin: { description: 'Enabling this takes the platform offline for all users immediately.' },
    },
    { name: 'maintenanceMessage',        type: 'textarea' },
    { name: 'featuredListingsLimit',     type: 'number', defaultValue: 6 },
    {
      name: 'orderReviewThresholdCents', type: 'number', defaultValue: 50000,
      admin: { description: 'Orders above this value (USD cents) are auto-escalated to admin review.' },
    },
    {
      name: 'flagThreshold', type: 'number', defaultValue: 3,
      admin: { description: 'Content flags needed before automatic admin review is triggered.' },
    },
  ],
};
```

---

## 8. Verification

- Run `npm run dev` and navigate to `http://localhost:3020/admin`.
- Confirm all 11 collections appear in the left sidebar.
- Confirm all 3 globals appear: Site Settings, Homepage Banner, Admin Config.
- Create a test Category record — confirm it saves and the `syncCategoryToService` hook fires (check logs for RabbitMQ publish confirmation).
- Attempt to access AdminConfig as a Developer-role user — confirm HTTP 403 is returned.
- **References:** CS-02 (bootstrapping), CS-05 (CategorySyncModule), CS-06 (access control functions).
