// apps/cms-service/src/payload.config.ts
//
// Master Payload v3 configuration. This file is the single source of truth
// for every collection, global, plugin, and database setting in cms-service.
// Keep it as a registry — do not put business logic here.
//
// Architectural note: cms-service is decoupled. The frontend NEVER reads from
// Payload directly. Editors mutate content here → afterChange hooks publish
// RabbitMQ events → consumer NestJS services write to their own schemas →
// the frontend reads from those services. This means we can upgrade Payload,
// add plugins, or change CMS internals without ever risking a frontend outage.

import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { seoPlugin } from '@payloadcms/plugin-seo'

// ── Collections ─────────────────────────────────────────────────────────────
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Projects } from './collections/Projects'
import { CategoryPages } from './collections/CategoryPages'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.CMS_SERVER_URL,

  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },

  // ── Editor ────────────────────────────────────────────────────────────────
  editor: lexicalEditor(),

  // ── Database ──────────────────────────────────────────────────────────────
  // All Payload tables live under the dedicated `cms` schema so they never
  // collide with TypeORM-managed tables owned by NestJS services.
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    schemaName: process.env.DATABASE_SCHEMA || 'cms',
  }),

  // ── Collections ───────────────────────────────────────────────────────────
  // Per-listing-type schemas (Projects, Services, Teams, Talent, Jobs) are
  // added in their respective build tasks. Each gets its OWN dedicated
  // collection — there is no shared "Listings" collection with a discriminator.
  collections: [Users, Media, Projects, CategoryPages],

  // ── Globals ───────────────────────────────────────────────────────────────
  globals: [],

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    // SEO plugin — exposes seoTitle/seoDescription/seoImage on content
    // collections that opt in. We'll enable per-collection as we add them.
    seoPlugin({
      collections: ['projects', 'category-pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) =>
        typeof doc?.title === 'string' ? `${doc.title} | Marketeq` : 'Marketeq',
    }),

    // S3 storage adapter pointed at Cloudflare R2 (R2 is S3-compatible).
    // The legacy v2 @payloadcms/storage-r2 package does NOT exist for v3 —
    // this is the canonical v3 path for R2.
    s3Storage({
      collections: {
        media: {
          prefix: 'cms',
        },
      },
      bucket: process.env.R2_BUCKET || '',
      config: {
        endpoint: process.env.R2_ENDPOINT,
        region: process.env.R2_REGION || 'auto',
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        forcePathStyle: true,
      },
    }),
  ],

  // ── Secret + TypeScript codegen ──────────────────────────────────────────
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
