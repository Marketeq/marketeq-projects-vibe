# **06 - Category Schema Enforcement -- Developer Guide (Strapi as Primary Source)**

## **1. Purpose**

This document defines how marketplace categories are modeled and
validated across **Strapi CMS** and the **NestJS backend**, while
avoiding duplicate logic.

- **Strapi** is the primary category source and handles admin-created
  category validation.

- **NestJS** mirrors the schema to maintain marketplace consistency and
  enforces rules only for categories created outside Strapi
  (AI/user-generated).

- Both systems share a universal UUID for syncing.

## **2. Division of Responsibility**

### **Strapi (Admin Side)**

- Manages **all admin-created categories and subcategories**.

- Handles parent-child nesting using native relations.

- Generates unique slugs for categories created in Strapi.

- Provides lifecycle hooks/webhooks to sync categories to NestJS.

- Stores optional SEO overrides.

### **NestJS (Marketplace Side)**

- Receives and stores categories synced from Strapi.

- Provides recursive API endpoints for marketplace frontend and
  autocomplete.

- Validates categories created by:

  - AI (auto-generated).

  - User input (through autocomplete microservice).

- Ensures user/AI-generated categories pass validation before pushing to
  Strapi.

## **3. Data Model**

Both Strapi and NestJS share the same core fields:

- uuid -- Shared universal ID.

- name -- Display name.

- slug -- URL-safe identifier.

- parent_id -- UUID of parent category (nullable).

- approved -- Moderation flag.

- published_in_marketplace -- Controls visibility.

- seo_meta_title / seo_meta_description -- Optional SEO overrides.

- created_at / updated_at -- Timestamps for sorting and moderation.

## **4. Unlimited Nesting**

- Categories form a **tree structure** with unlimited depth.

- **Strapi** enforces parent-child relationships for admin-created
  categories.

- **NestJS** validates nesting only for categories created outside
  Strapi.

## **5. Validation Rules**

### **a. Prevent Circular References (NestJS-side)**

Used only when AI/user-generated categories are created before syncing
to Strapi.

async validateParent(childUuid: string, parentUuid: string) {

if (childUuid === parentUuid) throw new Error(\'Category cannot be its
own parent\');

const ancestors = await this.getAncestors(parentUuid);

if (ancestors.includes(childUuid)) throw new Error(\'Circular reference
detected\');

}

### **b. Slug Uniqueness**

- **Strapi** generates unique slugs for admin-created categories.

- **NestJS** generates slugs for AI/user-generated categories before
  pushing to Strapi.

import slugify from \'slugify\';

async function generateUniqueSlug(name: string): Promise\<string\> {

let slug = slugify(name, { lower: true });

let exists = await this.categoryRepo.findOne({ where: { slug } });

let counter = 1;

while (exists) {

slug = \`\${slug}-\${counter++}\`;

exists = await this.categoryRepo.findOne({ where: { slug } });

}

return slug;

}

### **c. UUID Enforcement**

- UUIDs are generated once on category creation (Strapi or NestJS).

- Always synced to keep both systems in alignment.

## **6. Recursive Queries (NestJS)**

### **Fetch Category Tree**

****async getCategoryTree(parentUuid: string = null):
Promise\<Category\[\]\> {

const categories = await this.categoryRepo.find({ where: { parent_id:
parentUuid } });

for (const cat of categories) {

cat.children = await this.getCategoryTree(cat.uuid);

}

return categories;

}

### **Fetch Breadcrumbs**

****async getBreadcrumb(uuid: string, path: Category\[\] = \[\]):
Promise\<Category\[\]\> {

const category = await this.categoryRepo.findOne({ where: { uuid } });

if (!category) return path;

path.unshift(category);

if (category.parent_id) return this.getBreadcrumb(category.parent_id,
path);

return path;

}



## **7. Strapi Lifecycle Hooks**

- Strapi fires webhooks to NestJS on create/update/delete.

- NestJS mirrors categories but does not re-validate admin-created
  entries unless they conflict with UUID or slug rules.

## **8. Why This Split Matters**

- Prevents duplicating Strapi's built-in content management logic.

- Keeps marketplace DB consistent when categories are created outside
  Strapi.

- Ensures auto-complete and AI-generated subcategories follow the same
  rules as admin categories.

## **9. Testing Checklist**

- ✅ Admin creates a category in Strapi → Syncs to NestJS with correct
  parent/slug.

- ✅ AI/user-generated category passes NestJS validation → Syncs to
  Strapi.

- ✅ No duplicate slugs across systems.

- ✅ Breadcrumb and tree queries return correct unlimited nesting.

- ✅ UUID matches between Strapi and NestJS for all categories.

## **10. Related Documentation**

- **Strapi ↔ NestJS Marketplace Category Sync -- Developer
  Implementation Guide\**
  Covers:

  - Real-time webhook sync

  - NestJS → Strapi push logic

  - Payload structure

  - Cron job fallback

  - Tag integration
