import type { CollectionConfig, FieldHook } from 'payload'

import {
  isAdmin,
  isEditor,
  readPublishedOrCmsUser,
} from '../access/roles'

/**
 * Projects — dedicated CMS collection for the "Projects" listing type.
 *
 * Sources:
 *   - docs/md/CMS Service/projects/details/Strapi Collection Type_ Project Listings ...
 *   - docs/md/CMS Service/projects/details/data-dictionary.csv  (37 fields)
 *
 * Architectural notes:
 *
 *   1. This collection is INDEPENDENT from any other listing type. Per the
 *      project's decoupled-listings decision, Services / Teams / Talent /
 *      Jobs each get their OWN dedicated collection with their OWN schema.
 *
 *   2. cms-service is decoupled from the frontend. Editors mutate fields here,
 *      Payload's afterChange hook publishes a `cms.project.upserted` event to
 *      RabbitMQ, the listings-service NestJS consumer projects the change into
 *      its TypeORM-managed `projects` table, and the frontend reads from the
 *      NestJS API. The frontend NEVER queries Payload directly.
 *
 *   3. Computed fields (starting_price_total, project_duration_total, ratings,
 *      similar_projects, etc.) are READ-ONLY in the admin panel — they are
 *      written by NestJS workers via the Payload local API and surfaced here
 *      so editors can see them, not edit them.
 *
 *   4. Pure frontend / per-user state from the data dictionary (button states,
 *      save_to_list, recently_viewed_projects, recommended_projects,
 *      similar_projects fan-out, etc.) is NOT modeled here. Those belong to
 *      user-service / favorites-service / suggestions-service.
 */

