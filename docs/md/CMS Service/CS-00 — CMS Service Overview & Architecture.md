CS-00

**CMS Service — Overview & Architecture**

Service: cms-service \| Powered by Payload CMS

Marketeq Backend — marketeq-projects-nestjs

**1. Purpose & Scope**

cms-service is the centralised Payload CMS microservice installed inside
the Marketeq monorepo. It provides the content authoring and admin layer
for the entire Marketeq platform. cms-service syncs its managed content
to the shared PostgreSQL database via RabbitMQ events; the frontend and
other microservices read from the database through their own NestJS
services, never directly from cms-service. This architecture decouples
the CMS from runtime read traffic, allowing cms-service to be upgraded
or replaced independently without breaking the frontend or any consuming
service.

cms-service owns the following content domains:

Platform Listings — all five listing types (Projects, Services, Teams,
Talent, and Jobs) represented as Payload collections that mirror and
extend the listings-service data model for CMS-managed content fields
such as featured status, editorial labels, and promotional copy.

Platform Users — all user accounts with their role: clients, talent, and
admins. The Users collection in Payload is the canonical identity index
consumed by the admin panel and by any service that needs to query or
display user profiles outside of auth-service.

Permissions and Access Control — role-based access policies for Payload
admin panel users covering four roles: Admin, Developer, Content Editor,
and Author. Each role has precisely scoped collection and field-level
permissions defined in Payload access control functions.

Admin Features — platform administration surfaces including content
review queues, flag management, featured listing curation, and
platform-level configuration that internal staff manage through the
Payload admin panel.

Order Management — a structured Orders collection that records every
transaction initiated on the platform. When a client places an order,
the order record is written to the CMS index and is available for admin
review, fulfilment tracking, and reporting.

Marketing and Website Content — all content for the Marketeq marketing
site and in-app content surfaces: blog posts, help articles,
announcements, landing page copy, and testimonials.

Site Settings — a Payload global that stores platform-wide
configuration. Changes are synced to the shared database and consumed by
the frontend and other microservices from there.

Categories — a Payload collection that integrates with the platform
category-service via the CategorySyncModule. Categories in Payload are
the canonical source of truth. Sync events are published to a RabbitMQ
topic exchange (cms.events) and consumed by category-service; a nightly
cron reconciliation pull via REST handles drift recovery.

> *Important: cms-service does not replace listings-service,
> auth-service, or contracts-service. It provides the CMS layer on top
> of the platform — structured content authoring, admin tooling, and a
> queryable content index. Transactional logic (creating a contract,
> sending an invite, processing a payout) remains in the appropriate
> NestJS microservice.*
>
> *Note: This document reflects the current feature set of cms-service.
> The collections, admin features, and integrations listed here are not
> the final scope. The CMS is designed to be expanded as the platform
> scales — new collections, content types, admin surfaces, and service
> integrations will be added incrementally and documented in companion
> docs as they ship.*

**2. Repo Placement**

cms-service is installed directly inside the monorepo at
apps/cms-service. Payload CMS is a Node.js application — it runs
alongside the NestJS microservices as a peer process, not as a NestJS
module.

> apps/
>
> cms-service/
>
> src/
>
> collections/
>
> Listings.ts \# All listing types — projects, services, teams, talent,
> jobs
>
> Users.ts \# All platform users — clients, talent, admins
>
> Orders.ts \# Order management for all incoming orders
>
> Categories.ts \# Synced with category-service via CategorySyncModule
>
> BlogPosts.ts
>
> HelpArticles.ts
>
> Announcements.ts
>
> FeatureFlags.ts
>
> Media.ts
>
> Testimonials.ts
>
> LandingPages.ts
>
> globals/
>
> SiteSettings.ts \# Platform-wide config
>
> HomepageBanner.ts
>
> AdminConfig.ts \# Admin feature toggles and platform config
>
> access/
>
> roles.ts \# Admin, Developer, ContentEditor, Author
>
> isAdmin.ts
>
> isDeveloper.ts
>
> isContentEditor.ts
>
> isAuthor.ts
>
> isPublished.ts
>
> hooks/
>
> afterChange/
>
> syncCategories.ts \# Fires on categories change — notifies
> category-service
>
> invalidateCache.ts
>
> notifyOrderService.ts
>
> plugins/
>
> categorySync.plugin.ts \# CategorySyncModule — category-service
> integration rabbitmq/ rabbitmq.module.ts \# ClientsModule wiring for
> cms.events exchange cms-event.publisher.ts \# CmsEventPublisher —
> wraps client.emit()
>
> payload.config.ts
>
> Dockerfile
>
> package.json
>
> tsconfig.json

