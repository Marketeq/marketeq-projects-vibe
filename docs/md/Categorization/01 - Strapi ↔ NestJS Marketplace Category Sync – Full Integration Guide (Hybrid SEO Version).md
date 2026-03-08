# **01- Strapi ↔ NestJS Marketplace Category Sync -- Full Integration Guide (Hybrid SEO Version)**

## **1. Purpose**

This document provides full step-by-step integration instructions for
syncing marketplace categories and tags between **Strapi CMS** and the
**NestJS backend database** with:

- Unlimited nesting support

- Universal UUIDs for cross-referencing

- Real-time webhook sync + fallback cron

- Auto-approval and unpublished workflow for user-generated
  subcategories

- Hybrid SEO approach (automatic + optional overrides)

- Tag synchronization

- Conflict and deletion handling

## **2. Database Models**

### **Strapi Category Model**

- id: Auto (Strapi default)

- uuid: UUID (shared with NestJS)

- name: String

- slug: Unique string (URL)

- description: Text

- parent: Relation to self (unlimited nesting)

- tags: Relation to Tag model

- created_at: DateTime

- updated_at: DateTime

- published_in_marketplace: Boolean

- approved: Boolean

- seo_meta_title: String (optional)

- seo_meta_description: String (optional)

### **NestJS Category Model**

- id: Auto increment

- uuid: UUID (same as Strapi)

- name: String

- slug: String

- description: Text

- parent_id: UUID

- tags: Relation to Tag entity

- created_at: DateTime

- updated_at: DateTime

- published_in_marketplace: Boolean

- approved: Boolean

- seo_meta_title: String (optional)

- seo_meta_description: String (optional)

### **Tag Model (Both Systems)**

- id: Auto

- uuid: UUID

- name: String

- slug: String

- created_at: DateTime

## **3. Unlimited Nesting**

- Categories can have unlimited parent-child relationships.

- Both Strapi and NestJS models use recursive relations to support a
  hierarchy similar to WordPress.

## **4. Hybrid SEO Approach**

### **Dynamic Template SEO (Default)**

- All categories and subcategories automatically generate a page at
  /categories/:slug.

- Default SEO for auto-generated pages:

  - \<title\> = Browse {Category Name} Projects & Talent

  - \<meta description\> = Find top services, teams, and jobs in
    {Category Name}.

### **Optional Overrides**

- Admin can define seo_meta_title and seo_meta_description in Strapi.

- If these fields are filled, they override the default SEO template.

- If blank, dynamic defaults are applied.

### **Sync Behavior**

- SEO fields are synced both ways.

- Empty fields are ignored, and both systems fall back to dynamic SEO
  defaults.

## **5. Real-Time Webhook Sync**

### **Strapi → NestJS (Admin Updates)**

- **Trigger:** Category created/updated/deleted in Strapi.

- **Action:** Webhook sends category JSON to NestJS
  /api/categories/sync.

**NestJS Controller Example:**

****\@Post(\'sync\')

async syncCategory(@Body() categoryDto: CategoryDto) {

await this.categoryService.syncFromStrapi(categoryDto);

return { status: \'ok\' };

}

**Service Logic:**

- Upsert by UUID.

- Update parent relationship.

- Sync tags.

- Sync SEO overrides if present.

- If deleted: mark inactive and trigger reassignment.

### **NestJS → Strapi (User/AI-Generated Subcategories)**

- **Trigger:** New subcategory passes autocomplete filters.

- **Action:** Push to Strapi with approved = true and
  published_in_marketplace = false.

**Service Example:**

****async pushCategoryToStrapi(category: CategoryEntity) {

const payload = {

uuid: category.uuid,

name: category.name,

slug: category.slug,

parent: category.parent_id,

approved: true,

published_in_marketplace: false,

seo_meta_title: category.seo_meta_title \|\| null,

seo_meta_description: category.seo_meta_description \|\| null,

tags: category.tags.map(t =\> t.uuid),

};

await this.httpService.post(\'https://strapi.api/categories\', payload,
{

headers: { Authorization: \`Bearer \${process.env.STRAPI_TOKEN}\` }

}).toPromise();

}



## **6. Cron Fallback**

- Runs every 10 min to compare timestamps.

- Syncs any missing or outdated categories and tags.

## **7. Auto-Approval Workflow**

- Subcategories created under existing parents can be auto-approved.

- Auto-approved categories = approved = true, published_in_marketplace =
  false.

- Admin can review unpublished categories in Strapi sorted by
  created_at.

## **8. Deletion and Rename Handling**

- **Rename:** Immediate sync in both systems.

- **Delete:\**

  - System must reassign content to a new category or roll up to parent.

  - Prefer manual reassignment over automatic.

  - After reassignment, delete category in both DBs.

## **9. Tag Sync**

- Tags share UUIDs.

- Tag updates follow the same webhook + cron sync rules.

## **10. Step-by-Step Setup**

1.  Add uuid, seo_meta_title, seo_meta_description, and
    published_in_marketplace to both Strapi and NestJS models.

2.  Create Strapi webhooks for category lifecycle events.

3.  Build NestJS /categories/sync endpoint.

4.  Implement NestJS category service with upsert and tag sync logic.

5.  Create NestJS → Strapi push service for user/AI-generated
    categories.

6.  Add cron job to NestJS for fallback sync.

7.  Implement deletion reassignment workflow in NestJS.

8.  Configure dynamic SEO defaults in Next.js category page template.

9.  Test auto-generated subcategory SEO using default template.

10. Test optional override fields in Strapi to ensure they override
    defaults.

## **11. Developer Notes**

- Unlimited nesting requires recursive query helpers in both systems.

- Slug generation must be unique and URL-safe.

- created_at is required to allow admin to filter new categories for
  manual review.

- SEO fields are optional; dynamic templates ensure new categories are
  SEO-ready instantly.
