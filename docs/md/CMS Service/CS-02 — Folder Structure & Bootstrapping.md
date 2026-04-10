# CS-02 — Folder Structure & Bootstrapping

**Service:** cms-service | **Powered by:** Payload CMS

> **Purpose:** Complete file layout under `apps/cms-service/src`, full `payload.config.ts` walkthrough, plugin wiring, and module bootstrapping.
> **Prerequisites:** CS-00 (overview), CS-01 (Docker & runtime).

---

## 1. Complete Folder Layout

All code lives under `apps/cms-service` following the monorepo Folder Structure Policy. No `/src` at the repo root.

```
apps/cms-service/
├── src/
│   ├── server.ts                    # Express entry point + payload.init()
│   ├── payload.config.ts            # Master Payload configuration
│   │
│   ├── collections/                 # One file per Payload collection
│   │   ├── Listings.ts
│   │   ├── Users.ts
│   │   ├── Orders.ts
│   │   ├── Categories.ts
│   │   ├── BlogPosts.ts
│   │   ├── HelpArticles.ts
│   │   ├── Announcements.ts
│   │   ├── FeatureFlags.ts
│   │   ├── Media.ts
│   │   ├── Testimonials.ts
│   │   └── LandingPages.ts
│   │
│   ├── globals/                     # One file per Payload global
│   │   ├── SiteSettings.ts
│   │   ├── HomepageBanner.ts
│   │   └── AdminConfig.ts
│   │
│   ├── access/                      # Role-based access control functions
│   │   ├── roles.ts                 # UserRole type + all access functions
│   │   ├── isAdmin.ts
│   │   ├── isDeveloper.ts
│   │   ├── isContentEditor.ts
│   │   ├── isAuthor.ts
│   │   └── isPublished.ts
│   │
│   ├── hooks/                       # Payload lifecycle hooks
│   │   └── afterChange/
│   │       ├── syncCategories.ts    # Fires on Categories afterChange
│   │       ├── invalidateCache.ts   # Cache purge on globals change
│   │       └── notifyOrderService.ts
│   │
│   ├── plugins/                     # Custom Payload plugins
│   │   └── categorySync.plugin.ts   # CategorySyncModule
│   │
│   └── rabbitmq/                    # RabbitMQ wiring
│       ├── rabbitmq.module.ts       # AMQP ClientsModule setup
│       └── cms-event.publisher.ts   # CmsEventPublisher class
│
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 2. tsconfig.json

**File location:** `apps/cms-service/tsconfig.json`

```json
{
  "compilerOptions": {
    "target":                 "ES2020",
    "module":                 "CommonJS",
    "lib":                    ["ES2020"],
    "outDir":                 "./dist",
    "rootDir":                "./src",
    "strict":                 true,
    "noImplicitAny":          true,
    "esModuleInterop":        true,
    "skipLibCheck":           true,
    "resolveJsonModule":      true,
    "emitDecoratorMetadata":  true,
    "experimentalDecorators": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 3. payload.config.ts — Full Walkthrough

**File location:** `apps/cms-service/src/payload.config.ts`

This is the single source of truth for all Payload configuration. Every collection, global, and plugin is registered here. Do not add business logic to this file — keep it as a registry only.

```typescript
// apps/cms-service/src/payload.config.ts
import { buildConfig } from 'payload/config';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { r2Storage } from '@payloadcms/storage-r2';
import { seoPlugin } from '@payloadcms/plugin-seo';
import { lexicalEditor } from '@payloadcms/richtext-lexical';

// ── Plugin ──────────────────────────────────────────────────────────────────
import { categorySyncPlugin } from './plugins/categorySync.plugin';

// ── Collections ─────────────────────────────────────────────────────────────
import { Listings }      from './collections/Listings';
import { Users }         from './collections/Users';
import { Orders }        from './collections/Orders';
import { Categories }    from './collections/Categories';
import { BlogPosts }     from './collections/BlogPosts';
import { HelpArticles }  from './collections/HelpArticles';
import { Announcements } from './collections/Announcements';
import { FeatureFlags }  from './collections/FeatureFlags';
import { Media }         from './collections/Media';
import { Testimonials }  from './collections/Testimonials';
import { LandingPages }  from './collections/LandingPages';

// ── Globals ─────────────────────────────────────────────────────────────────
import { SiteSettings }   from './globals/SiteSettings';
import { HomepageBanner } from './globals/HomepageBanner';
import { AdminConfig }    from './globals/AdminConfig';

export default buildConfig({
  // Server URL — used for webhook callbacks and admin panel links
  serverURL: process.env.CMS_SERVER_URL,

  // ── Database ──────────────────────────────────────────────────────────────
  // All Payload tables live under the 'cms' schema on Supabase.
  // This prevents table name collisions with TypeORM-managed services.
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    schemaName: 'cms',
  }),

  // ── Editor ────────────────────────────────────────────────────────────────
  editor: lexicalEditor({}),

  // ── Collections ───────────────────────────────────────────────────────────
  collections: [
    Listings, Users, Orders, Categories,
    BlogPosts, HelpArticles, Announcements,
    FeatureFlags, Media, Testimonials, LandingPages,
  ],

  // ── Globals ───────────────────────────────────────────────────────────────
  globals: [SiteSettings, HomepageBanner, AdminConfig],

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    // 1. CategorySyncModule — publishes RabbitMQ events on category change
    categorySyncPlugin({
      categoryServiceUrl: process.env.CATEGORY_SERVICE_URL!,
    }),

    // 2. SEO plugin — adds seoTitle, seoDescription, seoImage to content collections
    seoPlugin({ uploadsCollection: 'media' }),

    // 3. R2 Storage — all Media uploads go to Cloudflare R2
    r2Storage({
      collections:     { media: true },
      bucket:          process.env.R2_BUCKET!,
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      endpoint:        process.env.R2_ENDPOINT!,
    }),
  ],

  // ── Admin Panel ───────────────────────────────────────────────────────────
  // The Users collection powers admin panel authentication.
  admin: { user: 'users' },

  // ── TypeScript ────────────────────────────────────────────────────────────
  // Run 'payload generate:types' to regenerate after schema changes.
  typescript: { outputFile: 'src/payload-types.ts' },
});
```

---

## 4. Plugin Wiring Explained

### 4.1 categorySyncPlugin

The `categorySyncPlugin` is a custom Payload plugin defined in `src/plugins/categorySync.plugin.ts`. It wires `afterChange` and `afterDelete` hooks on the Categories collection. When a category changes, the hook calls `CmsEventPublisher` to emit a RabbitMQ event to the `cms.events` exchange. Full implementation is documented in CS-05.

### 4.2 seoPlugin

The `@payloadcms/plugin-seo` plugin injects three fields (`seoTitle`, `seoDescription`, `seoImage`) into the BlogPosts, HelpArticles, Testimonials, and LandingPages collections. No additional configuration is needed beyond passing the `uploadsCollection` reference.

### 4.3 r2Storage

The `@payloadcms/storage-r2` plugin intercepts all Media collection uploads and routes them to Cloudflare R2. Payload replaces the local file URL with an R2 presigned URL on read. Media is never stored locally or served from cms-service.

---

## 5. server.ts — Entry Point

**File location:** `apps/cms-service/src/server.ts`

```typescript
import express from 'express';
import payload from 'payload';
import dotenv from 'dotenv';
import config from './payload.config';

dotenv.config();

const app = express();

// /health must be registered before payload.init() so it
// responds immediately — even before Payload finishes booting.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cms-service' });
});

const start = async (): Promise<void> => {
  await payload.init({
    config,
    express: app,
    onInit: () => {
      payload.logger.info(
        `cms-service listening on port ${process.env.CMS_PORT ?? 3020}`
      );
    },
  });

  app.listen(Number(process.env.CMS_PORT) ?? 3020);
};

start().catch((err) => {
  console.error('cms-service failed to start:', err);
  process.exit(1);
});
```

---

## 6. Module Bootstrapping Order

Understanding this order is important for debugging startup failures:

1. `dotenv.config()` loads environment variables from `.env`.
2. Express app is created and `/health` endpoint is registered.
3. `payload.init()` is called — begins loading `payload.config.ts`.
4. Database adapter connects to Supabase PostgreSQL (`cms` schema).
5. Collections and globals are registered in Payload's registry.
6. Plugins run their setup hooks (`categorySyncPlugin` wires `afterChange`/`afterDelete`; `r2Storage` patches the Media upload handler).
7. `CmsEventPublisher` connects to RabbitMQ (async — cms-service starts even if RabbitMQ is temporarily unavailable, but events will fail until connection is restored).
8. Admin panel assets are served at `/admin`.
9. `app.listen()` starts accepting HTTP traffic on `CMS_PORT`.

---

## 7. Verification

- Run `npm run dev` and confirm the terminal shows: `cms-service listening on port 3020`.
- Run the smoke tests from CS-01 Section 9 to verify health, admin panel, and categories API.
- Navigate to `http://localhost:3020/admin` and log in with your admin credentials.
- Confirm the collections sidebar shows all 11 collections: Listings, Users, Orders, Categories, BlogPosts, HelpArticles, Announcements, FeatureFlags, Media, Testimonials, LandingPages.
- Confirm globals sidebar shows: Site Settings, Homepage Banner, Admin Config.
- **References:** CS-00 (architecture), CS-01 (Docker & runtime), CS-03 (collections & globals), CS-05 (CategorySyncModule).
