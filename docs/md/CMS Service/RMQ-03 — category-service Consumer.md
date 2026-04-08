**RMQ-03 — category-service Consumer**

Service: category-service \| Queue: cms.category.category \| Exchange:
cms.events

*Purpose: Hybrid app setup for category-service. Full implementation of
the category event consumer for category.saved and category.deleted.
Redis cache invalidation on event receipt. Cold-start hydration. Nightly
cron reconciliation (retained). Prerequisites: RMQ-00 (platform guide),
CS-05 (publisher and event schemas).*

**1. Hybrid App Setup**

File: apps/category-service/src/main.ts

> import { NestFactory } from '@nestjs/core';
>
> import { MicroserviceOptions, Transport } from
> '@nestjs/microservices';
>
> import { AppModule } from './app.module';
>
> async function bootstrap() {
>
> const app = await NestFactory.create(AppModule);
>
> app.connectMicroservice\<MicroserviceOptions\>({
>
> transport: Transport.RMQ,
>
> options: {
>
> urls: \[process.env.RABBITMQ_URL!\],
>
> queue: 'cms.category.category',
>
> queueOptions: {
>
> durable: true,
>
> arguments: {
>
> 'x-dead-letter-exchange': 'cms.events.dlx',
>
> 'x-message-ttl': 30000,
>
> },
>
> },
>
> noAck: false,
>
> prefetchCount:1,
>
> },
>
> });
>
> await app.startAllMicroservices();
>
> await app.listen(process.env.PORT ?? 3025);
>
> }
>
> bootstrap();

**2. Category Event Consumer**

File: apps/category-service/src/consumers/category.consumer.ts

