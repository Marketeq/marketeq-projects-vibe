# TalentProfile — Payload CMS Implementation Guide

> **Context**: The original docs in `docs/md/CMS Service/check/` describe a Strapi-based TalentProfile sync.
> The CMS has since migrated to **Payload CMS** (v1, PostgreSQL adapter).
> This document specifies how to implement the TalentProfile feature using the existing Payload patterns.

---

## 1. Overview

### What We're Building

A `TalentProfiles` collection in Payload CMS that allows admins to manage freelancer profiles.
Changes sync to the **user-service** via RabbitMQ events, following the exact same pattern used for Categories today.

### Architecture

```
┌─────────────────────┐       RabbitMQ        ┌──────────────────┐
│   Payload CMS       │  ─── events ────────► │  user-service    │
│   (cms-service)     │                        │  (NestJS)        │
│                     │                        │                  │
│  TalentProfiles     │  talent-profile.saved  │  talent_profiles │
│  collection         │  talent-profile.deleted│  table (TypeORM) │
└─────────────────────┘                        └──────────────────┘
         ▲                                              │
         │  Admin panel edits                           │  REST API
         │                                              ▼
      CMS Admin                                   Next.js Frontend
```

- **Admins** create/edit talent profiles in the Payload admin panel
- **afterChange / afterDelete hooks** publish events to RabbitMQ
- **user-service** consumes events and upserts into its own `talent_profiles` table
- **Frontend** reads from user-service only — never hits the CMS directly
- **Reconcile endpoint** allows bulk re-sync of all profiles

### Existing Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Collection with UUID + hooks | `src/collections/Categories.ts` |
| afterChange / afterDelete hooks | `src/hooks/afterChange/syncCategories.ts` |
| RabbitMQ publisher with retry | `src/rabbitmq/cms-event.publisher.ts` |
| Reconcile plugin endpoint | `src/plugins/categorySync.plugin.ts` |
| Payload config registration | `src/payload.config.ts` |

---

## 2. CMS-Service Changes (Payload)

### 2.1 New Collection: `src/collections/TalentProfiles.ts`

```typescript
import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper } from '../access/roles';
import {
  syncTalentProfileToService,
  deleteTalentProfileFromService,
} from '../hooks/afterChange/syncTalentProfiles';

export const TalentProfiles: CollectionConfig = {
  slug: 'talent-profiles',
  admin: {
    useAsTitle: 'username',
    defaultColumns: ['username', 'name', 'availability', 'status'],
    group: 'Talent Management',
  },
  access: {
    read: () => true,         // public read (profiles are public)
    create: isAdminOrDeveloper,
    update: isAdminOrDeveloper,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [syncTalentProfileToService],
    afterDelete: [deleteTalentProfileFromService],
  },
  fields: [
    // ─── Identity ───────────────────────────────────────
    {
      name: 'uuid',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'Stable UUID for cross-service identity. Auto-generated on create.' },
      hooks: {
        beforeValidate: [
          ({ value, operation }) => {
            if (operation === 'create' && !value) {
              return require('crypto').randomUUID();
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'sourceId',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'User UUID from user-service/auth-service. Links this CMS profile to the platform user.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'username',
          type: 'text',
          unique: true,
          index: true,
          required: true,
          admin: { description: 'URL-safe slug. Lowercase, 3-30 chars.' },
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: { description: 'Display name (first + last).' },
        },
      ],
    },
    {
      name: 'headline',
      type: 'text',
      admin: { description: 'Short professional title, e.g. "Expert React Developer"' },
    },

    // ─── Availability & Location ────────────────────────
    {
      type: 'row',
      fields: [
        {
          name: 'availability',
          type: 'select',
          options: [
            { label: '10 hrs/week', value: '10' },
            { label: '20 hrs/week', value: '20' },
            { label: '30 hrs/week', value: '30' },
            { label: '40 hrs/week', value: '40' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'location', type: 'text', admin: { description: 'City or region' } },
        { name: 'country', type: 'text' },
        { name: 'timezone', type: 'text', admin: { description: 'e.g. America/New_York' } },
      ],
    },

    // ─── Rate ───────────────────────────────────────────
    {
      name: 'rate',
      type: 'number',
      admin: { description: 'Hourly rate (USD)' },
    },

    // ─── Bio ────────────────────────────────────────────
    {
      name: 'overview',
      type: 'richText',
      admin: { description: 'Full professional bio' },
    },

    // ─── Skills & Expertise ─────────────────────────────
    {
      name: 'skills',
      type: 'array',
      admin: { description: 'Professional skills (tags)' },
      fields: [
        { name: 'name', type: 'text', required: true },
      ],
    },
    {
      name: 'industryExpertise',
      type: 'array',
      admin: { description: 'Industry domains' },
      fields: [
        { name: 'name', type: 'text', required: true },
      ],
    },
    {
      name: 'languages',
      type: 'array',
      fields: [
        { name: 'language', type: 'text', required: true },
        {
          name: 'fluency',
          type: 'select',
          options: [
            { label: 'Basic', value: 'basic' },
            { label: 'Conversational', value: 'conversational' },
            { label: 'Fluent', value: 'fluent' },
            { label: 'Native', value: 'native' },
          ],
        },
      ],
    },

    // ─── Certifications ─────────────────────────────────
    {
      name: 'certifications',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'organization', type: 'text' },
        { name: 'dateAwarded', type: 'date' },
      ],
    },

    // ─── Education ──────────────────────────────────────
    {
      name: 'education',
      type: 'array',
      fields: [
        { name: 'institution', type: 'text', required: true },
        { name: 'degree', type: 'text' },
        { name: 'graduationYear', type: 'number' },
      ],
    },

    // ─── Work Experience ────────────────────────────────
    {
      name: 'workExperience',
      type: 'array',
      fields: [
        { name: 'role', type: 'text', required: true },
        { name: 'company', type: 'text', required: true },
        { name: 'startDate', type: 'date' },
        { name: 'endDate', type: 'date' },
        { name: 'description', type: 'textarea' },
      ],
    },

    // ─── Portfolio ──────────────────────────────────────
    {
      name: 'portfolio',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'url', type: 'text' },
        { name: 'thumbnail', type: 'upload', relationTo: 'media' },
        { name: 'description', type: 'textarea' },
      ],
    },

    // ─── Status ─────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Suspended', value: 'suspended' },
      ],
    },
  ],
};
```

