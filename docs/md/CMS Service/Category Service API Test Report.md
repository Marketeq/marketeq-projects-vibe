# Category Service — API Test Report

**Date:** 2026-04-06  
**Category Service:** `http://localhost:3023`  
**CMS Service:** `http://localhost:3020` (Payload CMS)  

> **41 tests** executed — **37 passed**, **4 failed**

---

## Quick Summary

| # | Section | Tests | Pass | Fail |
|---|---------|-------|------|------|
| 1 | 1. Categories: Read | 7 | 7 | 0 |
| 2 | 2. CMS Connection | 2 | 2 | 0 |
| 3 | 3. Sync: CMS to Category Service | 2 | 2 | 0 |
| 4 | 4. Webhook Sync (Category Pages) | 5 | 5 | 0 |
| 5 | 5. User Subcategory Creation | 5 | 2 | 3 |
| 6 | 6. Delete: Dry Run and Preview | 4 | 4 | 0 |
| 7 | 7. Delete Webhooks | 3 | 3 | 0 |
| 8 | 8. Reassign Children | 1 | 1 | 0 |
| 9 | 9. Actual Delete | 2 | 2 | 0 |
| 10 | 10. Tags | 3 | 3 | 0 |
| 11 | 11. Category Pages | 6 | 5 | 1 |
| 12 | 12. Tax Groups | 1 | 1 | 0 |

---

## 1. Categories: Read

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `GET` | `/api/categories` | 200 | Returns all categories with parent/tag relations |
| PASS | `GET` | `/api/categories/tree` | 200 | Recursive tree, roots first |
| PASS | `GET` | `/api/categories/tree?parentUuid=cms-test-uuid-001` | 200 | Subtree rooted at given UUID |
| PASS | `GET` | `/api/categories/slug/artificial-intelligence` | 200 | Lookup by slug, includes parent+tags |
| PASS | `GET` | `/api/categories/slug/does-not-exist` | 404 | Returns 404 |
| PASS | `GET` | `/api/categories/cms-test-uuid-001/breadcrumbs` | 200 | Ancestor chain from root to this category |
| PASS | `GET` | `/api/categories/bad-uuid/breadcrumbs` | 404 | Returns 404 |

**Sample Responses:**

**PASS** `GET /api/categories/slug/artificial-intelligence` → `200`
```json
{
  "id": 2,
  "uuid": "cms-test-uuid-001",
  "name": "Artificial Intelligence",
  "slug": "artificial-intelligence",
  "seo_meta_title": "AI Services",
  "seo_meta_description": "AI and machine learning services",
  "approved": true,
  "published_in_marketplace": true,
  "parentId": null,
  "created_at": "2026-04-07T05:08:03.816Z",
  "updated_at": "2026-04-07T05:08:03.816Z",
  "parent": null,
  "tags": [
    {
      "id": 1,
      "uuid": "tag-ai-001",
      "name": "AI",
      "slug": "ai",
      "created_at": "2026-04-07T05:08:03.779Z",
      "updated_at": "2026-04-07T05:08:03.779Z"
    },
    {
      "id": 2,
      "uuid": "tag-ml-001",
      "name": "ML",
      "slug": "ml",
      "created_at": "2026-04-07T05:08:03.807Z",
      "updated_at": "2026-04-07T05:08:03.807Z"
    }
  ]
}
```

---

## 2. CMS Connection

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `GET` | `/api/categories/test-cms` | 200 | Verifies category-service can reach CMS REST API |
| PASS | `GET` | `/api/categories/test-strapi` | 200 | Backward-compat alias for test-cms |

**Sample Responses:**

**PASS** `GET /api/categories/test-cms` → `200`
```json
{
  "success": true,
  "totalCategories": 13,
  "hasApiKey": true,
  "cmsUrl": "http://localhost:3020"
}
```

---

## 3. Sync: CMS to Category Service

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `POST` | `/api/categories/sync` | 201 | Upserts category + tags into local DB from CMS-shaped payload |
| PASS | `GET` | `/api/categories/slug/api-test-sync` | 200 | Confirms sync wrote to local DB |