> import { Controller, Logger } from '@nestjs/common';
>
> import { MessagePattern, Payload, Ctx, RmqContext } from
> '@nestjs/microservices';
>
> import { CategoryCacheService } from
> '../services/category-cache.service';
>
> @Controller()
>
> export class CategoryConsumer {
>
> private readonly logger = new Logger(CategoryConsumer.name);
>
> constructor(private readonly cache: CategoryCacheService) {}
>
> @MessagePattern('category.saved')
>
> async onCategorySaved(
>
> @Payload() event: CategorySavedEvent,
>
> @Ctx() context: RmqContext,
>
> ): Promise\<void\> {
>
> const channel = context.getChannelRef();
>
> const message = context.getMessage();
>
> try {
>
> this.logger.log(\`Received category.saved for slug: \${event.slug}\`);
>
> await this.cache.upsertCategory(event);
>
> channel.ack(message); // Acknowledge success
>
> } catch (err) {
>
> this.logger.error(\`Failed to process category.saved for
> \${event.slug}\`, err);
>
> channel.nack(message, false, false); // nack → routes to DLQ
>
> }
>
> }
>
> @MessagePattern('category.deleted')
>
> async onCategoryDeleted(
>
> @Payload() event: CategoryDeletedEvent,
>
> @Ctx() context: RmqContext,
>
> ): Promise\<void\> {
>
> const channel = context.getChannelRef();
>
> const message = context.getMessage();
>
> try {
>
> this.logger.log(\`Received category.deleted for slug:
> \${event.slug}\`);
>
> await this.cache.deleteCategory(event.slug);
>
> channel.ack(message);
>
> } catch (err) {
>
> this.logger.error(\`Failed to process category.deleted for
> \${event.slug}\`, err);
>
> channel.nack(message, false, false);
>
> }
>
> }
>
> }

**3. CategoryCacheService — Redis Operations**

File: apps/category-service/src/services/category-cache.service.ts

> import { Injectable } from '@nestjs/common';
>
> import { InjectRedis } from '@nestjs-modules/ioredis';
>
> import Redis from 'ioredis';
>
> const CACHE_TTL = 0; // No expiry — categories are long-lived;
> invalidated on change
>
> const KEY_PREFIX = 'category:';
>
> const INDEX_KEY = 'categories:index';
>
> @Injectable()
>
> export class CategoryCacheService {
>
> constructor(@InjectRedis() private readonly redis: Redis) {}
>
> async upsertCategory(category: CategorySavedEvent): Promise\<void\> {
>
> const key = \`\${KEY_PREFIX}\${category.slug}\`;
>
> await this.redis.set(key, JSON.stringify(category));
>
> await this.redis.sadd(INDEX_KEY, category.slug); // Keep index of all
> slugs
>
> }
>
> async deleteCategory(slug: string): Promise\<void\> {
>
> await this.redis.del(\`\${KEY_PREFIX}\${slug}\`);
>
> await this.redis.srem(INDEX_KEY, slug);
>
> }
>
> async getCategory(slug: string): Promise\<CategorySavedEvent \| null\>
> {
>
> const raw = await this.redis.get(\`\${KEY_PREFIX}\${slug}\`);
>
> return raw ? JSON.parse(raw) : null;
>
> }
>
> async getAllSlugs(): Promise\<string\[\]\> {
>
> return this.redis.smembers(INDEX_KEY);
>
> }
>
> }

**4. Cold-Start Hydration**

File: apps/category-service/src/services/category-hydration.service.ts

On startup, category-service fetches all categories from the CMS and
populates its Redis cache before serving requests.

> import { Injectable, Logger, OnApplicationBootstrap } from
> '@nestjs/common';
>
> import { HttpService } from '@nestjs/axios';
>
> import { firstValueFrom } from 'rxjs';
>
> import { CategoryCacheService } from './category-cache.service';
>
> @Injectable()
>
> export class CategoryHydrationService implements
> OnApplicationBootstrap {
>
> private readonly logger = new Logger(CategoryHydrationService.name);
>
> constructor(
>
> private readonly http: HttpService,
>
> private readonly cache: CategoryCacheService,
>
> ) {}
>
> async onApplicationBootstrap(): Promise\<void\> {
>
> await this.hydrate();
>
> }
>
> async hydrate(): Promise\<void\> {
>
> this.logger.log('Starting category cache hydration...');
>
> let page = 1;
>
> let hasNextPage = true;
>
> let total = 0;
>
> while (hasNextPage) {
>
> const { data } = await firstValueFrom(
>
> this.http.get(
>
> \`\${process.env.CMS_SERVICE_URL}/api/categories?depth=2&limit=1000&page=\${page}\`,
>
> { headers: { Authorization: \`API-Key \${process.env.CMS_API_KEY}\` }
> }
>
> )
>
> );
>
> for (const category of data.docs) {
>
> await this.cache.upsertCategory(category);
>
> }
>
> total += data.docs.length;
>
> hasNextPage = data.hasNextPage;
>
> page++;
>
> }
>
> this.logger.log(\`Hydration complete. \${total} categories loaded into
> Redis.\`);
>
> }
>
> }

**5. Nightly Cron Reconciliation**

A nightly cron job runs the same hydration logic to recover any events
missed due to RabbitMQ downtime. This is retained from the previous
implementation.

> // In CategoryHydrationService
>
> @Cron('0 2 \* \* \*') // 02:00 UTC nightly
>
> async reconcile(): Promise\<void\> {
>
> this.logger.log('Starting nightly category reconciliation...');
>
> await this.hydrate();
>
> this.logger.log('Reconciliation complete.');
>
> }

**6. Verification**

- Start category-service. Confirm log: Hydration complete. N categories
  loaded into Redis.

- Create a category in cms-service. Confirm category-service log:
  Received category.saved for slug: \<slug\>.

- Run redis-cli GET category:\<slug\> and confirm the cached JSON
  matches the Payload record.

- Delete a category in cms-service. Confirm log: Received
  category.deleted for slug: \<slug\>.

- Run redis-cli GET category:\<slug\> — confirm the key no longer
  exists.

- References: RMQ-00 (topology), CS-05 (publisher and event schemas),
  RMQ-01 (cms-service publisher).