### 2.2 Admin Panel Layout (Field Grouping)

The `type: 'row'` fields above handle the two-column layout. The visual ordering in the admin panel:

| Section | Fields | Layout |
|---------|--------|--------|
| Identity | `username`, `name` | 2 columns |
| | `headline` | full width |
| Availability | `availability` | 1 column |
| Location | `location`, `country`, `timezone` | 3 columns |
| Rate | `rate` | 1 column |
| Bio | `overview` | full width, rich text |
| Skills & Expertise | `skills`, `industryExpertise`, `languages` | full width arrays |
| Certifications | `certifications` | full width array |
| Education | `education` | full width array |
| Work Experience | `workExperience` | full width array |
| Portfolio | `portfolio` | full width array |
| Status | `status` | select |

---

### 2.3 Hooks: `src/hooks/afterChange/syncTalentProfiles.ts`

Follow the exact pattern from `syncCategories.ts`:

```typescript
import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload/types';

export const syncTalentProfileToService: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  try {
    const { CmsEventPublisher } = await import('../../rabbitmq/cms-event.publisher');
    const publisher = CmsEventPublisher.getInstance();
    if (!publisher.isConnected()) {
      req.payload.logger.warn('RabbitMQ not connected — skipping talent profile sync');
      return doc;
    }

    await publisher.publishTalentProfileSaved({
      id: doc.uuid || String(doc.id),
      sourceId: doc.sourceId || null,
      username: doc.username,
      name: doc.name,
      headline: doc.headline || null,
      availability: doc.availability || null,
      location: doc.location || null,
      country: doc.country || null,
      timezone: doc.timezone || null,
      rate: doc.rate || null,
      overview: doc.overview || null,
      skills: (doc.skills || []).map((s: any) => s.name),
      industryExpertise: (doc.industryExpertise || []).map((i: any) => i.name),
      languages: (doc.languages || []).map((l: any) => ({
        language: l.language,
        fluency: l.fluency,
      })),
      certifications: (doc.certifications || []).map((c: any) => ({
        title: c.title,
        organization: c.organization,
        dateAwarded: c.dateAwarded,
      })),
      education: (doc.education || []).map((e: any) => ({
        institution: e.institution,
        degree: e.degree,
        graduationYear: e.graduationYear,
      })),
      workExperience: (doc.workExperience || []).map((w: any) => ({
        role: w.role,
        company: w.company,
        startDate: w.startDate,
        endDate: w.endDate,
        description: w.description,
      })),
      portfolio: (doc.portfolio || []).map((p: any) => ({
        title: p.title,
        url: p.url,
        thumbnailId: typeof p.thumbnail === 'object' ? p.thumbnail?.id : p.thumbnail,
        description: p.description,
      })),
      status: doc.status || 'active',
    });

    req.payload.logger.info(
      `Published talent-profile.saved for "${doc.username}" (${operation})`,
    );
  } catch (err) {
    req.payload.logger.error({ err }, `Failed to publish talent-profile.saved for "${doc.username}"`);
  }

  return doc;
};

export const deleteTalentProfileFromService: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  try {
    const { CmsEventPublisher } = await import('../../rabbitmq/cms-event.publisher');
    const publisher = CmsEventPublisher.getInstance();
    if (!publisher.isConnected()) {
      req.payload.logger.warn('RabbitMQ not connected — skipping talent profile delete sync');
      return doc;
    }

    await publisher.publishTalentProfileDeleted({
      id: doc.uuid || String(doc.id),
      username: doc.username,
    });

    req.payload.logger.info(`Published talent-profile.deleted for "${doc.username}"`);
  } catch (err) {
    req.payload.logger.error({ err }, `Failed to publish talent-profile.deleted for "${doc.username}"`);
  }

  return doc;
};
```

