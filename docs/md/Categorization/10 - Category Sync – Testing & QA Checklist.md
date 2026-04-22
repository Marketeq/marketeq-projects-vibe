# **10 - Category Sync -- Testing & QA Checklist**

## **Purpose**

This document provides a single QA reference for all category-related
features, combining testing steps that were previously scattered across
multiple implementation docs.

## **1. Payload ↔ NestJS Sync**

### **Goals:**

- Ensure categories created in Payload appear in NestJS with correct
  UUID, slug, and parent relationships.

- Ensure user/AI-generated subcategories in NestJS sync back to Payload.

### **Tests:**

✅ **Payload → NestJS**

1.  Create a new category in Payload (top-level and subcategory).

2.  Verify:

    - UUID matches in NestJS.

    - Slug matches.

    - Parent-child relationship preserved.

3.  Update the name in Payload.

    - Confirm NestJS reflects updated name and slug.

4.  Delete category in Payload.

    - Confirm NestJS triggers reassignment logic for linked content.

✅ **NestJS → Payload**

1.  Create a user-generated subcategory via publishing flow.

2.  Verify:

    - Category appears in NestJS DB.

    - Category pushes to Payload with published_in_marketplace = false.

3.  Confirm UUID and slug match between systems.

## **2. Cron Fallback Validation**

### **Goals:**

- Ensure the scheduled job catches any missed updates if webhooks fail.

### **Tests:**

1.  Disable Payload webhook temporarily.

2.  Create a category in Payload.

3.  Wait for cron job (10 min default).

4.  Confirm category appears in NestJS after cron runs.

## **3. Unlimited Nesting**

### **Goals:**

- Verify category tree supports unlimited depth without breaking API or
  UI.

### **Tests:**

1.  Create a 5-level deep category chain in Payload.

2.  Fetch category tree via NestJS API:

    - GET /categories/tree

    - Confirm all levels are returned.

3.  Verify breadcrumb API:

    - GET /categories/:uuid/breadcrumbs

    - Confirms full parent chain returned in correct order.

4.  Add a 6th-level subcategory:

    - Confirm no depth limitation or circular errors.

## **4. SEO Defaults & Overrides**

### **Goals:**

- Confirm categories have correct SEO metadata applied.

### **Tests:**

1.  Create a category with no SEO fields:

    - Confirm frontend uses **default template** for title/description.

2.  Create a category with SEO overrides:

    - Confirm frontend uses custom meta title/description.

3.  Update SEO fields in Payload:

    - Confirm NestJS API reflects changes.

4.  Test nested subcategory with overrides:

    - Confirm overrides apply only to that category, not parents.

## **5. Content Reassignment on Deletion**

### **Goals:**

- Ensure content isn't orphaned when a category is deleted.

### **Tests:**

1.  Link projects, jobs, and services to a category.

2.  Delete category in Payload.

3.  Verify:

    - Admin is prompted to reassign content to a new category.

    - If no reassignment is chosen, content rolls up to parent category.

    - NestJS DB updates all linked content to new category UUID.

## **6. Autocomplete Sync**

### **Goals:**

- Confirm categories exposed via Autocomplete Microservice are in sync.

### **Tests:**

1.  Create a new category in Payload.

2.  Call GET /autocomplete/categories?q=\<term\>.

    - Confirm new category appears in suggestions.

3.  Update category name in Payload.

    - Confirm autocomplete reflects new name in real-time.

4.  Create a user-generated subcategory via publishing flow.

    - Confirm it appears in autocomplete immediately.

## **7. QA Notes**

- Always test with both top-level categories and subcategories.

- Verify UUID consistency for all sync scenarios.

- Test with long names, special characters, and deep nesting.

- Test category visibility flags:

  - approved = false → Should **not** show in autocomplete or
    marketplace.

  - published_in_marketplace = false → Should show in autocomplete but
    **not** in marketplace.
