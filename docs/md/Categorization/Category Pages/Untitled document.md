Got it. I'll give you **two tight docs**---one for the **Next.js
slug/routing for Project listings** (so the 404 goes away), and a
separate one for **Strapi ↔ Listing integration** (so projects in Strapi
can sync and resolve by slug). No fluff, just what your dev needs.

# **Doc A --- Project Details Routing (Next.js)**

**Goal:** Fix 404 by adding a dynamic route and wiring it to the backend
details API.\
**Audience:** Front-end dev (Next.js).\
**Package manager:** use the one you standardized (e.g.,
pnpm)---commands omitted here on purpose.

## **1) File & route structure**

- **Create:** apps/web/app/project-details/\[slug\]/page.tsx

- **Optional segment name:** \[slug\] (lowercase)

- **Resulting URLs:\**

  - /project-details/my-project-slug

> Your cards should link to /project-details/\${slug} (keep using the
> slug already in the payload).

## **2) Server fetch helper**

**Path:** apps/web/lib/api/projectDetails.ts

// Server-only helper: front end calls the aggregator (Nest) --- not
downstream services directly.

export async function fetchProjectBySlug(slug: string) {

const url =
\`\${process.env.NEST_API}/api/listings/projects/\${encodeURIComponent(slug)}\`;

const res = await fetch(url, { headers: { Accept: \'application/json\'
}, cache: \'no-store\' });

if (res.status === 404) return null;

if (!res.ok) throw new Error(\`Project fetch failed \${res.status}\`);

return res.json() as Promise\<{

uuid: string;

slug: string;

title: string;

summary?: string;

price_from?: number;

images?: { url: string; alt?: string }\[\];

// ...any other fields you expose

}\>;

}

## **3) Dynamic route page**

**Path:** apps/web/app/project-details/\[slug\]/page.tsx

import { notFound } from \'next/navigation\';

import { fetchProjectBySlug } from \'@/lib/api/projectDetails\';

type Params = { slug: string };

export default async function ProjectDetailsPage({ params }: { params:
Params }) {

const data = await fetchProjectBySlug(params.slug);

if (!data) return notFound();

return (

\<main\>

\<h1 className=\"text-2xl font-semibold\"\>{data.title}\</h1\>

{data.summary && \<p className=\"mt-2
text-gray-600\"\>{data.summary}\</p\>}

{/\* images \*/}

{!!data.images?.length && (

\<section className=\"mt-6 grid gap-3 grid-cols-2 md:grid-cols-3\"\>

{data.images.map((img, i) =\> (

\<img key={i} src={img.url} alt={img.alt ?? data.title}
className=\"rounded\" /\>

))}

\</section\>

)}

{/\* add your specs/pricing/components exactly as your design expects
\*/}

\</main\>

);

}

## **4) Card link (where you render project cards)**

Ensure the card points to the new route:

\<a href={\`/project-details/\${project.slug}\`}
className=\"block\"\>\...\</a\>

## **5) SEO**

If you want per-project SSR SEO:

export async function generateMetadata({ params }: { params: Params })
{

const data = await fetchProjectBySlug(params.slug);

if (!data) return {};

return {

title: data.title,

description: data.summary?.slice(0, 160),

alternates: { canonical:
\`\${process.env.NEXT_PUBLIC_SITE_ORIGIN}/project-details/\${data.slug}\`
}

};

}



# **Doc B --- Projects in Strapi & Sync to Listing (backend contract)**

**Goal:** Allow Projects that exist/edit in **Strapi** to sync into the
**Listing domain** your backend exposes to the site, with **slug** as
the stable path key.\
**Audience:** Backend/Strapi dev, and the Categories backend dev for
expectations.\
**Source of truth:** Your Listing layer served by Nest (the frontend
calls only Nest). Strapi is for **admin editing + push**.

## **1) Strapi content-type (minimal fields for slug + display)**

- **Content type:** project (collection type)

  - title (string, required)

  - slug (UID from title, required, **unique**)

  - summary (text)

  - images (media, multiple)

  - price_from (decimal or integer)

  - categories (many-to-many → category)

  - (any other editorial fields you already use)

> This mirrors what the Listing layer needs. If project already exists
> in Strapi, **do not rename**; just ensure slug is unique and
> published.

## **2) Webhook (Strapi → Nest)**

- **Trigger:** on project **create/update/publish/unpublish\**

- **Endpoint (Nest aggregator):** POST
  \${NEST_API}/internal/ingest/project

- **Body (example):\**

****{

\"uuid\": \"project-uuid-or-null-if-generated-in-Nest\",

\"slug\": \"my-project-slug\",

\"title\": \"My Project\",

\"summary\": \"Short summary...\",

\"images\": \[{\"url\":\"https://cdn/.../img1.jpg\",\"alt\":\"...\"}\],

\"price_from\": 5000,

\"categoryUuids\": \[\"\<uuid-of-L1-or-L2-or-L3\>\"\],

\"published\": true

}

> If you rely on **category slugs** instead of UUIDs, send
> categorySlugs:
> \[\[\"software-development\"\],\[\"software-development\",\"blockchain\"\],\[\"software-development\",\"blockchain\",\"smart-contracts\"\]\]
> so the backend can resolve to UUIDs.

**Strapi setup hint:** Use Strapi's **webhooks** UI (Settings →
Webhooks) or a lifecycle hook in project to fetch the Nest URL with an
internal auth header.

## **3) Nest "ingest" handler (simplified)**

**Path:** apps/categories/src/ingest/projects.controller.ts (or wherever
your ingest lives)

import { Controller, Post, Headers, Body, HttpCode } from
\'@nestjs/common\';

import { IngestService } from \'./ingest.service\';

\@Controller(\'internal/ingest\')

export class IngestController {

constructor(private readonly svc: IngestService) {}

\@Post(\'project\')

\@HttpCode(204)

async upsertProject(

\@Headers(\'x-internal-key\') key: string,

\@Body() dto: any

) {

// verify internal key

if (key !== process.env.INTERNAL_SYNC_KEY) throw new
Error(\'unauthorized\');

await this.svc.upsertProjectFromStrapi(dto); // map → listing store

}

}

**Service idea:**

- Upsert by **slug** (or UUID if you keep one).

- Normalize images to your CDN URLs.

- Materialize category relations using UUIDs or (l1/l2/l3) slug paths.

## **4) Public read endpoint (used by Project Details page)**

- **Endpoint:** GET \${NEST_API}/api/listings/projects/:slug

- **Purpose:** Return a single project by slug for the new page.

- **Response (example):\**

****{

\"uuid\":\"...\",

\"slug\":\"my-project-slug\",

\"title\":\"My Project\",

\"summary\":\"...\",

\"images\":\[{\"url\":\"...\"}\],

\"price_from\":5000,

\"categories\":\[

{\"uuid\":\"...\",\"level\":2,\"name\":\"Blockchain\",\"slugPath\":\[\"software-development\",\"blockchain\"\]}

\],

\"seo\":{\"title\":\"...\",\"description\":\"...\",\"canonical\":\"...\"}

}

> Note: This **read endpoint** can be served by the same Nest app that
> serves Category Pages; it simply proxies/reads from your Listing
> store. The browser never calls downstream microservices directly.

## **5) Where the slug comes from**

- In **Strapi**, project.slug is auto-generated from title (editor can
  override).

- When a project is **published** (or updated), Strapi pushes it to Nest
  via webhook with that **slug**.

- The **Category Pages API** already returns each card's slug. Cards
  link to /project-details/\${slug}.

## **6) CSV import (optional)**

If you bulk import projects to Strapi:

- Use Strapi's importer (or a small script) to create project entries
  with **unique slug**.

- After import, **publish** them (or programmatically set published),
  which fires the webhook to Nest.

- No frontend change needed---the details page will resolve by slug once
  Nest has them.

## **Quick checklist for the team**

**Frontend**

- Add apps/web/app/project-details/\[slug\]/page.tsx

- Link cards to /project-details/\${slug} (already in the payload)

- Use fetchProjectBySlug(slug) → GET /api/listings/projects/:slug

**Strapi**

- Ensure project type has **unique slug** (and is publishable)

- Add webhook on project publish/update → POST /internal/ingest/project
  (+ x-internal-key)

- Include category relations (UUIDs or slug paths)

**Nest**

- Implement POST /internal/ingest/project (upsert in listing store)

- Expose GET /api/listings/projects/:slug
