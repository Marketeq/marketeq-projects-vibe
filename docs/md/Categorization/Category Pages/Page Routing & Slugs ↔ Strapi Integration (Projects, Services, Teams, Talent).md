# **Page Routing & Slugs ↔ Strapi Integration (Projects, Services, Teams, Talent)**

**Audience:** Strapi admins + backend devs (NestJS).\
\
**Goal:** Map L1/L2/L3 category paths and typed detail URLs to Strapi
data, with minimal glue code and clear responsibilities.\
\
**Principles:** Human slugs + short id in URLs (no UUIDs in public
URLs), canonical trail comes from Category slugPath, types are required
for Projects/Services.

## **0) What integrates with what (one-liner)**

We compute each page's **canonical URL** from Strapi's categories
(slugPath) + the item's own slug, publicId, and (for Projects/Services)
required **type**.

## **1) Required fields in Strapi (per listing type)**

Each item must carry just enough data for the backend to build a
canonical path consistently.

**Common (all items)**

- title (string) --- for slug generation

- slug (UID from title) --- human segment in URLs

- categories (relation → many-to-many with Category) --- choose the
  **primary** category for canonical trail

- primary_category_uuid (string/uid) --- stores the canonical category
  UUID (one of categories)

- public_id (string) --- short, stable ID for URLs (int or short hash);
  **exposed in URLs**

- uuid (string/uid) --- internal stable id; **never exposed publicly**

**Typed only**

- **Projects**: project_type (enum e.g.,
  package\|hourly\|fixed-price\|retainer\|audit)

- **Services**: service_type (enum e.g.,
  package\|hourly\|monthly\|retainer\|audit)

> *Why:* The backend will read primary_category_uuid → resolve slugPath,
> then build the final URL using the item slug, public_id, and the
> **type** (for Projects/Services).

## **2) Strapi lifecycle: enforce & cache the canonical category (per item)**

**Purpose:** Ensure every item always has one unambiguous canonical
trail.

**File (example for Projects):**
/src/api/project/content-types/project/lifecycles.ts

import { errors } from \'@strapi/utils\';

const BadRequestError = errors.ApplicationError;

export default {

async beforeCreate(event) { await ensurePrimary(event.params.data,
strapi); },

async beforeUpdate(event) { await ensurePrimary(event.params.data,
strapi, event.params.where?.id); },

};

