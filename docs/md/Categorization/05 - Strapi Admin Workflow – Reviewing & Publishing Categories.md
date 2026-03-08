# **05 - Strapi Admin Workflow -- Reviewing & Publishing Categories**

## **1. Purpose**

This document explains how the **Strapi admin team** reviews, approves,
and publishes new categories and subcategories generated from user or AI
input. All moderation happens inside the Strapi CMS, and changes
automatically sync to the NestJS backend.

## **2. Where to Find New Categories**

1.  Log in to the Strapi admin panel.

2.  Navigate to **Content Manager → Categories**.

3.  Apply the following filters:

    - approved = true

    - published_in_marketplace = false

4.  Sort by created_at (descending) to see the most recent additions.

## **3. Reviewing Categories**

When you open a category entry, check:

- ✅ **Parent Assignment** -- Ensure it's under the correct parent or
  subcategory.

- ✅ **Name & Slug** -- Verify spelling and formatting.

- ✅ **Tags** -- Ensure tags are relevant to the category.

- ✅ **Auto-Complete Relevance** -- Make sure the category logically
  fits into the marketplace.

## **4. Approving & Publishing**

1.  If the category is correct:

    - Set published_in_marketplace = true.

    - Save changes.

    - Lifecycle hook triggers NestJS sync, making it available for the
      marketplace.

2.  If the category needs edits:

    - Fix name, slug, or parent.

    - Save changes.

    - Category remains unpublished until published_in_marketplace =
      true.

## **5. Rejecting Categories**

If a category is irrelevant or inappropriate:

- Set approved = false.

- Save changes.

- The category remains in the DB but hidden from marketplace and
  autocomplete.

## **6. SEO Overrides (Optional)**

- You can set:

  - seo_meta_title

  - seo_meta_description

- If left blank, the marketplace will use the default dynamic SEO
  template.

## **7. How Changes Propagate**

- **Publishing:** Lifecycle hook sends updated category to NestJS.

- **Editing:** Updates name, slug, and tags in both Strapi and NestJS.

- **Rejecting:** Marks category as inactive in NestJS; hidden from
  autocomplete and marketplace.

## **8. Testing Checklist**

- ✅ Category marked as published_in_marketplace = true appears on
  marketplace pages.

- ✅ Edits to parent/slug propagate to NestJS without breaking
  hierarchy.

- ✅ Rejected categories disappear from autocomplete suggestions.
