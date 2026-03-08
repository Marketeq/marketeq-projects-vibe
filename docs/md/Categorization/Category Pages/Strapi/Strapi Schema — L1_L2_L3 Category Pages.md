# **Strapi Schema --- L1/L2/L3 Category Pages**

**Goal:** Define exactly what lives in Strapi for Category Pages so L1
(top level), L2 (subcategory of L1), and L3 (subcategory of L2) render
correctly.

Strapi is used for **admin authoring & overrides**. Core ranking/listing
logic lives downstream. We **do not** store heavy runtime data in Strapi
(e.g., listings, profiles). FAQs, Guides, Courses, Hero/Editorial are
authored here and exposed to the Category Pages API.

## **0) Content Types & Components (at a glance)**

- **Content-Type:** category

- **Component:** seo.seo_override

- **Component:** editorial.hero

- **Collection-Type (optional editorial):** guide (aka article)

- **Collection-Type (optional editorial):** course

- **Collection-Type (rules engine):** taxonomy_group (with nested rule
  component)

> Folder roots follow Strapi v4 layout:
> ./src/api/\<ct\>/content-types/\<ct\>/schema.json and
> ./src/components/\<category\>/\<component\>.json.

## **1) Category (collection type)**

**Folder path\**
/src/api/category/content-types/category/schema.json

**Purpose\**
Represents a single category page node. L1 has no parent. L2 parent = an
L1. L3 parent = an L2.

**Fields**

- name (text, required) --- Display name, e.g., "Software Development"

- slug (UID from name, required, unique **per parent**) --- e.g.,
  software-development, blockchain, smart-contracts

- level (integer, required, enum: 1 \| 2 \| 3) --- L1/L2/L3

- uuid (UID/text, required, unique) --- Stable UUID used by backend
  assemblers

- parent (relation: category → category, many-to-one) --- null for L1

- children (relation: category → category, one-to-many, mapped) ---
  managed by Strapi

- published_in_marketplace (boolean, default false) --- Only
  **published** appear on site

- seo_override (component: seo.seo_override) --- Optional SEO overrides

- hero (component: editorial.hero, repeatable: **false**) --- Optional
  hero/editorial card

- tags (string, repeatable) --- Optional admin tags

**Validation/Constraints**

- **Unique path:** Enforce (parent, slug) uniqueness via custom
  validation/lifecycle.

- **No cycles:** Parent cannot be self or any descendant.

- **Level rule:\**

  - L1: parent=null, level=1

  - L2: parent.level=1, level=2

  - L3: parent.level=2, level=3

- **Slug path (computed, not stored):** Backends can compute from tree:
  l1/l2/l3.

**Example schema.json (trimmed)**

****{

\"kind\": \"collectionType\",

\"collectionName\": \"categories\",

\"info\": { \"singularName\": \"category\", \"pluralName\":
\"categories\", \"displayName\": \"Category\" },

\"options\": { \"draftAndPublish\": true },

\"attributes\": {

\"name\": { \"type\": \"string\", \"required\": true },

\"slug\": { \"type\": \"uid\", \"targetField\": \"name\", \"required\":
true },

\"level\": { \"type\": \"integer\", \"required\": true, \"enum\":
\[1,2,3\] },

\"uuid\": { \"type\": \"uid\", \"required\": true },

\"parent\": { \"type\": \"relation\", \"relation\": \"manyToOne\",
\"target\": \"api::category.category\", \"inversedBy\": \"children\" },

\"children\": { \"type\": \"relation\", \"relation\": \"oneToMany\",
\"target\": \"api::category.category\", \"mappedBy\": \"parent\" },

\"published_in_marketplace\": { \"type\": \"boolean\", \"default\":
false },

\"seo_override\": { \"type\": \"component\", \"repeatable\": false,
\"component\": \"seo.seo-override\" },

\"hero\": { \"type\": \"component\", \"repeatable\": false,
\"component\": \"editorial.hero\" },

\"tags\": { \"type\": \"text\" }

}

}

**Lifecycle (example) --- enforce rules\**
/src/api/category/content-types/category/lifecycles.ts

import { errors } from \'@strapi/utils\'

