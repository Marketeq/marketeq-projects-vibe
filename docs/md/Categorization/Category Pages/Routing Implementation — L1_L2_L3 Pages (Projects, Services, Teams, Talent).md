# **Routing Implementation --- L1/L2/L3 Pages (Projects, Services, Teams, Talent)**

## **0) What you're building (in plain English)**

- One **route file per listing type** (Projects/Services/Teams/Talent)
  must handle **all three levels** (L1/L2/L3).

- Each level has a different layout, so we'll **compose the page from
  level-specific components** instead of cramming 1,500+ lines in a
  single file.

- The **route file** does data fetching **once** (SSR) and passes the
  payload to the appropriate level component.

## **1) Folder structure (App Router)**

Create a small, predictable structure that keeps **route files** slim
and **level layouts** isolated.

apps/web/

└─ app/

└─ c/

└─ \[\...category\]/

├─ page.tsx \# L1/L2/L3 "All" (already exists)

├─ projects/

│ └─ page.tsx \# Route file: L1/L2/L3 Projects

├─ services/

│ └─ page.tsx \# Route file: L1/L2/L3 Services

├─ teams/

│ └─ page.tsx \# Route file: L1/L2/L3 Teams

└─ talent/

└─ page.tsx \# Route file: L1/L2/L3 Talent

src/

└─ features/

└─ category-pages/

├─ lib/

│ ├─ parseCategory.ts \# level detection + slugPath parsing

│ └─ fetchCategoryPage.ts \# thin server-only fetcher (SSR)

├─ projects/

│ ├─ L1ProjectsContent.tsx

│ ├─ L2ProjectsContent.tsx

│ └─ L3ProjectsContent.tsx

├─ services/

│ ├─ L1ServicesContent.tsx

│ ├─ L2ServicesContent.tsx

│ └─ L3ServicesContent.tsx

├─ teams/

│ ├─ L1TeamsContent.tsx

│ ├─ L2TeamsContent.tsx

│ └─ L3TeamsContent.tsx

└─ talent/

├─ L1TalentContent.tsx

├─ L2TalentContent.tsx

└─ L3TalentContent.tsx

> Why this layout? It implements separate component files per level,
> placed under src/features/\... so **route files stay \~30 lines** and
> **level components own their layouts**.

## **2) Level detection & slug parsing (shared util)**

**File:** src/features/category-pages/lib/parseCategory.ts

export type CategoryParams = { category?: string\[\] };