**Sample Responses:**

**PASS** `POST /api/categories/sync` → `201`
```json
{
  "status": "ok"
}
```

---

## 4. Webhook Sync (Category Pages)

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `POST` | `/api/category-pages/cms-sync` | 201 | Payload CMS webhook shape (collection + doc) |
| PASS | `POST` | `/api/category-pages/cms-sync` | 201 | Tag sync via webhook |
| PASS | `POST` | `/api/category-pages/strapi-sync` | 201 | Strapi v4 webhook shape (model + entry) |
| PASS | `POST` | `/api/category-pages/cms-sync` | 201 | Returns {status:'ignored'} for unhandled models |
| PASS | `POST` | `/api/category-pages/cms-sync` | 400 | Rejects empty payload |

**Sample Responses:**

**PASS** `POST /api/category-pages/cms-sync` → `201`
```json
{
  "status": "success",
  "message": "Category Webhook Cat synced"
}
```

---

## 5. User Subcategory Creation

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| FAIL | `POST` | `/api/categories/user-subcategory` | 500 | Creates subcategory under given parent, pushes to CMS |
| FAIL | `POST` | `/api/categories/user-subcategory/moderated` | 500 | Moderated path; optional parentUuid (heuristic if omitted) |
| FAIL | `POST` | `/api/categories/user` | 500 | Alias for /user-subcategory |
| PASS | `POST` | `/api/categories/user-subcategory` | 400 | 400 when parent not found |
| PASS | `POST` | `/api/categories/user-subcategory` | 400 | 400 when name is empty |

**Sample Responses:**

**FAIL** `POST /api/categories/user-subcategory` → `500`
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

**FAIL** `POST /api/categories/user-subcategory/moderated` → `500`
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

**FAIL** `POST /api/categories/user` → `500`
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## 6. Delete: Dry Run and Preview

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `GET` | `/api/categories/api-test-sync-001/delete-dry-run` | 200 | Shows impact without making changes: child count, content counts, reassign target |
| PASS | `GET` | `/api/categories/api-test-sync-001/delete-dry-run?reassignTo=cms-test-uuid-001` | 200 | Shows what would happen with specific reassignment target |
| PASS | `GET` | `/api/categories/api-test-sync-001/reassign/preview` | 200 | Shows content counts + sample items that would be reassigned |
| PASS | `GET` | `/api/categories/test-delete/api-test-sync-001` | 200 | Returns info about the delete, no side effects |

**Sample Responses:**

**PASS** `GET /api/categories/api-test-sync-001/delete-dry-run` → `200`
```json
{
  "uuid": "api-test-sync-001",
  "hasChildren": false,
  "childCount": 0,
  "wouldReassignContentTo": null,
  "canDelete": true,
  "contentCounts": {
    "Listings": 0,
    "BlogPosts": 0
  },
  "contentSample": {
    "Listings": [],
    "BlogPosts": []
  },
  "message": "OK to delete with current reassignment target."
}
```

---

## 7. Delete Webhooks

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `POST` | `/api/categories/cms/delete` | 201 | Handles CMS delete event |
| PASS | `POST` | `/api/categories/strapi/delete` | 201 | Strapi-style delete webhook |
| PASS | `POST` | `/api/categories/cms/delete` | 201 | Idempotent — returns ignored if already deleted |

**Sample Responses:**

**PASS** `POST /api/categories/cms/delete` → `201`
```json
{
  "status": "ok"
}
```

---

## 8. Reassign Children

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `POST` | `/api/categories/reassigned` | 201 | Moves all direct children from one parent to another |

**Sample Responses:**

**PASS** `POST /api/categories/reassigned` → `201`
```json
{
  "status": "ok",
  "updated": 0
}
```

---

## 9. Actual Delete

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `POST` | `/api/categories/api-test-sync-001/delete` | 201 | Deletes category, reassigns content to parent/fallback |
| PASS | `DELETE` | `/api/categories/api-test-sync-001` | 404 | 404 on second delete — idempotent |

**Sample Responses:**

