# **Strapi Schema --- L1/L2/L3 Category Pages (Step‑by‑Step)**

**Audience:** Strapi admins & backend devs.\
**Goal:** Create the exact schema (content‑types + components +
validation) so L1 (top), L2 (child of L1), L3 (child of L2) category
pages render correctly and stay consistent.

**Important:** Strapi is for **admin editing** (titles, SEO overrides,
hero, FAQ, guides/courses, taxonomy rules). Do **not** store heavy
runtime data here (listings, profiles). Those are read from other
services at runtime.

## **0) Prereqs**

*Why:* Make sure Strapi runs locally and your database/env are set so
the builder and schema files load correctly before you start creating
types.

- Strapi v4 project checked out and running (see \"Strapi Quick Setup
  --- Dependencies & Bootstrap\").

- PostgreSQL configured in .env (or your DB of choice).

- You are logged into the Admin UI at http://localhost:1337/admin with
  an **Admin** user.

## **1) What you will create (overview)**

*Why:* This is a quick map of every content type and component we'll add
so you know what pieces exist and how they fit together.

- **Content‑type:** category (collection type) --- the L1/L2/L3 tree

- **Component:** seo.seo-override --- optional SEO overrides per
  category

- **Component:** editorial.hero --- optional hero card per category

- **Collection types (optional editorial):** guide, course ---
  articles/learning items to show on category pages

- **Collection type (rules engine):** taxonomy-group + **component**
  rules.rule --- defines which blocks show on each page

> Folder layout follows Strapi v4:\
> ./src/api/\<ct\>/content-types/\<ct\>/schema.json\
> ./src/components/\<category\>/\<component\>.json

## **2) Create components (UI or file‑based)**

*Why:* Components are reusable chunks (SEO, Hero, Rule) that categories
reference; defining them first keeps the category type clean and
consistent.\
You can do this **in Admin UI** or by **adding JSON files**. Pick one.

### **2.1 SEO Override component (seo.seo-override)**

**Admin UI path:** *Content‑Type Builder → Create new component*

- **Category:** seo

- **Display Name:** SEO Override

- **Fields:\**

  - meta_title (Text → Short text)

  - meta_description (Text → Long text)

  - canonical_url (Text → Short text)

**File path:** /src/components/seo/seo-override.json

{

\"collectionName\": \"components_seo_seo_overrides\",

\"info\": { \"displayName\": \"SEO Override\" },

\"attributes\": {

\"meta_title\": { \"type\": \"string\" },

\"meta_description\": { \"type\": \"text\" },

\"canonical_url\": { \"type\": \"string\" }

}

}

### **2.2 Hero component (editorial.hero)**

**Admin UI path:** *Content‑Type Builder → Create new component*

- **Category:** editorial

- **Display Name:** Hero

- **Fields:\**

  - title (Short text, **required**)

  - image (Media → Single)

  - link (Short text)

**File path:** /src/components/editorial/hero.json

{

\"collectionName\": \"components_editorial_heroes\",

\"info\": { \"displayName\": \"Hero\" },

\"attributes\": {

\"title\": { \"type\": \"string\", \"required\": true },

\"image\": { \"type\": \"media\", \"multiple\": false },

\"link\": { \"type\": \"string\" }

}

}

### **2.3 Rule component for Taxonomy Groups (rules.rule)**

**Admin UI path:** *Content‑Type Builder → Create new component*

- **Category:** rules

- **Display Name:** Rule

- **Fields:\**

  - entity (Enumeration:
    projects,services,teams,talent,guides,courses,collections)

  - kind (Enumeration: top_rated,trending,new,curated)

  - limit (Number → Integer)

  - gridSize (Number → Integer)

  - carousel (Boolean)

  - pageKind (Enumeration: show-all,projects,services,teams,talent,any)

**File path:** /src/components/rules/rule.json

{

\"collectionName\": \"components_rules_rules\",

\"info\": { \"displayName\": \"Rule\" },

\"attributes\": {

\"entity\": { \"type\": \"enumeration\", \"enum\":
\[\"projects\",\"services\",\"teams\",\"talent\",\"guides\",\"courses\",\"collections\"\]
},

\"kind\": { \"type\": \"enumeration\", \"enum\":
\[\"top_rated\",\"trending\",\"new\",\"curated\"\] },

\"limit\": { \"type\": \"integer\" },

\"gridSize\": { \"type\": \"integer\" },

\"carousel\": { \"type\": \"boolean\" },

\"pageKind\": { \"type\": \"enumeration\", \"enum\":
\[\"show-all\",\"projects\",\"services\",\"teams\",\"talent\",\"any\"\]
}

}

}



## **3) Create collection types**

*Why:* These are the main data structures (Category tree,
Guides/Courses, Taxonomy Groups) the site reads to assemble each page.\
You can do this **in Admin UI** or via files.

### **3.1 Category (collection type)**

**Admin UI path:** *Content‑Type Builder → Create new collection type* →
Category\
Add fields in this exact order:

1.  name (Short text, **required**)

2.  slug (UID from name, **required**)

3.  level (Number → Integer, **required**, allowed values: 1,2,3)

4.  uuid (UID → Autogenerate or paste your UUIDs, **required**,
    **unique**)

5.  parent (Relation → Category **many‑to‑one**, field name parent)

6.  children (Relation → Category **one‑to‑many**, mapped by parent)

7.  published_in_marketplace (Boolean, default **false**)

