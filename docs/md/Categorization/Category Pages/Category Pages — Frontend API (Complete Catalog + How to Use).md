# **Category Pages --- Frontend API (Complete Catalog + How to Use)**

**Base:** use **relative** paths (same origin).\
**Levels:** {l1}, {l1}/{l2}, {l1}/{l2}/{l3} → L1/L2/L3.

## **A) Page payload (the one call that powers each page)**

### **A.1 Get Category Page (L1/L2/L3)**

**GET**
/api/category-pages/{l1}\[/{l2}\[/{l3}\]\]?kind={show-all\|projects\|services\|teams\|talent}\[&cursor={TOKEN}\]\[&preview=1\]\
**Purpose:** Returns everything needed to render the page.\
**Returns:** level, slugPath, uuids, breadcrumbs, seo, hero,
subcategories, blocks\[\], suggestions{...}\
**How to use it:**

- Call once per page view with the right kind.

- Render hero, subcategory grid, blocks, suggestions, SEO, breadcrumbs
  from this single payload.

- If a block exposes pagination.nextCursor, call **A.1** again with
  cursor={TOKEN} to load more for that block.\
  **404:** Category not found or unpublished.

**Examples (copy/paste):**

- /api/category-pages/software-development?kind=show-all

- /api/category-pages/software-development?kind=projects

- /api/category-pages/software-development/blockchain?kind=services

- /api/category-pages/software-development/blockchain/smart-contracts?kind=teams

- Pagination:
  /api/category-pages/software-development?kind=projects&cursor=eyJvIjo\...

## **B) Suggestions (optional lazy-loads)**

> Already included inside **A.1** under payload.suggestions. Use these
> only if you prefer to fetch suggestions separately.

### **B.1 Get all suggestions**

**GET** /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/suggestions\
**Purpose:** Fetch all suggestion modules for the current category.\
**Returns:**

- relatedCategories\[\] (category links with slugPath)

- trendingCategories\[\]

- popularCategories\[\]

- relatedSkills\[\] (chips linking to /skills/{slug})

- *(If enabled)* relatedSearches\[\] \| trendingSearches\[\] \|
  popularSearches\[\] (label + link)\
  **How to use it:** Render the "More ways to explore" area and chips.

### **B.2 Related categories only**

**GET**
/api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/suggestions/related-categories\
**Purpose:** Just the related categories list.\
**Returns:** \[{ uuid, level, name, slugPath\[\], link }\]\
**How to use it:** Show the related-categories module without fetching
other suggestions.

### **B.3 Related skills ("related searches") only**

**GET**
/api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/suggestions/related-skills\
**Purpose:** Search-chip style skills.\
**Returns:** \[{ name, slug, link }\]\
**How to use it:** Render the chips that deep-link to /skills/{slug}.

## **C) Blocks & Pagination (optional focused fetches)**

> Blocks are already in **A.1**. Use these only if you want a single
> block without the whole page.

### **C.1 Get a single block**

**GET**
/api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/blocks?entity={projects\|services\|teams\|talent\|guides\|courses\|collections}\[&cursor={TOKEN}\]\
**Purpose:** Fetch one block (e.g., just Projects).\
**Returns:** { key, type(\'grid\'\|\'carousel\'), entity, items\[\],
pagination? }\
**How to use it:** Load/refresh one block independently; use cursor for
its pagination.

### **C.2 Load next page for the current block**

**GET** same as **A.1** with &cursor={TOKEN}\
**Purpose:** Continue pagination for the primary block.\
**How to use it:** Reuse your current page URL + cursor and merge the
new items.

## **D) Structure & Chrome (optional lazy-loads)**

> All of these fields are included in **A.1**. Use only if you want
> separate requests.

### **D.1 Subcategories**

**GET** /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/subcategories\
**Purpose:** Get children categories of the current node.\
**Returns:** \[{ name, slug, uuid }\]\
**How to use it:** Render the subcategory grid.

### **D.2 Breadcrumbs**

**GET** /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/breadcrumbs\
**Purpose:** Path trail root→current.\
**Returns:** \[{ name, slug, uuid }\]\
**How to use it:** Render breadcrumb links.

### **D.3 Hero / Editorial**

**GET** /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/hero\
**Purpose:** Optional hero/editorial card from Strapi.\
**Returns:** { title, image?, link? } \| null\
**How to use it:** Show the hero section if present.

### **D.4 SEO (Hybrid SEO)**

**GET** /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/seo\
**Purpose:** Page SEO fields.\
**Returns:** { title, description, canonical }\
**How to use it:** Set \<title\>, meta description, canonical URL.

## **E) Editorial & Knowledge (Strapi-sourced)**

> **Authored in Strapi**; the API simply returns them. Not stored in the
> NestJS DB.

### **E.1 Guides (articles)**

**GET** /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/editorial/guides\
**Purpose:** Category-relevant guides/articles.\
**Returns:** \[{ title, slug, summary, image?, link }\]\
**How to use it:** Render the Guides section.

### **E.2 Courses**

**GET** /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/editorial/courses\
**Purpose:** Category-relevant courses.\
**Returns:** \[{ title, slug, summary, image?, link }\]\
**How to use it:** Render the Courses section.

### **E.3 FAQ**

**GET** /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/faq\
**Purpose:** Category-specific FAQs.\
**Returns:** \[{ question, answerHtml }\]\
**How to use it:** Render the FAQ accordion.

## **F) Collections (curated)**

> Matches the "Featured Project Collections" section in designs.

### **F.1 Collections list**

**GET** /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]/collections\
**Purpose:** Curated collections relevant to the category.\
**Returns:** \[{ title, slugPath\[\], link, image?, count? }\]\
**How to use it:** Render the collections tiles/cards.

## **G) Marketing (newsletter)**

### **G.1 Subscribe**

**POST** /api/marketing/newsletter-subscribe\
**Purpose:** Newsletter signup form submit.\
**Body:** { email: string }\
**Returns:** 204 No Content on success\
**How to use it:** Call on submit; treat 204 as success, show thank-you
UI.

## **Status codes**

- 200 OK --- success

- 404 Not Found --- category unpublished or missing

- 5xx --- unexpected error