---

### 2.4 RabbitMQ Publisher Updates: `src/rabbitmq/cms-event.publisher.ts`

Add new event interfaces and publish methods alongside the existing category ones.

#### New Interfaces

```typescript
interface TalentProfileSavedEvent {
  event: 'talent-profile.saved';
  id: string;
  sourceId: string | null;
  username: string;
  name: string;
  headline: string | null;
  availability: string | null;
  location: string | null;
  country: string | null;
  timezone: string | null;
  rate: number | null;
  overview: unknown | null;        // Lexical rich text JSON
  skills: string[];
  industryExpertise: string[];
  languages: { language: string; fluency: string }[];
  certifications: { title: string; organization: string; dateAwarded: string | null }[];
  education: { institution: string; degree: string; graduationYear: number | null }[];
  workExperience: { role: string; company: string; startDate: string | null; endDate: string | null; description: string | null }[];
  portfolio: { title: string; url: string | null; thumbnailId: number | null; description: string | null }[];
  status: 'active' | 'inactive' | 'suspended';
}

interface TalentProfileDeletedEvent {
  event: 'talent-profile.deleted';
  id: string;
  username: string;
}
```

#### New Queue Setup (inside `setup` callback)

```typescript
const TP_QUEUE = 'cms.talent-profile.sync';
const TP_DLQ = `${TP_QUEUE}.dlq`;
await channel.assertQueue(TP_QUEUE, {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': EXCHANGE_DLX,
    'x-message-ttl': 30000,
  },
});
await channel.assertQueue(TP_DLQ, { durable: true });
await channel.bindQueue(TP_QUEUE, EXCHANGE, 'talent-profile.*');
await channel.bindQueue(TP_DLQ, EXCHANGE_DLX, '');
```

#### New Publish Methods (on `CmsEventPublisher` class)

```typescript
async publishTalentProfileSaved(event: Omit<TalentProfileSavedEvent, 'event'>): Promise<void> {
  const payload: TalentProfileSavedEvent = { event: 'talent-profile.saved', ...event };
  await this.publishWithRetry('talent-profile.saved', payload);
}

async publishTalentProfileDeleted(event: Omit<TalentProfileDeletedEvent, 'event'>): Promise<void> {
  const payload: TalentProfileDeletedEvent = { event: 'talent-profile.deleted', ...event };
  await this.publishWithRetry('talent-profile.deleted', payload);
}
```

---

### 2.5 Reconcile Plugin: `src/plugins/talentProfileSync.plugin.ts`