**3. Database — Pointing to the CMS Index**

cms-service connects to the same Supabase PostgreSQL instance used by
all Marketeq microservices. Payload uses the @payloadcms/db-postgres
adapter. All Payload-managed tables live under the cms schema on
Supabase — no table name collisions with TypeORM-managed services are
possible.

cms-service writes to the cms schema on Supabase. Content changes are
synced to the shared database tables consumed by NestJS microservices
via RabbitMQ events. The frontend and other services read from the
shared database through their own NestJS services — they never call
cms-service directly at runtime. This means cms-service can be upgraded,
swapped, or taken offline for maintenance without any impact on the
frontend or downstream services.

**3.1 payload.config.ts — Core Configuration**

> // apps/cms-service/src/payload.config.ts
>
> import { buildConfig } from 'payload/config';
>
> import { postgresAdapter } from '@payloadcms/db-postgres';
>
> import { r2Storage } from '@payloadcms/storage-r2';
>
> import { seoPlugin } from '@payloadcms/plugin-seo';
>
> import { categorySyncPlugin } from './plugins/categorySync.plugin';
>
> // Collections
>
> import { Listings } from './collections/Listings';
>
> import { Users } from './collections/Users';
>
> import { Orders } from './collections/Orders';
>
> import { Categories } from './collections/Categories';
>
> import { BlogPosts } from './collections/BlogPosts';
>
> import { HelpArticles } from './collections/HelpArticles';
>
> import { Announcements } from './collections/Announcements';
>
> import { FeatureFlags } from './collections/FeatureFlags';
>
> import { Media } from './collections/Media';
>
> import { Testimonials } from './collections/Testimonials';
>
> import { LandingPages } from './collections/LandingPages';
>
> // Globals
>
> import { SiteSettings } from './globals/SiteSettings';
>
> import { HomepageBanner } from './globals/HomepageBanner';
>
> import { AdminConfig } from './globals/AdminConfig';
>
> export default buildConfig({
>
> serverURL: process.env.CMS_SERVER_URL,
>
> db: postgresAdapter({
>
> pool: { connectionString: process.env.DATABASE_URL },
>
> schemaName: 'cms',
>
> }),
>
> collections: \[
>
> Listings, Users, Orders, Categories,
>
> BlogPosts, HelpArticles, Announcements,
>
> FeatureFlags, Media, Testimonials, LandingPages,
>
> \],
>
> globals: \[SiteSettings, HomepageBanner, AdminConfig\],
>
> plugins: \[
>
> categorySyncPlugin({ categoryServiceUrl:
> process.env.CATEGORY_SERVICE_URL }),
>
> seoPlugin({ uploadsCollection: 'media' }),
>
> r2Storage({ collections: { media: true }, bucket:
> process.env.R2_BUCKET,
>
> accessKeyId: process.env.R2_ACCESS_KEY_ID,
>
> secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
>
> endpoint: process.env.R2_ENDPOINT }),
>
> \],
>
> admin: { user: 'users' },
>
> typescript: { outputFile: 'src/payload-types.ts' },
>
> });

**3.2 Environment Variables**

|  |  |  |
|----|----|----|
| **Variable** | **Example** | **Description** |
| CMS_PORT | 3020 | Port cms-service listens on. |
| CMS_SERVER_URL | http://cms-service:3020 | Full URL of the cms-service container. |
| DATABASE_URL | postgres://...supabase.co/postgres | Shared Supabase connection string. Same value used by all services. |
| PAYLOAD_SECRET | (32+ char random) | JWT signing secret for Payload admin sessions. |
| CMS_API_KEY | cms-internal-key | Read-only API key used by other microservices to authenticate CMS index requests. |
| CATEGORY_SERVICE_URL | http://category-service:3025 | URL of category-service. Used by the CategorySyncModule to push category change events. |
| R2_BUCKET | marketeq-cms | Cloudflare R2 bucket for CMS media uploads. |
| R2_ACCESS_KEY_ID | (secret) | R2 access key. |
| R2_SECRET_ACCESS_KEY | (secret) | R2 secret key. |
| R2_ENDPOINT | https://\<id\>.r2.cloudflarestorage.com | R2 account endpoint. |
| RABBITMQ_URL | amqp://user:pass@rabbitmq:5672 | RabbitMQ connection string. Used by CmsEventPublisher to publish events to the cms.events exchange. |