const BadRequestError = errors.ApplicationError

export default {

async beforeCreate(event) { await validateCategory(event.params.data,
strapi) },

async beforeUpdate(event) { await validateCategory(event.params.data,
strapi, event.params.where?.id) }

}

async function validateCategory(data:any, strapi:any,
currentId?:string){

const { parent, level, slug } = data

// Rule: level matches parent

if (parent && level === 1) throw new BadRequestError(\'L1 cannot have a
parent\')

if (!parent && level !== 1) throw new BadRequestError(\'Only L1 can have
no parent\')

if (parent) {

const p = await strapi.entityService.findOne(\'api::category.category\',
parent.connect?.id \|\| parent, { fields: \[\'id\',\'level\'\] })

if (!p) throw new BadRequestError(\'Parent not found\')

if (p.level !== level - 1) throw new BadRequestError(\'Level must be
parent.level + 1\')

}

// Unique (parent, slug)

const existing = await
strapi.db.query(\'api::category.category\').findOne({

where: { slug, \...(parent ? { parent: parent.connect?.id \|\| parent }
: { parent: null }), \...(currentId ? { id: { \$ne: currentId } } : {})
}

})

if (existing) throw new BadRequestError(\'Slug already exists under this
parent\')

}



## **2) SEO Override (component)**

**Folder path\**
/src/components/seo/seo-override.json

**Purpose\**
Allow editors to override default meta (hybrid SEO).

**Fields**

- meta_title (string)

- meta_description (text)

- canonical_url (string)

**Schema**

****{

\"collectionName\": \"components_seo_seo_overrides\",

\"info\": { \"displayName\": \"SEO Override\" },

\"attributes\": {

\"meta_title\": { \"type\": \"string\" },

\"meta_description\": { \"type\": \"text\" },

\"canonical_url\": { \"type\": \"string\" }

}

}



## **3) Hero (component)**

**Folder path\**
/src/components/editorial/hero.json

**Purpose\**
Optional hero/editorial block for certain categories.

**Fields**

- title (string, required)

- image (media, single)

- link (string)

**Schema**

****{

\"collectionName\": \"components_editorial_heroes\",

\"info\": { \"displayName\": \"Hero\" },

\"attributes\": {

\"title\": { \"type\": \"string\", \"required\": true },

\"image\": { \"type\": \"media\", \"multiple\": false },

\"link\": { \"type\": \"string\" }

}

}



## **4) Guides & Courses (optional editorial types)**

**Folder paths\**
/src/api/guide/content-types/guide/schema.json\
/src/api/course/content-types/course/schema.json

**Purpose\**
Lightweight editorial collections to feature on category pages.

**Guide fields**

- title (string, required)

- slug (uid from title, required)

- summary (text)

- image (media)

- link (string) --- target URL

- categories (many-to-many → category) --- to scope to L1/L2/L3

**Course fields** (mirror Guide)

## **5) Taxonomy Groups (rules engine)**

**Folder path\**
/src/api/taxonomy-group/content-types/taxonomy-group/schema.json

**Purpose\**
Editors configure which **blocks** appear on each page and their caps
(Top‑Rated, Trending, New, etc.). Category Pages API consumes this.

**Fields**

- name (string, required)

- path_scope (enumeration: l1 \| l2 \| l3 \| subtree) --- optional

- categories (many-to-many → category) --- scope targets

- rules (component: rules.rule, **repeatable**) --- ordered list of
  blocks

**Rule component\**
/src/components/rules/rule.json

- entity (enum:
  projects\|services\|teams\|talent\|guides\|courses\|collections)

- kind (enum: top_rated\|trending\|new\|curated)

- limit (integer)

- gridSize (integer)

- carousel (boolean)

- pageKind (enum: show-all\|projects\|services\|teams\|talent\|any)

## **6) Permissions & Roles**

- Only **Admin** roles access Strapi. No public access needed.

- Expose read endpoints to backend (server-to-server) only.

## **7) Notes**

- FAQs/Guides/Courses/Hero are **authored in Strapi**, returned by
  backend to the front-end; they are **not** stored in the NestJS DB.

- Keep categories lean: tree, SEO override, hero, marketplace publish
  flag.