```typescript
import { Plugin } from 'payload/config';

export const talentProfileSyncPlugin: Plugin = (incomingConfig) => {
  const config = { ...incomingConfig };
  const existingEndpoints = config.endpoints || [];

  config.endpoints = [
    ...existingEndpoints,
    {
      path: '/api/cms/reconcile-talent-profiles',
      method: 'post',
      handler: async (req: any, res: any) => {
        try {
          const configuredKey = process.env.CMS_API_KEY;
          if (!configuredKey) {
            return res.status(500).json({ error: 'CMS_API_KEY not configured' });
          }
          const apiKey = req.headers['authorization']?.replace('API-Key ', '');
          if (!apiKey || apiKey !== configuredKey) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const { CmsEventPublisher } = await import('../rabbitmq/cms-event.publisher');
          const publisher = CmsEventPublisher.getInstance();

          if (!publisher.isConnected()) {
            return res.status(503).json({ error: 'RabbitMQ not connected' });
          }

          const { payload } = req;
          let page = 1;
          let published = 0;
          let totalDocs = 0;
          let hasNextPage = true;
          const PAGE_SIZE = 100;

          while (hasNextPage) {
            const profiles = await payload.find({
              collection: 'talent-profiles',
              limit: PAGE_SIZE,
              page,
              depth: 1,
            });

            totalDocs = profiles.totalDocs;

            for (const profile of profiles.docs) {
              await publisher.publishTalentProfileSaved({
                id: (profile as any).uuid || String(profile.id),
                sourceId: (profile as any).sourceId || null,
                username: profile.username as string,
                name: profile.name as string,
                headline: (profile as any).headline || null,
                availability: (profile as any).availability || null,
                location: (profile as any).location || null,
                country: (profile as any).country || null,
                timezone: (profile as any).timezone || null,
                rate: (profile as any).rate || null,
                overview: (profile as any).overview || null,
                skills: ((profile as any).skills || []).map((s: any) => s.name),
                industryExpertise: ((profile as any).industryExpertise || []).map((i: any) => i.name),
                languages: ((profile as any).languages || []).map((l: any) => ({
                  language: l.language,
                  fluency: l.fluency,
                })),
                certifications: ((profile as any).certifications || []).map((c: any) => ({
                  title: c.title,
                  organization: c.organization,
                  dateAwarded: c.dateAwarded,
                })),
                education: ((profile as any).education || []).map((e: any) => ({
                  institution: e.institution,
                  degree: e.degree,
                  graduationYear: e.graduationYear,
                })),
                workExperience: ((profile as any).workExperience || []).map((w: any) => ({
                  role: w.role,
                  company: w.company,
                  startDate: w.startDate,
                  endDate: w.endDate,
                  description: w.description,
                })),
                portfolio: ((profile as any).portfolio || []).map((p: any) => ({
                  title: p.title,
                  url: p.url,
                  thumbnailId: typeof p.thumbnail === 'object' ? p.thumbnail?.id : p.thumbnail,
                  description: p.description,
                })),
                status: (profile as any).status || 'active',
              });
              published++;
            }

            hasNextPage = profiles.hasNextPage;
            page++;
          }

          return res.json({ status: 'ok', totalProfiles: totalDocs, published });
        } catch (err: any) {
          return res.status(500).json({ error: err.message });
        }
      },
    },
  ];

  return config;
};
```

---

### 2.6 Register in Payload Config: `src/payload.config.ts`

```diff
 // Collections
+import { TalentProfiles } from './collections/TalentProfiles';

 // Plugins
+import { talentProfileSyncPlugin } from './plugins/talentProfileSync.plugin';

 collections: [
   Listings,
   Users,
   Orders,
   Categories,
+  TalentProfiles,
   BlogPosts,
   // ...
 ],

 plugins: [
   categorySyncPlugin,
+  talentProfileSyncPlugin,
   seoPlugin({ ... }),
 ],
```

---

## 3. User-Service Changes (NestJS Consumer)

### 3.1 TypeORM Entity: `talent-profile.entity.ts`

