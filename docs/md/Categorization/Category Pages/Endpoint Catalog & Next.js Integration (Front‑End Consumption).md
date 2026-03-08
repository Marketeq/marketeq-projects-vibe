# **Endpoint Catalog & Next.js Integration (Front‑End Consumption)**

**Audience:** Front‑end developer wiring the already‑built Next.js pages
to the Category Pages API.\
**Important:** Frontend **only talks to the Category Pages API**
documented here. No direct calls to other backend microservices from the
browser. Here's why:

1.  **Security/Secrets:** Listings/Categories/User services usually need
    server creds. Calling them from the browser would expose tokens,
    scopes, and internal routes. The Category Pages API lets the server
    call them safely.

2.  **Single source of truth:** The **assembler** applies all business
    rules (published-only, L1→L2→L3 logic, tax-group ranking, related
    categories via HF, fallbacks). If the front end hits services
    directly, it can bypass those rules and show inconsistent results.

3.  **Performance & caching:** One endpoint → one SSR fetch → clean edge
    caching + selective revalidation. Multiple browser calls =
    waterfalls, CORS, and harder cache invalidation.

4.  **Stable contract:** We can change downstream APIs without breaking
    the front end. The assembler shields the UI from service-by-service
    churn.

5.  **Error hygiene:** The assembler normalizes errors (404 for
    unpublished/not found, 500 for real faults). Mixing raw service
    errors in the browser is noisy and brittle.

## **0) Summary**

- Base: NEST_API (server‑to‑server from Next.js). Example:
  https://api.example.com.

- Primary endpoint (SSR/edge): GET
  /api/category-pages/:l1\[/:l2\[/:l3\]\]?kind=show-all\|projects\|services\|teams\|talent\[&cursor=...\]\[&preview=1\]

- Returns: **single JSON payload** with level, slugPath, uuids,
  breadcrumbs, seo, hero, subcategories, blocks\[\], pagination?,
  suggestions{...}.

- Pagination: per‑block pagination.nextCursor; call the **same
  endpoint** with cursor to fetch the next page of that block.

- Status: 200 ok, 404 unpublished/not found, 5xx unexpected.

## **1) Endpoint Catalog**

### **1.1 Category Page (primary)**

**Method/Path\**
GET /api/category-pages/:l1\[/:l2\[/:l3\]\]

**Query params**

- kind *(required)*: show-all \| projects \| services \| teams \| talent

- cursor *(optional)*: pagination token for the primary block being
  paged

- preview *(optional)*: 1 to bypass caches when previewing in admin
  flows

**Examples**

****\# L1 show-all

curl -s
\"\${NEST_API}/api/category-pages/software-development?kind=show-all\"
\| jq .

\# L2 projects

curl -s
\"\${NEST_API}/api/category-pages/software-development/blockchain?kind=projects\"
\| jq .

\# L3 services, second page (cursor)

curl -s
\"\${NEST_API}/api/category-pages/software-development/blockchain/smart-contracts?kind=services&cursor=eyJvIjo\...\"
\| jq .

**Response (shape)**

****{

\"level\": 2,

\"slugPath\": \[\"software-development\",\"blockchain\"\],

\"uuids\": { \"l1\": \"...\", \"l2\": \"...\" },

\"breadcrumbs\": \[{\"name\":\"Software
Development\",\"slug\":\"software-development\",\"uuid\":\"...\"},{\"name\":\"Blockchain\",\"slug\":\"blockchain\",\"uuid\":\"...\"}\],

\"seo\": { \"title\": \"...\", \"description\": \"...\", \"canonical\":
\"https://.../c/software-development/blockchain\" },

\"hero\": { \"title\": \"Learn Blockchain\", \"image\":
\"https://.../img.jpg\", \"link\": \"/guides/blockchain\" },

\"subcategories\": \[{\"name\":\"Smart
Contracts\",\"slug\":\"smart-contracts\",\"uuid\":\"...\"}\],

\"blocks\": \[

{

\"key\":\"rule-123\",

\"type\":\"grid\",

\"entity\":\"projects\",

\"items\":\[ {\"uuid\":\"...\",\"title\":\"...\", \"card\":{ /\* fields
\*/ } } \],

\"pagination\": { \"nextCursor\":\"eyJvIjo...\" }

}

\],

\"pagination\": null,

\"suggestions\": {