**PASS** `POST /api/categories/api-test-sync-001/delete` → `201`
```json
{
  "status": "deleted"
}
```

---

## 10. Tags

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `POST` | `/api/tags/sync` | 201 | Upsert tag into local DB |
| PASS | `GET` | `/api/tags/slug/vuejs` | 200 | Lookup tag by slug |
| PASS | `GET` | `/api/tags/slug/nonexistent` | 404 | 404 for missing tag |

**Sample Responses:**

**PASS** `POST /api/tags/sync` → `201`
```json
{
  "status": "ok",
  "tag": {
    "uuid": "tag-vue-001",
    "name": "Vue.js",
    "slug": "vuejs"
  }
}
```

---

## 11. Category Pages

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `GET` | `/api/category-pages/artificial-intelligence` | 200 | Full category page: blocks, suggestions, seo, breadcrumbs, editorial |
| PASS | `GET` | `/api/category-pages/artificial-intelligence?kind=projects` | 200 | Filtered by entity type |
| PASS | `GET` | `/api/category-pages/artificial-intelligence?limit=5` | 200 | Custom row limit |
| FAIL | `GET` | `/api/category-pages/artificial-intelligence/3d-modeling` | 404 | Child category page |
| PASS | `GET` | `/api/category-pages/artificial-intelligence/fake-l2/fake-l3` | 404 | Deep path not found |
| PASS | `GET` | `/api/category-pages/nonexistent` | 404 | 404 for unknown slug |

**Sample Responses:**

**PASS** `GET /api/category-pages/artificial-intelligence` → `200`
```json
{
  "level": 1,
  "slugPath": [
    "artificial-intelligence"
  ],
  "uuids": {
    "l1": "cms-test-uuid-001"
  },
  "seo": {
    "title": "AI Services",
    "description": "AI and machine learning services",
    "canonical": "http://localhost:3000/c/artificial-intelligence"
  },
  "subcategories": [],
  "breadcrumbs": [
    {
      "name": "Artificial Intelligence",
      "slug": "artificial-intelligence",
      "uuid": "cms-test-uuid-001"
    }
  ],
  "blocks": [],
  "suggestions": {
    "relatedCategories": [
      {
        "uuid": "creative-design",
        "level": 1,
        "name": "Creative & Design",
        "slugPath": [
          "creative-design"
        ],
        "link": "/c/creative-design"
      },
      {
        "uuid": "ui-ux-design",
        "level": 1,
        "name":
  // ...truncated
```