Location: `backend/apps/user-service/src/talent-profile/entities/talent-profile.entity.ts`

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('talent_profiles')
export class TalentProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  @Index()
  externalId: string;                // CMS uuid

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  @Index()
  sourceId: string | null;           // auth-service user UUID

  @Column({ type: 'varchar', length: 120, unique: true })
  @Index()
  username: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  headline: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  availability: string | null;       // "10", "20", "30", "40"

  @Column({ type: 'varchar', length: 180, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  timezone: string | null;

  @Column({ type: 'int', nullable: true })
  rate: number | null;

  @Column({ type: 'jsonb', nullable: true })
  overview: unknown | null;          // Lexical rich text JSON

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  skills: string[];

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  industryExpertise: string[];

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  languages: { language: string; fluency: string }[];

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  certifications: { title: string; organization: string; dateAwarded: string | null }[];

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  education: { institution: string; degree: string; graduationYear: number | null }[];

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  workExperience: { role: string; company: string; startDate: string | null; endDate: string | null; description: string | null }[];

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  portfolio: { title: string; url: string | null; thumbnailId: number | null; description: string | null }[];

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'inactive' | 'suspended';

  // System-generated fields (NOT from CMS — populated by other services)
  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  rating: number | null;

  @Column({ type: 'int', nullable: true })
  reviewsCount: number | null;

  @Column({ type: 'int', nullable: true })
  totalProjectsCompleted: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  repeatHireRate: number | null;

  @Column({ type: 'int', nullable: true })
  responseTimeHours: number | null;

  @Column({ type: 'date', nullable: true })
  memberSince: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
```

### 3.2 RabbitMQ Consumer: `talent-profile-sync.consumer.ts`

Location: `backend/apps/user-service/src/talent-profile/talent-profile-sync.consumer.ts`

```typescript
import { Controller, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { TalentProfileSyncService } from './talent-profile-sync.service';

@Controller()
export class TalentProfileSyncConsumer {
  private readonly logger = new Logger(TalentProfileSyncConsumer.name);

  constructor(private readonly syncService: TalentProfileSyncService) {}

  @MessagePattern('talent-profile.saved')
  async handleSaved(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.log(`Received talent-profile.saved for "${data.username}"`);
    await this.syncService.upsert(data);
    const channel = context.getChannelRef();
    channel.ack(context.getMessage());
  }

  @MessagePattern('talent-profile.deleted')
  async handleDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.log(`Received talent-profile.deleted for "${data.username}"`);
    await this.syncService.delete(data.id);
    const channel = context.getChannelRef();
    channel.ack(context.getMessage());
  }
}
```

### 3.3 Sync Service: `talent-profile-sync.service.ts`

Location: `backend/apps/user-service/src/talent-profile/talent-profile-sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentProfile } from './entities/talent-profile.entity';

@Injectable()
export class TalentProfileSyncService {
  private readonly logger = new Logger(TalentProfileSyncService.name);

  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
  ) {}

  async upsert(event: any): Promise<TalentProfile> {
    const existing = await this.repo.findOne({ where: { externalId: event.id } });

    const data: Partial<TalentProfile> = {
      externalId: event.id,
      sourceId: event.sourceId,
      username: event.username,
      name: event.name,
      headline: event.headline,
      availability: event.availability,
      location: event.location,
      country: event.country,
      timezone: event.timezone,
      rate: event.rate,
      overview: event.overview,
      skills: event.skills,
      industryExpertise: event.industryExpertise,
      languages: event.languages,
      certifications: event.certifications,
      education: event.education,
      workExperience: event.workExperience,
      portfolio: event.portfolio,
      status: event.status,
    };

    if (existing) {
      // Preserve system-generated fields — only update CMS-owned fields
      await this.repo.update(existing.id, data);
      this.logger.log(`Updated talent profile "${event.username}" (externalId=${event.id})`);
      return this.repo.findOneOrFail({ where: { id: existing.id } });
    }

    const profile = this.repo.create(data);
    const saved = await this.repo.save(profile);
    this.logger.log(`Created talent profile "${event.username}" (externalId=${event.id})`);
    return saved;
  }

  async delete(externalId: string): Promise<void> {
    const result = await this.repo.delete({ externalId });
    if (result.affected) {
      this.logger.log(`Deleted talent profile externalId=${externalId}`);
    } else {
      this.logger.warn(`No talent profile found for externalId=${externalId}`);
    }
  }
}
```

### 3.4 Public Read Endpoint: `talent-profile.controller.ts`

Location: `backend/apps/user-service/src/talent-profile/talent-profile.controller.ts`

```typescript
import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentProfile } from './entities/talent-profile.entity';

@Controller('public/talent')
export class TalentProfileController {
  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
  ) {}

  @Get(':username')
  async getByUsername(@Param('username') username: string): Promise<TalentProfile> {
    const profile = await this.repo.findOne({
      where: { username, status: 'active' },
    });
    if (!profile) {
      throw new NotFoundException(`Talent profile "${username}" not found`);
    }
    return profile;
  }

  @Get()
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const [profiles, total] = await this.repo.findAndCount({
      where: { status: 'active', isAvailable: true },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
    });
    return { data: profiles, total, page, limit };
  }
}
```

### 3.5 Module: `talent-profile.module.ts`

Location: `backend/apps/user-service/src/talent-profile/talent-profile.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TalentProfile } from './entities/talent-profile.entity';
import { TalentProfileSyncService } from './talent-profile-sync.service';
import { TalentProfileSyncConsumer } from './talent-profile-sync.consumer';
import { TalentProfileController } from './talent-profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TalentProfile])],
  controllers: [TalentProfileController, TalentProfileSyncConsumer],
  providers: [TalentProfileSyncService],
  exports: [TalentProfileSyncService],
})
export class TalentProfileModule {}
```

Register in the user-service's root `AppModule`:

```diff
+import { TalentProfileModule } from './talent-profile/talent-profile.module';

 @Module({
   imports: [
     // ...existing modules
+    TalentProfileModule,
   ],
 })
 export class AppModule {}
```

---

## 4. Environment Variables

### CMS Service (existing — no new vars needed)

| Variable | Purpose | Already exists? |
|----------|---------|-----------------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `RABBITMQ_URL` | RabbitMQ connection | Yes |
| `PAYLOAD_SECRET` | Payload auth secret | Yes |
| `CMS_API_KEY` | Reconcile endpoint auth | Yes |

### User Service

| Variable | Purpose | Already exists? |
|----------|---------|-----------------|
| `RABBITMQ_URL` | RabbitMQ connection | Yes |
| `DATABASE_URL` | PostgreSQL connection | Yes |

No new environment variables required.

---

## 5. RabbitMQ Topology

### Existing (Category)

```
Exchange: cms.events (topic, durable)
  └── Queue: cms.category.category
      Binding: category.*
