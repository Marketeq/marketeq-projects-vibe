# **Explore More, Pagination & Suggestions**

**Audience:** Backend dev for the Categories microservice (Category
Pages module).

## **0) Scope of this Addendum**

*Why:* Clarifies what is (and isn't) covered here.

- **Covers:** per‑block cursor pagination, "Explore more ..." behavior,
  suggestions source (now), priorities, and minimal mocks for editorial.

- **Does NOT repeat**: base endpoint contract, FE rendering, or Strapi
  schema. Jayesh owns Strapi and Strapi→Nest wiring.

## **1) "Explore more ..." --- URLs & API Calls**

*Why:* Clicking end‑of‑row cards should land on a single‑entity view for
the **same L1/L2/L3 path**.

### **1.1 Front‑end page URLs (site)**

Use your existing Next.js router style --- both patterns call the same
backend.

You're right---that's the doc we should be editing. Sorry for touching
the other one. I'll stick to **"Addendum --- Category Pages: Explore
More, Pagination & Suggestions (Prod-Ready)"** only.

Here's the **exact patch** you asked for---adds the **All (mixed
types)** pages and the **Talent** pages, nothing else changed. Insert
this **inside Section "1.1 Front-end page URLs (site)"**, augmenting the
two bullet lists already there.

### **Query style** 

- **L1 All (mixed types)** → /c/{l1}?kind=show-all

- **L2 All (mixed types)** → /c/{l1}/{l2}?kind=show-all

- **L3 All (mixed types)** → /c/{l1}/{l2}/{l3}?kind=show-all

- **L1 Projects** → /c/{l1}?kind=projects

- **L2 Projects** → /c/{l1}/{l2}?kind=projects

- **L3 Projects** → /c/{l1}/{l2}/{l3}?kind=projects

- **L1 Services** → /c/{l1}?kind=services

- **L2 Services** → /c/{l1}/{l2}?kind=services

- **L3 Services** → /c/{l1}/{l2}/{l3}?kind=services

- **L1 Teams** → /c/{l1}?kind=teams

- **L2 Teams** → /c/{l1}/{l2}?kind=teams

- **L3 Teams** → /c/{l1}/{l2}/{l3}?kind=teams

- **L1 Talent** → /c/{l1}?kind=talent

- **L2 Talent** → /c/{l1}/{l2}?kind=talent

- **L3 Talent** → /c/{l1}/{l2}/{l3}?kind=talent

### **Path style** 

- **L1 All (mixed types)** → /c/{l1}

- **L2 All (mixed types)** → /c/{l1}/{l2}

- **L3 All (mixed types)** → /c/{l1}/{l2}/{l3}

- **L1 Projects** → /c/{l1}/projects

- **L2 Projects** → /c/{l1}/{l2}/projects

- **L3 Projects** → /c/{l1}/{l2}/{l3}/projects

- **L1 Services** → /c/{l1}/services

- **L2 Services** → /c/{l1}/{l2}/services

- **L3 Services** → /c/{l1}/{l2}/{l3}/services

- **L1 Teams** → /c/{l1}/teams

- **L2 Teams** → /c/{l1}/{l2}/teams

- **L3 Teams** → /c/{l1}/{l2}/{l3}/teams

- **L1 Talent** → /c/{l1}/talent

- **L2 Talent** → /c/{l1}/{l2}/talent

- **L3 Talent** → /c/{l1}/{l2}/{l3}/talent

### **1.2 Backend endpoint (unchanged)**

GET
/api/category-pages/{l1}\[/{l2}\[/{l3}\]\]?kind=projects\|services\|teams\|talent\[&cursor=...\]

- FE advances carousels **row‑by‑row** using the **block's** nextCursor.

- After \~10 advances, return a **terminal card** linking to the
  single‑entity page (same path + kind).

**Assembler addition (optional, helps FE):\**
**File:** /apps/categories/src/category-pages/assembler/types.ts