export function parseCategory(params: CategoryParams) {

const slugPath = (params.category ?? \[\]).map(String);

if (slugPath.length \< 1 \|\| slugPath.length \> 3) {

throw new Error(\'Invalid category depth: must be L1, L2, or L3\');

}

const level = slugPath.length as 1 \| 2 \| 3;

return { level, slugPath };

}



## **3) Server-side fetcher (route fetches once, components are dumb)**

**Important:** We do **not** call other microservices here---only the
**Category Pages API** you already have.\
**File:** src/features/category-pages/lib/fetchCategoryPage.ts

export type PageKind =
\'show-all\'\|\'projects\'\|\'services\'\|\'teams\'\|\'talent\';

export async function fetchCategoryPageSSR({

slugPath, kind, cursor, preview

}: {

slugPath: string\[\];

kind: PageKind;

cursor?: string;

preview?: boolean;

}) {

const path = slugPath.map(encodeURIComponent).join(\'/\');

const qs = new URLSearchParams({ kind });

if (cursor) qs.set(\'cursor\', cursor);

if (preview) qs.set(\'preview\', \'1\');

const res = await
fetch(\`\${process.env.NEST_API}/api/category-pages/\${path}?\${qs.toString()}\`,
{

// This runs on the server in Next.js (SSR). Do not expose tokens in the
browser.

headers: { \'Accept\': \'application/json\' },

cache: \'no-store\'

});

if (res.status === 404) return { notFound: true } as const;

if (!res.ok) throw new Error(\`CategoryPages \${res.status}\`);

return (await res.json()) as any;

}

> This fetches in the **route file** (SSR) and passes the payload down.
> Components stay purely presentational.

## **4) Route files (one per listing type)**

Each route file:

1.  Parse L1/L2/L3 from URL.

2.  Fetch one payload via /api/category-pages/\... with the correct
    kind.

3.  Switch on level and render the correct level component.

### **4.1 Projects**

**File:** apps/web/app/c/\[\...category\]/projects/page.tsx

import { parseCategory } from
\'@/features/category-pages/lib/parseCategory\'

import { fetchCategoryPageSSR } from
\'@/features/category-pages/lib/fetchCategoryPage\'

import L1ProjectsContent from
\'@/features/category-pages/projects/L1ProjectsContent\'

import L2ProjectsContent from
\'@/features/category-pages/projects/L2ProjectsContent\'

import L3ProjectsContent from
\'@/features/category-pages/projects/L3ProjectsContent\'

export default async function ProjectsPage({ params, searchParams }:{

params: { category?: string\[\] },

searchParams?: { cursor?: string; preview?: \'1\' }

}) {

const { level, slugPath } = parseCategory(params);

const payload = await fetchCategoryPageSSR({

slugPath,

kind: \'projects\',

cursor: searchParams?.cursor,

preview: searchParams?.preview === \'1\'

});

if ((payload as any)?.notFound) {

// Let your global 404 page handle this

return null;

}

if (level === 1) return \<L1ProjectsContent payload={payload} /\>;

if (level === 2) return \<L2ProjectsContent payload={payload} /\>;

return \<L3ProjectsContent payload={payload} /\>;

}

### **4.2 Services**

**File:** apps/web/app/c/\[\...category\]/services/page.tsx

import { parseCategory } from
\'@/features/category-pages/lib/parseCategory\'

import { fetchCategoryPageSSR } from
\'@/features/category-pages/lib/fetchCategoryPage\'

import L1ServicesContent from
\'@/features/category-pages/services/L1ServicesContent\'

import L2ServicesContent from
\'@/features/category-pages/services/L2ServicesContent\'

import L3ServicesContent from
\'@/features/category-pages/services/L3ServicesContent\'

export default async function ServicesPage({ params, searchParams }:{

params: { category?: string\[\] },

searchParams?: { cursor?: string; preview?: \'1\' }

}) {

const { level, slugPath } = parseCategory(params);

const payload = await fetchCategoryPageSSR({

slugPath,

kind: \'services\',

cursor: searchParams?.cursor,

preview: searchParams?.preview === \'1\'

});

if ((payload as any)?.notFound) return null;

if (level === 1) return \<L1ServicesContent payload={payload} /\>;

if (level === 2) return \<L2ServicesContent payload={payload} /\>;

return \<L3ServicesContent payload={payload} /\>;

}

### **4.3 Teams**

**File:** apps/web/app/c/\[\...category\]/teams/page.tsx

import { parseCategory } from
\'@/features/category-pages/lib/parseCategory\'

import { fetchCategoryPageSSR } from
\'@/features/category-pages/lib/fetchCategoryPage\'

import L1TeamsContent from
\'@/features/category-pages/teams/L1TeamsContent\'

import L2TeamsContent from
\'@/features/category-pages/teams/L2TeamsContent\'

import L3TeamsContent from
\'@/features/category-pages/teams/L3TeamsContent\'

export default async function TeamsPage({ params, searchParams }:{

params: { category?: string\[\] },

searchParams?: { cursor?: string; preview?: \'1\' }

}) {

const { level, slugPath } = parseCategory(params);

const payload = await fetchCategoryPageSSR({

slugPath,

kind: \'teams\',

cursor: searchParams?.cursor,

preview: searchParams?.preview === \'1\'

});

if ((payload as any)?.notFound) return null;

if (level === 1) return \<L1TeamsContent payload={payload} /\>;

if (level === 2) return \<L2TeamsContent payload={payload} /\>;

return \<L3TeamsContent payload={payload} /\>;

}

### **4.4 Talent**

**File:** apps/web/app/c/\[\...category\]/talent/page.tsx

import { parseCategory } from
\'@/features/category-pages/lib/parseCategory\'

import { fetchCategoryPageSSR } from
\'@/features/category-pages/lib/fetchCategoryPage\'

import L1TalentContent from
\'@/features/category-pages/talent/L1TalentContent\'

import L2TalentContent from
\'@/features/category-pages/talent/L2TalentContent\'

import L3TalentContent from
\'@/features/category-pages/talent/L3TalentContent\'

export default async function TalentPage({ params, searchParams }:{

params: { category?: string\[\] },

searchParams?: { cursor?: string; preview?: \'1\' }

}) {

const { level, slugPath } = parseCategory(params);

const payload = await fetchCategoryPageSSR({

slugPath,

kind: \'talent\',

cursor: searchParams?.cursor,

preview: searchParams?.preview === \'1\'

});

if ((payload as any)?.notFound) return null;

if (level === 1) return \<L1TalentContent payload={payload} /\>;

if (level === 2) return \<L2TalentContent payload={payload} /\>;

return \<L3TalentContent payload={payload} /\>;

}

> These route files directly implement **Question 1 (organization)**
> and **Question 2 (location)** with Option B and src/features/\...
> placement.

## **5) Level components (one per level, per type)**

Each component receives a **payload** (the exact JSON contract you
already have) and renders the proper layout for that **level** and
**type**.

> Replace the \<TODO\>s with your existing cards/sections; **no fetching
> here**.

**Example:** src/features/category-pages/projects/L1ProjectsContent.tsx

export default function L1ProjectsContent({ payload }:{ payload:any })
{

// payload: { level, slugPath, breadcrumbs, hero, subcategories,
blocks\[\], suggestions{} }

return (

\<main\>

{/\* Hero, 3-col grid, Browse-by-Subcategory, etc. \*/}

{/\* Use your existing design system/components here \*/}

{/\* Example: \<Hero {\...payload.hero} /\> \*/}

{/\* Example: \<ProjectsGrid
items={payload.blocks.find(b=\>b.entity===\'projects\')?.items ?? \[\]}
columns={3} /\> \*/}

\</main\>

)

}

Create the analogous L2\... and L3\... files for
**projects/services/teams/talent**, each reflecting that level's layout
(hero/no-hero, grid size, sidebars, etc.). This ensures that **each
level has its own design** but uses **one route per type**.

## **6) Pagination & "Explore more ..." links**

- Use the payload's **per-block** pagination.nextCursor to fetch more of
  the **same block** (if your design includes in-place "Load more").

- If your design uses **"Explore more Projects/Services/Teams/Talent"**
  as navigation, link to the **same route** with the kind-specific path
  already in use (/c/{l1}/projects, /c/{l1}/{l2}/services, etc.).

- The **route** will render the correct level component automatically
  based on slugPath length.

> "Explore more ..." navigates to the single-type page for the **current
> L1/L2/L3 context**, not a separate app. (No extra code needed beyond
> links.)

## **7) Migration plan (what to do first)**

To minimize churn and keep diffs clean:

1.  **By listing type first** (Projects → Services → Teams → Talent).

    - Reason: Within a type, you'll reuse the same atoms (cards,
      headers, filters).

2.  Inside each type, port **L1 → L2 → L3** (top-down).

    - Reason: L1 establishes shared atoms; L2/L3 typically specialize
      them.

3.  Delete the old temp/level-\* routes once each type is
    parity-complete.

## **8) Styling organization**

- **Keep separate styles per level** where layouts diverge a lot (your
  case: heroes, grid sizes, sidebars).

- Extract **shared atoms** (cards, headers, chips) to shared files to
  avoid duplication.

## **9) Developer checklist (copy/paste)**

- Create
  src/features/category-pages/lib/{parseCategory,fetchCategoryPage}.ts.

- Add one page.tsx per listing type under app/c/\[\...category\]/.

- Add three level components per type under
  src/features/category-pages/{type}/.

- Route files fetch once (SSR) via **Category Pages API** and pass
  payload.

- Level components do **no fetching**; they render payload only.

- "Explore more ..." links point to the **same type route** for the
  current L1/L2/L3.

- Remove temp/level-\* pages after parity.

### **Notes & boundaries**

- If a level shows a **different grid** or **different sections**, keep
  that logic inside the **L1/L2/L3 level components**, not the route
  file.

- Keep the route files dumb: **parse → fetch → delegate**.