```

### New (TalentProfile)

```
Exchange: cms.events (topic, durable)     ← same exchange, reused
  ├── Queue: cms.category.category
  │   Binding: category.*
  └── Queue: cms.talent-profile.sync      ← NEW
      Binding: talent-profile.*

Exchange: cms.events.dlx (fanout, durable) ← same DLX, reused
  ├── Queue: cms.category.category.dlq
  └── Queue: cms.talent-profile.sync.dlq  ← NEW
```

### Routing Keys

| Event | Routing Key | Publisher | Consumer |
|-------|-------------|-----------|----------|
| Profile created/updated | `talent-profile.saved` | cms-service | user-service |
| Profile deleted | `talent-profile.deleted` | cms-service | user-service |

---

## 6. Field Mapping: CMS → User-Service Entity

| CMS Field (Payload) | RabbitMQ Event Key | User-Service Column | Type |
|---------------------|--------------------|---------------------|------|
| `uuid` | `id` | `externalId` | varchar(64) |
| `sourceId` | `sourceId` | `sourceId` | varchar(64) |
| `username` | `username` | `username` | varchar(120) |
| `name` | `name` | `name` | varchar(180) |
| `headline` | `headline` | `headline` | varchar(180) |
| `availability` | `availability` | `availability` | varchar(10) |
| `isAvailable` | `isAvailable` | `isAvailable` | boolean |
| `location` | `location` | `location` | varchar(180) |
| `country` | `country` | `country` | varchar(100) |
| `timezone` | `timezone` | `timezone` | varchar(60) |
| `rateMin` | `rateMin` | `rateMin` | int |
| `rateMax` | `rateMax` | `rateMax` | int |
| `overview` | `overview` | `overview` | jsonb |
| `skills[].name` | `skills` (string[]) | `skills` | jsonb |
| `industryExpertise[].name` | `industryExpertise` (string[]) | `industryExpertise` | jsonb |
| `languages[]` | `languages` (object[]) | `languages` | jsonb |
| `certifications[]` | `certifications` (object[]) | `certifications` | jsonb |
| `education[]` | `education` (object[]) | `education` | jsonb |
| `workExperience[]` | `workExperience` (object[]) | `workExperience` | jsonb |
| `portfolio[]` | `portfolio` (object[]) | `portfolio` | jsonb |
| `status` | `status` | `status` | varchar(20) |
| *(not from CMS)* | — | `rating` | numeric(3,2) |
| *(not from CMS)* | — | `reviewsCount` | int |
| *(not from CMS)* | — | `totalProjectsCompleted` | int |
| *(not from CMS)* | — | `repeatHireRate` | numeric(5,2) |
| *(not from CMS)* | — | `responseTimeHours` | int |
| *(not from CMS)* | — | `memberSince` | date |

**Key design decision**: System-generated fields (`rating`, `reviewsCount`, `totalProjectsCompleted`, `repeatHireRate`, `responseTimeHours`, `memberSince`) live only in the user-service entity. They are populated by other services (reviews, projects, messaging) and are **never overwritten** by CMS sync events.

---

## 7. API Endpoints Summary

### CMS Service (Payload — auto-generated + custom)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/talent-profiles` | Payload session | List profiles (admin panel) |
| GET | `/api/talent-profiles/:id` | Payload session | Get single profile (admin) |
| POST | `/api/talent-profiles` | Admin/Developer | Create profile |
| PATCH | `/api/talent-profiles/:id` | Admin/Developer | Update profile |
| DELETE | `/api/talent-profiles/:id` | Admin only | Delete profile |
| POST | `/api/cms/reconcile-talent-profiles` | `API-Key` header | Bulk reconcile all profiles |

### User Service (NestJS — custom)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/public/talent/:username` | None (public) | Get active profile by username |
| GET | `/public/talent` | None (public) | List active, available profiles |

---

## 8. Testing Plan

### 8.1 CMS-Service Tests

| # | Test | How to verify |
|---|------|---------------|
| 1 | Create a talent profile in Payload admin | Profile appears in admin UI, `uuid` auto-generated |
| 2 | Verify RabbitMQ event on create | Check RabbitMQ management UI for `talent-profile.saved` message on `cms.talent-profile.sync` queue |
| 3 | Update profile and verify event | Edit fields in admin, confirm updated message published |
| 4 | Delete profile and verify event | Delete from admin, confirm `talent-profile.deleted` message |
| 5 | Reconcile endpoint | `curl -X POST http://localhost:3020/api/cms/reconcile-talent-profiles -H "Authorization: API-Key <key>"` — returns `{ status: 'ok', totalProfiles: N, published: N }` |
| 6 | Reconcile auth rejection | Same curl without API key — returns 401 |