async function ensurePrimary(data:any, strapi:any, currentId?:number) {

// 1) Require at least one category

const cats = data.categories?.connect ?? data.categories ?? \[\];

if (!cats.length && !data.primary_category_uuid) {

throw new BadRequestError(\'At least one category is required\');

}

// 2) If primary not set, default to the first category selected

if (!data.primary_category_uuid && cats.length) {

const firstId = cats\[0\].id ?? cats\[0\];

const cat = await
strapi.entityService.findOne(\'api::category.category\', firstId, {
fields: \[\'uuid\'\] });

if (!cat) throw new BadRequestError(\'Primary category not found\');

data.primary_category_uuid = cat.uuid;

}

// 3) Require short public id in addition to internal uuid (do not put
uuid in URL)

if (!data.public_id) {

// Generate once; replace with your own generator (e.g., sequence or
hashid)

data.public_id = String(Math.floor(10000 + Math.random()\*90000));

}

}

> Replicate this file (with field names adjusted) for **Services**,
> **Teams**, and **Talent**.

## **3) Strapi helper: resolve slugPath by category UUID**

**Purpose:** A small shared helper Strapi can use (and/or Nest can call
via a categories endpoint) to get \[\"l1\",\"l2\",\"l3\"\] from the
chosen primary_category_uuid.

**File:** /src/extensions/utils/category-path.ts

export async function resolveSlugPathByUuid(strapi:any,
categoryUuid:string) {

// Fetch category by UUID and walk up to its ancestors to build the
trail

const cat = await strapi.db.query(\'api::category.category\').findOne({

where: { uuid: categoryUuid },

populate: { parent: { populate: { parent: true } } },

select: \[\'slug\',\'level\',\'uuid\',\'id\'\]

});

if (!cat) return null;

const parts:string\[\] = \[\];

let cur:any = cat;

while (cur) {

parts.unshift(cur.slug);

cur = cur.parent \|\| null;

}

return parts; // e.g.
\[\"software-development\",\"blockchain\",\"smart-contracts\"\]

}



## **4) Strapi REST projection: expose only what the backend needs**

**Purpose:** Keep payloads lean: the backend assembler should receive
exactly the link-building fields, not entire items.

**Route config (example for Projects):**
/src/api/project/routes/project.ts

export default {

routes: \[

{

method: \'GET\',

path: \'/projects/:id/slug-meta\', // Strapi internal id OR uuid; choose
one

handler: \'project.slugMeta\',

config: { policies: \[\'admin::isAuthenticatedAdmin\'\] } // tighten as
needed

}

\]

}

**Controller:** /src/api/project/controllers/project.ts

import { resolveSlugPathByUuid } from
\'../../../extensions/utils/category-path\';

export default {

async slugMeta(ctx) {

const id = ctx.params.id;

const item = await
strapi.entityService.findOne(\'api::project.project\', id, {

fields:
\[\'slug\',\'public_id\',\'project_type\',\'primary_category_uuid\'\],

});

if (!item) return ctx.notFound();

const slugPath = await resolveSlugPathByUuid(strapi,
item.primary_category_uuid);

ctx.body = {

slug: item.slug,

publicId: item.public_id,

type: item.project_type, // required for Projects

slugPath // \[\"l1\",\"l2\",\"l3\"\]

};

}

}

> Create equivalent /slug-meta routes for **Services** (return
> service_type), **Teams**, and **Talent** (no type).

## **5) NestJS link builder: construct canonical URLs (server-side only)**

**Purpose:** The API that serves pages (or detail) uses these helpers to
output canonical links (and to 301 when paths are wrong).

**File:** apps/api/src/common/link-builder.ts

type SlugPath = string\[\];

export function projectUrl(slugPath:SlugPath, type:string, slug:string,
publicId:string\|number) {

return
\`/c/\${slugPath.join(\'/\')}/projects/\${type}/\${slug}-\${publicId}\`;

}

export function serviceUrl(slugPath:SlugPath, type:string, slug:string,
publicId:string\|number) {

return
\`/c/\${slugPath.join(\'/\')}/services/\${type}/\${slug}-\${publicId}\`;

}

export function teamUrl(slugPath:SlugPath, slug:string,
publicId:string\|number) {

return \`/c/\${slugPath.join(\'/\')}/teams/\${slug}-\${publicId}\`;

}

export function talentUrl(slugPath:SlugPath, slug:string,
publicId:string\|number) {

return \`/c/\${slugPath.join(\'/\')}/talent/\${slug}-\${publicId}\`;

}



## **6) Detail lookup flow (per entity)**

**Purpose:** Standardize how Nest builds canonical links and handles
redirects when a user lands on non-canonical paths.

**File (example for Projects):**
apps/api/src/projects/projects.controller.ts

import { Controller, Get, Param, Res, Query } from \'@nestjs/common\';

import { Response } from \'express\';

import { projectUrl } from \'../common/link-builder\';

\@Controller(\'projects\')

export class ProjectsController {

constructor(private readonly svc: ProjectsService) {}

// Internal detail API used by Next.js serverside (not public URL)

\@Get(\':publicId\')

async getByPublicId(@Param(\'publicId\') publicId:string, \@Res()
res:Response) {

const p = await this.svc.findDetailByPublicId(publicId); // reads from
Listing Service (not Strapi)

if (!p) return res.status(404).send();

// p must include: slug, projectType, slugPath, seo\...

const canonicalPath = projectUrl(p.slugPath, p.projectType, p.slug,
p.publicId);

return res.status(200).json({ \...p, canonicalPath });

}

// Optional legacy shortlink → 301 to canonical

\@Get()

async legacyRedirect(@Query(\'id\') id:string, \@Res() res:Response) {

if (!id) return res.status(400).send();

const p = await this.svc.findDetailByPublicId(id);

if (!p) return res.status(404).send();

return res.redirect(301, projectUrl(p.slugPath, p.projectType, p.slug,
p.publicId));

}

}

> Implement equivalent controllers for **Services** (uses serviceUrl
> with serviceType), **Teams**, **Talent**.

## **7) Category listing pages: using Strapi to resolve the trail**

**Purpose:** When building listing pages, Nest takes the path parts
(l1/l2/l3), validates against Strapi Categories, and uses the page's
**Taxonomy Group rules** to populate blocks.

**Minimal flow (L3 example):**

1.  Parse URL: /c/{l1}/{l2}/{l3}/services

2.  Verify each slug exists and forms a valid parent→child→grandchild
    chain in Strapi Categories.

3.  Read taxonomy-group rules for the matched Category (and pageKind =
    services) to render blocks.

4.  For each card, read slug, publicId, type (if any),
    primary_category_uuid from your downstream (Listing/User services),
    and build links via the helpers in §5.

## **8) Webhooks: keep Nest in sync without duplicating schemas**

**Purpose:** Push only what Nest needs when categories or item slugs
change; do **not** rebuild the category service.

**Strapi → Nest webhooks (examples):**

- **Category changed/published** → POST /internal/hooks/category-updated
  with { uuid, slug, level, parent_uuid, published_in_marketplace }

- **Project/Service/Team/Talent changed** → POST
  /internal/hooks/item-updated with { kind, uuid, public_id, slug,
  primary_category_uuid, type? }

> Nest stores a **lightweight projection** for canonicalization (no
> heavy content): for each item, cache slug, publicId, type?,
> primary_category_uuid → on request, it asks Listing/User services for
> the "full" detail content.

## **9) Redirect & canonical behavior (server-side)**

**Purpose:** Guarantee stable links like big marketplaces.

- **Wrong trail**: if incoming trail ≠ item's canonical slugPath, return
  **301** to the canonical URL (use §5 helpers).

- **Missing type (Projects/Services)**: 301 to typed canonical.

- **Slug drift**: keep same publicId, 301 old slug → new slug.

- **Canonical tag**: Next.js sets \<link rel=\"canonical\"\> to the
  final canonical path returned by the API.

## **10) Quick test matrix (copy/paste)**

**Project (package)**

- Given:
  slugPath=\[\"software-development\",\"blockchain\",\"smart-contracts\"\],
  slug=\"solidity-erc20-starter\", publicId=12345,
  projectType=\"package\"

- Canonical URL →
  /c/software-development/blockchain/smart-contracts/projects/package/solidity-erc20-starter-12345

**Service (audit)**

- Given:
  slugPath=\[\"software-development\",\"blockchain\",\"smart-contracts\"\],
  slug=\"smart-contract-audit\", publicId=90112, serviceType=\"audit\"

- Canonical URL →
  /c/software-development/blockchain/smart-contracts/services/audit/smart-contract-audit-90112

**Team**

- Canonical URL → /c/\.../teams/{slug}-{id}

**Talent**

- Canonical URL → /c/\.../talent/{slug}-{id}

## **11) Hand-off checklist (Strapi ↔ Routing ready)**

- Each item type has slug, public_id, uuid, categories,
  primary_category_uuid, and **type** where required.

- Lifecycles enforce primary_category_uuid and generate public_id if
  missing.

- Category helper resolveSlugPathByUuid in place and returns correct
  trails.

- Minimal /slug-meta endpoints exist for Projects/Services/Teams/Talent
  (Strapi-side) **or** equivalent data is available to Nest via existing
  projections.

- Nest link builders (projectUrl, serviceUrl, teamUrl, talentUrl) used
  universally.

- Redirect rules implemented (wrong trail, missing type, slug drift).

- Webhooks configured to notify Nest on category/item updates.

### **Notes & boundaries**

- **Do not** expose UUIDs in URLs; they remain internal.

- **Do not** duplicate heavy listing data in Strapi; keep it in the
  Listing/User services.

- Strapi remains the **editorial + taxonomy** source (categories,
  overrides, rules), not the runtime catalog.