const slugifyFromTitle: FieldHook = ({ value, originalDoc, data }) => {
  if (typeof value === 'string' && value.length > 0) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }
  const fallback = (data?.title ?? originalDoc?.title) as string | undefined
  if (!fallback) return value
  return fallback
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: {
    singular: 'Project',
    plural: 'Projects',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'projectType', 'pricingModel', 'featured', 'updatedAt'],
    description:
      'Project listings shown on the marketplace. Edits sync to listings-service via RabbitMQ.',
  },
  versions: {
    drafts: {
      autosave: { interval: 800 },
      schedulePublish: true,
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
    // ── Identity ────────────────────────────────────────────────────────────
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 140,
      admin: { description: 'Used as the main heading on the project card and details page.' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Auto-generated from the title. Used in URLs and preview links.',
      },
      hooks: {
        beforeValidate: [slugifyFromTitle],
      },
    },

    // ── Tabs: editorial / categorization / media / system / computed ───────
    {
      type: 'tabs',
      tabs: [
        // ── 1. Editorial ───────────────────────────────────────────────────
        {
          label: 'Content',
          fields: [
            {
              name: 'shortDescription',
              type: 'textarea',
              required: true,
              maxLength: 320,
              admin: { description: 'Summary used on cards and meta tags.' },
            },
            {
              name: 'fullDescription',
              type: 'richText',
              required: true,
              admin: {
                description:
                  'Rich-text overview shown on the project details page. No external links or custom fonts; must pass content moderation.',
              },
            },
            {
              name: 'deliverables',
              type: 'richText',
              admin: { description: 'Bullet list or table of project deliverables.' },
            },
            {
              name: 'faqQuestions',
              type: 'array',
              labels: { singular: 'FAQ', plural: 'FAQs' },
              admin: { description: 'Common questions answered by the team. Editable by team lead, must pass moderation.' },
              fields: [
                { name: 'question', type: 'text', required: true },
                { name: 'answer', type: 'textarea', required: true },
              ],
            },
            {
              name: 'recentQuestions',
              type: 'array',
              admin: {
                description:
                  'Recently asked public questions. Must pass content moderation and be approved by team lead or project owner.',
              },
              fields: [{ name: 'question', type: 'text', required: true }],
            },
          ],
        },

        // ── 2. Pricing & scope ─────────────────────────────────────────────
        {
          label: 'Pricing & Scope',
          fields: [
            {
              name: 'totalEstimatedHours',
              type: 'number',
              required: true,
              min: 1,
              admin: { description: 'Total scope hours used for pricing logic.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'timelineValue',
                  type: 'number',
                  required: true,
                  min: 1,
                  admin: { width: '50%' },
                },
                {
                  name: 'timelineUnit',
                  type: 'select',
                  required: true,
                  defaultValue: 'weeks',
                  options: [
                    { label: 'Weeks', value: 'weeks' },
                    { label: 'Months', value: 'months' },
                  ],
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'pricingModel',
              type: 'select',
              required: true,
              defaultValue: 'biweekly',
              options: [
                { label: 'Weekly', value: 'weekly' },
                { label: 'Biweekly', value: 'biweekly' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Quarterly', value: 'quarterly' },
                { label: 'Yearly', value: 'yearly' },
              ],
              admin: { description: 'How project pricing is broken down for the buyer.' },
            },
            {
              name: 'priceViewMode',
              type: 'select',
              defaultValue: 'biweekly',
              options: [
                { label: 'Weekly', value: 'weekly' },
                { label: 'Biweekly', value: 'biweekly' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Quarterly', value: 'quarterly' },
                { label: 'Yearly', value: 'yearly' },
              ],
              admin: {
                description:
                  'Default payment view mode shown to the buyer on the project page.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'priceRangeMin',
                  type: 'number',
                  required: true,
                  min: 0,
                  admin: { width: '50%', description: 'Minimum total price (USD).' },
                },
                {
                  name: 'priceRangeMax',
                  type: 'number',
                  required: true,
                  min: 0,
                  admin: { width: '50%', description: 'Maximum total price (USD).' },
                },
              ],
            },
            {
              name: 'projectType',
              type: 'select',
              required: true,
              defaultValue: 'team',
              options: [
                { label: 'Single', value: 'single' },
                { label: 'Team', value: 'team' },
                { label: 'Custom', value: 'custom' },
              ],
            },
            {
              name: 'klarnaPaymentEnabled',
              type: 'checkbox',
              defaultValue: false,
              admin: { description: 'Show Klarna installment options at checkout.' },
            },
          ],
        },

        // ── 3. Categorization ──────────────────────────────────────────────
        {
          label: 'Categorization',
          fields: [
            {
              name: 'categories',
              type: 'array',
              maxRows: 3,
              required: true,
              labels: { singular: 'Category', plural: 'Categories' },
              admin: { description: 'Top-level categories used for discovery (max 3).' },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              name: 'subcategories',
              type: 'array',
              maxRows: 5,
              labels: { singular: 'Subcategory', plural: 'Subcategories' },
              admin: { description: 'Secondary classifications selected during creation (max 5).' },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              name: 'tags',
              type: 'array',
              maxRows: 10,
              admin: { description: 'Custom tags added by the project creator (max 10).' },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              name: 'projectSkills',
              type: 'array',
              maxRows: 25,
              labels: { singular: 'Skill', plural: 'Skills' },
              admin: {
                description:
                  'Skills associated with the project scope. Seeded by AI from task breakdown; editable.',
              },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              name: 'programmingLanguages',
              type: 'array',
              maxRows: 10,
              admin: { description: 'Languages used in the project (max 10).' },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              name: 'developmentTechnologies',
              type: 'array',
              maxRows: 10,
              labels: { singular: 'Technology', plural: 'Technologies' },
              admin: { description: 'Frameworks and tools used in the project (max 10).' },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              name: 'skillsAndTools',
              type: 'array',
              labels: { singular: 'Skill / Tool', plural: 'Skills & Tools' },
              admin: { description: 'Skill or tool with an icon shown on the project details page.' },
              fields: [
                { name: 'title', type: 'text', required: true },
                {
                  name: 'icon',
                  type: 'upload',
                  relationTo: 'media',
                  required: false,
                },
              ],
            },
          ],
        },

        // ── 4. Media ───────────────────────────────────────────────────────
        {
          label: 'Media',
          fields: [
            {
              name: 'thumbnail',
              type: 'upload',
              relationTo: 'media',
              required: true,
              admin: { description: 'Card thumbnail. Stored in Cloudflare R2.' },
            },
            {
              name: 'gallery',
              type: 'array',
              labels: { singular: 'Gallery image', plural: 'Gallery images' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                { name: 'caption', type: 'text' },
              ],
            },
            {
              name: 'videoWalkthrough',
              type: 'group',
              admin: {
                description:
                  'Optional. Either upload a video or supply an external URL — not both.',
              },
              fields: [
                {
                  name: 'upload',
                  type: 'upload',
                  relationTo: 'media',
                },
                { name: 'externalUrl', type: 'text' },
              ],
            },
          ],
        },

        // ── 5. Computed (read-only, set by NestJS workers via local API) ───
        {
          label: 'Computed',
          description:
            'Auto-calculated by NestJS workers and surfaced here for visibility. Not editable.',
          fields: [
            {
              name: 'startingPriceTotal',
              type: 'number',
              admin: {
                readOnly: true,
                description:
                  'Total project price based on assigned resources and scope hours.',
              },
            },
            {
              name: 'priceViewAmount',
              type: 'number',
              admin: {
                readOnly: true,
                description: 'Displayed cost according to the selected payment view mode.',
              },
            },
            {
              name: 'teamMemberCount',
              type: 'number',
              admin: { readOnly: true },
            },
            {
              name: 'projectDurationTotal',
              type: 'number',
              admin: {
                readOnly: true,
                description: 'Total weeks across all phases (auto-calculated from scope).',
              },
            },
            {
              name: 'projectDurationLabel',
              type: 'text',
              admin: { readOnly: true, description: 'Human-readable duration (e.g. "12 weeks").' },
            },
            {
              name: 'projectHistoryRatings',
              type: 'number',
              min: 0,
              max: 5,
              admin: {
                readOnly: true,
                description: 'Average rating of the client\u2019s past projects.',
              },
            },
            {
              name: 'datePublished',
              type: 'date',
              admin: {
                readOnly: true,
                description: 'Auto-set when the project is first published.',
              },
            },
          ],
        },
      ],
    },

    // ── Sidebar toggles ────────────────────────────────────────────────────
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Highlight this project on the homepage / category pages.',
      },
    },
    {
      name: 'chatEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Show the live-chat widget. Effective state is computed at runtime from team online status.',
      },
    },
    {
      name: 'reportButtonEnabled',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'shareButtonEnabled',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'helpButtonEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],

  hooks: {
    afterChange: [
      // CmsEventPublisher will be wired in a follow-up task (RMQ-01).
      // Stub left intentionally empty so collection compiles standalone.
    ],
  },
}
