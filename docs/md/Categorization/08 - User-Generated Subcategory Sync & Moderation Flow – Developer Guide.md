# **08 - User-Generated Subcategory Sync & Moderation Flow -- Developer Guide**

## **1. Purpose**

This document provides the **complete implementation** for handling
user-generated subcategories in the marketplace. It covers:

- Fuzzy moderation filters.

- NestJS database save logic.

- Push-to-Strapi sync with payload.

- Step-by-step setup with all required code.

## **2. Flow Overview**

1.  **User Input:** A new subcategory is added during
    project/service/job publishing.

2.  **Moderation Filters:** Entry is validated with fuzzy matching,
    spellcheck, and content filters.

3.  **Save to NestJS:** If approved, it's stored in the NestJS Postgres
    DB.

4.  **Push to Strapi:** The category is synced to Strapi for admin
    visibility.

5.  **Autocomplete Exposure:** Once saved, it's immediately available in
    the Autocomplete Microservice.

## **3. Moderation Filters**

### **a. Filter Chain Logic**

- ✅ Profanity & slur check

- ✅ Drugs, gambling, pornography, tobacco filter

- ✅ Spellcheck & fuzzy correction

- ✅ Category relevance check (must map to existing parent)

### **b. Filter Utility**

/apps/marketeq-nestjs/src/categories/category.filters.ts

import { checkProfanity, checkDrugs, checkTobacco, fuzzySpellcheck,
mapToParentCategory } from \'@/utils/filters\';

export async function validateSubcategory(name: string) {

if (checkProfanity(name)) return { valid: false, reason: \'Profanity\'
};

if (checkDrugs(name)) return { valid: false, reason: \'Drugs\' };

if (checkTobacco(name)) return { valid: false, reason: \'Tobacco\' };

const correctedName = fuzzySpellcheck(name);

const parentCategory = await mapToParentCategory(correctedName);

if (!parentCategory) return { valid: false, reason: \'No relevant
parent\' };

return { valid: true, name: correctedName, parent: parentCategory };

}



## **4. NestJS Service Logic**

/apps/marketeq-nestjs/src/categories/category.service.ts

async createUserSubcategory(name: string) {

const { valid, name: cleanName, parent } = await
validateSubcategory(name);

if (!valid) return null;

const category = this.categoryRepo.create({

uuid: uuidv4(),

name: cleanName,

slug: await this.generateUniqueSlug(cleanName),

parent_id: parent.uuid,

approved: true,

published_in_marketplace: false

});

const saved = await this.categoryRepo.save(category);

await this.pushToStrapi(saved); // Sync to Strapi for admin review

return saved;

}



## **5. Push to Strapi Sync**

/apps/marketeq-nestjs/src/categories/category.service.ts

import axios from \'axios\';

async pushToStrapi(category) {

const payload = {

uuid: category.uuid,

name: category.name,

slug: category.slug,

parent: category.parent_id,

approved: category.approved,

published_in_marketplace: category.published_in_marketplace

};

await axios.post(\`\${process.env.STRAPI_URL}/categories/sync\`,
payload, {

headers: { Authorization: \`Bearer \${process.env.STRAPI_TOKEN}\` }

});

}



## **6. Autocomplete Integration**

- The moment the category is saved in NestJS, it's available in the
  Autocomplete Microservice.

- Endpoint:

GET /autocomplete/categories?q=term

- No extra work needed; it queries the same DB table.

## **7. Step-by-Step Setup**

1.  **Create Filters:\**

    - Add category.filters.ts with all validation utilities.

2.  **Update Category Service:\**

    - Add createUserSubcategory() method.

    - Add pushToStrapi() method.

3.  **Configure Environment Variables:\**

    - STRAPI_URL

    - STRAPI_TOKEN

4.  **Integrate Into Publishing Flows:\**

    - Call createUserSubcategory(name) when a user adds a new category
      in project/service/job publishing.

5.  **Test:\**

    - Submit a new subcategory.

    - Confirm it passes filters.

    - Verify it appears in NestJS DB, Strapi CMS, and autocomplete.

## **8. Testing Checklist**

- ✅ Profanity and drug-related terms are rejected.

- ✅ Valid subcategories pass filters and are corrected with fuzzy
  spellcheck.

- ✅ Approved categories save to NestJS DB with correct parent.

- ✅ Categories sync to Strapi immediately.

- ✅ Suggestions appear in autocomplete in real-time.

## **9. Notes**

- No duplicate logic: Strapi handles admin-created categories; NestJS
  handles user-generated ones.

- All UUIDs are universal for cross-system sync.

- Categories are marked published_in_marketplace = false until the admin
  publishes the new category.
