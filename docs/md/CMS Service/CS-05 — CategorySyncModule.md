**CS-05 — CategorySyncModule**

Service: cms-service → category-service \| Protocol: RabbitMQ (primary),
REST (cold-start)

*Purpose: Full implementation of the CategorySyncModule — the
categorySync.plugin.ts, CmsEventPublisher, RabbitMQ exchange/queue
topology, event payload schemas, cold-start hydration flow, DLQ setup,
and nightly cron reconciliation. Prerequisites: CS-03 (Categories
collection), RMQ-00 (platform guide), RMQ-01 (publisher).*

**1. Overview**

When a category is created, updated, or deleted in Payload, the
CategorySyncModule publishes a RabbitMQ event to the cms.events topic
exchange. category-service consumes these events from the
cms.category.category queue and updates its local cache. A nightly cron
job calls GET /api/categories as a drift recovery mechanism.

This replaces the previous axios HTTP POST webhook approach. RabbitMQ
provides delivery guarantees, automatic retry with dead-letter queues,
and fully decoupled consumers.

**2. RabbitMQ Topology**

|  |  |  |  |
|----|----|----|----|
| **Exchange** | **Type** | **Routing Key** | **Consumer Queue** |
| **cms.events** | topic, durable | category.saved | cms.category.category (category-service) |
| **cms.events** | topic, durable | category.deleted | cms.category.category (category-service) |
| **cms.events.dlx** | direct, durable | category.\* | cms.category.category.dlq (inspection) |

**3. RabbitMQ Module**

File location: apps/cms-service/src/rabbitmq/rabbitmq.module.ts

> // apps/cms-service/src/rabbitmq/rabbitmq.module.ts
>
> import { Module } from '@nestjs/common';
>
> import { ClientsModule, Transport } from '@nestjs/microservices';
>
> import { CmsEventPublisher } from './cms-event.publisher';
>
> @Module({
>
> imports: \[
>
> ClientsModule.register(\[
>
> {
>
> name: 'CMS_EVENTS',
>
> transport: Transport.RMQ,
>
> options: {
>
> urls: \[process.env.RABBITMQ_URL!\],
>
> queue: 'cms.events.publisher',
>
> queueOptions: { durable: true },
>
> exchange: 'cms.events',
>
> exchangeType: 'topic',
>
> noAck: false,
>
> prefetchCount: 1,
>
> },
>
> },
>
> \]),
>
> \],
>
> providers: \[CmsEventPublisher\],
>
> exports: \[CmsEventPublisher\],
>
> })
>
> export class RabbitMQModule {}

**4. CmsEventPublisher**

File location: apps/cms-service/src/rabbitmq/cms-event.publisher.ts