**4. Roles and Permissions**

cms-service defines four access roles within the Payload admin panel.
Roles are stored on the Users collection as a select field and are
enforced by Payload access control functions on every collection and
global. Role definitions are centralised in src/access/roles.ts.

|  |  |  |
|----|----|----|
| **Role** | **Slug** | **Permissions** |
| Admin | admin | Full access to all collections, globals, admin features, user management, and order management. Can create, read, update, and delete any document. Can manage all other users and their roles. Can access all admin-only config globals. |
| Developer | developer | Full read and write access to all collections and globals. Can create and modify content and configuration. Cannot delete users or orders. Cannot access the AdminConfig global (platform config is admin-only). Intended for backend engineers who need direct CMS access during development. |
| Content Editor | content_editor | Read and write access to content collections: BlogPosts, HelpArticles, Announcements, Testimonials, LandingPages, Media, and SiteSettings global. Read-only access to Listings and Categories. No access to Users, Orders, FeatureFlags, or AdminConfig. Cannot publish — documents must be approved by an Admin. |
| Author | author | Write access to BlogPosts and HelpArticles only — restricted to their own authored documents. Cannot publish their own work (status is locked to draft). No access to any other collection or global. Intended for external contributors and freelance content creators. |

> // apps/cms-service/src/access/roles.ts
>
> import { Access } from 'payload/types';
>
> export type UserRole = 'admin' \| 'developer' \| 'content_editor' \|
> 'author';
>
> export const isAdmin: Access = ({ req: { user } }) =\>
>
> user?.role === 'admin';
>
> export const isAdminOrDeveloper: Access = ({ req: { user } }) =\>
>
> \['admin', 'developer'\].includes(user?.role);
>
> export const isContentEditorOrAbove: Access = ({ req: { user } }) =\>
>
> \['admin', 'developer', 'content_editor'\].includes(user?.role);
>
> // Author can only access their own documents
>
> export const isAuthorOfDocument: Access = ({ req: { user }, id }) =\>
> {
>
> if (\['admin', 'developer', 'content_editor'\].includes(user?.role))
> return true;
>
> if (user?.role === 'author') return { author: { equals: user.id } };
>
> return false;
>
> };

**5. Collections — Full Index**

**5.1 Listings**

The Listings collection represents all five listing types on the
Marketeq platform: Projects, Services, Teams, Talent, and Jobs. This
collection is the CMS-managed view of listings — it stores editorial and
promotional metadata that complements the transactional listing record
owned by listings-service. The sourceId field links each CMS listing
record back to the authoritative record in listings-service.

