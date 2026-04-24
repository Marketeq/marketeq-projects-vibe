**Marketeq Home Page**

**Homepage Assembler & Evaluator Integration**

*How the API gateway assembles homepage content using evaluators, the
page assembler, and Tax Group rules*

Date: April 5, 2026

Scope: Backend Only

**1. Architecture Context**

The homepage module leverages existing infrastructure rather than
building from scratch. This section outlines the key architectural
principles.

-   The homepage module lives at apps/api-gateway/src/homepage/

-   It REUSES the existing category-pages evaluator/assembler
    infrastructure at apps/api-gateway/src/category-pages/

-   No new assembler is needed --- the homepage service acts as the
    orchestrator and calls into the existing EvaluatorFactory

**Data Flow Architecture**

The data moves through several key stages in sequence:

1.  CMS Config --- Homepage configuration is fetched from the CMS API

2.  HomepageService --- Orchestrates the assembly process by iterating
    through sections

3.  EvaluatorFactory --- Dispatches to entity-specific evaluators based
    on rule configuration

4.  Entity Evaluators --- Each evaluator applies scoring logic based on
    entity type and kind

5.  PostgreSQL --- Evaluators query the listings database for candidates

6.  Assembled Blocks --- Results are assembled into HomepageBlock and
    HomepageSection objects

**2. Evaluator Factory**

**2.1 Existing Architecture**

**File:**
apps/api-gateway/src/category-pages/evaluators/evaluator.factory.ts

The EvaluatorFactory is a central dispatch mechanism that routes
evaluation requests to the appropriate entity evaluator based on two
dimensions:

-   **Entity Type:** projects, services, teams, or talent

-   **Kind:** top-rated, trending, newest, or most-popular

Each entity evaluator implements its own scoring logic for top-rated,
trending, and newest kinds. The most-popular kind is handled by a
dedicated cross-entity evaluator that works uniformly across all entity
types.

**2.2 Entity Evaluators (Existing)**

Each entity evaluator handles multiple kind patterns adapted to the
entity\'s specific metrics:

**ProjectsEvaluator:** Handles projects with top-rated (rating 40%,
completions 15%, revenue 15%, CTR 10%, admin boost 10%, HF score 10%),
trending (CTR 40%, impressions 30%, recency penalty), and newest
(created_at DESC)

**ServicesEvaluator:** Same kind patterns adapted for service-specific
metrics

**TeamsEvaluator:** Adapted for team composition and collaboration
metrics

**TalentEvaluator:** Adapted for individual talent profile metrics

**2.3 Most Popular Evaluator (New)**

**File:**
apps/api-gateway/src/category-pages/evaluators/most-popular.evaluator.ts

The MostPopularEvaluator is a cross-entity evaluator that works
uniformly across all entity types. It uses a unified blend of signals
that indicate popularity across the entire platform.

**Scoring Blend**

  --------------------- -------------------------------------------------
  **Signal**            **Weight**

  **Completions**       40%

  **Views (90d)**       35%

  **Recency**           15%

  **Admin Boost**       10%
  --------------------- -------------------------------------------------

**Implementation Details**

  -----------------------------------------------------------------------
  // MostPopularEvaluator scoring formula\
  score(listing) {\
  const normCompletions = listing.completions / maxCompletions;\
  const normViews = listing.views90d / maxViews;\
  const normRecency = 1 - (daysSinceUpdate / 90);\
  const normBoost = listing.adminBoost / 100;\
  \
  return (normCompletions \* 0.40) +\
  (normViews \* 0.35) +\
  (normRecency \* 0.15) +\
  (normBoost \* 0.10);\
  }

  -----------------------------------------------------------------------

Normalization is relative to the maximum value in the current pool of
candidates. Recency decay is linear over a 90-day window.

**2.4 EvalContext Interface**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  **categoryIds?**      Filter by category subtree; undefined for
                        homepage means cross-category evaluation

  **excludeIds?**       IDs already shown in prior blocks/sections; used
                        for global deduplication
  --------------------- -------------------------------------------------

**3. Evaluation Pipeline**

**3.1 Step-by-Step Flow with Code**