export type Block = {

// ...existing fields...

pagination?: {

nextCursor?: string;

pageSize?: number; // slice size returned

advancesUsed?: number; // how many row-steps already taken
(server-tracked)

maxAdvances?: number; // cap, usually 10

terminalCard?: { href: string; label: string };

};

}

## **2) Per‑Block Cursor Pagination (independent rows)**

*Why:* When the user advances **Projects**, only Projects paginates;
Services/Teams remain unchanged.

### **2.1 Controller behavior**

**File:**
/apps/categories/src/category-pages/category-pages.controller.ts

// Only key bits shown; wire to your service as you already have

\@Get(\'api/category-pages/:l1/:l2?/:l3?\')

async getPage(@Param() params: any, \@Query(\'kind\') kind: PageKind,
\@Query(\'cursor\') cursor?: string) {

// Clamp server-side page size inside the service; default 10

return this.svc.buildPage({ slugParts: \[params.l1, params.l2,
params.l3\].filter(Boolean), kind, cursor });

}

### **2.2 Opaque cursor helpers**

**File:** /apps/categories/src/category-pages/pagination/cursor.ts

// Base64URL encode/decode for opaque tokens (no internals leaked)

const b64u = {

enc: (s: string) =\> Buffer.from(s,
\'utf8\').toString(\'base64\').replace(/\\+/g,\'-\').replace(/\\//g,\'\_\').replace(/=+\$/,\'\'),

dec: (s: string) =\>
Buffer.from(s.replace(/-/g,\'+\').replace(/\_/g,\'/\'),
\'base64\').toString(\'utf8\'),

};

export type CursorPayload = {

v: 1; entity: BlockEntity; order:
\[\'created_at\',\'id\'\]\|\[\'updated_at\',\'id\'\];

last: { created_at?: string; updated_at?: string; id: string };

extra?: Record\<string, any\>; // e.g., rule hash

};

export const encodeCursor = (p: CursorPayload) =\>
b64u.enc(JSON.stringify(p));

export const decodeCursor = \<T=CursorPayload\>(t?: string): T\|null =\>
t ? JSON.parse(b64u.dec(t)) as T : null;

### **2.3 Stable query (TypeORM example)**

**File:**
/apps/categories/src/category-pages/adapters/listing.adapter.mock.ts

// Example for projects; replicate for services/teams with their repos

async function fetchProjectsSlice({ limit = 10, cursor }: { limit?:
number; cursor?: string }) {

const repo = this.ds.getRepository(ProjectEntity);

const c = decodeCursor(cursor as any) as CursorPayload \| null;

const qb = repo.createQueryBuilder(\'p\')

.where(\'p.status = :s\', { s: \'active\' })

.orderBy(\'p.created_at\', \'DESC\')

.addOrderBy(\'p.id\', \'DESC\')

.limit(Math.min(limit, 10));

if (c?.last?.created_at && c?.last?.id) {

qb.andWhere(\'(p.created_at, p.id) \< (:ca, :id)\', { ca:
c.last.created_at, id: c.last.id });

}

const rows = await qb.getMany();

const next = rows.length === Math.min(limit, 10)

? encodeCursor({ v:1, entity:\'projects\',
order:\[\'created_at\',\'id\'\], last:{ created_at:
rows\[rows.length-1\].created_at.toISOString(), id:
rows\[rows.length-1\].id } })

: undefined;

return { items: rows, nextCursor: next };

}

### **2.4 Assembler: advance only the active block**

**File:** /apps/categories/src/category-pages/assembler/assembler.ts

// Pseudocode --- keep your existing evaluator; only the pagination
branch is shown

if (input.cursor && input.kind === \'projects\') {

const { items, nextCursor } = await listing.queryProjects({ cursor:
input.cursor, limit: 10 });

const b = findBlock(payload.blocks, \'projects\');

b.items = items; // replace or append depending on your UI contract

b.pagination = {

\...(b.pagination ?? {}),

nextCursor,

pageSize: 10,

advancesUsed: Math.min((b.pagination?.advancesUsed ?? 0) + 1, 10),

maxAdvances: 10,

terminalCard: !nextCursor ? { href:
\`/c/\${payload.slugPath.join(\'/\')}/projects\`, label: \'View more
projects\' } : undefined,

};

}

## **3) Suggestions v1 (local now, HF later)**

*Why:* Ship deterministic suggestions today; later we can swap the
engine without changing your evaluator.

### **3.1 Interface (unchanged)**

**File:**
/apps/categories/src/category-pages/suggestions/suggestions.service.ts

export class SuggestionsService {

constructor(private readonly catsRepo: CategoryRepo /\* + optional tags
repo \*/) {}

async forCategory(uuid: string): Promise\<Suggestions\> {

// v1 heuristic: siblings as related, ancestors' popular children as
trending, tag-based skills

const siblings = await this.catsRepo.siblingsOf(uuid, { published:true,
limit:8 });

const trending = await this.catsRepo.topChildrenOfAncestors(uuid, {
limit:8 });

const relatedSkills = await this.catsRepo.topTagsForCategory(uuid, {
limit:12 });

return {

relatedCategories: siblings.map(mkCatLink),

trendingCategories: trending.map(mkCatLink),

popularCategories: \[\],

relatedSkills: relatedSkills.map(t =\> ({ name:t.name, slug:t.slug,
link:\`/skills/\${t.slug}\` }))

};

}

}

function mkCatLink(c: any){ return { uuid:c.uuid, level:c.level,
name:c.name, slugPath:c.slug_path,
link:\`/c/\${c.slug_path.join(\'/\')}\` }; }

### **3.2 Future: embeddings/HF**

- Keep your **SuggestionsService** signature; Jayesh can inject an
  embeddings‑powered recommender behind it later. No FE or assembler
  changes needed.

## **4) Editorial mocks (temporary)**

*Why:* FE can wire hero/guides/courses now; Jayesh swaps in Strapi
later.

**File:**
/apps/categories/src/category-pages/editorial/editorial.proxy.ts

export class EditorialProxy {

async forCategory(uuid: string) {

return {

seo: { title: \'Category Title\', description: \'SEO desc\', canonical:
\`https://site/c/path\` },

hero: { title: \'Learn X\', image: \'https://cdn/img.jpg\', link:
\'/guides/x\' },

guides: \[{ title:\'Guide 1\', link:\'/guides/g1\' }\],

courses: \[{ title:\'Course 1\', link:\'/courses/c1\' }\],

faq: \[{ q:\'What is X?\', a:\'X is ...\' }\]

};

}

}

## **5) Answers to your questions (final)**

*Why:* Single source of truth you can reference as you finish the
module.\*

1.  **Pagination model ("per‑block cursor")?\**
    **Yes, independent.** Advancing Projects fetches only Projects;
    Services/Teams stay as they are. No page‑wide pagination. Row steps
    of **≤10 items**, cap at \~10 advances; then show a **terminal
    card** linking to the single‑entity page.

2.  **Embeddings/"HF service" hookup?\**
    **Not now.** Keep suggestions local (the service above). Later,
    Jayesh can wire HF behind the same interface.

3.  **Priority order?\**
    **Build pagination first**, then normalize error handling (404
    unpublished/missing, 5xx masking, timeouts), then polish.

4.  **Mock editorial data?\**
    **Yes.** Populate light mocks via EditorialProxy so FE can build;
    Jayesh replaces with Strapi adapter next.

## **6) QA checklist (quick)**

- GET /api/category-pages/{path}?kind=projects returns **only Projects**
  advanced when cursor is provided.

- blocks\[i\].pagination.nextCursor present until the last slice; absent
  on final slice.

- After \~10 advances, terminalCard present with correct href
  (/c/{path}/projects\|services\|teams\|talent).

- Suggestions included (siblings/trending) with valid links.

- 404 for unpublished/missing categories; no downstream internals leaked
  in errors.

## **7) Env notes (no hard dependency yet)**

- Your service should run with mocks if STRAPI_URL, LISTING_API, or
  USER_API are missing. Jayesh will supply these when wiring real
  adapters.