> // apps/cms-service/src/collections/Listings.ts
>
> export const Listings: CollectionConfig = {
>
> slug: 'listings',
>
> admin: { useAsTitle: 'title', defaultColumns: \['title',
> 'listingType', 'status', 'featured'\] },
>
> access: {
>
> read: () =\> true,
>
> create: isAdminOrDeveloper,
>
> update: isContentEditorOrAbove,
>
> delete: isAdmin,
>
> },
>
> fields: \[
>
> { name: 'sourceId', type: 'text', required: true, unique: true, index:
> true,
>
> admin: { description: 'UUID of the listing record in
> listings-service.' } },
>
> { name: "listingType", type: "select", required: true,
>
> options: \['project', 'service', 'team', 'talent', 'job'\] },
>
> { name: 'title', type: 'text', required: true },
>
> { name: 'slug', type: 'text', required: true, unique: true, index:
> true },
>
> { name: 'excerpt', type: 'textarea', maxLength: 300 },
>
> { name: 'featured', type: 'checkbox', defaultValue: false,
>
> admin: { description: 'Pin to featured section on homepage and
> marketplace.' } },
>
> { name: 'featuredOrder', type: 'number', admin: { condition: (d) =\>
> d.featured } },
>
> { name: 'editorialLabel', type: 'select',
>
> options: \['top_pick', 'new', 'trending', 'staff_pick', 'none'\],
> defaultValue: 'none' },
>
> { name: 'category', type: 'relationship', relationTo: 'categories' },
>
> { name: 'coverImage', type: 'upload', relationTo: 'media' },
>
> { name: "status", type: "select", required: true,
>
> options: \['draft', 'published', 'archived'\], defaultValue: 'draft'
> },
>
> { name: 'publishedAt', type: 'date' },
>
> \],
>
> };

**5.2 Users**

The Users collection is the Payload admin panel user store and the CMS
identity index for the entire platform. It covers all three user types:
clients, talent members, and admins. The sourceId field links back to
the user record in user-service (auth-service). Payload uses this
collection as its authentication source for the admin panel (admin: {
user: "users" } in payload.config.ts).

> // apps/cms-service/src/collections/Users.ts
>
> export const Users: CollectionConfig = {
>
> slug: 'users',
>
> auth: true, // Enables Payload JWT auth for admin panel login
>
> admin: { useAsTitle: 'email', defaultColumns: \['email', 'name',
> 'userType', 'role', 'status'\] },
>
> access: {
>
> read: isAdminOrDeveloper,
>
> create: isAdmin,
>
> update: isAdmin,
>
> delete: isAdmin,
>
> },
>
> fields: \[
>
> { name: 'sourceId', type: 'text', unique: true, index: true,
>
> admin: { description: 'UUID from user-service / auth-service.' } },
>
> { name: 'name', type: 'text', required: true },
>
> { name: 'email', type: 'email', required: true },
>
> { name: "userType", type: "select", required: true,
>
> options: \['client', 'talent', 'admin'\] },
>
> { name: "role", type: "select", required: true,
>
> options: \['admin', 'developer', 'content_editor', 'author'\],
>
> admin: { condition: (d) =\> d.userType === 'admin',
>
> description: 'CMS admin panel role. Only applies to admin-type users.'
> } },
>
> { name: 'avatar', type: 'upload', relationTo: 'media' },
>
> { name: 'status', type: 'select', options: \['active', 'suspended',
> 'deleted'\],
>
> defaultValue: 'active' },
>
> { name: 'verifiedAt', type: 'date' },
>
> { name: 'notes', type: 'textarea',
>
> admin: { description: 'Internal admin notes. Never shown to the user.'
> } },
>
> \],
>
> };

**5.3 Orders**

The Orders collection records every order placed on the Marketeq
platform. When a client initiates an engagement — hiring talent on a
project, purchasing a service, or starting a team — the order is written
to the CMS index. Admins use the Payload admin panel to review orders,
track fulfilment status, and resolve disputes.

> // apps/cms-service/src/collections/Orders.ts
>
> export const Orders: CollectionConfig = {
>
> slug: 'orders',
>
> admin: { useAsTitle: 'orderNumber',
>
> defaultColumns: \['orderNumber', 'client', 'listing', 'orderType',
> 'status', 'createdAt'\] },
>
> access: {
>
> read: isAdminOrDeveloper,
>
> create: isAdminOrDeveloper, // Written by order sync from
> contracts-service
>
> update: isAdminOrDeveloper,
>
> delete: isAdmin,
>
> },
>
> fields: \[
>
> { name: 'orderNumber', type: 'text', required: true, unique: true,
> index: true },
>
> { name: 'sourceId', type: 'text', index: true,
>
> admin: { description: 'Contract or transaction ID from
> contracts-service.' } },
>
> { name: 'client', type: 'relationship', relationTo: 'users', required:
> true },
>
> { name: 'talent', type: 'relationship', relationTo: 'users' },
>
> { name: 'listing', type: 'relationship', relationTo: 'listings' },
>
> { name: "orderType", type: "select", required: true,
>
> options: \['project', 'service', 'team', 'talent', 'job'\] },
>
> { name: 'totalAmount', type: 'number', admin: { description: 'USD
> cents.' } },
>
> { name: 'currency', type: 'text', defaultValue: 'USD' },
>
> { name: "status", type: "select", required: true,
>
> options: \['pending', 'active', 'completed', 'disputed',
> 'cancelled'\],
>
> defaultValue: 'pending' },
>
> { name: 'notes', type: 'textarea' },
>
> { name: 'startDate', type: 'date' },
>
> { name: 'endDate', type: 'date' },
>
> \],
>
> };

**5.4 Categories — CategorySyncModule Integration**

The Categories collection is the canonical source of truth for all
platform listing categories. It integrates with category-service via
RabbitMQ. When a category is created, updated, or deleted in Payload,
the CmsEventPublisher publishes an event to the cms.events topic
exchange with routing key category.saved or category.deleted.
category-service consumes these events from the cms.category.category
queue. A nightly cron reconciliation pull via REST handles any missed
messages. This replaces the previous axios HTTP webhook approach.

> // apps/cms-service/src/collections/Categories.ts
>
> export const Categories: CollectionConfig = {
>
> slug: 'categories',
>
> admin: { useAsTitle: 'name',
>
> defaultColumns: \['name', 'slug', 'parent', 'listingTypes', 'status'\]
> },
>
> access: { read: () =\> true, create: isAdminOrDeveloper,
>
> update: isAdminOrDeveloper, delete: isAdmin },
>
> fields: \[
>
> { name: 'name', type: 'text', required: true },
>
> { name: 'slug', type: 'text', required: true, unique: true, index:
> true },
>
> { name: 'description', type: 'textarea' },
>
> { name: 'icon', type: 'upload', relationTo: 'media' },
>
> { name: 'parent', type: 'relationship', relationTo: 'categories',
> hasMany: false },
>
> { name: "listingTypes", type: "select", hasMany: true,
>
> options: \['project', 'service', 'team', 'talent', 'job'\] },
>
> { name: "status", type: "select",
>
> options: \['active', 'inactive'\], defaultValue: 'active' },
>
> { name: 'sortOrder', type: 'number' },
>
> { name: 'algoliaFacetOrder', type: 'number' },
>
> \],
>
> hooks: {
>
> afterChange: \[syncCategoryToService\],
>
> afterDelete: \[deleteCategoryFromService\],
>
> },
>
> };
>
> // apps/cms-service/src/plugins/categorySync.plugin.ts
>
> import { Config } from 'payload/config';
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
> return {
>
> ...config,
>
> hooks: {
>
> afterChange: \[
>
> async ({ doc, collection, req }) =\> {
>
> if (collection.slug !== 'categories') return;
>
> // Push updated category to category-service
>
> await fetch(opts.categoryServiceUrl + "/api/cms-sync", {
>
> method: 'POST',
>
> headers: { 'Content-Type': 'application/json',
>
> Authorization: 'Bearer ' + process.env.CMS_SYNC_SECRET },
>
> body: JSON.stringify({ event: 'afterChange', doc }),
>
> });
>
> },
>
> \],
>
> },
>
> };
>
> };

**5.5 Content Collections**

|  |  |  |
|----|----|----|
| **Collection** | **Slug** | **Purpose & Key Fields** |
| Blog Posts | blog-posts | Marketing blog content. Fields: title, slug, body (richText), author (relationship to Users), coverImage, category, tags, seo (SEO plugin), status (draft/published), publishedAt. Access: Content Editor and above can edit. Author can create drafts only. |
| Help Articles | help-articles | Help centre and FAQ content. Fields: title, slug, body (richText), topic (select), helpfulCount, relatedArticles (self-relationship), status. Consumed by the in-app help widget and public help centre. |
| Announcements | announcements | Platform-wide announcements shown to authenticated users. Fields: title, message (richText), audience (all/clients/talent/admins select), startDate, endDate, ctaLabel, ctaUrl, priority. Consumed by notification-service and pushed via Ably. |
| Feature Flags | feature-flags | Platform feature toggles. Fields: key (unique, indexed), enabled (checkbox), description, rolloutPercentage (number). Consumed by all services via Redis cache with 60s TTL. |
| Testimonials | testimonials | Client and talent testimonials for marketing use. Fields: authorName, authorTitle, authorCompany, avatar (upload), quote (textarea), rating (number 1-5), featured, status. Displayed on the marketing site. |
| Landing Pages | landing-pages | CMS-managed marketing landing pages. Fields: title, slug, hero (group: headline, subheadline, cta), sections (array of flexible content blocks), seo, status. Synced to DB; frontend reads from DB via NestJS. |
| Media | media | Centralised media library. All uploads stored in Cloudflare R2 via @payloadcms/storage-r2. Fields: alt, caption, credit, dimensions (auto). Payload returns R2 presigned URLs — media is never served directly from cms-service. |

**6. Globals**

|  |  |  |
|----|----|----|
| **Global** | **Access** | **Purpose & Key Fields** |
| Site Settings | Content Editor and above | Platform-wide configuration: platformName, supportEmail, socialLinks (group), defaultSeoTitle, defaultSeoDescription, cookieConsentCopy, termsUrl, privacyUrl. Synced to DB; frontend reads from DB via NestJS on every page render. |
| Homepage Banner | Content Editor and above | Optional promotional banner: enabled (checkbox), message, ctaLabel, ctaUrl, expiresAt, bannerType (info/promo/warning). Frontend polls on page load. Cache purged on change. |
| Admin Config | Admin only | Platform administration settings not exposed to the public: maintenanceMode (checkbox), maintenanceMessage, featuredListingsLimit, orderReviewThresholdCents, flagThreshold. This global is admin-only — Developers, Content Editors, and Authors have no access. |

**7. Admin Features**

The Payload admin panel provides the following administration surfaces.
These features are available to Admin and Developer roles unless
otherwise noted.

|  |  |
|----|----|
| **Admin Feature** | **Description** |
| Order Management | Admins review all incoming orders via the Orders collection. Filter by status (pending / active / completed / disputed / cancelled), order type, client, or date range. Update order status and add internal notes. Includes searchable transaction history with refund processing, billing date and billing frequency changes. Admin-only and Developer roles only. |
| User Management | View, filter, and edit all platform users. Suspend or reactivate accounts. Add internal notes. Manage CMS panel roles for admin-type users. View user activity history and edit account info. Admin role only for destructive actions. |
| Featured Listings Curation | Mark listings as featured, set featuredOrder, and assign editorial labels (top pick, trending, staff pick) from the Listings collection. Controls what appears in the featured section on the homepage and marketplace. |
| Content Review Queue | Blog posts and help articles authored by Author-role users accumulate in a draft state. Content Editors and Admins review and publish (or reject) drafts from the Payload collection list view using the status field. |
| Feature Flag Management | Admins and Developers toggle feature flags in the FeatureFlags collection without a code deploy. Changes propagate to all consuming services within 60 seconds via Redis TTL expiry and webhook-driven cache invalidation. |
| Announcement Scheduling | Admins create announcements with start and end dates. The announcements are automatically active within the window and expire automatically. Content Editors can draft announcements; only Admins can publish them. |
| Platform Config (AdminConfig global) | Admin-only global for maintenance mode, featured listing limits, order review thresholds, and content flag thresholds. Changes take effect immediately in consuming services. |
| Media Library | Centralised media management for all CMS-managed assets. Admins and Content Editors upload, tag, and organise images and documents. All assets stored in R2. |
| Team Management | Admins manage platform teams from the user account screen. Team assignment and membership visible alongside user profile data. |
| Talent List & Details | Browse and view talent profiles with application details. Admin-editable talent profile fields include username, availability, location, timezone, skills, industry expertise, overview, certifications, languages, education, and work experience. |
| Listing & Catalog Management | Search and sort listings across all five types (project, service, team, talent, job) with tabbed detail view. Create, edit, delete listings and manage listing status. Publish listings to the marketplace. Catalog-level management of all listing types. |

**8. Order Management Flow**

When a client places an order on the Marketeq platform (by accepting an
invite and completing the checkout flow), contracts-service emits a
contract.activated event. A listener in cms-service receives this event
and writes an order record to the Orders collection. Admins can then
track, review, and manage the order from the Payload admin panel.

> // Order sync listener in cms-service
>
> // Triggered by contract.activated RabbitMQ event
>
> async function syncOrderFromContract(event: ContractActivatedEvent):
> Promise\<void\> {
>
> const { contractId, groupId, clientId, talentId, listingId, orderType,
> amount } = event;
>
> await payload.create({
>
> collection: 'orders',
>
> data: {
>
> orderNumber: generateOrderNumber(contractId),
>
> sourceId: contractId,
>
> client: await resolveUserBySourceId(clientId),
>
> talent: await resolveUserBySourceId(talentId),
>
> listing: await resolveListingBySourceId(listingId),
>
> orderType,
>
> totalAmount: amount,
>
> status: 'active',
>
> startDate: new Date(),
>
> },
>
> });
>
> }
>
> *Important: cms-service does not process orders or payments. It
> records the order for admin visibility and reporting only. All
> transactional logic (deposit, billing, contract lifecycle) remains in
> contracts-service, checkout-service, and billing-service.*

**9. Order Management System — Support Team Overview**

The order management system provides the support team with end-to-end
visibility into every order on the platform. It spans the full order
lifecycle from intake through resolution and is powered by the Orders
collection in cms-service, with transactional logic delegated to
contracts-service, checkout-service, and billing-service.

**9.1 Order Lifecycle**

Every order passes through a defined set of statuses. The support team
can view and advance orders through these stages from the Payload admin
panel.

|  |  |  |
|----|----|----|
| **Status** | **Description** | **Support Actions** |
| Pending | Order created, awaiting payment confirmation from checkout-service. | View details, add notes, cancel if requested. |
| Active | Payment confirmed, engagement in progress. Billing cycle running via billing-service. | Track fulfilment, change billing date/frequency, add notes. |
| Disputed | Client or talent has raised a dispute. Billing paused by billing-service until resolved. | Review evidence, mediate, issue ruling (see 9.3). |
| Completed | Engagement finished, final payment settled. Read-only in CMS. | View history, process post-completion refund if needed. |
| Cancelled | Order terminated before completion. Refund processed if applicable. | Record cancellation reason, verify refund status. |

**9.2 Support Team Capabilities**

The support team operates from the Payload admin panel with the
following capabilities across the order lifecycle: search and filter
orders by status, order type, client, talent, date range, or order
number; view full order history including linked client and talent
profiles, associated listing, and transaction timeline; update order
status and add internal notes visible only to admin and developer roles;
initiate refunds via billing-service (full or partial) with a required
reason field; modify billing date and billing frequency for active
recurring orders; view searchable transaction history per order showing
all charges, refunds, and adjustments; escalate orders to admin review
by flagging them in the notes field.

**9.3 Dispute Handling**

When a client or talent raises a dispute, the order moves to the
disputed status. Billing-service automatically pauses the billing cycle
for the order. The support team follows a structured resolution flow.

Dispute intake: The dispute reason and any supporting evidence
(messages, deliverables, screenshots) are attached to the order record.
Both parties are notified that the dispute is under review.

Evidence review: The support agent reviews evidence from both sides.
Each party has a defined window to submit evidence. The agent can
request additional documentation from either party via the platform
messaging system.

Resolution: The support team issues a ruling with one of the following
outcomes: resolve in favour of client (full or partial refund processed
via billing-service, order cancelled or returned to active), resolve in
favour of talent (billing resumes, order returned to active), mutual
agreement (negotiated refund amount, order closed or continued), or
escalation to admin for complex cases exceeding a configurable threshold
set in the AdminConfig global (orderReviewThresholdCents).

All dispute actions, evidence, and the final ruling are recorded in the
order notes and transaction history for audit purposes. The resolution
outcome is communicated to both parties via notification-service.

**9.4 Service Boundaries**

cms-service owns the order record and admin UI. contracts-service owns
contract lifecycle and status transitions. billing-service owns payment
processing, refund execution, and billing schedule changes.
checkout-service owns the initial payment capture. The support team
interacts with the CMS admin panel; all financial operations are
delegated to the appropriate service via RabbitMQ events or internal API
calls.

**10. CMS Index — Microservice Consumption**

cms-service syncs all CMS-managed content to the shared PostgreSQL
database via RabbitMQ events. The frontend and all microservices read
from the database through their own NestJS services — they never call
cms-service directly at runtime. The CMS_API_KEY is used only for
internal service-to-service calls (e.g. category-service cold-start
hydration) and admin tooling, not for frontend reads. This separation
means cms-service can be updated to a new version at any time without
affecting the frontend or any downstream service.

|  |  |  |
|----|----|----|
| **Endpoint** | **Method** | **Primary Consumer** |
| /api/categories?depth=2 | GET | listings-service — listing type dropdowns, Algolia facet seeding, category validation on listing create. |
| /api/listings?where\[featured\]\[equals\]=true | GET | listings-service — syncs featured listings to the shared DB; frontend reads from DB. |
| /api/feature-flags | GET | All services — cached in Redis per service (TTL 60s). Invalidated via webhook on flag change. |
| /api/announcements?where\[status\]\[equals\]=published | GET | notification-service — active announcements pushed via Ably to authenticated users. |
| /api/blog-posts?where\[status\]\[equals\]=published | GET | Content synced to DB — frontend reads blog posts from DB via NestJS. |
| /api/help-articles | GET | Content synced to DB — frontend and help widget read from DB via NestJS. |
| /api/globals/site-settings | GET | Settings synced to DB — frontend reads from DB via NestJS on every render. |
| /api/globals/homepage-banner | GET | Banner synced to DB — frontend reads from DB via NestJS on page load. |

**10.1 Inter-Service Messaging — RabbitMQ**

cms-service publishes events to a durable RabbitMQ topic exchange
(cms.events) via the CmsEventPublisher. Downstream services bind to
routing keys they need. This replaces the previous axios HTTP POST
hooks, providing delivery guarantees, automatic retry with dead-letter
queues, and decoupled consumers. Payload is the source of truth;
category-service and listings-service maintain read-optimised caches.

|  |  |
|----|----|
| **Event** | **Flow** |
| Category created in Payload | CmsEventPublisher emits category.saved to cms.events exchange. category-service consumer creates the record and updates its Redis cache. |
| Category updated in Payload | CmsEventPublisher emits category.saved with the full updated document. category-service consumer upserts the record and invalidates the affected cache keys. |
| Category deleted in Payload | CmsEventPublisher emits category.deleted. category-service consumer removes the record and updates the cache. |
| category-service cold start | On startup, category-service calls GET /api/categories?depth=2&limit=1000 on cms-service to hydrate its full cache. This is the initial CMS index pull. |

**11. Deployment**

**11.1 Dockerfile**

> \# apps/cms-service/Dockerfile
>
> FROM node:20-alpine
>
> WORKDIR /app
>
> COPY package\*.json ./
>
> RUN npm install
>
> COPY . .
>
> RUN npm run build
>
> EXPOSE 3020
>
> CMD \["node", "dist/server.js"\]

**11.2 docker-compose.override.yml**

> cms-service:
>
> build: ./apps/cms-service
>
> container_name: cms-service
>
> restart: always
>
> environment:
>
> \- CMS_PORT=3020
>
> \- CMS_SERVER_URL=http://cms-service:3020
>
> \- DATABASE_URL=\${DATABASE_URL}
>
> \- PAYLOAD_SECRET=\${PAYLOAD_SECRET}
>
> \- CMS_API_KEY=\${CMS_API_KEY}
>
> \- CATEGORY_SERVICE_URL=http://category-service:3025 -
> RABBITMQ_URL=\${RABBITMQ_URL}
>
> \- CMS_SYNC_SECRET=\${CMS_SYNC_SECRET}
>
> \- R2_BUCKET=\${CMS_R2_BUCKET}
>
> \- R2_ACCESS_KEY_ID=\${R2_ACCESS_KEY_ID}
>
> \- R2_SECRET_ACCESS_KEY=\${R2_SECRET_ACCESS_KEY}
>
> \- R2_ENDPOINT=\${R2_ENDPOINT}
>
> ports:
>
> \- "3020:3020"
>
> depends_on:
>
> \- postgres

**11.3 First-Run Instructions**

> \# 1. Run Payload migrations to create the cms schema on Supabase
>
> cd apps/cms-service && npx payload migrate
>
> \# 2. Payload auto-seeds the first admin user from env vars on
> startup.
>
> \# Set CMS_ADMIN_EMAIL and CMS_ADMIN_PASSWORD before first boot.
>
> \# Rotate the password immediately after first login.
>
> \# 3. Verify health
>
> curl http://localhost:3020/health
>
> \# Expected: { "status": "ok", "service": "cms-service" }
>
> \# 4. Seed initial categories from the Payload admin panel or via API.
>
> \# category-service will pull the full category list on its next
> startup.

**12. Companion Document Index**

CS-01 — Docker & Runtime Setup — full package.json, Dockerfile, env var
table, smoke tests

CS-02 — Folder Structure & Bootstrapping — complete file layout,
payload.config.ts walkthrough, plugin wiring

CS-03 — Collections & Globals — full TypeScript schema definitions for
every collection and global

CS-04 — REST API Reference — all endpoints, authentication, query
parameters, response shapes, pagination

CS-05 — CategorySyncModule — full implementation of the category-service
sync plugin, webhook contracts, cold-start hydration flow

CS-06 — Permissions & Access Control — full role definitions,
field-level access rules, admin panel configuration

CS-07 — Admin Features Guide — order management workflows, content
review queue, featured listing curation, announcement scheduling

CS-08 — Observability & Health — logging, health endpoint, alert
thresholds, webhook failure handling

RMQ-00 — RabbitMQ Platform Guide — exchange topology, naming
conventions, consumer patterns

RMQ-01 — cms-service Publisher — RabbitMQModule, CmsEventPublisher,
updated hooks replacing axios

RMQ-02 — listings-service Consumer — hybrid app setup, project event
consumer, removal of HTTP sync endpoint

RMQ-03 — category-service Consumer — hybrid app setup, category event
consumer, cron reconciliation retained

Admin Requirements — admin panel feature requirements for user, order,
project, talent, and team management