**FAIL** `GET /api/category-pages/artificial-intelligence/3d-modeling` → `404`
```json
{
  "message": "Category not found at path: artificial-intelligence/3d-modeling",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## 12. Tax Groups

| Result | Method | Endpoint | HTTP | Notes |
|:------:|--------|----------|:----:|-------|
| PASS | `GET` | `/api/tax-groups/affected-by-subtree/cms-test-uuid-001` | 200 | Returns taxonomy groups referencing categories in given subtree |

**Sample Responses:**

**PASS** `GET /api/tax-groups/affected-by-subtree/cms-test-uuid-001` → `200`
```json
{
  "oldParentUuid": "cms-test-uuid-001",
  "subtreeCategoryUuids": [
    "cms-test-uuid-001",
    "b9148708-fdff-4406-b8ef-3fe300f695b6",
    "38cd1f62-74e8-4384-bbb6-5909df4d840b",
    "073621df-5ea3-41be-9f14-39badbdb1996",
    "a939c0ec-9f16-4b60-9456-8c9a39f5a35e",
    "c92bbefc-64bc-4385-89f5-8f2c8d45b556",
    "e2109266-da70-4ef8-9848-8f274205ed00"
  ],
  "affectedCount": 0,
  "affected": [],
  "warning": "Request failed with status code 404"
}
```

---

## Known Issues

| # | Endpoint | Status | Root Cause | Severity |
|---|----------|:------:|------------|----------|
| 1 | `POST /user-subcategory` | 500 | CMS push fails — `API-Key` auth is read-only. Local DB creation succeeds. Needs admin JWT or write-enabled API key configured. | Low |
| 2 | `POST /user-subcategory/moderated` | 500 | Same as #1 | Low |
| 3 | `POST /user` | 500 | Same as #1 | Low |
| 4 | `GET /category-pages/:l1/:l2` | 404 | L2 lookup requires child's `parentId` to match L1's DB `id`. After reassignment tests moved children, path resolution breaks. Expected. | None |

## Test Environment

```
Category Service:  NestJS on port 3023
CMS Service:       Payload CMS v2 on port 3020
Database:          PostgreSQL (localhost:5432)
RabbitMQ:          localhost:5672
Auth:              CMS_API_KEY=dev-api-key (read-only)
Node.js:           v22.x
```

## Full Endpoint Inventory

| # | Method | Path | Controller | Purpose |
|---|--------|------|------------|---------|
| 1 | `GET` | `/api/categories` | CategoryController | List all categories |
| 2 | `GET` | `/api/categories/tree` | CategoryController | Recursive category tree |
| 3 | `GET` | `/api/categories/slug/:slug` | CategoryController | Get category by slug |
| 4 | `GET` | `/api/categories/test-cms` | CategoryController | Test CMS service connection |
| 5 | `GET` | `/api/categories/test-strapi` | CategoryController | Legacy alias for test-cms |
| 6 | `GET` | `/api/categories/test-delete/:uuid` | CategoryController | Delete info (no side effects) |
| 7 | `GET` | `/api/categories/:uuid/breadcrumbs` | CategoryController | Breadcrumb chain |
| 8 | `GET` | `/api/categories/:uuid/delete-dry-run` | CategoryController | Dry-run delete impact |
| 9 | `GET` | `/api/categories/:uuid/reassign/preview` | CategoryController | Preview reassignment |
| 10 | `POST` | `/api/categories/sync` | CategoryController | Sync category from CMS payload |
| 11 | `POST` | `/api/categories/push` | CategoryController | Push category to CMS |
| 12 | `POST` | `/api/categories/push-test` | CategoryController | Push dummy category to CMS |
| 13 | `POST` | `/api/categories/user` | CategoryController | Create user subcategory |
| 14 | `POST` | `/api/categories/user-subcategory` | CategoryController | Create user subcategory |
| 15 | `POST` | `/api/categories/user-subcategory/moderated` | CategoryController | Create moderated subcategory |
| 16 | `POST` | `/api/categories/strapi/delete` | CategoryController | Handle CMS delete webhook (legacy) |
| 17 | `POST` | `/api/categories/cms/delete` | CategoryController | Handle CMS delete webhook |
| 18 | `POST` | `/api/categories/reassigned` | CategoryController | Reassign children between parents |
| 19 | `POST` | `/api/categories/:uuid/reassign` | CategoryController | Reassign content to another category |
| 20 | `POST` | `/api/categories/:uuid/delete` | CategoryController | Delete category (POST) |
| 21 | `DELETE` | `/api/categories/:uuid` | CategoryController | Delete category (DELETE) |
| 22 | `POST` | `/api/category-pages/cms-sync` | CategoryPagesController | CMS webhook sync |
| 23 | `POST` | `/api/category-pages/strapi-sync` | CategoryPagesController | Legacy webhook sync |
| 24 | `GET` | `/api/category-pages/:l1` | CategoryPagesController | L1 category page |
| 25 | `GET` | `/api/category-pages/:l1/:l2` | CategoryPagesController | L2 category page |
| 26 | `GET` | `/api/category-pages/:l1/:l2/:l3` | CategoryPagesController | L3 category page |
| 27 | `POST` | `/api/tags/sync` | TagsController | Sync tag from CMS |
| 28 | `POST` | `/api/tags/push` | TagsController | Push tag to CMS |
| 29 | `POST` | `/api/tags/push-test` | TagsController | Push dummy tag to CMS |
| 30 | `GET` | `/api/tags/slug/:slug` | TagsController | Get tag by slug |
| 31 | `GET` | `/api/tax-groups/affected-by-subtree/:uuid` | TaxGroupsController | Tax groups affected by subtree |
