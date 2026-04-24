# RMQ-02 — listings-service Consumer

**Service:** listings-service | **Consuming from:** `cms.events` exchange

> **Purpose:** Hybrid app setup for listings-service. Featured listings sync implementation. Removal of deprecated HTTP sync endpoint.
> **Prerequisites:** RMQ-00 (platform guide), CS-04 (CMS REST API for featured listings).

---

## 1. What This Document Covers

listings-service needs to stay in sync with CMS content for two purposes: (1) syncing featured listing data from the CMS Listings collection to the shared DB, and (2) keeping its category cache up to date. This document covers the hybrid app setup and event consumer implementation.

---

## 2. Hybrid App Setup

**File:** `apps/listings-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls:         [process.env.RABBITMQ_URL!],
      queue:        'cms.listings.featured',
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'cms.events.dlx',
          'x-message-ttl': 30000,
        },
      },
      noAck:        false,
      prefetchCount:1,
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3010);
}

bootstrap();
```

---

## 3. CMS Sync Module

**File:** `apps/listings-service/src/cms-sync/cms-sync.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CmsSyncService } from './cms-sync.service';

@Module({
  imports: [HttpModule],
  providers: [CmsSyncService],
})
export class CmsSyncModule {}
```

---

## 4. Featured Listings Sync

listings-service periodically pulls featured listings from the CMS REST API and syncs them to the shared DB. This is done via a scheduled job because featured listing changes are low-frequency and the CMS already exposes a filtered endpoint.

**File:** `apps/listings-service/src/cms-sync/cms-sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CmsSyncService {
  private readonly logger = new Logger(CmsSyncService.name);

  constructor(private readonly http: HttpService) {}

  // Runs every 5 minutes to sync featured listings from CMS
  @Cron('*/5 * * * *')
  async syncFeaturedListings(): Promise<void> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(
          `${process.env.CMS_SERVICE_URL}/api/listings` +
          `?where[featured][equals]=true&where[status][equals]=published&limit=100`,
          { headers: { Authorization: `API-Key ${process.env.CMS_API_KEY}` } }
        )
      );

      for (const listing of data.docs) {
        await this.upsertFeaturedListing(listing);
      }

      this.logger.log(`Synced ${data.docs.length} featured listings from CMS.`);
    } catch (err) {
      this.logger.error('Featured listings sync failed.', err);
    }
  }

  private async upsertFeaturedListing(cmsListing: any): Promise<void> {
    // Write featured, featuredOrder, editorialLabel, coverImage
    // to the shared DB listings table, matched by sourceId
    // Implementation: use your listings TypeORM repository here
  }
}
```

---

## 5. Removed: HTTP Sync Endpoint

The previous implementation used a direct HTTP endpoint in listings-service that cms-service called via axios. This endpoint is now removed.

- Delete: `apps/listings-service/src/controllers/cms-sync.controller.ts` (if it exists)
- Delete: any route registered as `POST /api/cms-sync` in listings-service
- Remove: `CMS_SYNC_SECRET` usage from listings-service

```bash
# Confirm removal
grep -r 'cms-sync' apps/listings-service/src/
```

---

## 6. Verification

- Start listings-service. Confirm log: `[CmsSyncService] Synced N featured listings from CMS.`
- Mark a listing as featured in the Payload admin panel. Wait up to 5 minutes. Confirm the shared DB listing record shows `featured = true`.
- Confirm no HTTP sync endpoint exists: `curl -X POST http://listings-service:3010/api/cms-sync` — expect 404.
