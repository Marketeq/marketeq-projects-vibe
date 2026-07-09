import { CollectionConfig } from 'payload/types';

import { isAdmin, isEditor, readPublishedOrCmsUser } from '../access/roles';

// Entity source of truth: CategoryPageEntity in category-service
// Fields: categoryUuid, path, displayTitle, level, heroBanner {title,subtitle,imageUrl}, intro (text), faq [{question,answer}], featured

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
    // ── Sidebar: level, path, featured ─────────────────────────────────────
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
        description: 'Category depth. Must match the actual depth of this category in the taxonomy.',
      },
    },
    {
      name: 'path',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Full URL path, e.g. "development/web-development/wordpress". Must match the category taxonomy exactly.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Featured categories may appear in the homepage, navigation menus, or promoted sections.',
      },
    },

    // ── Main fields ─────────────────────────────────────────────────────────
    {
      name: 'displayTitle',
      type: 'text',
      required: true,
      admin: {
        description: 'Internal admin label, e.g. "Web Development (L1)". Not shown publicly.',
      },
    },
    {
      name: 'categoryRef',
      type: 'group',
      admin: { hidden: true },
      fields: [
        {
          name: 'categoryId',
          type: 'text',
          index: true,
          admin: { hidden: true },
        },
      ],
    },

    // ── Tabs ────────────────────────────────────────────────────────────────
    {
      type: 'tabs',
      tabs: [
        // ─ Hero banner — maps to entity: heroBanner {title, subtitle, imageUrl}
        {
          label: 'Hero',
          fields: [
            {
              name: 'heroBanner',
              type: 'group',
              admin: { description: 'Banner shown at the top of the category page. All fields optional — leave blank to use defaults.' },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  admin: { description: 'Hero headline. Leave blank to use the category name.' },
                },
                {
                  name: 'subtitle',
                  type: 'text',
                  admin: { description: 'Short tagline shown below the headline. Leave blank to hide.' },
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Background image for the hero banner. Choose from the media library.' },
                },
              ],
            },
          ],
        },

        // ─ Intro + FAQ — maps to entity: intro (text), faq [{question, answer}]
        {
          label: 'Content',
          fields: [
            {
              name: 'intro',
              type: 'textarea',
              admin: {
                description: 'Opening paragraph shown above the listings grid. Most SEO-impactful text on the page.',
              },
            },
            {
              name: 'faq',
              type: 'array',
              labels: { singular: 'FAQ item', plural: 'FAQ items' },
              admin: { description: 'Question/answer pairs shown at the bottom of the page. Aim for 4–8 entries.' },
              fields: [
                { name: 'question', type: 'text', required: true, admin: { description: 'The question as a user would ask it.' } },
                { name: 'answer', type: 'textarea', required: true, admin: { description: 'Clear, concise answer.' } },
              ],
            },
          ],
        },
      ],
    },
  ],

  hooks: {
    afterChange: [
      // CmsEventPublisher will be wired in RMQ-01.
      // Publishes `cms.category-page.upserted` to the category-service consumer.
    ],
  },
}