\"relatedCategories\":
\[{\"uuid\":\"...\",\"level\":2,\"name\":\"DeFi\",\"slugPath\":\[\"software-development\",\"defi\"\],\"link\":\"/c/software-development/defi\"}\],

\"trendingCategories\": \[\],

\"popularCategories\": \[\],

\"relatedSkills\":
\[{\"name\":\"Solidity\",\"slug\":\"solidity\",\"link\":\"/skills/solidity\"}\]

}

}

**Status codes**

- 200 --- OK

- 404 --- Not found or **unpublished** category (treat as hard 404)

- 5xx --- Unexpected error

## **2) Next.js: Environment & Base Client**

**Folder path\**
/apps/web/lib/env.ts

export const API_BASE = process.env.NEST_API ??
\"http://localhost:3000\"; // server env only

**Folder path\**
/apps/web/lib/api/categoryPages.ts

export type PageKind =
\'show-all\'\|\'projects\'\|\'services\'\|\'teams\'\|\'talent\';

export async function fetchCategoryPage({ slugParts, kind, cursor,
preview }:{

slugParts: string\[\]; kind: PageKind; cursor?: string; preview?:
boolean;

}) {

const path = slugParts.map(encodeURIComponent).join(\'/\');

const qs = new URLSearchParams({ kind });

if (cursor) qs.set(\'cursor\', cursor);

if (preview) qs.set(\'preview\', \'1\');

const res = await
fetch(\`\${process.env.NEST_API}/api/category-pages/\${path}?\${qs.toString()}\`,
{

// SSR/server-only fetch; do not expose token/client secrets to browser

headers: { \'Accept\': \'application/json\' },

cache: \'no-store\' // rely on server/CDN caching; avoid stale client
cache

});

if (res.status === 404) return { notFound: true } as const;

if (!res.ok) throw new Error(\`CategoryPages \${res.status}\`);

return (await res.json()) as any; // use shared types if available

}



## **3) Next.js Pages Router (already built) --- SSR wiring**

**Pattern A (single dynamic route with page kinds as query)\**
*Use if your existing file is* pages/c/\[\...slug\].tsx.

**Folder path\**
/apps/web/pages/c/\[\...slug\].tsx

import Head from \'next/head\'

import { GetServerSideProps } from \'next\'

import { fetchCategoryPage, PageKind } from \'@/lib/api/categoryPages\'

import CategoryView from \'@/components/category/CategoryView\' // your
existing renderer

export const getServerSideProps: GetServerSideProps = async (ctx) =\> {

const slugParts = (ctx.params?.slug as string\[\]) \|\| \[\]

const kind = (ctx.query.kind as PageKind) \|\| \'show-all\'

const data = await fetchCategoryPage({ slugParts, kind })

if ((data as any)?.notFound) return { notFound: true }

return { props: { payload: data, kind } }

}

export default function CategoryPage({ payload, kind }: { payload: any;
kind: PageKind }) {

return (

\<\>

\<Head\>

\<title\>{payload.seo?.title ?? \'Categories\'}\</title\>

{payload.seo?.canonical && \<link rel=\"canonical\"
href={payload.seo.canonical} /\>}

{payload.seo?.description && \<meta name=\"description\"
content={payload.seo.description} /\>}

{/\* JSON-LD breadcrumbs (optional) \*/}

\<script type=\"application/ld+json\" dangerouslySetInnerHTML={{
\_\_html: JSON.stringify({

\'@context\': \'https://schema.org\', \'@type\': \'BreadcrumbList\',

itemListElement: payload.breadcrumbs.map((b:any,i:number)=\>({

\'@type\':\'ListItem\', position:i+1, name:b.name,

item:\`\${process.env.NEXT_PUBLIC_SITE_ORIGIN}/c/\${payload.slugPath.slice(0,i+1).join(\'/\')}\`

}))

}) }} /\>

\</Head\>

\<CategoryView payload={payload} kind={kind} /\>

\</\>

)

}

**Pattern B (separate pages per kind)\**
If your codebase uses distinct files (/c/\[\...slug\]/projects.tsx,
etc.), reuse the exact getServerSideProps above and hardcode kind per
file.

## **4) Rendering from Payload (component contract)**

**Folder path\**
/apps/web/components/category/CategoryView.tsx

type Payload = {

level: 1\|2\|3;

slugPath: string\[\];

breadcrumbs: { name:string; slug:string; uuid:string }\[\];

hero?: { title:string; image?:string; link?:string };

subcategories: { name:string; slug:string; uuid:string }\[\];

blocks: Array\<{ key:string; type:\'grid\'\|\'carousel\';
entity:\'projects\'\|\'services\'\|\'teams\'\|\'talent\'\|\'guides\'\|\'courses\';
items:any\[\]; pagination?:{ nextCursor?:string } }\>;

suggestions: { relatedCategories:any\[\]; trendingCategories:any\[\];
popularCategories:any\[\]; relatedSkills:any\[\] };

}

export default function CategoryView({ payload, kind }:{
payload:Payload;
kind:\'show-all\'\|\'projects\'\|\'services\'\|\'teams\'\|\'talent\' }){

return (

\<main\>

{/\* Hero \*/}

{payload.hero && (

\<section className=\"mb-8\"\>

\<h1 className=\"text-2xl font-semibold\"\>{payload.hero.title}\</h1\>

{/\* img/link as you already have \*/}

\</section\>

)}

{/\* Subcategories grid \*/}

{payload.subcategories?.length \> 0 && (

\<section className=\"mb-10\"\>

\<h2 className=\"text-xl font-semibold mb-3\"\>Subcategories\</h2\>

\<ul className=\"grid gap-2 grid-cols-2 md:grid-cols-3
lg:grid-cols-4\"\>

{payload.subcategories.map(sc =\> (

\<li key={sc.uuid}\>\<a href={\`/c/\${\[\...payload.slugPath,
sc.slug\].join(\'/\')}\`} className=\"block border rounded p-3
hover:shadow\"\>{sc.name}\</a\>\</li\>

))}

\</ul\>

\</section\>

)}

{/\* Dynamic blocks \*/}

{(payload.blocks\|\|\[\]).map(block =\> (

\<section key={block.key} className=\"mb-10\"\>

{/\* Render block header based on your rule metadata (already in your
code) \*/}

\<div className={block.type === \'carousel\' ? \'overflow-x-auto\' :
\'\'}\>

{/\* Your existing card components here \*/}

\</div\>

{block.pagination?.nextCursor && (

\<LoadMore slugPath={payload.slugPath} kind={kind}
cursor={block.pagination.nextCursor} blockKey={block.key} /\>

)}

\</section\>

))}

{/\* Suggestions \*/}

\<SuggestionsPanel suggestions={payload.suggestions} /\>

\</main\>

);

}

**Load more (per block)**

****function LoadMore({ slugPath, kind, cursor, blockKey }:{
slugPath:string\[\]; kind:any; cursor:string; blockKey:string }){

const onClick = async () =\> {

const qs = new URLSearchParams({ kind, cursor });

const res = await
fetch(\`/api/category-pages/\${slugPath.join(\'/\')}?\${qs.toString()}\`);

const data = await res.json();

// Merge data.blocks\[?\].items into the matching blockKey (state
management left to your app)

}

return \<button onClick={onClick} className=\"px-4 py-2 border
rounded\"\>Load more\</button\>

}

**Suggestions panel**

****function SuggestionsPanel({ suggestions }:{ suggestions:any }){

const cats = (key:string) =\> (suggestions?.\[key\]\|\|\[\]) as any\[\];

return (

\<aside className=\"mt-12 space-y-10\"\>

{cats(\'relatedCategories\').length\>0 && (

\<section\>

\<h3 className=\"text-lg font-semibold mb-2\"\>Related Categories\</h3\>

\<ul className=\"flex flex-wrap gap-2\"\>

{cats(\'relatedCategories\').map(c =\> \<li key={c.uuid}\>\<a
href={c.link} className=\"inline-block rounded-full border px-3
py-1\"\>{c.name}\</a\>\</li\>)}

\</ul\>

\</section\>

)}

{cats(\'relatedSkills\').length\>0 && (

\<section\>

\<h3 className=\"text-lg font-semibold mb-2\"\>Related Skills\</h3\>

\<ul className=\"flex flex-wrap gap-2\"\>

{cats(\'relatedSkills\').map((s:any) =\> \<li key={s.slug}\>\<a
href={s.link} className=\"inline-block rounded-full border px-3
py-1\"\>{s.name}\</a\>\</li\>)}

\</ul\>

\</section\>

)}

\</aside\>

)

}



## **5) SEO from Payload (SSR)**

**Folder path\**
/apps/web/pages/c/\[\...slug\].tsx (see \<Head\> block above)

- Title → payload.seo.title

- Meta Description → payload.seo.description

- Canonical → payload.seo.canonical

- JSON‑LD Breadcrumbs → build from payload.breadcrumbs

## **6) Error & Empty States**

- 404: render Next.js 404 page.

- 5xx: render error boundary / generic error.

- Sparse categories: show your "Coming soon / No items yet" section, but
  still render **Suggestions**.

## **7) Caching & Revalidation (front‑end notes)**

- Server responses may be cached at the edge; **do not** add client‑side
  caches beyond normal React state.

- Preview flows append &preview=1 so you always get fresh data.

## **8) Developer Checklist**

- .env.local includes NEST_API and NEXT_PUBLIC_SITE_ORIGIN.

- SSR wired in /pages/c/\[\...slug\].tsx (or per‑kind files) with
  fetchCategoryPage.

- Renders: hero, subcategories, blocks (+cursor), suggestions.

- \<Head\> sets SEO based on payload.

- Load‑more merges items without duplicates.

- 404 and error states handled.

- RTL tested (if applicable in your codebase).

## **9) Quick Postman Smoke (for front‑end)**

****\# L1 kinds

for k in show-all projects services teams talent; do

curl -sf
\"\${NEST_API}/api/category-pages/software-development?kind=\$k\"
\>/dev/null \|\| echo \"FAIL \$k\";

done



## **10) FAQs**

- **Do we ever call other services from the browser?** No. All data
  comes from /api/category-pages/\....

- **Are All/Projects/Services/Teams/Talent separate pages?** Yes (as per
  design). Use either separate files or a single dynamic page with kind
  query (you already have the page built---keep the pattern you use
  now).

- **Do we reload the whole page on kind change?** Normal navigation is
  fine; if you prefer smoother UX, prefetch links and use client
  transitions.