### 8.2 User-Service Tests

| # | Test | How to verify |
|---|------|---------------|
| 7 | Consumer creates profile on `talent-profile.saved` | Query `SELECT * FROM talent_profiles WHERE external_id = '<uuid>'` |
| 8 | Consumer updates profile on re-publish | Change a field in CMS, verify DB row updated |
| 9 | Consumer deletes profile on `talent-profile.deleted` | Delete in CMS, verify DB row removed |
| 10 | System fields preserved on update | Set `rating = 4.5` directly in DB, then trigger CMS update — verify `rating` is still 4.5 |
| 11 | `GET /public/talent/:username` returns profile | `curl http://localhost:3001/public/talent/johndoe` |
| 12 | `GET /public/talent/:username` returns 404 for inactive | Set status to `inactive` in CMS, verify 404 |
| 13 | `GET /public/talent` lists active profiles | Verify pagination and `isAvailable` filter |

### 8.3 E2E Integration Test

```typescript
// test/talent-profile-sync.e2e-spec.ts
describe('TalentProfile CMS Sync (E2E)', () => {
  it('should create profile in CMS and appear in user-service', async () => {
    // 1. POST to Payload REST API to create profile
    // 2. Wait for RabbitMQ delivery (~1-2s)
    // 3. GET /public/talent/:username from user-service
    // 4. Assert fields match
  });

  it('should delete profile in CMS and remove from user-service', async () => {
    // 1. DELETE from Payload REST API
    // 2. Wait for RabbitMQ delivery
    // 3. GET /public/talent/:username → 404
  });
});
```

---

## 9. Implementation Checklist

### CMS Service

- [x] Create `src/collections/TalentProfiles.ts`
- [x] Create `src/hooks/afterChange/syncTalentProfiles.ts`
- [x] Create `src/mappers/talentProfile.mapper.ts` (shared mapper — added during review)
- [x] Add event interfaces + queue setup + publish methods to `src/rabbitmq/cms-event.publisher.ts`
- [x] Create `src/plugins/talentProfileSync.plugin.ts`
- [x] Register collection and plugin in `src/payload.config.ts`
- [ ] Run `payload generate:types` to update `payload-types.ts`
- [ ] Test admin panel CRUD (requires CMS service running)
- [ ] Test RabbitMQ events publish correctly (requires CMS service running)
- [ ] Test reconcile endpoint (requires CMS service running)

### User Service

- [x] Create `src/talent-profile/entities/talent-profile.entity.ts`
- [x] Create `src/talent-profile/interfaces/talent-profile-events.ts` (shared types — added during review)
- [x] Create `src/talent-profile/talent-profile-sync.service.ts`
- [x] Create `src/talent-profile/talent-profile-sync.consumer.ts`
- [x] Create `src/talent-profile/talent-profile.controller.ts`
- [x] Create `src/talent-profile/talent-profile.module.ts`
- [x] Register `TalentProfileModule` in `AppModule`
- [x] Connect RabbitMQ microservice in `main.ts`
- [x] Create TypeORM migration `1773800000000-CreateTalentProfiles.ts`
- [x] Build passes (`nest build user-service` — zero errors)
- [x] Service starts and connects to PostgreSQL + RabbitMQ
- [x] Test public read endpoints (GET /public/talent, GET /public/talent/:username)
- [ ] Test consumer upsert / delete (requires CMS → RabbitMQ flow)
- [ ] Test system-generated fields are preserved on CMS sync

### API Gateway

- [x] Add `/public/talent/*` routing to user-service in `proxy.controller.ts`

---

## 10. Migration from Original Strapi Docs

| Original Strapi Concept | Payload Equivalent | Notes |
|--------------------------|-------------------|-------|
| Strapi Content-Type Builder | `CollectionConfig` in code | Payload is code-first, no UI schema builder |
| Strapi webhook + HMAC | Payload `afterChange` hooks | No webhook needed — hooks fire in-process |
| `strapi-to-entity.mapper.ts` | Direct field mapping in hooks | No mapper needed — we control both the CMS schema and the event payload |
| Nightly reconcile via REST API | `reconcile-talent-profiles` plugin endpoint | Same concept, uses Payload local API instead of external HTTP |
| Strapi `manyToMany` relations for skills | Payload `array` fields | Simpler — stored as arrays, flattened to string[] in events |
| Strapi components (`shared.certification`) | Payload `array` with inline fields | Same data, different config syntax |
| Heroku deployment | Render deployment | Per project architecture |
| `x-strapi-signature` HMAC verification | Not needed | Hooks run server-side — no external webhook to verify |