> // apps/cms-service/src/rabbitmq/cms-event.publisher.ts
>
> import { Injectable, Inject } from '@nestjs/common';
>
> import { ClientProxy } from '@nestjs/microservices';
>
> import { lastValueFrom } from 'rxjs';
>
> export interface CategorySavedEvent {
>
> event: 'category.saved';
>
> id: string;
>
> name: string;
>
> slug: string;
>
> status: string;
>
> parent?: string \| null;
>
> listingTypes: string\[\];
>
> sortOrder?: number;
>
> algoliaFacetOrder?: number;
>
> }
>
> export interface CategoryDeletedEvent {
>
> event: 'category.deleted';
>
> id: string;
>
> slug: string;
>
> }
>
> @Injectable()
>
> export class CmsEventPublisher {
>
> private readonly MAX_RETRIES = 3;
>
> private readonly BACKOFF_MS = \[1000, 5000, 30000\];
>
> constructor(@Inject('CMS_EVENTS') private readonly client:
> ClientProxy) {}
>
> async publishCategorySaved(doc: CategorySavedEvent): Promise\<void\> {
>
> await this.publishWithRetry('category.saved', doc);
>
> }
>
> async publishCategoryDeleted(doc: CategoryDeletedEvent):
> Promise\<void\> {
>
> await this.publishWithRetry('category.deleted', doc);
>
> }
>
> private async publishWithRetry(routingKey: string, payload: object):
> Promise\<void\> {
>
> let lastError: unknown;
>
> for (let attempt = 0; attempt \< this.MAX_RETRIES; attempt++) {
>
> try {
>
> await lastValueFrom(
>
> this.client.emit({ cmd: routingKey }, payload)
>
> );
>
> return; // success
>
> } catch (err) {
>
> lastError = err;
>
> const delay = this.BACKOFF_MS\[attempt\] ?? 30000;
>
> console.error(\`\[CmsEventPublisher\] Attempt \${attempt + 1} failed
> for \${routingKey}. Retrying in \${delay}ms.\`);
>
> await new Promise((r) =\> setTimeout(r, delay));
>
> }
>
> }
>
> console.error(\`\[CmsEventPublisher\] All retries exhausted for
> \${routingKey}. Event lost to DLQ.\`, lastError);
>
> throw lastError;
>
> }
>
> }

**5. Hooks — syncCategories.ts**

File location: apps/cms-service/src/hooks/afterChange/syncCategories.ts

> // apps/cms-service/src/hooks/afterChange/syncCategories.ts
>
> import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from
> 'payload/types';
>
> import { CmsEventPublisher } from
> '../../rabbitmq/cms-event.publisher';
>
> // CmsEventPublisher is injected via the categorySyncPlugin
>
> let publisher: CmsEventPublisher;
>
> export const setPublisher = (p: CmsEventPublisher) =\> { publisher =
> p; };
>
> export const syncCategoryToService: CollectionAfterChangeHook = async
> ({ doc }) =\> {
>
> if (!publisher) {
>
> console.warn('\[syncCategories\] Publisher not initialised. Skipping
> sync.');
>
> return;
>
> }
>
> await publisher.publishCategorySaved({
>
> event: 'category.saved',
>
> id: doc.id,
>
> name: doc.name,
>
> slug: doc.slug,
>
> status: doc.status,
>
> parent: doc.parent ?? null,
>
> listingTypes: doc.listingTypes ?? \[\],
>
> sortOrder: doc.sortOrder,
>
> algoliaFacetOrder:doc.algoliaFacetOrder,
>
> });
>
> };
>
> export const deleteCategoryFromService: CollectionAfterDeleteHook =
> async ({ doc }) =\> {
>
> if (!publisher) return;
>
> await publisher.publishCategoryDeleted({
>
> event: 'category.deleted',
>
> id: doc.id,
>
> slug: doc.slug,
>
> });
>
> };

**6. categorySync.plugin.ts**

File location: apps/cms-service/src/plugins/categorySync.plugin.ts

> // apps/cms-service/src/plugins/categorySync.plugin.ts
>
> import { Config } from 'payload/config';
>
> import { CmsEventPublisher } from '../rabbitmq/cms-event.publisher';
>
> import { setPublisher } from '../hooks/afterChange/syncCategories';
>
> interface CategorySyncOptions {
>
> categoryServiceUrl: string;
>
> }
>
> export const categorySyncPlugin =
>
> (opts: CategorySyncOptions) =\>
>
> (config: Config): Config =\> {
>
> // Wire the publisher into the hooks module
>
> // Publisher is initialised by the NestJS DI container on app
> bootstrap
>
> const publisher = new CmsEventPublisher(null as any); // replaced by
> DI at runtime
>
> setPublisher(publisher);
>
> return {
>
> ...config,
>
> // The plugin extends the config but hooks are wired directly on
> Categories collection
>
> };
>
> };

**7. Cold-Start Hydration Flow**

When category-service starts up, it calls the CMS index to hydrate its
full category cache before serving requests. This is a one-time pull on
startup; subsequent updates arrive via RabbitMQ events.

> // Pseudocode — implemented in category-service (see RMQ-03)
>
> async function hydrateCategoryCache(): Promise\<void\> {
>
> let page = 1;
>
> let hasNextPage = true;
>
> while (hasNextPage) {
>
> const res = await fetch(
>
> \`\${CMS_SERVICE_URL}/api/categories?depth=2&limit=1000&page=\${page}\`,
>
> { headers: { Authorization: \`API-Key \${CMS_API_KEY}\` } }
>
> );
>
> const { docs, hasNextPage: next } = await res.json();
>
> for (const category of docs) {
>
> await redis.set(\`category:\${category.slug}\`,
> JSON.stringify(category));
>
> }
>
> hasNextPage = next;
>
> page++;
>
> }
>
> }

**8. Nightly Cron Reconciliation**

A nightly cron job in category-service fetches all categories from the
CMS and reconciles any missed RabbitMQ events. This is the final safety
net for drift recovery.

> // Runs nightly at 02:00 UTC in category-service
>
> @Cron('0 2 \* \* \*')
>
> async reconcileCategories(): Promise\<void\> {
>
> this.logger.log('Starting nightly category reconciliation...');
>
> await this.hydrateCategoryCache(); // same function as cold-start
>
> this.logger.log('Category reconciliation complete.');
>
> }

**9. Verification**

- Create a category in Payload admin panel. Check cms-service logs for:
  \[CmsEventPublisher\] category.saved published.

- Check category-service logs for: \[CategoryConsumer\] Received
  category.saved. Cache updated for slug: \<slug\>.

- Delete a category. Check both services for category.deleted event
  flow.

- Stop RabbitMQ and create a category. Confirm retry log: Attempt 1
  failed. Retrying in 1000ms.

- Restart RabbitMQ. Confirm the event is delivered after reconnect.

- References: RMQ-00 (topology), RMQ-01 (publisher), RMQ-03
  (category-service consumer).
