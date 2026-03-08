# **07 - Auto-Complete ↔ Category Sync -- Developer Guide**

## **1. Purpose**

This document defines how marketplace categories and subcategories are
integrated with the **Autocomplete Microservice** and synchronized with
Strapi. It ensures:

- Categories are exposed to autocomplete endpoints.

- User-generated subcategories follow the same moderation filters.

- Changes in Strapi propagate to autocomplete suggestions in real-time.

## **2. Data Flow Overview**

### **Sources:**

- **Strapi:** Admin-created categories and subcategories.

- **NestJS:** User-generated and AI-generated subcategories (via
  publishing flows).

### **Consumers:**

- Autocomplete Microservice → Provides suggestions for:

  - Projects

  - Services

  - Teams

  - Talent

  - Jobs

## **3. Exposing Categories via Autocomplete**

### **a. Endpoint**

****GET /autocomplete/categories?q=term

### **b. Response Example**

****\[

{ \"value\": \"Artificial Intelligence\", \"uuid\": \"ai-123\",
\"type\": \"category\" },

{ \"value\": \"Machine Learning\", \"uuid\": \"ml-456\", \"type\":
\"subcategory\" }

\]

### **c. Microservice Handler**

/apps/autocomplete-service/src/categories.controller.ts

@Get(\'categories\')

async getCategorySuggestions(@Query(\'q\') query: string) {

return this.autocompleteService.getCategoryMatches(query);

}



## **4. Sync Logic**

### **a. Real-Time**

- Strapi lifecycle/webhooks trigger updates to NestJS.

- NestJS writes categories into the categories table.

- Autocomplete microservice queries the same table → always up-to-date.

### **b. Cron Fallback**

- Every 10 min, NestJS compares Strapi updated_at timestamps to resync
  any missed categories.

- Autocomplete service automatically reflects updated DB entries.

## **5. User-Generated Subcategories**

### **Flow:**

1.  User adds a new category in a project/service/job publishing flow.

2.  Category passes through fuzzy autocomplete moderation filters:

    - Profanity, drugs, gambling, pornography checks.

    - Category relevance check (must map to an existing parent).

3.  If approved:

    - Saved to NestJS DB with approved = true and
      published_in_marketplace = false.

    - Immediately exposed to autocomplete suggestions.

    - Sent to Strapi for admin review via API.

4.  If rejected:

    - Marked approved = false.

    - Not exposed to autocomplete or marketplace.

### **Code Snippet:**

****if (passesFilters && parentCategory) {

const category = this.categoryRepo.create({

name,

parent_id: parentCategory.uuid,

approved: true,

published_in_marketplace: false

});

await this.categoryRepo.save(category);

await this.pushToStrapi(category);

}



## **6. Keeping Autocomplete in Sync**

- Autocomplete microservice **reads directly from the NestJS category
  table**.

- When Strapi updates categories:

  - Lifecycle/webhook triggers NestJS update.

  - Autocomplete suggestions update instantly.

- When user-generated categories are added:

  - NestJS writes to DB → immediately available to autocomplete.

## **7. Moderation Filters**

All category and subcategory suggestions must pass:

- ✅ Profanity/slur filter.

- ✅ Drugs, gambling, pornography, tobacco filters.

- ✅ Fuzzy spellcheck.

- ✅ Category relevance check:

  - Must map to an existing parent category.

  - AI-assisted mapping using embeddings.

## **8. Testing Checklist**

- ✅ Admin-created categories show up in autocomplete suggestions.

- ✅ User-generated subcategories pass filters and appear immediately.

- ✅ Rejected categories never appear in autocomplete.

- ✅ Updates in Strapi propagate to suggestions in real-time.

- ✅ Cron job catches missed updates within 10 minutes.
