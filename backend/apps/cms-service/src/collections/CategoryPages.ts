import { CollectionConfig } from 'payload/types';

import { isAdmin, isEditor, readPublishedOrCmsUser } from '../access/roles';

/**
 * CategoryPages — editorial decoration for category landing pages.
 *
 * One row per category node, regardless of level (L1, L2, L3). The level
 * discriminator drives `admin.condition` toggles so the form only shows
 * fields that apply to the current level.
 *
 * Architectural notes:
 *
 *   1. This collection does NOT own the category taxonomy. The category
 *      tree (parent/child links, slugs, names) lives in `category-service`,
 *      which is the source of truth. CategoryPages just references each
 *      node by `categoryId` and mirrors a few cached identifiers (slug,
 *      path, breadcrumb) for editor convenience and slug-based lookup.
 *
 *   2. Adding L4/L5 in the future is a one-line enum change — no schema
 *      migration. 95% of fields are level-agnostic, only a few are gated.
 *
 *   3. Same decoupled sync pattern as Projects: editor mutates here, an
 *      afterChange hook publishes a `cms.category-page.upserted` event,
 *      the existing category-service consumer projects the editorial
 *      fields onto its own DB row, and the frontend reads from there.
 *      The frontend NEVER queries Payload directly.
 */
export const CategoryPages: CollectionConfig = {
  slug: 'category-pages',
  labels: {
    singular: 'Category Page',
    plural: 'Category Pages',
  },
  admin: {
    useAsTitle: 'displayTitle',
    defaultColumns: ['displayTitle', 'level', 'path', 'featured', 'updatedAt'],
    description:
      'Editorial content for category landing pages (L1, L2, L3). One row per category node.',
    listSearchableFields: ['displayTitle', 'path', 'categoryRef.slug'],
  },
  versions: {
    drafts: {
      autosave: { interval: 800 },
    },
    maxPerDoc: 25,
  },
  access: {
    read: readPublishedOrCmsUser,
    create: isEditor,
    update: isEditor,
    delete: isAdmin,
  },
  fields: [
    // ── Level discriminator ─────────────────────────────────────────────────
    {
      name: 'level',
      type: 'select',
      required: true,
      defaultValue: 'l1',
      options: [
        { label: 'L1 — Top-level category', value: 'l1' },
        { label: 'L2 — Subcategory', value: 'l2' },
        { label: 'L3 — Sub-subcategory / niche', value: 'l3' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Drives which conditional sections appear below. Must match the depth of the linked category-service node.',
      },
    },

    // ── Display title (sidebar, used for admin list view) ──────────────────
    {
      name: 'displayTitle',
      type: 'text',
      required: true,
      admin: {
        description:
          'Internal label shown in the admin list. Usually the category name plus level (e.g. "Web Development (L1)"). Public hero title goes in the Hero tab.',
      },
    },

    // ── path (unique) — full breadcrumb slug like "web-development/e-commerce/wordpress"
    {
      name: 'path',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Full breadcrumb path used for URL routing and slug-based lookup. Must match the linked category-service node.',
      },
    },

    // ── Tabs ────────────────────────────────────────────────────────────────
    {
      type: 'tabs',
      tabs: [
        // ─ 1. Category reference (mirrored from category-service) ─────────
        {
          label: 'Category Reference',
          description:
            'Cached identifiers from category-service. The category tree itself is owned by category-service — these fields exist purely so editors can pick a node and so we can look this row up by slug.',
          fields: [
            {
              name: 'categoryRef',
              type: 'group',
              fields: [
                {
                  name: 'categoryId',
                  type: 'text',
                  required: true,
                  index: true,
                  admin: {
                    description:
                      'The canonical category-service ID this page decorates. One CategoryPages row per category node.',
                  },
                },
                {
                  name: 'slug',
                  type: 'text',
                  required: true,
                  admin: { description: 'Leaf slug (e.g. "wordpress").' },
                },
                {
                  name: 'name',
                  type: 'text',
                  required: true,
                  admin: { description: 'Human-readable category name.' },
                },
                {
                  name: 'breadcrumb',
                  type: 'array',
                  labels: { singular: 'Crumb', plural: 'Breadcrumb' },
                  admin: {
                    description:
                      'Ordered breadcrumb from L1 down to this node. Mirrored from category-service for SEO/markup convenience.',
                  },
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'slug', type: 'text', required: true },
                  ],
                },
              ],
            },
          ],
        },

        // ─ 2. Hero / banner (shared across all levels) ────────────────────
        {
          label: 'Hero',
          fields: [
            {
              name: 'heroBanner',
              type: 'group',
              admin: { description: 'Top banner. Same blue overlay/animation as the home page hero.' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    description:
                      'Banner background image override. If blank, the frontend uses its default L1 banner. Stored in Cloudflare R2.',
                  },
                },
                {
                  name: 'titleOverride',
                  type: 'text',
                  admin: {
                    description:
                      'Optional override for the hero title. Falls back to categoryRef.name if blank.',
                  },
                },
                {
                  name: 'descriptionOverride',
                  type: 'textarea',
                  maxLength: 320,
                  admin: {
                    description:
                      'Optional override for the hero description. Falls back to the auto-generated category copy.',
                  },
                },
                {
                  name: 'ctaLabel',
                  type: 'text',
                  admin: { description: 'Optional CTA button label (e.g. "Browse Projects").' },
                },
                {
                  name: 'ctaHref',
                  type: 'text',
                  admin: { description: 'Optional CTA button href.' },
                },
              ],
            },
          ],
        },

        // ─ 3. Body content (shared) ───────────────────────────────────────
        {
          label: 'Content',
          fields: [
            {
              name: 'intro',
              type: 'richText',
              admin: {
                description:
                  'Intro paragraph(s) shown above the listings grid. SEO-critical copy.',
              },
            },
            {
              name: 'featuredListings',
              type: 'array',
              labels: { singular: 'Featured listing', plural: 'Featured listings' },
              admin: {
                description:
                  'Hand-picked listings to highlight at the top of the page. Will become a polymorphic relationship as Services/Teams/Talent/Jobs collections come online.',
              },
              fields: [
                {
                  name: 'project',
                  type: 'relationship',
                  relationTo: 'projects',
                  required: true,
                },
                { name: 'pinnedLabel', type: 'text', admin: { description: 'Optional badge text (e.g. "Editor\u2019s pick").' } },
              ],
            },
            {
              name: 'faq',
              type: 'array',
              labels: { singular: 'FAQ', plural: 'FAQ' },
              admin: { description: 'Question/answer pairs rendered at the bottom of the page. Boosts long-tail SEO.' },
              fields: [
                { name: 'question', type: 'text', required: true },
                { name: 'answer', type: 'textarea', required: true },
              ],
            },
            {
              name: 'relatedReads',
              type: 'array',
              labels: { singular: 'Related read', plural: 'Related reads' },
              admin: { description: 'Internal links to blog posts, guides, or sibling category pages.' },
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'href', type: 'text', required: true },
              ],
            },
          ],
        },

        // ─ 4. L1-only fields ──────────────────────────────────────────────
        {
          label: 'L1: Featured Subcategories',
          admin: {
            condition: (data: any) => data?.level === 'l1',
            description:
              'Curated grid of L2 subcategories shown on this L1 page. Only visible when level = L1.',
          },
          fields: [
            {
              name: 'featuredSubcategories',
              type: 'array',
              labels: { singular: 'Featured subcategory', plural: 'Featured subcategories' },
              fields: [
                { name: 'subcategorySlug', type: 'text', required: true, admin: { description: 'L2 slug to feature (must exist in category-service).' } },
                { name: 'displayLabel', type: 'text', admin: { description: 'Optional override label. Falls back to the category name.' } },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Optional tile image. Falls back to the auto-resolved subcategory icon.' },
                },
                { name: 'blurb', type: 'textarea', maxLength: 200 },
              ],
            },
          ],
        },

        // ─ 5. L1 + L2 only ────────────────────────────────────────────────
        {
          label: 'Promoted Children',
          admin: {
            condition: (data: any) => data?.level === 'l1' || data?.level === 'l2',
            description:
              'Carousel of promoted child categories. Visible on L1 and L2 pages.',
          },
          fields: [
            {
              name: 'promotedChildren',
              type: 'array',
              labels: { singular: 'Promoted child', plural: 'Promoted children' },
              fields: [
                { name: 'childSlug', type: 'text', required: true },
                { name: 'displayLabel', type: 'text' },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                },
              ],
            },
          ],
        },

        // ─ 6. L3-only ─────────────────────────────────────────────────────
        {
          label: 'L3: Niche Detail',
          admin: {
            condition: (data: any) => data?.level === 'l3',
            description:
              'Deep niche content for L3 pages — comparison tables, use-case copy, etc. Only visible when level = L3.',
          },
          fields: [
            {
              name: 'comparisonTable',
              type: 'array',
              labels: { singular: 'Comparison row', plural: 'Comparison rows' },
              admin: { description: 'Side-by-side comparison rendered as a table on L3 pages.' },
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'pros', type: 'textarea' },
                { name: 'cons', type: 'textarea' },
                { name: 'priceFrom', type: 'number' },
              ],
            },
            {
              name: 'useCaseCopy',
              type: 'richText',
              admin: { description: 'Long-form niche copy targeted at this L3 audience.' },
            },
          ],
        },
      ],
    },

    // ── Sidebar toggles ─────────────────────────────────────────────────────
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Highlight this category page in nav menus or homepage modules.',
      },
    },
  ],

  hooks: {
    afterChange: [
      // CmsEventPublisher will be wired in RMQ-01.
      // Publishes `cms.category-page.upserted` to the category-service consumer.
    ],
  },
}