The HomepageService.assembleSections() method orchestrates the complete
evaluation pipeline:

  -----------------------------------------------------------------------
  async assembleSections(config, context) {\
  const sections = \[\];\
  const globalExcludeIds = new Set();\
  \
  for (const section of config.sections) {\
  const blocks = \[\];\
  \
  for (const rule of section.rules) {\
  // Hybrid mode: fetch pinned items first\
  let items = \[\];\
  if (rule.manualEnabled && rule.pinnedIds?.length) {\
  const pinned = await this.fetchPinnedItems(rule.pinnedIds);\
  items = pinned;\
  pinned.forEach(p =\> globalExcludeIds.add(p.id));\
  }\
  \
  // Evaluate for remaining slots\
  const adjustedLimit = rule.limit - items.length;\
  const evalContext = {\
  categoryIds: rule.categoryIds,\
  excludeIds: Array.from(globalExcludeIds)\
  };\
  const evaluated = await this.evaluatorFactory.evaluate(\
  rule.entity,\
  rule.kind,\
  adjustedLimit,\
  evalContext\
  );\
  \
  items.push(\...evaluated);\
  evaluated.forEach(e =\> globalExcludeIds.add(e.id));\
  \
  // Apply carousel guard\
  if (rule.carousel && items.length \>= rule.gridSize \* 3) {\
  blocks.push({\
  type: \'carousel\',\
  items,\
  gridSize: rule.gridSize,\
  maxPages: 10\
  });\
  } else if (items.length \> 0) {\
  blocks.push({ type: \'grid\', items, gridSize: rule.gridSize });\
  }\
  }\
  \
  if (blocks.length \> 0) {\
  sections.push({ title: section.title, blocks });\
  }\
  }\
  \
  return sections;\
  }

  -----------------------------------------------------------------------

**3.2 Deduplication Strategy**

A global exclude list is maintained across all sections to prevent the
same listing from appearing multiple times on the homepage:

-   When a listing appears in Section A, its ID is added to
    globalExcludeIds

-   Subsequent evaluators in Section B, C, etc. receive this exclude
    list and filter out those IDs

-   Pinned (manual) items are also added to the exclude list after they
    are selected

-   This ensures perfect deduplication across all sections and all
    blocks within sections

**3.3 Carousel Guard Logic**

The carousel rendering decision is controlled by a simple heuristic:

-   A block is rendered as a carousel ONLY when: rule.carousel === true
    AND items.length \>= gridSize \* 3

-   If these conditions are not met, the block falls back to a grid
    layout

-   Max carousel pages is capped at 10 to prevent infinite scrolling
    experiences

-   If items \< gridSize, the block is suppressed entirely (empty blocks
    are filtered out)

**3.3 Fallback Behavior**

The system handles missing or empty results gracefully:

-   If an evaluator returns 0 results (no active listings match the
    criteria), the block is suppressed

-   If ALL blocks in a section are empty, the entire section is
    suppressed

-   The frontend receives only sections with content --- no empty
    placeholder sections

-   Minimum content threshold: at least 1 item in at least 1 block per
    section

**4. Hybrid Mode (Manual Override)**

**4.1 How It Works**

Hybrid mode allows CMS admins to combine manual (pinned) items with
rule-based evaluation:

**When manualEnabled=true**

-   Pinned items go first in the order set by the CMS admin

-   Evaluator fills remaining slots: adjustedLimit = rule.limit -
    pinnedItems.length

-   Pinned items are excluded from evaluator results to prevent
    duplicates

-   Example: limit=10, pinnedIds has 3 items → evaluator returns up to 7
    items

**When manualEnabled=false**

-   100% rule-based evaluation, no pinned items

-   pinnedItems field is ignored even if populated in CMS config

-   All slots are filled by the evaluator

**4.2 Pinned Item Fetching**

Full implementation of fetchPinnedItems():

  -----------------------------------------------------------------------
  async fetchPinnedItems(pinnedIds) {\
  const ids = pinnedIds.filter(id =\> id); // filter nulls\
  if (!ids.length) return \[\];\
  \
  // Call CMS API with in clause\
  const response = await this.cmsClient.get(\'/api/listings\', {\
  where: { id: { in: ids } }\
  });\
  \
  // Map back to preserve CMS-defined order\
  const itemMap = new Map(response.items.map(i =\> \[i.id, i\]));\
  const ordered = ids\
  .map(id =\> itemMap.get(id))\
  .filter(item =\> item !== undefined);\
  \
  return ordered; // Order preserved, no re-sorting\
  }

  -----------------------------------------------------------------------

Pinned items maintain the CMS-defined order and are not re-sorted by the
evaluator.

**5. Scoring Deep Dive**

**5.1 Top-Rated Blend (Existing)**

The top-rated blend combines multiple quality signals into a composite
score:

  --------------------- -------------------------------------------------
  **Signal**            **Weight & Description**

  **Rating**            40% --- Average rating (0-5 stars)

  **Completions**       15% --- Number of completed engagements

  **Revenue**           15% --- Total revenue generated

  **CTR**               10% --- Click-through rate from listings pages

  **Admin Boost**       10% --- Manual editorial boost (0-100)

  **HF Score**          10% --- Health factor / quality score
  --------------------- -------------------------------------------------

**5.2 Trending Blend (Existing)**

The trending blend focuses on recent engagement velocity:

  --------------------- -------------------------------------------------
  **Signal**            **Weight**

  **CTR**               40% --- Recent click-through rate

  **Impressions**       30% --- Recent impression count

  **Recency Penalty**   30% --- Decay based on last activity
  --------------------- -------------------------------------------------

**5.3 Newest**

Pure chronological ordering with no scoring:

-   ORDER BY created_at DESC

-   All items weighted equally, freshest first

-   No editorial adjustment or boost applied

**5.4 Most Popular Blend (New)**

The most-popular blend emphasizes sustained engagement and completions:

  --------------------- -------------------------------------------------
  **Signal**            **Weight**

  **Completions**       40% --- Number of completed engagements

  **Views (90d)**       35% --- View count in last 90 days

  **Recency**           15% --- Decay based on last update

  **Admin Boost**       10% --- Manual editorial boost
  --------------------- -------------------------------------------------

**Full Scoring Formula**

  -----------------------------------------------------------------------
  computeScore(listing, pool) {\
  // Find max values in pool for normalization\
  const maxCompletions = Math.max(\...pool.map(l =\> l.completions));\
  const maxViews = Math.max(\...pool.map(l =\> l.views90d));\
  \
  // Normalize each signal \[0, 1\]\
  const normComp = listing.completions / (maxCompletions \|\| 1);\
  const normViews = listing.views90d / (maxViews \|\| 1);\
  const daysSince = Math.max(0,\
  (Date.now() - listing.lastUpdated) / (1000 \* 60 \* 60 \* 24)\
  );\
  const normRecency = Math.max(0, 1 - (daysSince / 90));\
  const normBoost = listing.adminBoost / 100;\
  \
  // Weighted sum\
  const score = (normComp \* 0.40) +\
  (normViews \* 0.35) +\
  (normRecency \* 0.15) +\
  (normBoost \* 0.10);\
  \
  return score;\
  }

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Note:** Normalization is relative to the maximum value in the current
  pool of candidates. This ensures fair comparison even when the absolute
  numbers vary widely.

  -----------------------------------------------------------------------

**6. Integration with Homepage Module**

**6.1 Module Dependency Graph**

The homepage module builds on top of the category-pages module:

-   HomepageModule imports CategoryPagesModule

-   CategoryPagesModule exports EvaluatorFactory and PageAssembler

-   HomepageService injects EvaluatorFactory from the DI container

-   EvaluatorFactory injects all entity evaluators (Projects, Services,
    Teams, Talent)

-   EvaluatorFactory also injects MostPopularEvaluator for cross-entity
    queries

**6.2 Provider Registration**

MostPopularEvaluator must be registered in CategoryPagesModule:

  -----------------------------------------------------------------------
  \@Module({\
  imports: \[TypeOrmModule.forFeature(\[Listing\])\],\
  providers: \[\
  EvaluatorFactory,\
  ProjectsEvaluator,\
  ServicesEvaluator,\
  TeamsEvaluator,\
  TalentEvaluator,\
  MostPopularEvaluator\
  \],\
  exports: \[\
  EvaluatorFactory,\
  MostPopularEvaluator\
  \]\
  })\
  export class CategoryPagesModule {}

  -----------------------------------------------------------------------

**6.3 Request Lifecycle**

End-to-end flow from HTTP request to cached response:

7.  HTTP GET /api/homepage hits HomepageController

8.  Controller reads cookies and query params (country code, category
    filters, etc.)

9.  Controller calls HomepageService.getHomepage(context)

10. Service checks Redis cache with context hash as key

11. On cache hit: return cached result

12. On miss: Service calls CMS API for homepage config and banner data

13. Service calls assembleSections() which loops through Tax Group
    sections

14. For each rule: EvaluatorFactory.evaluate() dispatches to correct
    evaluator

15. Evaluator queries PostgreSQL listings table (typically 3x limit
    rows)

16. Evaluator scores and ranks listings using entity-specific logic

17. Service assembles blocks and sections into HomepageResponse

18. Service caches result in Redis with TTL (typically 5-10 minutes)

19. Controller returns JSON response to client

**7. Performance Considerations**

**Database Query Optimization**

-   Evaluator queries should use proper indexes on listings table:
    (entity_type, kind, created_at)

-   Pool size for scoring: 3x the requested limit (balance between
    ranking quality and DB load)

-   Each evaluator makes one parameterized query with excludeIds filter

-   Typical homepage: 3-6 rules = 3-6 database queries

**API Calls**

-   1 call to CMS API to fetch homepage config

-   1 call to CMS API to fetch banner/promotional content

-   These calls are often cached at the CMS level

**Assembly Time**

-   Expected assembly time: 200-400ms on cache miss

-   Dominated by database queries, not evaluator logic

-   Redis cache reduces subsequent requests to \<10ms

-   TTL recommendation: 5-10 minutes depending on update frequency

**Scalability Notes**

-   Parallel evaluation is possible (each rule is independent) but not
    implemented in MVP

-   Sequential evaluation is simpler and sufficient for typical homepage
    sizes

-   If homepage grows to \>10 sections with \>20 rules, consider
    Promise.all() parallelization

-   Always measure before optimizing --- the bottle neck is typically
    DB, not orchestration
