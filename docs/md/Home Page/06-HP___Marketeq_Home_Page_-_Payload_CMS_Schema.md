Marketeq Home Page

Payload CMS Schema

Homepages Collection, Globals, Hooks, Access Control, and Admin
Configuration

April 5, 2026

Backend Only --- No React, HTML, or Frontend Code

1.  Payload CMS Architecture Overview

Payload CMS 3.x provides a flexible, headless backend for the Marketeq
platform. This document covers the Homepages collection, related
globals, hooks, and access control patterns that enable editorial
management of homepage content.

-   CMS Service Location

    Runs at /apps/cms-service/ in the Marketeq monorepo

-   Database

    PostgreSQL on Supabase

    Schema: cms

    Tables auto-created by Payload migrations on first startup

-   Media Storage

    Cloudflare R2 integration via \@payloadcms/storage-r2

    All uploads stored in R2 buckets with signed URLs

-   REST API

    All collections auto-generate REST API at /api/{collection-slug}

    Public read access for API consumers

    Protected write access (admin role required)

-   Admin Panel

    Available at /admin

    Accessible only to authenticated admin users

    Provides CRUD interface for all collections and globals

2.  Homepages Collection --- Complete Specification

The Homepages collection is the core editorial interface for managing
homepage content, layouts, and promotional content.

2.1 Collection Config

Full production-ready code for
apps/cms-service/src/collections/Homepages.ts:

+-----------------------------------------------------------------------+
| export const Homepages: CollectionConfig = {                          |
|                                                                       |
| slug: \'homepages\',                                                  |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| useAsTitle: \'title\',                                                |
|                                                                       |
| defaultColumns: \[\'title\', \'slug\', \'status\', \'isDefault\',     |
| \'updatedAt\'\],                                                      |
|                                                                       |
| group: \'Content\'                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| access: {                                                             |
|                                                                       |
| read: () =\> true,                                                    |
|                                                                       |
| create: isAdminRole,                                                  |
|                                                                       |
| update: isAdminRole,                                                  |
|                                                                       |
| delete: isAdminRole                                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| // Field definitions follow below                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| hooks: {                                                              |
|                                                                       |
| afterChange: \[publishHomepageSaved\],                                |
|                                                                       |
| afterDelete: \[publishHomepageDeleted\]                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| };                                                                    |
+-----------------------------------------------------------------------+

2.2 Access Control

Payload implements role-based access control (RBAC) for the Homepages
collection:

Read Access

  -----------------------------------------------------------------------
  read: () =\> true

  -----------------------------------------------------------------------

Public read access: any API consumer or admin user can fetch homepages
via /api/homepages. This enables frontend applications to consume
homepage data without authentication.

Create Access

+-----------------------------------------------------------------------+
| create: ({ req }) =\> {                                               |
|                                                                       |
| return req.user?.role === \'admin\';                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

Only users with admin role can create new homepage documents. This
prevents unauthorized homepage creation.

Update Access

+-----------------------------------------------------------------------+
| update: ({ req, doc }) =\> {                                          |
|                                                                       |
| return req.user?.role === \'admin\';                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

Only admin users can modify existing homepages. This includes updating
fields, status, and associated relationships.

Delete Access

+-----------------------------------------------------------------------+
| delete: ({ req }) =\> {                                               |
|                                                                       |
| return req.user?.role === \'admin\';                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

Only admin users can delete homepages. Deleted homepages trigger the
afterDelete hook to notify downstream services.

2.3 Fields --- Identity Group

The Identity group contains core metadata for each homepage document:

  ----------------------------------- -------------------------------------
  Field                               Configuration

  title                               text, required, displayed as admin
                                      title, max 100 characters

  slug                                text, required, unique, enforced at
                                      database level, typically \'home\'
                                      for default

  status                              select
                                      (draft\|active\|testing\|archived),
                                      required, default \'draft\'

  isDefault                           checkbox, default false, validation:
                                      only one should be true per
                                      environment

  testGroup                           text, optional, conditional on
                                      status=\'testing\', used for A/B
                                      testing
  ----------------------------------- -------------------------------------

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| type: \'group\',                                                      |
|                                                                       |
| name: \'identity\',                                                   |
|                                                                       |
| label: \'Identity\',                                                  |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'title\',                                                      |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| maxLength: 100,                                                       |
|                                                                       |
| admin: { description: \'Display name for this homepage version\' }    |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'slug\',                                                       |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| unique: true,                                                         |
|                                                                       |
| admin: { description: \'URL slug. Use \"home\" for the default        |
| homepage\' }                                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'status\',                                                     |
|                                                                       |
| type: \'select\',                                                     |
|                                                                       |
| options: \[                                                           |
|                                                                       |
| { label: \'Draft\', value: \'draft\' },                               |
|                                                                       |
| { label: \'Active\', value: \'active\' },                             |
|                                                                       |
| { label: \'Testing\', value: \'testing\' },                           |
|                                                                       |
| { label: \'Archived\', value: \'archived\' }                          |
|                                                                       |
| \],                                                                   |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| defaultValue: \'draft\',                                              |
|                                                                       |
| admin: { description: \'Publishing status. Only \"active\" is visible |
| to users.\' }                                                         |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'isDefault\',                                                  |
|                                                                       |
| type: \'checkbox\',                                                   |
|                                                                       |
| defaultValue: false,                                                  |
|                                                                       |
| admin: { description: \'Mark as default. Only one per environment     |
| should be true.\' }                                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'testGroup\',                                                  |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| condition: (data) =\> data.status === \'testing\',                    |
|                                                                       |
| description: \'Test group identifier for A/B testing\'                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

2.4 Fields --- Hero Group

The Hero group defines the main visual and messaging area at the top of
the homepage:

  ----------------------------------- -----------------------------------
  Field                               Configuration

  hero.headline                       text, required, max 200 characters,
                                      main hero message

  hero.subheadline                    textarea, optional, supporting
                                      message

  hero.backgroundImage                upload, relationTo \'media\', hero
                                      background image

  hero.ctaLabel                       text, optional, call-to-action
                                      button text

  hero.ctaUrl                         text, optional, CTA target URL
  ----------------------------------- -----------------------------------

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| type: \'group\',                                                      |
|                                                                       |
| name: \'hero\',                                                       |
|                                                                       |
| label: \'Hero Section\',                                              |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'headline\',                                                   |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| maxLength: 200,                                                       |
|                                                                       |
| admin: { description: \'Main hero headline\' }                        |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'subheadline\',                                                |
|                                                                       |
| type: \'textarea\',                                                   |
|                                                                       |
| admin: { description: \'Supporting headline text\' }                  |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'backgroundImage\',                                            |
|                                                                       |
| type: \'upload\',                                                     |
|                                                                       |
| relationTo: \'media\',                                                |
|                                                                       |
| admin: { description: \'Hero section background image\' }             |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'ctaLabel\',                                                   |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Button text for hero CTA\' }                  |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'ctaUrl\',                                                     |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Target URL for hero button\' }                |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

2.5 Fields --- Sections Array (Tax Groups)

The sections array is the primary editorial control for homepage content
layout. Each section displays a curated collection of listings based on
configurable rules or manual selection.

  ----------------------------------- -----------------------------------
  Field                               Configuration

  sections\[\].title                  text, required, section heading

  sections\[\].subtitle               text, optional, subheading

  sections\[\].ctaLabel               text, optional, section-level CTA
                                      button

  sections\[\].ctaUrl                 text, optional, section CTA target

  sections\[\].rules                  array of rule objects for dynamic
                                      listing selection

  sections\[\].manualEnabled          checkbox, enables pinnedItems
                                      override

  sections\[\].pinnedItems            relationship to listings,
                                      conditional when manualEnabled=true
  ----------------------------------- -----------------------------------

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| type: \'array\',                                                      |
|                                                                       |
| name: \'sections\',                                                   |
|                                                                       |
| label: \'Content Sections\',                                          |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'title\',                                                      |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| admin: { description: \'Section heading displayed to users\' }        |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'subtitle\',                                                   |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Optional subheading\' }                       |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'ctaLabel\',                                                   |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Section-level CTA button text\' }             |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'ctaUrl\',                                                     |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Section CTA button URL\' }                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| type: \'array\',                                                      |
|                                                                       |
| name: \'rules\',                                                      |
|                                                                       |
| label: \'Listing Selection Rules\',                                   |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'entity\',                                                     |
|                                                                       |
| type: \'select\',                                                     |
|                                                                       |
| options: \[\'listing\', \'category\', \'tag\'\],                      |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| admin: { description: \'Entity type to filter\' }                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'kind\',                                                       |
|                                                                       |
| type: \'select\',                                                     |
|                                                                       |
| options: \[\'newest\', \'trending\', \'topRated\', \'mostViewed\'\],  |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| admin: { description: \'How to rank and sort listings\' }             |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'limit\',                                                      |
|                                                                       |
| type: \'number\',                                                     |
|                                                                       |
| defaultValue: 10,                                                     |
|                                                                       |
| admin: { description: \'Max listings to display from this rule\' }    |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'gridSize\',                                                   |
|                                                                       |
| type: \'select\',                                                     |
|                                                                       |
| options: \[\'1\', \'2\', \'3\', \'4\'\],                              |
|                                                                       |
| defaultValue: \'3\',                                                  |
|                                                                       |
| admin: { description: \'Grid columns for display\' }                  |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'carousel\',                                                   |
|                                                                       |
| type: \'checkbox\',                                                   |
|                                                                       |
| defaultValue: false,                                                  |
|                                                                       |
| admin: { description: \'Use carousel/slider for horizontal scroll\' } |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'manualEnabled\',                                              |
|                                                                       |
| type: \'checkbox\',                                                   |
|                                                                       |
| defaultValue: false,                                                  |
|                                                                       |
| admin: { description: \'Override rules with manually selected         |
| listings\' }                                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'pinnedItems\',                                                |
|                                                                       |
| type: \'relationship\',                                               |
|                                                                       |
| relationTo: \'listings\',                                             |
|                                                                       |
| hasMany: true,                                                        |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| condition: (data) =\> data.manualEnabled === true,                    |
|                                                                       |
| description: \'Manually selected listings (overrides rules if set)\'  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

The rules system provides flexibility:

-   Multiple rules per section are evaluated and combined (union)

-   entity can filter by listing type, category, or tag

-   kind determines the ranking algorithm: newest (createdAt), trending
    (trend score), topRated (rating), mostViewed (views90d)

-   limit constrains results per rule

-   gridSize controls responsive layout (1--4 columns)

-   carousel enables horizontal scrolling UX

-   manualEnabled allows editors to override rules with hand-picked
    listings for promotional control

    2.6 Fields --- Popular Tabs

The populartabs relationship connects to the Categories collection to
create filter tabs in the Most Popular section:

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| name: \'popularTabs\',                                                |
|                                                                       |
| type: \'relationship\',                                               |
|                                                                       |
| relationTo: \'categories\',                                           |
|                                                                       |
| hasMany: true,                                                        |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| description: \'L1 categories displayed as filter tabs in Most Popular |
| section\'                                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

Usage: Frontend fetches this homepage, iterates popularTabs, and
displays category filters. Clicking a tab filters the popular listings
by category.

2.7 Fields --- More Categories

The moreCategoriesList relationship provides additional category
recommendations:

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| name: \'moreCategoriesList\',                                         |
|                                                                       |
| type: \'relationship\',                                               |
|                                                                       |
| relationTo: \'categories\',                                           |
|                                                                       |
| hasMany: true,                                                        |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| description: \'Additional categories for \"Browse All Categories\"    |
| section\'                                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

2.8 Fields --- Talent Network CTA

Talent Network CTA is a dedicated group for promoting talent recruiting:

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| type: \'group\',                                                      |
|                                                                       |
| name: \'talentNetworkCta\',                                           |
|                                                                       |
| label: \'Talent Network CTA\',                                        |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'headline\',                                                   |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Heading for talent recruiting banner\' }      |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'description\',                                                |
|                                                                       |
| type: \'textarea\',                                                   |
|                                                                       |
| admin: { description: \'Description text\' }                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'ctaLabel\',                                                   |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Button text\' }                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'ctaUrl\',                                                     |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Recruiting URL\' }                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

2.9 Fields --- Footer Navigation

Footer navigation is an array of column groups, each containing a
heading and links:

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| type: \'array\',                                                      |
|                                                                       |
| name: \'footerNav\',                                                  |
|                                                                       |
| label: \'Footer Navigation\',                                         |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'heading\',                                                    |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| admin: { description: \'Column heading\' }                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| type: \'array\',                                                      |
|                                                                       |
| name: \'links\',                                                      |
|                                                                       |
| label: \'Links\',                                                     |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'label\',                                                      |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| admin: { description: \'Link text\' }                                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'url\',                                                        |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| required: true,                                                       |
|                                                                       |
| admin: { description: \'Link destination URL\' }                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

2.10 Fields --- SEO

The SEO group provides metadata for search engines and social sharing:

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| type: \'group\',                                                      |
|                                                                       |
| name: \'seo\',                                                        |
|                                                                       |
| label: \'SEO & Social\',                                              |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'metaTitle\',                                                  |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Page title for search results and browser     |
| tab\' }                                                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'metaDescription\',                                            |
|                                                                       |
| type: \'textarea\',                                                   |
|                                                                       |
| admin: { description: \'Meta description for search results\' }       |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'canonical\',                                                  |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: { description: \'Canonical URL to prevent duplicate content    |
| issues\' }                                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'ogImage\',                                                    |
|                                                                       |
| type: \'upload\',                                                     |
|                                                                       |
| relationTo: \'media\',                                                |
|                                                                       |
| admin: { description: \'Open Graph image for social sharing\' }       |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'noindex\',                                                    |
|                                                                       |
| type: \'checkbox\',                                                   |
|                                                                       |
| defaultValue: false,                                                  |
|                                                                       |
| admin: { description: \'Prevent search engines from indexing this     |
| page\' }                                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

3.  Hooks

Payload hooks enable event-driven architecture. The Homepages collection
publishes events to RabbitMQ whenever homepages are saved or deleted.

3.1 afterChange Hook --- publishHomepageSaved

Location: apps/cms-service/src/hooks/publishHomepageEvent.ts

+-----------------------------------------------------------------------+
| export const publishHomepageSaved: AfterChangeHook = async ({         |
|                                                                       |
| doc,                                                                  |
|                                                                       |
| operation,                                                            |
|                                                                       |
| req                                                                   |
|                                                                       |
| }) =\> {                                                              |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const event = {                                                       |
|                                                                       |
| id: doc.id,                                                           |
|                                                                       |
| slug: doc.slug,                                                       |
|                                                                       |
| status: doc.status,                                                   |
|                                                                       |
| isDefault: doc.isDefault,                                             |
|                                                                       |
| operation, // \'create\' or \'update\'                                |
|                                                                       |
| timestamp: new Date().toISOString()                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| await publishEvent(\'cms.events\', \'homepage.saved\', event);        |
|                                                                       |
| } catch (error) {                                                     |
|                                                                       |
| console.error(\'Failed to publish homepage.saved event:\', error);    |
|                                                                       |
| // Non-blocking: do not throw                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| };                                                                    |
+-----------------------------------------------------------------------+

Hook behavior:

-   Fires after a homepage is created or updated

-   Publishes to RabbitMQ exchange \'cms.events\' with routing key
    \'homepage.saved\'

-   Event payload includes id, slug, status, isDefault, operation, and
    timestamp

-   Fire-and-forget pattern: errors are logged but do not prevent CMS
    save

-   Downstream services (search indexing, cache invalidation, etc.)
    subscribe to homepage.saved events

    3.2 afterDelete Hook --- publishHomepageDeleted

Location: apps/cms-service/src/hooks/publishHomepageEvent.ts

+-----------------------------------------------------------------------+
| export const publishHomepageDeleted: AfterDeleteHook = async ({       |
|                                                                       |
| doc,                                                                  |
|                                                                       |
| req                                                                   |
|                                                                       |
| }) =\> {                                                              |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const event = {                                                       |
|                                                                       |
| id: doc.id,                                                           |
|                                                                       |
| slug: doc.slug,                                                       |
|                                                                       |
| timestamp: new Date().toISOString()                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| await publishEvent(\'cms.events\', \'homepage.deleted\', event);      |
|                                                                       |
| } catch (error) {                                                     |
|                                                                       |
| console.error(\'Failed to publish homepage.deleted event:\', error);  |
|                                                                       |
| // Non-blocking: do not throw                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| };                                                                    |
+-----------------------------------------------------------------------+

Hook behavior:

-   Fires after a homepage is deleted

-   Publishes to RabbitMQ exchange \'cms.events\' with routing key
    \'homepage.deleted\'

-   Event payload includes id, slug, and timestamp

-   Fire-and-forget pattern: errors are logged but do not prevent CMS
    delete

-   Downstream services can perform cleanup, cache invalidation, etc.

    3.3 Hook Error Handling

All hooks follow a consistent error handling pattern:

+-----------------------------------------------------------------------+
| // In publishEvent utility                                            |
|                                                                       |
| export async function publishEvent(                                   |
|                                                                       |
| exchange: string,                                                     |
|                                                                       |
| routingKey: string,                                                   |
|                                                                       |
| payload: any                                                          |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const connection = await amqp.connect(RABBITMQ_URL);                  |
|                                                                       |
| const channel = await connection.createChannel();                     |
|                                                                       |
| await channel.assertExchange(exchange, \'topic\', { durable: true }); |
|                                                                       |
| const success = channel.publish(                                      |
|                                                                       |
| exchange,                                                             |
|                                                                       |
| routingKey,                                                           |
|                                                                       |
| Buffer.from(JSON.stringify(payload))                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| await channel.close();                                                |
|                                                                       |
| await connection.close();                                             |
|                                                                       |
| if (!success) {                                                       |
|                                                                       |
| throw new Error(\'RabbitMQ publish failed\');                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

Key principles:

-   Hooks catch all errors and log them via console.error

-   CMS operations (save, delete) always succeed even if RabbitMQ is
    unavailable

-   This is a fire-and-forget pattern: if RabbitMQ is down, the CMS
    still saves the data

-   Downstream services must implement their own retry logic if needed

-   Consider adding monitoring/alerting to detect hook failures

4.  HomepageBanner Global

The HomepageBanner global provides a persistent promotional banner at
the top of the homepage, managed independently from the main homepage
document.

4.1 Global Config

Location: apps/cms-service/src/globals/HomepageBanner.ts

+-----------------------------------------------------------------------+
| export const HomepageBanner: GlobalConfig = {                         |
|                                                                       |
| slug: \'homepage-banner\',                                            |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| description: \'Sitewide promotional banner at top of homepage\'       |
|                                                                       |
| },                                                                    |
|                                                                       |
| access: {                                                             |
|                                                                       |
| read: () =\> true,                                                    |
|                                                                       |
| create: isAdminRole,                                                  |
|                                                                       |
| update: isAdminRole,                                                  |
|                                                                       |
| delete: isAdminRole                                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| fields: \[                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'enabled\',                                                    |
|                                                                       |
| type: \'checkbox\',                                                   |
|                                                                       |
| defaultValue: false,                                                  |
|                                                                       |
| admin: { description: \'Show or hide the banner\' }                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'message\',                                                    |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| required: false,                                                      |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| condition: (data) =\> data.enabled === true,                          |
|                                                                       |
| description: \'Banner message text (required if enabled)\'            |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'ctaLabel\',                                                   |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| condition: (data) =\> data.enabled === true,                          |
|                                                                       |
| description: \'Button text for banner CTA\'                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'ctaUrl\',                                                     |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| condition: (data) =\> data.enabled === true,                          |
|                                                                       |
| description: \'Target URL for banner button\'                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'expiresAt\',                                                  |
|                                                                       |
| type: \'date\',                                                       |
|                                                                       |
| admin: { description: \'Automatically hide banner after this date\' } |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'bannerType\',                                                 |
|                                                                       |
| type: \'select\',                                                     |
|                                                                       |
| options: \[                                                           |
|                                                                       |
| { label: \'Info\', value: \'info\' },                                 |
|                                                                       |
| { label: \'Promo\', value: \'promo\' },                               |
|                                                                       |
| { label: \'Warning\', value: \'warning\' }                            |
|                                                                       |
| \],                                                                   |
|                                                                       |
| defaultValue: \'info\',                                               |
|                                                                       |
| admin: { description: \'Banner styling and intent\' }                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| };                                                                    |
+-----------------------------------------------------------------------+

Usage:

-   Frontend fetches /api/globals/homepage-banner on every page load

-   If enabled=true and expiresAt is in the future, display the banner

-   Banner styling is determined by bannerType: info (blue), promo
    (green), warning (red)

-   Editors can manage the banner without touching the main homepage
    document

-   Useful for sitewide announcements, promotions, or urgent notices

5.  Related Collections

The Homepages collection references several other collections.
Understanding these relationships is essential for editorial workflows.

5.1 Categories Collection (Existing)

The Categories collection defines marketplace categories used throughout
the platform:

  ----------------------------------- -----------------------------------
  Field                               Purpose

  uuid                                Unique identifier for category

  name                                Display name (e.g., \'Graphic
                                      Design\')

  slug                                URL-friendly identifier (e.g.,
                                      \'graphic-design\')

  iconUrl                             URL to category icon image

  parentId                            Optional parent category for
                                      hierarchies

  type                                Category type (service, talent,
                                      marketplace)
  ----------------------------------- -----------------------------------

Used by Homepages in:

-   popularTabs: L1 categories displayed as filter tabs in Most Popular
    section

-   moreCategoriesList: Additional categories for Browse All Categories
    section

    5.2 Listings Collection (Existing)

The Listings collection contains individual marketplace listings
(services, talent, projects):

  ----------------------------------- -----------------------------------
  Field                               Purpose

  id                                  Unique listing identifier

  type                                Listing type: service, talent, or
                                      marketplace

  title                               Listing title/name

  slug                                URL-friendly slug

  status                              Publishing status: draft, active,
                                      inactive

  categoryId                          Associated category UUID

  rating                              Average rating (0--5)

  completionsCount                    Number of completed transactions

  views90d                            Pageviews in last 90 days

  lastActivityAt                      ISO timestamp of most recent update

  adminBoost                          Manual boost score set by editors

  featured                            Boolean: should be featured

  featuredOrder                       Sort order when featured

  editorialLabel                      Custom label set by editors
  ----------------------------------- -----------------------------------

Used by Homepages in:

-   sections\[\].rules: Dynamic selection by entity, kind, limit,
    gridSize, carousel

-   sections\[\].pinnedItems: Manual selection of featured listings when
    manualEnabled=true

The featured, featuredOrder, and editorialLabel fields enable editors to
manually boost listings on the homepage without modifying core listing
data.

5.3 Media Collection (Existing)

The Media collection manages all uploaded assets:

  ----------------------------------- -----------------------------------
  Field                               Purpose

  id                                  Unique media identifier

  filename                            Original filename

  url                                 Signed Cloudflare R2 URL

  mimeType                            Content type (image/png, etc.)

  width                               Image width in pixels

  height                              Image height in pixels

  alt                                 Accessibility alt text
  ----------------------------------- -----------------------------------

Used by Homepages in:

-   hero.backgroundImage: Hero section background image

-   seo.ogImage: Open Graph image for social sharing

All media is stored in Cloudflare R2 and served with signed URLs that
expire after a configured TTL (typically 1 hour).

6.  Registration in payload.config.ts

To enable the Homepages collection, add it to the main Payload
configuration:

+-----------------------------------------------------------------------+
| import { buildConfig } from \'payload/config\';                       |
|                                                                       |
| import { Homepages } from \'./collections/Homepages\';                |
|                                                                       |
| import { HomepageBanner } from \'./globals/HomepageBanner\';          |
|                                                                       |
| import { Categories } from \'./collections/Categories\';              |
|                                                                       |
| import { Listings } from \'./collections/Listings\';                  |
|                                                                       |
| import { Media } from \'./collections/Media\';                        |
|                                                                       |
| export default buildConfig({                                          |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| user: Users.slug,                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| collections: \[                                                       |
|                                                                       |
| Users,                                                                |
|                                                                       |
| Categories,                                                           |
|                                                                       |
| Listings,                                                             |
|                                                                       |
| Homepages, // Add Homepages collection                                |
|                                                                       |
| Media,                                                                |
|                                                                       |
| \],                                                                   |
|                                                                       |
| globals: \[                                                           |
|                                                                       |
| HomepageBanner, // Add HomepageBanner global                          |
|                                                                       |
| \],                                                                   |
|                                                                       |
| db: postgresAdapter({                                                 |
|                                                                       |
| url: process.env.DATABASE_URL,                                        |
|                                                                       |
| }),                                                                   |
|                                                                       |
| upload: {                                                             |
|                                                                       |
| limits: {                                                             |
|                                                                       |
| fileSize: 5000000, // 5MB                                             |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| plugins: \[                                                           |
|                                                                       |
| storagePlugin({                                                       |
|                                                                       |
| collections: {                                                        |
|                                                                       |
| media: {                                                              |
|                                                                       |
| adapter: r2Adapter({                                                  |
|                                                                       |
| credentials: {                                                        |
|                                                                       |
| accessKeyId: process.env.R2_ACCESS_KEY_ID,                            |
|                                                                       |
| secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| bucket: process.env.R2_BUCKET,                                        |
|                                                                       |
| baseURL: process.env.R2_BASE_URL,                                     |
|                                                                       |
| }),                                                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| }),                                                                   |
|                                                                       |
| \],                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

Notes:

-   Import the Homepages collection from ./collections/Homepages

-   Import HomepageBanner from ./globals/HomepageBanner

-   Add Homepages to the collections array (order doesn\'t matter, but
    keep alphabetical for consistency)

-   Add HomepageBanner to the globals array

-   Homepages must come after Categories, Listings, and Media in the
    config (or at least they should be imported)

7.  Admin Panel Configuration

The Homepages collection in the Payload admin panel provides an
intuitive interface for editors to manage homepage content.

7.1 List View

The admin list view displays all homepages in a table:

+-----------------------------------------------------------------------+
| admin: {                                                              |
|                                                                       |
| useAsTitle: \'title\',                                                |
|                                                                       |
| defaultColumns: \[\'title\', \'slug\', \'status\', \'isDefault\',     |
| \'updatedAt\'\],                                                      |
|                                                                       |
| group: \'Content\'                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

The defaultColumns setting controls which fields appear in the list:

-   title: Display name (used as row title)

-   slug: URL identifier

-   status: Publishing status at a glance

-   isDefault: Quick indicator for the default homepage

-   updatedAt: Last modified timestamp

    7.2 useAsTitle Configuration

The useAsTitle: \'title\' setting tells Payload to display the \'title\'
field as the row label in the list view and in breadcrumb navigation,
rather than the document ID.

7.3 Conditional Field Display

Payload supports conditional fields that only appear when certain
criteria are met:

+-----------------------------------------------------------------------+
| // testGroup only shows when status === \'testing\'                   |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'testGroup\',                                                  |
|                                                                       |
| type: \'text\',                                                       |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| condition: (data) =\> data.status === \'testing\',                    |
|                                                                       |
| description: \'Test group identifier for A/B testing\'                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // pinnedItems only shows when manualEnabled === true                 |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'pinnedItems\',                                                |
|                                                                       |
| type: \'relationship\',                                               |
|                                                                       |
| relationTo: \'listings\',                                             |
|                                                                       |
| hasMany: true,                                                        |
|                                                                       |
| admin: {                                                              |
|                                                                       |
| condition: (data) =\> data.manualEnabled === true,                    |
|                                                                       |
| description: \'Manually selected listings\'                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

These conditional fields reduce UI clutter and guide editors toward
correct data entry.

7.4 Custom Admin Views (Not Implemented for MVP)

Payload allows custom React components in the admin panel, but the MVP
uses standard field components. Future enhancements might include:

-   Custom section preview component showing how a section will render

-   Drag-to-reorder sections

-   Live preview of hero image and text overlay

-   Listing search/browse UI for pinnedItems selection

8.  Migration Notes

Payload CMS handles database migrations automatically. No manual SQL is
required.

8.1 Schema Creation

When the CMS service starts for the first time:

-   Payload inspects all collection and global configs

    Generates TypeScript types from field definitions

    Creates database tables and columns to match the schema

-   Migration system tracks changes

    Each schema change is recorded as a migration

    Migrations are stored in apps/cms-service/migrations/

    Running npm run migrate applies pending migrations

-   No manual SQL needed

    Editors can add/remove fields in config without writing SQL

    Payload generates the DDL (CREATE TABLE, ALTER TABLE, etc.)

    8.2 Rollback Strategy

If a schema change introduces an error:

+-----------------------------------------------------------------------+
| // Revert the collection config change                                |
|                                                                       |
| // Then run:                                                          |
|                                                                       |
| npm run migrate:down                                                  |
|                                                                       |
| // This reverts the most recent migration                             |
|                                                                       |
| // Payload maintains the full migration history                       |
+-----------------------------------------------------------------------+

Best practices:

-   Always test schema changes in a staging environment first

-   Keep migrations in version control (migrations/ directory)

-   Document breaking changes in migration commit messages

-   Consider zero-downtime deployments for production schema changes

-   Use ALTER TABLE statements that support rolling deployments (e.g.,
    add column, make it nullable, then add default)

9.  Summary & Next Steps

The Homepages collection provides a comprehensive editorial interface
for managing homepage content in Marketeq. Key takeaways:

-   Architecture

    Payload CMS 3.x at /apps/cms-service/ with PostgreSQL on Supabase

    Auto-generated REST API at /api/homepages with public read access

    RabbitMQ integration for event-driven downstream services

-   Content Model

    Homepages collection with identity, hero, sections, footer, and SEO
    metadata

    HomepageBanner global for sitewide promotional banners

    Relationships to Categories, Listings, and Media collections

-   Access Control

    Public read for API consumers

    Admin-only create, update, delete

    Role-based access control implemented at the hook level

-   Hooks & Events

    afterChange and afterDelete hooks publish events to RabbitMQ

    Fire-and-forget pattern ensures CMS operations succeed even if
    RabbitMQ is unavailable

    Downstream services subscribe to homepage.saved and homepage.deleted
    events

-   Next Steps

    Implement the Homepages.ts collection config in apps/cms-service/

    Add publishHomepageSaved and publishHomepageDeleted hooks

    Register collections in payload.config.ts

    Create migration to initialize the homepages table

    Develop frontend API client to fetch and render homepage data

+-----------------------------------------------------------------------+
| Frontend Implementation                                               |
|                                                                       |
| This document covers only the backend CMS schema. Frontend            |
| applications must independently fetch the /api/homepages endpoint,    |
| parse the response, and render the hero, sections, footer, and banner |
| components.                                                           |
+-----------------------------------------------------------------------+
