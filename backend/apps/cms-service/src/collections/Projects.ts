import { CollectionConfig, FieldHook } from 'payload/types';

import {
  isAdmin,
  isAdminField,
  isEditor,
  readPublishedOrCmsUser,
} from '../access/roles';
import { GenerateDeliverablesButton } from '../admin/components/GenerateDeliverablesButton'
import {
  syncProjectToListings,
  deleteProjectFromListings,
} from '../hooks/afterChange/syncProjects';
import { computeProjectFields } from '../hooks/beforeChange/computeProjectFields';
import { normalizeProjectPublishFields } from '../hooks/beforeChange/normalizeProjectPublishFields';

function validateTitleLikePublishProject(value: unknown): true | string {
  if (typeof value !== 'string') return 'Title must be a string.'
  const trimmed = value.trim()
  if (!trimmed) return 'Title is required.'
  if (trimmed.length < 10) return 'Please enter at least 10 character(s)'
  if (trimmed.length > 120) return 'Please do not enter more than 120 character(s)'
  return true
}

function lexicalToPlainText(value: unknown): string {
  // Lexical richText stores a document like `{ root: { children: [...] } }`.
  // If legacy Slate JSON sneaks in (array of nodes), return empty string so
  // validation fails with a helpful message.
  if (Array.isArray(value)) return ''
  if (!value || typeof value !== 'object') return ''

  const root = (value as any).root ?? value
  const visit = (node: any): string => {
    if (!node) return ''
    if (typeof node.text === 'string') return node.text
    if (Array.isArray(node.children)) return node.children.map(visit).join('')
    return ''
  }

  return visit(root).replace(/\s+/g, ' ').trim()
}

function validateTextareaLengthLikePublishProject(
  value: unknown,
  { min, max, minMessage, maxMessage }: { min: number; max: number; minMessage: string; maxMessage: string },
): true | string {
  if (typeof value !== 'string') return 'Value must be a string.'
  const trimmed = value.trim()
  if (trimmed.length < min) return minMessage
  if (trimmed.length > max) return maxMessage
  return true
}

function validateLexicalLengthLikePublishProject(
  value: unknown,
  { min, max, minMessage, maxMessage }: { min: number; max: number; minMessage: string; maxMessage: string },
): true | string {
  const text = lexicalToPlainText(value)
  // If this is empty but the field is required, let the "required" validation
  // handle truly missing values; this handles legacy Slate / too-short content.
  if (!text) return minMessage
  if (text.length < min) return minMessage
  if (text.length > max) return maxMessage
  return true
}

function validateCategorySelectionsLikePublishProject(value: unknown): true | string {
  // publish-project requires 3 category selections, each with 1–5 subcategories.
  if (!Array.isArray(value)) {
    return 'Please enter/select all the categories and sub-categories'
  }
  if (value.length !== 3) {
    return 'Please enter/select all the categories and sub-categories'
  }
  for (const row of value) {
    const category = typeof (row as any)?.category === 'string' ? (row as any).category.trim() : ''
    if (!category) return 'Please enter/select all the categories and sub-categories'
    const subs = (row as any)?.subCategories
    const subArr = Array.isArray(subs) ? subs : []
    const values = subArr
      .map((s: any) => (typeof s?.value === 'string' ? s.value.trim() : ''))
      .filter(Boolean)
    if (values.length < 1 || values.length > 5) {
      return 'Please enter/select all the categories and sub-categories'
    }
  }
  return true
}

