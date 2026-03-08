# Category Pages --- Pagination & Suggestions

## Step 1 --- Confirm the page payload & block model

Explanation: Keep the unified page payload (level, slugPath,
breadcrumbs, hero) and blocks\[\] with independent per‑block pagination;
do not change field names.

Folder path: /apps/api/src/category-pages/types.ts

## Step 2 --- Add cursor utilities (encode/decode)

Explanation: Provide a single utility to create opaque base64 cursors
and to decode them using stable sort keys (uuid or (createdAt,id)).

Folder path: /apps/api/src/category-pages/pagination.utils.ts

+-----------------------------------------------------------------------+
| TypeScript                                                            |
|                                                                       |
| // pagination.utils.ts                                                |
|                                                                       |
| **export function** encodeCursor(key: { id?: string; createdAt?:      |
| string })                                                             |
|                                                                       |
| return Buffer.from(JSON.stringify(key)).toString(\'base64url\')       |
|                                                                       |
| }                                                                     |
|                                                                       |
| **export function** decodeCursor(token?: string): { id?: string;      |
| createdAt?: string } \| null {                                        |
|                                                                       |
| if (!token) return null                                               |
|                                                                       |
| try {                                                                 |
|                                                                       |
| return JSON.parse(Buffer.from(token,                                  |
| \'base64url\').toString(\'utf8\')))                                   |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| return null                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## Step 3 --- Controller: accept kind, cursor, limit (≤10) and pass through

Explanation: Read ?kind=&cursor=&limit= from the request, clamp limit to
10, and pass to the service; return the assembled page payload.

Folder path: /apps/api/src/category-pages/category-pages.controller.ts

+-----------------------------------------------------------------------+
| TypeScript                                                            |
|                                                                       |
| // category-pages.controller.ts (excerpt)                             |
|                                                                       |
| \@Get(\'/api/category-pages/:l1/:l2?/:l3?\')                          |
|                                                                       |
| async getPage(@Query(\'kind\') kind: string, \@Query(\'cursor\')      |
| cursor?: string, \@Query(\'limit\') limitRaw?: string, )              |
|                                                                       |
| {                                                                     |
|                                                                       |
| const limit = Math.min(Number(limitRaw \|\| 10), 10)                  |
|                                                                       |
| return this.service.getPage({ slugPath: params, kind, cursor, limit   |
| })                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## Step 4 --- Service/Assembler: apply per-block limit and nextCursor only to the active block

Explanation: The service routes to the evaluator for the requested
block, enforces limit ≤10, sets nextCursor for that block only, and
leaves other blocks unchanged.

Folder path: /apps/api/src/category-pages/category-pages.service.ts;
/apps/api/src/category-pages/assembler.ts

+-----------------------------------------------------------------------+
| TypeScript                                                            |
|                                                                       |
| // assembler.ts (projects example)                                    |
|                                                                       |
| const LIMIT = Math.min(Number(q.limit \|\| 10), 10)                   |
|                                                                       |
| const items = await evaluators.projects.list({ slugPath, cursor:      |
| q.cursor, limit: LIMIT })                                             |
|                                                                       |
| const nextCursor = items.length === LIMIT ? encodeCursor({ id:        |
| items.items\[items.length - 1\].id }) : undefined                     |
|                                                                       |
| blocks.push({ type: \'projects\', items, pagination: nextCursor ? {   |
| nextCursor } : undefined, viewMoreUrl})                               |
+=======================================================================+

## Step 5 --- Adapters/Repos: propagate cursor & limit

Explanation: Update signatures to accept {cursor, limit} and implement
stable ordering to support cursor pagination for each block
(projects/services/teams/talent).

Folder path: /apps/api/src/category-pages/adapters/\*.ts;
/apps/api/src/categories/categories.repo.ts

+-----------------------------------------------------------------------+
| TypeScript                                                            |
|                                                                       |
| // listing.adapter.ts (signature)                                     |
|                                                                       |
| async function queryProjects(params: { slugPath: string\[\]; cursor?: |
| { id?: string; createdAt?: string }; limit: number }):                |
| Promise\<ProjectCard\[\]\> {                                          |
|                                                                       |
| // translate cursor -\> WHERE and ORDER BY created_at DESC, id DESC   |
| (tie-breaker)                                                         |
|                                                                       |
| }                                                                     |
+=======================================================================+

## Step 6 --- Page limits & "View more ..."

Explanation: Each carousel shows max 10 items and exposes viewMoreUrl to
L1/L2/L3 listing pages; there is no in-carousel Load More button.

Folder path: /apps/api/src/category-pages/evaluators/\* (limit
enforcement); /apps/api/src/category-pages/assembler.ts (viewMoreUrl)

## Step 7 --- Suggestions: local heuristics now; pgvector later

Explanation: Implement suggestions using local repository heuristics
(related/trending/skills) for v1 and document pgvector as a future
enhancement, not a requirement today.

Folder path: /apps/api/src/category-pages/suggestions.service.ts;
/apps/api/src/categories/categories.repo.ts; (future)
/apps/api/src/db/migrations/\*\_pgvector_categories.sql;
/apps/workers/embed-categories/\*

## Step 8 --- Editorial blocks & mock data (temporary)

Explanation: Seed minimal mock data for hero/guides/courses in dev to
unblock FE until Strapi integration is wired via the editorial proxy.

Folder path: /apps/api/src/category-pages/editorial.proxy.ts;
/apps/web/components/category/\*; /apps/api/.env.development

## Step 9 --- QA & acceptance scope

Explanation: Validate independent per-block cursors, 10-item cap,
suggestions links, and kind routes; include tests for TypeORM COUNT
aliasing and avoiding virtual-relation sorts.

Folder path: /apps/web/cypress/e2e/category-pages.spec.ts;
/qa/Postman/CategoryPages.collection.json

+------------------------------------------------------------------------+
| JavaScript                                                             |
|                                                                        |
| // Postman assertions (pseudo)                                         |
|                                                                        |
| pm.test(\'limit\<=10\', () =\>                                         |
| pm.response.json().blocks.find(b=\>b.type===\'projects\').items.length |
| \<= 10)                                                                |
|                                                                        |
| pm.test(\'nextCursor optional\', () =\> \'pagination\' in              |
| pm.response.json().blocks.find(b=\>b.type===\'projects\'))             |
+========================================================================+

## API Contracts (Per-Block Pagination)

+----------------------------------------------------------------------------------+
| HTTP/JSON                                                                        |
|                                                                                  |
| GET                                                                              |
| /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]?kind=projects&cursor={TOKEN}&limit=10 |
|                                                                                  |
| GET                                                                              |
| /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]?kind=services&cursor={TOKEN}&limit=10 |
|                                                                                  |
| GET                                                                              |
| /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]?kind=teams&cursor={TOKEN}&limit=10    |
|                                                                                  |
| {                                                                                |
|                                                                                  |
| \"blocks\": \[                                                                   |
|                                                                                  |
| { \"type\": \"projects\", \"items\": \[/\* ≤ 10 \*/\], \"pagination\": {         |
| \"nextCursor\": \"opaque-token\" }, \"viewMoreUrl\": \"/c/design/ux/projects\"   |
| },                                                                               |
|                                                                                  |
| { \"type\": \"services\", \"items\": \[ \... \] }                                |
|                                                                                  |
| \]                                                                               |
|                                                                                  |
| }                                                                                |
+==================================================================================+

## Frontend usage --- Only the active block paginates

Explanation: When FE requests a new cursor for Projects, only the
Projects block advances; Services/Teams blocks remain unchanged in the
same response.

Folder path: /apps/web/pages/category/\[\...slug\].tsx;
/apps/web/lib/api/category-pages.ts

+------------------------------------------------------------------------------+
| HTTP                                                                         |
|                                                                              |
| // fetch next page for Projects only                                         |
|                                                                              |
| GET                                                                          |
| /api/category-pages/design/ux?kind=projects&cursor=eyJpZCI6IjEyMyJ9&limit=10 |
+==============================================================================+

## Ready-to-Implement Checklist (Revised)

• Add pagination.utils.ts with encodeCursor/decodeCursor (opaque base64
tokens).

• Controller passes kind/cursor/limit to service; clamp limit ≤10.

• Assembler sets nextCursor only for the active block; others unchanged.

• Adapters/Repos accept cursor+limit; use stable ORDER BY for
deterministic pagination.

• Suggestions are local (heuristics) in v1; pgvector scheduled as
future.

• QA adds tests for independent cursors, 10-item cap, TypeORM COUNT
alias, and no sort on virtual relations.