---

## 11. Test Execution Results (2026-04-07)

### Environment

| Component | Detail |
|-----------|--------|
| PostgreSQL | 16-alpine via Docker (`strapi-postgres-1` on port 5432) |
| RabbitMQ | 3-management-alpine via Docker (`backend-rabbitmq-1` on ports 5672/15672) |
| user-service | NestJS on port 3002, schema `user_service` |
| Node.js | v22.15.1 |

### Build Verification

| Step | Result |
|------|--------|
| `nest build user-service` | Clean — zero TypeScript errors |
| Service startup | All modules initialized, including `TalentProfileModule` |
| RabbitMQ connection | Connected to queue `cms.talent-profile.sync` |
| TypeORM schema sync | `talent_profiles` table created in `user_service` schema |

### Endpoint Tests

| # | Test | Method | URL | Expected | Actual | Status |
|---|------|--------|-----|----------|--------|--------|
| 1 | Health check | GET | `/health` | 200 OK | `{"status":"ok","service":"user-service"}` | PASS |
| 2 | List profiles (empty DB) | GET | `/public/talent` | 200, empty list | `{"data":[],"total":0,"page":1,"limit":20}` | PASS |
| 3 | Get profile by username (missing) | GET | `/public/talent/testuser` | 404 Not Found | `{"message":"Talent profile \"testuser\" not found","error":"Not Found","statusCode":404}` | PASS |

### Startup Log Verification

| Check | Expected | Result |
|-------|----------|--------|
| `TalentProfileModule` loaded | `dependencies initialized` | PASS — `TalentProfileModule dependencies initialized` |
| RabbitMQ microservice connected | Queue binding logged | PASS — `RabbitMQ microservice connected (queue: cms.talent-profile.sync)` |
| Route: `GET /public/talent/:username` | Mapped | PASS — `Mapped {/public/talent/:username, GET} route` |
| Route: `GET /public/talent` | Mapped | PASS — `Mapped {/public/talent, GET} route` |
| `@EventPattern('talent-profile.saved')` | Registered | PASS — consumer registered via `TalentProfileSyncConsumer` |
| `@EventPattern('talent-profile.deleted')` | Registered | PASS — consumer registered via `TalentProfileSyncConsumer` |

### Issues Found During Testing

| Issue | Severity | Resolution |
|-------|----------|------------|
| `overview` field typed as `unknown` caused TS2345 build error (`unknown` not assignable to `_QueryDeepPartialEntity`) | Build blocker | Changed to `Record<string, any>` in entity and event interface |
| Missing `geo-tz` npm dependency | Runtime crash | Ran `npm install --legacy-peer-deps` to restore all dependencies |
| Pre-existing migration chain broken (duplicate `ADD COLUMN username`) | Pre-existing | Used `synchronize: true` for local dev schema creation; not related to TalentProfile changes |

### Code Review Fixes Applied Before Testing

All items from two rounds of code review were resolved before the test run:

| # | Issue | Fix |
|---|-------|-----|
| 1 | PK type `int` instead of `uuid` | Changed to `@PrimaryGeneratedColumn('uuid')`, migration uses `UUID DEFAULT gen_random_uuid()` |
| 2 | Duplicate mapping logic in hook + reconcile plugin | Extracted `src/mappers/talentProfile.mapper.ts` with shared `mapProfileToEvent()` |
| 3 | Redundant indexes (migration + entity) | Removed 4 `CREATE INDEX` from migration, removed `@Index()` from 3 unique columns |
| 4 | Reconcile aborts on single publish failure | Per-item `try/catch`, reports `failed` count in response |
| 5 | Gateway `public` prefix too broad | Changed to specific `if (prefix === 'public' && segments[1] === 'talent')` routing |
| 6 | `upsert(event: any)` untyped | Extracted `interfaces/talent-profile-events.ts`, used by consumer and sync service |
| 7 | Username not validated in CMS | Added `minLength: 3`, `maxLength: 30`, `beforeValidate` hook for lowercase + URL-safe chars |

### Not Yet Tested (Requires CMS Service Running)

| # | Test | Reason |
|---|------|--------|
| CMS admin panel CRUD | CMS service not started in this session (Payload build required) |
| RabbitMQ event publish on CMS save | Requires CMS service running |
| Consumer upsert from live event | Requires CMS → RabbitMQ → user-service full flow |
| Reconcile endpoint | Requires CMS service running |
| System fields preserved on sync | Requires end-to-end flow with seeded data |