function validatePublishScopeLikePublishProject(value: unknown): true | string {
  if (!Array.isArray(value) || value.length < 1) return 'Please add at least 1 phase(s)'
  for (const phase of value) {
    const name = typeof (phase as any)?.name === 'string' ? (phase as any).name.trim() : ''
    if (!name) return 'Please add at least 1 phase(s)'
    const tasks = (phase as any)?.tasks
    if (!Array.isArray(tasks) || tasks.length < 1) return 'Please add at least 1 task(s)'
    for (const t of tasks) {
      const taskName = typeof (t as any)?.taskName === 'string' ? (t as any).taskName.trim() : ''
      const role = typeof (t as any)?.role === 'string' ? (t as any).role.trim() : ''
      const loc = (t as any)?.location
      const locArr = Array.isArray(loc) ? loc : []
      const locValues = locArr
        .map((l: any) => (typeof l?.value === 'string' ? l.value.trim() : ''))
        .filter(Boolean)
      const exp = typeof (t as any)?.experienceLevel === 'string' ? String((t as any).experienceLevel) : ''
      const durVal = (t as any)?.duration?.value
      const durType = (t as any)?.duration?.type
      if (!taskName || !role || locValues.length < 1 || !exp) return 'Please add at least 1 task(s)'
      if (!(typeof durVal === 'number' && durVal > 0)) return 'Please add at least 1 task(s)'
      if (!['hours', 'days', 'weeks'].includes(String(durType))) return 'Please add at least 1 task(s)'
    }
  }
  return true
}

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
  endpoints: [
    {
      path: '/:id/generate-deliverables',
      method: 'post',
      handler: async (req, res) => {
        try {
          const role = (req.user as any)?.role
          if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' })

          const listingsUrl = process.env.LISTINGS_SERVICE_URL
          const token = process.env.CMS_SYNC_TOKEN
          if (!listingsUrl || !token) {
            return res.status(500).json({ error: 'LISTINGS_SERVICE_URL / CMS_SYNC_TOKEN not configured' })
          }

          const id = String((req as any).params?.id || '')
          if (!id) return res.status(400).json({ error: 'Missing project id' })

          const project = await req.payload.findByID({
            collection: 'projects' as any,
            id: id as any,
            depth: 0,
          })
          // Derive deliverables from the legacy scope shape that the
          // listings-service expects. `scope` is derived from `publishScope`
          // in a beforeChange hook, but this endpoint runs without saving,
          // so fall back to deriving on-the-fly if needed.
          const deriveLegacyScope = (publishScope: any[]) => {
            return publishScope
              .map((p, idx) => {
                const phaseName = typeof p?.name === 'string' ? p.name.trim() : ''
                const order = typeof p?.order === 'number' && p.order > 0 ? p.order : idx + 1
                const tasks = (Array.isArray(p?.tasks) ? p.tasks : [])
                  .map((t: any) => {
                    const title = typeof t?.taskName === 'string' ? t.taskName.trim() : ''
                    const roleName = typeof t?.role === 'string' ? t.role.trim() : ''
                    const locArr = Array.isArray(t?.location) ? t.location : []
                    const location =
                      locArr
                        .map((l: any) =>
                          typeof l === 'string'
                            ? l.trim()
                            : typeof l?.value === 'string'
                              ? l.value.trim()
                              : '',
                        )
                        .filter(Boolean)[0] || undefined
                    const experienceLevel =
                      typeof t?.experienceLevel === 'string' ? t.experienceLevel : 'Medior'
                    const explicitHours =
                      typeof t?.estimatedHours === 'number' && t.estimatedHours > 0
                        ? Math.round(t.estimatedHours)
                        : null
                    const durVal =
                      typeof t?.duration?.value === 'number' && t.duration.value > 0
                        ? t.duration.value
                        : null
                    const durType = typeof t?.duration?.type === 'string' ? t.duration.type : null
                    const derivedHours =
                      durVal && durType === 'hours'
                        ? Math.round(durVal)
                        : durVal && durType === 'days'
                          ? Math.round(durVal * 8)
                          : durVal && durType === 'weeks'
                            ? Math.round(durVal * 40)
                            : 0
                    const estimatedHours = explicitHours ?? derivedHours
                    if (!title || !roleName || estimatedHours <= 0) return null
                    return { title, roleName, location, experienceLevel, estimatedHours }
                  })
                  .filter(Boolean)
                if (!phaseName || tasks.length === 0) return null
                return { phaseName, order, tasks }
              })
              .filter(Boolean)
          }

          let scope = (project as any)?.scope
          if (!Array.isArray(scope) || scope.length === 0) {
            const publishScope = (project as any)?.publishScope
            if (Array.isArray(publishScope) && publishScope.length > 0) {
              scope = deriveLegacyScope(publishScope)
            }
          }

          if (!Array.isArray(scope) || scope.length === 0) {
            return res.status(400).json({ error: 'Scope is empty' })
          }

          const deriveUrl = `${listingsUrl.replace(/\/$/, '')}/internal/project-sync/derive-deliverables`
          const deriveRes = await fetch(deriveUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ scope }),
          })
          if (!deriveRes.ok) {
            const text = await deriveRes.text().catch(() => '')
            return res.status(502).json({ error: text || `derive failed (${deriveRes.status})` })
          }

          const derived = (await deriveRes.json()) as any
          const deliverablesLexical =
            derived?.deliverablesLexical && typeof derived.deliverablesLexical === 'object'
              ? derived.deliverablesLexical
              : null
          if (!deliverablesLexical) {
            return res.status(502).json({ error: 'derive response missing deliverablesLexical' })
          }

          const updated = await req.payload.update({
            collection: 'projects' as any,
            id: id as any,
            overrideAccess: true,
            data: {
              deliverables: deliverablesLexical,
              deliverablesGenerated: true,
            } as any,
          })

          return res.json({ ok: true, id, deliverablesGenerated: true, updatedAt: (updated as any)?.updatedAt })
        } catch (e) {
          return res.status(500).json({ error: e instanceof Error ? e.message : 'Internal error' })
        }
      },
    },
  ],
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'projectType', 'pricingModel', 'featured', 'updatedAt'],
    description:
      'Project listings shown on the marketplace. Edits sync to listings-service via RabbitMQ.',
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
    // ── Identity ────────────────────────────────────────────────────────────
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 120,
      validate: validateTitleLikePublishProject,
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
              maxLength: 300,
              validate: (value) =>
                validateTextareaLengthLikePublishProject(value, {
                  min: 50,
                  max: 300,
                  minMessage: 'Please enter at least 50 character(s)',
                  maxMessage: 'Please do not enter more than 300 character(s)',
                }),
              admin: { description: 'Summary used on cards and meta tags.' },
            },
            {
              name: 'fullDescription',
              type: 'richText',
              required: true,
              admin: {
                description:
                  'Long description shown on the project details page.',
              },
            },
            // ── Scope Builder (drives deliverables generation) ────────────────
            {
              name: 'publishScope',
              type: 'array',
              required: true,
              minRows: 1,
              labels: { singular: 'Phase', plural: 'Project Scope (publish-project)' },
              admin: {
                description:
                  'Source of truth. Mirrors /publish-project schema: phases with tasks that include role, location(s), experience level, and duration.',
              },
              validate: validatePublishScopeLikePublishProject,
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  required: true,
                  admin: { description: 'Phase name (e.g. "Research", "Design", "Build").' },
                },
                {
                  name: 'stageName',
                  type: 'text',
                  required: true,
                  admin: { description: 'Stage label (e.g. "Stage 1").' },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'startDay',
                      type: 'number',
                      required: true,
                      min: 1,
                      admin: { width: '33%', description: 'Start day (publish-project payload).' },
                    },
                    {
                      name: 'endDay',
                      type: 'number',
                      required: true,
                      min: 1,
                      admin: { width: '33%', description: 'End day (publish-project payload).' },
                    },
                    {
                      name: 'order',
                      type: 'number',
                      required: true,
                      min: 1,
                      admin: { width: '33%', description: 'Phase order (1-indexed).' },
                    },
                  ],
                },
                {
                  name: 'tasks',
                  type: 'array',
                  required: true,
                  minRows: 1,
                  labels: { singular: 'Task', plural: 'Tasks' },
                  fields: [
                    { name: 'taskName', type: 'text', required: true },
                    { name: 'role', type: 'text', required: true },
                    {
                      name: 'location',
                      type: 'array',
                      required: true,
                      minRows: 1,
                      labels: { singular: 'Location', plural: 'Locations' },
                      fields: [{ name: 'value', type: 'text', required: true }],
                      admin: {
                        description: 'Matches publish-project: location is an array (usually 1 item).',
                      },
                    },
                    {
                      name: 'experienceLevel',
                      type: 'select',
                      required: true,
                      defaultValue: 'Medior',
                      options: [
                        { label: 'Student', value: 'Student' },
                        { label: 'Junior', value: 'Junior' },
                        { label: 'Medior', value: 'Medior' },
                        { label: 'Senior', value: 'Senior' },
                        { label: 'Guru', value: 'Guru' },
                      ],
                    },
                    {
                      name: 'duration',
                      type: 'group',
                      admin: { description: 'Matches publish-project form: numeric value + unit.' },
                      fields: [
                        {
                          name: 'value',
                          type: 'number',
                          required: true,
                          min: 1,
                          admin: { width: '50%' },
                        },
                        {
                          name: 'type',
                          type: 'select',
                          required: true,
                          defaultValue: 'weeks',
                          options: [
                            { label: 'Hours', value: 'hours' },
                            { label: 'Days', value: 'days' },
                            { label: 'Weeks', value: 'weeks' },
                          ],
                          admin: { width: '50%' },
                        },
                      ],
                    },
                    // Optional: publish-service accepts it, but publish-project UI does not currently compute it.
                    {
                      name: 'estimatedHours',
                      type: 'number',
                      required: false,
                      min: 1,
                      admin: {
                        description:
                          'Optional override. If empty, cms-service derives estimated hours from duration (hours/day/week heuristics) for computed fields.',
                      },
                    },
                  ],
                },
              ],
            },
            {
              name: 'scope',
              type: 'array',
              required: false,
              labels: { singular: 'Phase', plural: 'Scope (phases)' },
              admin: {
                description:
                  'Derived from publishScope (hidden). Kept for internal computed fields + sync compatibility.',
                hidden: true,
                readOnly: true,
              },
              fields: [
                {
                  name: 'phaseName',
                  type: 'text',
                  required: true,
                  admin: { description: 'e.g. "Research", "Design", "Front-End"' },
                },
                {
                  name: 'order',
                  type: 'number',
                  required: true,
                  min: 1,
                  admin: {
                    description:
                      'Phase order (1-indexed). Used to sort phases on the project details page.',
                  },
                },
                {
                  name: 'tasks',
                  type: 'array',
                  required: true,
                  minRows: 1,
                  labels: { singular: 'Task', plural: 'Tasks' },
                  fields: [
                    { name: 'title', type: 'text', required: true },
                    {
                      name: 'roleName',
                      type: 'text',
                      required: true,
                      admin: { description: 'Role required for this task (e.g. "Senior Designer").' },
                    },
                    {
                      name: 'location',
                      type: 'text',
                      admin: { description: 'Location / country preference.' },
                    },
                    {
                      name: 'experienceLevel',
                      type: 'select',
                      required: true,
                      defaultValue: 'Medior',
                      options: [
                        { label: 'Student', value: 'Student' },
                        { label: 'Junior', value: 'Junior' },
                        { label: 'Medior', value: 'Medior' },
                        { label: 'Senior', value: 'Senior' },
                        { label: 'Guru', value: 'Guru' },
                      ],
                    },
                    {
                      name: 'estimatedHours',
                      type: 'number',
                      required: true,
                      min: 1,
                      admin: { description: 'Estimated hours for this task. Drives pricing + duration.' },
                    },
                    {
                      name: 'assigneeEmail',
                      type: 'email',
                      admin: {
                        description:
                          'Email of the user assigned to this task. Resolved to a profile at render time via user-service. Leave empty if unassigned.',
                      },
                    },
                  ],
                },
              ],
            },
            {
              name: 'generateDeliverables',
              type: 'ui',
              admin: {
                components: {
                  Field: GenerateDeliverablesButton as any,
                },
              },
            },
            {
              name: 'deliverables',
              type: 'richText',
              required: false,
              access: {
                // Not editable at first. After listings-service generates deliverables
                // and cms-service backfills them, we flip `deliverablesGenerated=true`
                // so admins can override the generated rich text.
                create: () => false,
                update: ({ req, data, doc }) => {
                  if (!isAdminField({ req })) return false;
                  return (
                    (doc as any)?.deliverablesGenerated === true ||
                    (data as any)?.deliverablesGenerated === true
                  );
                },
              },
              admin: {
                description:
                  'Flow: Save Scope → click “Generate deliverables from scope” above → Deliverables will be backfilled as rich text. After generation, admins can edit/override.',
              },
            },
            {
              name: 'deliverablesGenerated',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                hidden: true,
                readOnly: true,
              },
            },
            {
              name: 'faqQuestions',
              type: 'array',
              labels: { singular: 'FAQ', plural: 'FAQs' },
              admin: { description: 'Common questions answered by the team. Editable by team lead, must pass moderation.' },
              // Per docs/md/.../creation/Strapi Integration:196 §FAQItem the
              // answer is spec'd as Rich Text, so editors can add bold,
              // lists, inline links etc. — listings-service reuses the same
              // Lexical→HTML converter used for fullDescription (no extra
              // code path, same sanitiser).
              fields: [
                { name: 'question', type: 'text', required: true },
                { name: 'answer', type: 'richText', required: true },
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
            // NOTE: The "About the Team" section is intentionally NOT a CMS
            // field. Per docs/md/CMS Service/projects/details/03 PHASE 1 §1
            // and data-dictionary.csv:12/32, team composition is *derived*
            // from `project_tasks.assignee` (user IDs), not authored in the
            // CMS. The listings-service will expose GET /projects/:id/team
            // once project_tasks lands. Until then the frontend renders a
            // static fallback (see project-details/[slug]/page.tsx).
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
              admin: {
                description:
                  'Fallback only: used when Scope is empty. When Scope is present, this value is auto-recomputed from scope task hours.',
              },
            },
            {
              name: 'pricingScopeHint',
              type: 'ui',
              admin: {
                components: {
                  Field: () =>
                    'Tip: duration + computed pricing come from Scope (tasks + assignees). Use Timeline only if Scope is empty.',
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'timelineValue',
                  type: 'number',
                  required: true,
                  min: 1,
                  admin: {
                    width: '50%',
                    description:
                      'Fallback only when Scope is empty. When Scope is present, duration is derived automatically from scope hours + team size.',
                  },
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
                  admin: {
                    width: '50%',
                    description: 'Used with Timeline Value (fallback mode only).',
                  },
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
              label: 'Billing cadence',
              admin: {
                description:
                  'How pricing is presented for the buyer (cadence label).',
              },
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
              label: 'Default payment view (UI)',
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
              name: 'categorySelections',
              type: 'array',
              minRows: 3,
              maxRows: 3,
              required: true,
              labels: { singular: 'Category Group', plural: 'Category Groups' },
              admin: {
                description:
                  'Matches /publish-project: exactly 3 categories, each with 1–5 subcategories.',
              },
              validate: validateCategorySelectionsLikePublishProject,
              fields: [
                {
                  name: 'category',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'subCategories',
                  type: 'array',
                  minRows: 1,
                  maxRows: 5,
                  required: true,
                  labels: { singular: 'Subcategory', plural: 'Subcategories' },
                  fields: [{ name: 'value', type: 'text', required: true }],
                },
              ],
            },
            {
              name: 'categories',
              type: 'array',
              maxRows: 3,
              required: false,
              labels: { singular: 'Category', plural: 'Categories' },
              admin: {
                description:
                  'Derived from Category Groups above. Kept for sync compatibility with listings-service.',
                hidden: true,
                readOnly: true,
              },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              name: 'subcategories',
              type: 'array',
              maxRows: 15,
              required: false,
              labels: { singular: 'Subcategory', plural: 'Subcategories' },
              admin: {
                description:
                  'Derived (flattened) from Category Groups above. Kept for sync compatibility with listings-service. Max 15 (= 3 categories × 5 subcategories).',
                hidden: true,
                readOnly: true,
              },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              name: 'tags',
              type: 'array',
              maxRows: 10,
              minRows: 1,
              required: true,
              admin: { description: 'Custom tags added by the project creator (max 10).' },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              // Per data-dictionary.csv:11 — "Generated by AI based on
              // task breakdown and assigned roles." Spec says computed,
              // but we keep it editable as a manual fallback until the
              // AI skill-extraction pipeline (§14.11 HuggingFace) lands.
              // Once that's wired, flip to `admin: { readOnly: true }`.
              name: 'projectSkills',
              type: 'array',
              maxRows: 10,
              minRows: 1,
              required: true,
              labels: { singular: 'Skill', plural: 'Skills' },
              admin: {
                description:
                  'Spec: AI-generated from task breakdown (§14.11). Currently editable as manual fallback — will flip to readOnly when AI pipeline lands.',
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
            // Per creation/Strapi Integration §60 + creation/Fields That
            // Require Autocomplete §3: industries are distinct from
            // categories and rendered as "industry badges" on the details
            // page (doc §13 L52). Sourced from the same autocomplete
            // library as categories (filterLevel=1 or 2).
            {
              name: 'industries',
              type: 'array',
              maxRows: 5,
              minRows: 1,
              required: true,
              labels: { singular: 'Industry', plural: 'Industries' },
              admin: {
                description:
                  'Industry tags shown as badges. Max 5. Distinct from project categories.',
              },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            // Per spec §16 L139 + creation §208: editor-curated list of
            // related projects. M2M self-reference so the admin can pick
            // from the same Projects collection.
            {
              name: 'relatedProjects',
              type: 'relationship',
              relationTo: 'projects' as any,
              hasMany: true,
              admin: {
                description:
                  'Manually curated related projects. Shown in the "You might also like" rail on the details page.',
              },
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
              admin: {
                readOnly: true,
                description:
                  'Human-readable duration. Unit pivots per spec §01 L98-104: <7 days → "N days", <4 weeks → "N weeks", else "N months".',
              },
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
              // Derived in computeProjectFields from
              // unique(scope[].tasks[].assigneeEmail). The gateway
              // hydrates each email into a full profile via
              // user-service at request time. Emails (not UUIDs)
              // match spec §16 L96 and avoid leaking the UUID space
              // to CMS editors.
              name: 'teamEmails',
              type: 'json',
              admin: {
                readOnly: true,
                description:
                  'Derived from scope task assignees. Array of email addresses — the canonical team identifiers per spec §16.',
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

        // ── 6. Admin & moderation ─────────────────────────────────────────
        // Per docs/md/.../16 - Strapi Integration §Basic Project Info L44-51
        // + §SEO & Admin L137-149. Fields here are internal-only (not
        // synced to listings or rendered on the frontend) except where
        // the sync hook explicitly reads them.
        {
          label: 'Admin & Moderation',
          description:
            'Internal fields for project governance. Not shown to public visitors.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'visibility',
                  type: 'select',
                  defaultValue: 'public',
                  options: [
                    { label: 'Public', value: 'public' },
                    { label: 'Private', value: 'private' },
                    { label: 'Unlisted', value: 'unlisted' },
                  ],
                  admin: {
                    width: '33%',
                    description:
                      'Distinct from draft/published. "Private" hides from search; "Unlisted" is accessible by direct URL only.',
                  },
                },
                {
                  name: 'moderationStatus',
                  type: 'select',
                  defaultValue: 'approved',
                  options: [
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' },
                    { label: 'Escalated', value: 'escalated' },
                  ],
                  admin: {
                    width: '33%',
                    description:
                      'Content-moderation status, separate from Payload\'s draft/published workflow. Set automatically by the FlagScore hook (§14.12).',
                  },
                },
                {
                  name: 'ownerId',
                  type: 'text',
                  admin: {
                    width: '33%',
                    description:
                      'UUID of the project owner from user-service. Links this project to a real user for team, audit, and permissions.',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'isFlagged',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: {
                    width: '33%',
                    description: 'Internal flag for admin review.',
                  },
                },
                {
                  name: 'forceReviewOnEdit',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: {
                    width: '33%',
                    description:
                      'When true, editing sensitive fields (title, description, deliverables, tags, skills, video) sets moderationStatus back to "pending" (§14.13).',
                  },
                },
                {
                  name: 'previewToken',
                  type: 'text',
                  admin: {
                    width: '33%',
                    readOnly: true,
                    description:
                      'Auto-generated shareable token for previewing unpublished drafts. Set on first create by the beforeChange hook.',
                  },
                },
              ],
            },
            {
              name: 'adminNotes',
              type: 'richText',
              admin: {
                description:
                  'Internal notes visible only to admins. Not synced to listings or shown publicly.',
              },
            },
            {
              name: 'adminTags',
              type: 'array',
              labels: { singular: 'Admin Tag', plural: 'Admin Tags' },
              admin: {
                description: 'Internal categorization tags for admin use only.',
              },
              fields: [
                { name: 'value', type: 'text', required: true },
              ],
            },
            {
              name: 'activityLog',
              type: 'array',
              labels: { singular: 'Entry', plural: 'Activity Log' },
              admin: {
                readOnly: true,
                description:
                  'Audit trail appended automatically on every save. Shape per spec §14.16 / §11.',
                components: {
                  RowLabel: ({ data, index }: { data?: Record<string, unknown>; index?: number }) => {
                    const row = (data ?? {}) as {
                      actionType?: string;
                      performedBy?: string;
                      timestamp?: string;
                      fieldChanged?: string;
                    };
                    const num = String((index ?? 0) + 1).padStart(2, '0');
                    const when = row.timestamp
                      ? new Date(row.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—';
                    const action = row.actionType
                      ? row.actionType.charAt(0).toUpperCase() + row.actionType.slice(1)
                      : 'Change';
                    const actor = row.performedBy || 'system';
                    const field = row.fieldChanged && row.fieldChanged !== '(save)' ? ` · ${row.fieldChanged}` : '';
                    return `#${num}  ·  ${when}  ·  ${action}  ·  ${actor}${field}`;
                  },
                },
              },
              fields: [
                {
                  name: 'actionType',
                  type: 'select',
                  options: [
                    { label: 'Create', value: 'create' },
                    { label: 'Update', value: 'update' },
                    { label: 'Publish', value: 'publish' },
                    { label: 'Unpublish', value: 'unpublish' },
                    { label: 'Flag', value: 'flag' },
                    { label: 'Moderate', value: 'moderate' },
                  ],
                },
                { name: 'performedBy', type: 'text' },
                { name: 'timestamp', type: 'date' },
                { name: 'fieldChanged', type: 'text' },
              ],
            },
            // SEO — per spec §16 L137-138. The @payloadcms/plugin-seo is
            // installed globally but not targeted at this collection, so
            // adding inline fields for now.
            {
              type: 'row',
              fields: [
                {
                  name: 'seoTitle',
                  type: 'text',
                  maxLength: 70,
                  admin: { width: '50%', description: 'Max 70 chars. Defaults to project title if empty.' },
                },
                {
                  name: 'seoDescription',
                  type: 'textarea',
                  maxLength: 160,
                  admin: { width: '50%', description: 'Max 160 chars. Defaults to shortDescription if empty.' },
                },
              ],
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
      // Per data-dictionary.csv:14 — "True only if at least one assigned
      // team member is online." Spec says runtime-computed, but we keep
      // it as an admin override toggle so editors can force-disable the
      // widget for specific projects. The frontend ANDs this with the
      // real-time presence check when messaging-service lands.
      // Per data-dictionary.csv:25 — "Visible to logged-in users only."
      // Spec treats this as a frontend feature, not a per-project CMS
      // toggle. Kept for backwards compat with the sync pipeline, but
      // the spec intent is that the report button always exists for
      // logged-in users.
      name: 'helpButtonEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],

  hooks: {
    // Derive Computed-tab fields from the authored doc before persistence.
    // See docs/md/CMS Service/projects/GAP-ANALYSIS.md §2 + §7 Tier 1.
    beforeValidate: [normalizeProjectPublishFields],
    beforeChange: [normalizeProjectPublishFields, computeProjectFields],
    afterChange: [syncProjectToListings],
    afterDelete: [deleteProjectFromListings],
  },
}