8.  seo_override (Component → seo.seo-override, **non‑repeatable**)

9.  hero (Component → editorial.hero, **non‑repeatable**)

10. tags (Text → Long text) *optional\*

**File path:** /src/api/category/content-types/category/schema.json

{

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

### **3.2 Guides & Courses (optional)**

**Admin UI path:** *Content‑Type Builder → Create new collection type* →
Guide and Course\
**Fields (both):**

- title (Short text, **required**)

- slug (UID from title, **required**)

- summary (Long text)

- image (Media)

- link (Short text) --- external/internal URL

- categories (Relation → many‑to‑many with **Category**)

### **3.3 Taxonomy Group (rules engine)**

**Admin UI path:** *Content‑Type Builder → Create new collection type* →
Taxonomy Group\
**Fields:**

- name (Short text, **required**)

- path_scope (Enumeration: l1,l2,l3,subtree) *optional\*

- categories (Relation → many‑to‑many with **Category**)

- rules (Component → rules.rule, **repeatable**, order defines block
  order)

**File path:**
/src/api/taxonomy-group/content-types/taxonomy-group/schema.json (use
attributes above)

## **4) Add validation (no cycles, unique per parent, correct levels)**

*Why:* Guards prevent broken trees and duplicate slugs so URLs and
breadcrumbs remain stable as editors add or move categories.\
**File path:** /src/api/category/content-types/category/lifecycles.ts

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

// L1 must have no parent; L2 must have L1 parent; L3 must have L2
parent

if (parent && level === 1) throw new BadRequestError(\'L1 cannot have a
parent\')

if (!parent && level !== 1) throw new BadRequestError(\'Only L1 can have
no parent\')

if (parent) {

const parentId = parent.connect?.id \|\| parent

const p = await strapi.entityService.findOne(\'api::category.category\',
parentId, { fields: \[\'id\',\'level\'\] })

if (!p) throw new BadRequestError(\'Parent not found\')

if (p.level !== level - 1) throw new BadRequestError(\'Level must be
parent.level + 1\')

}

// Uniqueness: (parent, slug)

const where:any = { slug }

if (parent) where.parent = parent.connect?.id \|\| parent; else
where.parent = null

if (currentId) where.id = { \$ne: currentId }

const existing = await
strapi.db.query(\'api::category.category\').findOne({ where })

if (existing) throw new BadRequestError(\'Slug already exists under this
parent\')

}

**How to enable lifecycles:** if you don't see the lifecycles file,
create it and restart Strapi. Strapi auto‑loads it.

## **5) Create example data (sanity check)**

*Why:* Entering one L1→L2→L3 chain verifies your schema rules, publish
flags, and components render correctly in the Admin UI.

1.  **Create an L1** Category

    - name: Software Development, level: 1, parent: *(none)*, slug
      auto‑fills

    - publish it

2.  **Create an L2** Category

    - name: Blockchain, level: 2, parent: Software Development

    - publish it

3.  **Create an L3** Category

    - name: Smart Contracts, level: 3, parent: Blockchain

    - publish it

4.  **Add SEO override** (optional)

    - On any category, fill SEO Override fields

5.  **Add Hero** (optional)

    - On any category, set Hero component with title/image/link

6.  **Add a Taxonomy Group\**

    - name: Software Dev --- Default Blocks

    - categories: pick Software Development

    - rules: add 2--3 rules (e.g., entity=projects, kind=top_rated,
      limit=12)

> If validation throws errors: check level and parent match the rules
> above.

## **6) Permissions (keep secure)**

*Why:* Locking these types to Admins prevents accidental public exposure
or edits that could break live navigation.

- Only **Admin** roles should edit these types.

- Public/Authenticated roles **do not** need access to these content
  types directly.

## **7) Exporting/Importing (optional)**

*Why:* Use this when you need to move the schema and seed content
between dev, staging, and production without hand-recreating items.\
For bulk setup across environments:

- Use Strapi's **Content Transfer** or a plugin (e.g., import/export) to
  move categories.

- Alternatively, write a small bootstrap script using Strapi's
  programmatic API to seed L1/L2/L3 from a CSV (UUIDs included).

## **8) Troubleshooting**

*Why:* These are the most common errors you'll see when building or
changing the schema and how to resolve them quickly.

- **"Slug already exists under this parent"** → change the slug or
  choose a different parent.

- **"Level must be parent.level + 1"** → your level does not match the
  parent level.

- **Components not appearing** → run yarn build && yarn develop to
  refresh Admin UI.

- **DB errors after schema changes** → clear .cache and build folders;
  restart Strapi.

## **9) Hand‑off checklist**

*Why:* Final confirmation that the schema, validation, and sample
content are correct before backend integration starts.

- Components created: seo.seo-override, editorial.hero, rules.rule

- Content types created: category, taxonomy-group (+ guide,course if
  used)

- Lifecycle validation file present and working

- Example L1/L2/L3 created and **published\**

- Admin roles only; no public exposure

## **10) What the backend expects (FYI)**

*Why:* These are the guarantees the Category Pages API relies on (UUIDs,
path rules, publish flag) so it can serve stable pages.

- Each category has a **stable uuid**.

- URL path uses **slug** stacked by parent (l1/l2/l3).

- Only categories with published_in_marketplace = true are served to the
  site.

- The Category Pages API will read **SEO override** and **Hero**, and
  use **Taxonomy Groups → Rules** to decide which blocks to render.
