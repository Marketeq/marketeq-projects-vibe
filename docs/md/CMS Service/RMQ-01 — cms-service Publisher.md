**RMQ-01 — cms-service Publisher**

Service: cms-service \| Exchange: cms.events \| Type: topic, durable

*Purpose: Full implementation of RabbitMQModule, CmsEventPublisher, and
the updated afterChange/afterDelete hooks that replaced the previous
axios HTTP POST approach. Prerequisites: RMQ-00 (platform guide), CS-05
(CategorySyncModule context).*

**1. What Changed**

cms-service previously used axios HTTP POST requests to push category
changes directly to category-service. This approach had no delivery
guarantees, no retry, and tight coupling between the two services. It
has been replaced entirely with RabbitMQ event publishing.

|  |  |
|----|----|
| **Previous (axios HTTP POST)** | **Current (RabbitMQ)** |
| Tight coupling — cms-service needed to know category-service URL | Decoupled — cms-service publishes to exchange; category-service binds independently |
| No delivery guarantee — HTTP failures silently dropped events | Durable queue + DLQ ensures delivery or explicit failure |
| No retry — single HTTP call, fail = data drift | 3 retries with exponential backoff before DLQ |
| Synchronous blocking in the hook — slow HTTP call held up the Payload save | Async publish — hook fires and returns; RabbitMQ handles delivery |

**2. RabbitMQModule**

File: apps/cms-service/src/rabbitmq/rabbitmq.module.ts — see CS-05
Section 3 for full code.

The module registers CMS_EVENTS as a named ClientProxy using the NestJS
RMQ transport. It is imported by the plugin bootstrap and used by
CmsEventPublisher.

**3. CmsEventPublisher — Full Implementation**

File: apps/cms-service/src/rabbitmq/cms-event.publisher.ts — see CS-05
Section 4 for full code.

Key behaviours:

- publishCategorySaved(doc) — emits routing key category.saved with the
  full category document as payload.

- publishCategoryDeleted(doc) — emits routing key category.deleted with
  the category id and slug.

- publishWithRetry(routingKey, payload) — retries up to 3 times with
  backoff 1s → 5s → 30s. Logs each attempt. After exhaustion, logs error
  and re-throws — the event is considered lost (nightly cron recovers).

**4. Event Payload Schemas**

**4.1 category.saved**

> interface CategorySavedEvent {
>
> event: 'category.saved';
>
> id: string; // Payload document ID
>
> name: string;
>
> slug: string;
>
> status: 'active' \| 'inactive';
>
> parent: string \| null; // parent category ID or null
>
> listingTypes: string\[\]; // \['project', 'service', ...\]
>
> sortOrder?: number;
>
> algoliaFacetOrder?: number;
>
> }

**4.2 category.deleted**

> interface CategoryDeletedEvent {
>
> event: 'category.deleted';
>
> id: string;
>
> slug: string;
>
> }

**5. Updated Hooks**

File: apps/cms-service/src/hooks/afterChange/syncCategories.ts — see
CS-05 Section 5 for full code.

syncCategoryToService is the afterChange hook on the Categories
collection. It calls publisher.publishCategorySaved() with the full
document from the hook context.

deleteCategoryFromService is the afterDelete hook. It calls
publisher.publishCategoryDeleted() with the document id and slug.

Both hooks are registered in Categories.ts under hooks.afterChange and
hooks.afterDelete respectively.

**6. Removed Code**

The following files and patterns are no longer used and must be deleted
if they exist in the codebase:

- Any axios or fetch call to category-service in cms-service hooks

- CategorySyncModule HTTP webhook endpoint in category-service
  (/api/cms-sync)

- CMS_SYNC_SECRET env var usage in hooks (it is still used for the
  cold-start REST pull — keep it in env, but remove from event
  publishing code)

**7. Verification**

- Create a category in Payload admin. Check cms-service logs:
  \[CmsEventPublisher\] category.saved published for id: \<id\>.

- Check category-service logs: \[CategoryConsumer\] Received
  category.saved. Slug: \<slug\>.

- Confirm no axios calls remain in cms-service hooks by running: grep -r
  'axios' apps/cms-service/src/hooks/

- References: RMQ-00 (topology), CS-05 (full CategorySyncModule), RMQ-03
  (category-service consumer).
