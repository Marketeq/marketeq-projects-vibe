import type { CollectionConfig, FieldHook } from 'payload/types';

import {
  isAdmin,
  isEditor,
  readPublishedOrCmsUser,
} from '../access/roles';
import {
  syncProjectToListings,
  deleteProjectFromListings,
} from '../hooks/afterChange/syncProjects';
import { computeProjectFields } from '../hooks/beforeChange/computeProjectFields';
import CategorySelectField from '../components/CategorySelectField';
import {
  ProjectIndustriesChipField,
  ProjectSkillsTagsField,
  ProjectTagsChipField,
} from '../components/ChipArrayTagsField';
import SubcategoryAutocompleteField from '../components/SubcategoryAutocompleteField';
import VideoUrlField from '../components/VideoUrlField';
import { COUNTRIES } from '../constants/countries';
import GenerateDeliverablesFromListingsButton from '../components/GenerateDeliverablesFromListingsButton';
import { timingSafeEqual } from 'crypto';

function hasValidCmsApiKey(req: any): boolean {
  const configured = process.env.CMS_API_KEY;
  if (!configured) return false;
  const header = req?.headers?.authorization;
  if (typeof header !== 'string') return false;
  const match = header.match(/^API-Key\s+(.+)$/);
  if (!match) return false;
  const provided = match[1];
  if (provided.length !== configured.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(configured));
  } catch {
    return false;
  }
}

/**
 * Projects — dedicated CMS collection for the "Projects" listing type.
 *
 * Sources: docs/md/CMS Service/projects/** (Strapi integration, data dictionary, GAP-ANALYSIS).
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

const slugifyFromTitle: FieldHook = ({ value, originalDoc, data }: any) => {
  if (typeof value === 'string' && value.length > 0) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  // On updates, the slug field is typically omitted (hidden in admin UI).
  // Preserve the existing slug to avoid re-slugifying the title into a
  // non-unique value.
  if (typeof originalDoc?.slug === 'string' && originalDoc.slug.trim()) {
    return originalDoc.slug;
  }
  const fallback = (data?.title ?? originalDoc?.title) as string | undefined;
  if (!fallback) return value;
  return fallback
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

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
    },
    maxPerDoc: 25,
  },
  access: {
    read: readPublishedOrCmsUser,
    create: isEditor,
    update: isEditor,
    delete: isAdmin,
  },
  endpoints: [
    {
      path: '/:id/generate-deliverables',
      method: 'post',
      handler: async (req, res) => {
        if (!req.user && !hasValidCmsApiKey(req)) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const listingsUrl = process.env.LISTINGS_SERVICE_URL;
        const token = process.env.CMS_SYNC_TOKEN;
        if (!listingsUrl || !token) {
          return res.status(500).json({
            message: 'LISTINGS_SERVICE_URL / CMS_SYNC_TOKEN not configured',
          });
        }

        const id = (req.params as any)?.id;
        const doc = await req.payload.findByID({
          collection: 'projects',
          id,
          overrideAccess: true,
          depth: 0,
        });

        const base = listingsUrl.endsWith('/')
          ? listingsUrl.slice(0, -1)
          : listingsUrl;
        const upstream = await fetch(
          `${base}/internal/project-deliverables`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ scope: (doc as any)?.scope ?? [] }),
          },
        );

        if (!upstream.ok) {
          const text = await upstream.text();
          return res.status(502).json({
            message: `deliverables generation failed (${upstream.status})`,
            detail: text,
          });
        }

        const json = (await upstream.json()) as {
          deliverables?: Array<{
            phaseLabel: string;
            phaseName: string;
            items: string[];
          }>;
        };

        const deliverables = Array.isArray(json.deliverables)
          ? json.deliverables
              .map((g) => {
                const phaseLabel =
                  typeof g.phaseLabel === 'string' ? g.phaseLabel.trim() : '';
                const phaseName =
                  typeof g.phaseName === 'string' ? g.phaseName.trim() : '';
                const items = Array.isArray(g.items)
                  ? g.items
                      .map((t) => (typeof t === 'string' ? t.trim() : ''))
                      .filter(Boolean)
                      .map((text) => ({ text }))
                  : [];

                // Match Payload validation: phaseLabel + phaseName required; items required with minRows=1.
                if (!phaseLabel || !phaseName || items.length === 0) return null;
                return { phaseLabel, phaseName, items };
              })
              .filter((p): p is NonNullable<typeof p> => !!p)
          : [];

        // Persist immediately so the admin UI + downstream services reflect the
        // generated deliverables without requiring an extra manual save.
        try {
          await req.payload.update({
            collection: 'projects',
            id,
            // Do NOT force publish here — generation should work for drafts too.
            data: { deliverables } as any,
            overrideAccess: true,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const data =
            err && typeof err === 'object' && 'data' in err
              ? (err as any).data
              : undefined;
          return res.status(400).json({
            message: 'Failed to persist generated deliverables',
            detail: message,
            data,
          });
        }

        return res.json({ status: 'ok', deliverables });
      },
    },
  ],
  fields: [
    // ── Computed (read-only) ───────────────────────────────────────────────
    // Populated by `computeProjectFields` (beforeChange). These fields must
    // exist in the schema or Payload will drop them during writes.
    { name: 'startingPriceTotal', type: 'number', admin: { readOnly: true, hidden: true } },
    { name: 'priceViewAmount', type: 'number', admin: { readOnly: true, hidden: true } },
    { name: 'teamMemberCount', type: 'number', admin: { readOnly: true, hidden: true } },
    { name: 'projectDurationTotal', type: 'number', admin: { readOnly: true, hidden: true } },
    { name: 'projectDurationLabel', type: 'text', admin: { readOnly: true, hidden: true } },
    { name: 'datePublished', type: 'text', admin: { readOnly: true, hidden: true } },

    // ── Identity ────────────────────────────────────────────────────────────
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 120,
      validate: (value) => {
        if (typeof value !== 'string' || !value.trim()) return true;
        if (value.trim().length < 10) {
          return 'Please enter at least 10 character(s) (publish-project parity).';
        }
        return true;
      },
      admin: { description: 'Used as the main heading on the project card and details page.' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Highlight this project on the homepage / category pages.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        hidden: true,
      },
      hooks: {
        beforeValidate: [slugifyFromTitle],
      },
    },

    // ── Tabs: project info first, then FAQs, pricing, deliverables, media… ─
    {
      type: 'tabs',
      tabs: [
        // ── 1. Project info (publish-project step 1 parity) ───────────────
        {
          label: 'Project Info',
          admin: {
            description:
              'Field order matches /publish-project: categories → industries → descriptions → tags → skills. Programming languages and frameworks are not collected in the marketplace wizard; use Tags and Skills instead.',
          },
          fields: [
            {
              name: 'categories',
              type: 'array',
              maxRows: 3,
              minRows: 3,
              required: true,
              validate: (value) => {
                if (!Array.isArray(value) || value.length !== 3) {
                  return 'Please select all required categories (exactly 3, same as publish-project).';
                }

                const seen = new Set<string>();

                for (const entry of value as Array<{
                  value?: unknown;
                  subcategories?: Array<{ value?: unknown }>;
                }>) {
                  const categoryValue =
                    typeof entry?.value === 'string' ? entry.value.trim() : '';

                  if (!categoryValue) {
                    return 'Each category row must have a category selected.';
                  }

                  const normalizedCategoryValue = categoryValue.toLowerCase();
                  if (seen.has(normalizedCategoryValue)) {
                    return 'Duplicate categories are not allowed.';
                  }
                  seen.add(normalizedCategoryValue);

                  const selectedSubcategories = Array.isArray(entry?.subcategories)
                    ? entry.subcategories.filter(
                        (subEntry) =>
                          typeof subEntry?.value === 'string' &&
                          subEntry.value.trim().length > 0,
                      )
                    : [];

                  if (!selectedSubcategories.length) {
                    return `Category "${categoryValue}" must include at least one subcategory.`;
                  }

                  if (selectedSubcategories.length > 5) {
                    return `Category "${categoryValue}" can include at most 5 subcategories.`;
                  }

                  const subSeen = new Set<string>();
                  for (const subEntry of selectedSubcategories) {
                    const sv =
                      typeof subEntry?.value === 'string'
                        ? subEntry.value.trim()
                        : '';
                    if (!sv) continue;
                    const sk = sv.toLowerCase();
                    if (subSeen.has(sk)) {
                      return `Duplicate subcategory "${sv}" under "${categoryValue}" is not allowed.`;
                    }
                    subSeen.add(sk);
                  }
                }

                return true;
              },
              labels: { singular: 'Category', plural: 'Categories' },
              admin: {
                description:
                  'Exactly 3 category groups. Each must include at least one unique subcategory (max 5 per group), same as publish-project.',
              },
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  required: true,
                  admin: {
                    components: {
                      Field: CategorySelectField,
                    },
                  },
                },
                {
                  name: 'subcategories',
                  type: 'array',
                  required: true,
                  minRows: 1,
                  maxRows: 5,
                  labels: { singular: 'Subcategory', plural: 'Subcategories' },
                  admin: {
                    description:
                      'At least one subcategory is required for each category, same as publish-project validation.',
                  },
                  fields: [
                    {
                      name: 'value',
                      type: 'text',
                      required: true,
                      admin: {
                        components: {
                          Field: SubcategoryAutocompleteField,
                        },
                      },
                    },
                  ],
                },
              ],
            },
            {
              name: 'industries',
              type: 'array',
              minRows: 1,
              maxRows: 5,
              required: true,
              labels: { singular: 'Industry', plural: 'Industries' },
              admin: {
                description:
                  'Min 1, max 5. Same autocomplete service + chip UX as publish-project industries.',
                components: {
                  Field: ProjectIndustriesChipField,
                },
              },
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  required: true,
                },
              ],
            },
            {
              name: 'shortDescription',
              type: 'textarea',
              required: true,
              maxLength: 300,
              validate: (value) => {
                if (typeof value !== 'string') return true;
                const t = value.trim();
                if (t.length > 0 && t.length < 50) {
                  return 'Please enter at least 50 character(s) (publish-project parity).';
                }
                return true;
              },
              admin: { description: 'Summary used on cards and meta tags.' },
            },
            {
              name: 'fullDescription',
              type: 'richText',
              required: true,
              admin: {
                description:
                  'Rich-text overview shown on the project details page.',
              },
            },
            {
              name: 'tags',
              type: 'array',
              minRows: 1,
              maxRows: 10,
              required: true,
              labels: { singular: 'Tag', plural: 'Tags' },
              admin: {
                description:
                  'Min 1, max 10. Same autocomplete service + chip UX as publish-project.',
                components: {
                  Field: ProjectTagsChipField,
                },
              },
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
              minRows: 1,
              maxRows: 10,
              required: true,
              labels: { singular: 'Skill', plural: 'Skills' },
              admin: {
                description:
                  'Min 1, max 10. Same autocomplete service + chip UX as publish-project skills.',
                components: {
                  Field: ProjectSkillsTagsField,
                },
              },
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  required: true,
                },
              ],
            },
          ],
        },

        // ── 2. FAQs & public questions ─────────────────────────────────────
        {
          label: 'FAQs & Questions',
          admin: {
            description:
              'Optional Q&A blocks. Title, descriptions, and marketplace categorization are on the Project Info tab (publish-project parity).',
          },
          fields: [
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
                condition: (_data: any, siblingData: any) => {
                  const items = Array.isArray(siblingData?.recentQuestions)
                    ? siblingData.recentQuestions
                    : [];
                  return items.some((q: any) => !q?.answer);
                },
              },
              labels: { singular: 'Question', plural: 'Recent Questions' },
              fields: [
                {
                  name: 'question',
                  type: 'text',
                  required: true,
                  admin: {
                    readOnly: true,
                    description:
                      'This question is sourced from the marketplace database. Editors can only add an answer.',
                  },
                },
                {
                  name: 'answer',
                  type: 'richText',
                  admin: {
                    description: 'Editor answer shown publicly on the project page.',
                  },
                },
              ],
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

        // ── 3. Pricing & scope ─────────────────────────────────────────────
        {
          label: 'Pricing & Scope',
          fields: [
            {
              // Spec: auto-calculated from scope[].tasks[].durationValue.
              name: 'totalEstimatedHours',
              type: 'number',
              admin: {
                readOnly: true,
                hidden: true,
                description: 'Auto-calculated from scope task hours. Not editable.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  // Spec: derived from scope duration. Do NOT allow manual edits.
                  name: 'timelineValue',
                  type: 'number',
                  admin: { width: '50%', readOnly: true, hidden: true, description: 'Auto-calculated from scope.' },
                },
                {
                  name: 'timelineUnit',
                  type: 'select',
                  defaultValue: 'weeks',
                  options: [
                    { label: 'Weeks', value: 'weeks' },
                    { label: 'Months', value: 'months' },
                  ],
                  admin: { width: '50%', readOnly: true, hidden: true },
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
                description: 'Default payment view mode shown to the buyer on the project page.',
              },
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
            // ── Scope Builder ────────────────────────────────────────────────
            // Per docs/md/CMS Service/projects/creation/Strapi Integration §Step 3
            // Scope Builder. Phase { phase_name, order, tasks[] } and
            // Task { title, role_name, location, experience_level, estimated_hours }
            // are the primary data the entire pricing + deliverables +
            // skills + duration pipeline derives from.
            //
            // The spec's warning applies verbatim:
            //   ⛔ Do NOT add editable fields for duration, weeks, start day,
            //      or end day. These are calculated automatically based on
            //      task hours and work schedules.
            {
              name: 'scope',
              type: 'array',
              required: true,
              minRows: 1,
              labels: { singular: 'Phase', plural: 'Scope (phases)' },
              admin: {
                description:
                  'Ordered list of phases. Each phase contains tasks with role, experience, and estimated hours. Pricing and duration are computed from this tree — do not add duration fields here.',
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
                  admin: {
                    readOnly: true,
                    hidden: true,
                    description:
                      'Auto-calculated phase order (1-indexed).',
                  },
                },
                {
                  name: 'tasks',
                  type: 'array',
                  required: true,
                  minRows: 1,
                  labels: { singular: 'Task', plural: 'Tasks' },
                  fields: [
                    { name: 'title', type: 'text', required: true, label: 'Task Name' },
                    {
                      // Same options as the frontend ROLES constant in publish-project/page.tsx
                      name: 'roleName',
                      type: 'select',
                      required: true,
                      label: 'Role',
                      options: [
                        { label: 'Frontend Developer', value: 'Frontend Developer' },
                        { label: 'Backend Developer', value: 'Backend Developer' },
                        { label: 'Full Stack Developer', value: 'Full Stack Developer' },
                        { label: 'DevOps Engineer', value: 'DevOps Engineer' },
                        { label: 'Data Scientist', value: 'Data Scientist' },
                        { label: 'Machine Learning Engineer', value: 'Machine Learning Engineer' },
                        { label: 'Cloud Engineer', value: 'Cloud Engineer' },
                        { label: 'Database Administrator', value: 'Database Administrator' },
                        { label: 'Security Engineer', value: 'Security Engineer' },
                        { label: 'Mobile Developer', value: 'Mobile Developer' },
                        { label: 'QA Engineer', value: 'QA Engineer' },
                        { label: 'System Architect', value: 'System Architect' },
                        { label: 'Network Engineer', value: 'Network Engineer' },
                        { label: 'Site Reliability Engineer (SRE)', value: 'Site Reliability Engineer (SRE)' },
                        { label: 'Software Engineer', value: 'Software Engineer' },
                        { label: 'UI/UX Designer', value: 'UI/UX Designer' },
                        { label: 'Graphic Designer', value: 'Graphic Designer' },
                        { label: 'Product Designer', value: 'Product Designer' },
                        { label: 'Interaction Designer', value: 'Interaction Designer' },
                        { label: 'Visual Designer', value: 'Visual Designer' },
                        { label: 'Motion Designer', value: 'Motion Designer' },
                        { label: 'Web Designer', value: 'Web Designer' },
                        { label: 'Brand Designer', value: 'Brand Designer' },
                        { label: 'Illustrator', value: 'Illustrator' },
                        { label: 'Information Architect', value: 'Information Architect' },
                        { label: 'User Researcher', value: 'User Researcher' },
                        { label: 'Content Strategist', value: 'Content Strategist' },
                        { label: 'Design Technologist', value: 'Design Technologist' },
                        { label: 'Experience Designer', value: 'Experience Designer' },
                        { label: 'Service Designer', value: 'Service Designer' },
                      ],
                    },
                    {
                      name: 'location',
                      type: 'select',
                      required: true,
                      options: COUNTRIES,
                      label: 'Location',
                      admin: { description: 'Country preference.' },
                    },
                    {
                      // Mirrors frontend EXPERIENCE_LEVELS constant
                      name: 'experienceLevel',
                      type: 'select',
                      required: true,
                      defaultValue: 'Medior',
                      label: 'Experience',
                      options: [
                        { label: 'Student', value: 'Student' },
                        { label: 'Junior', value: 'Junior' },
                        { label: 'Medior', value: 'Medior' },
                        { label: 'Senior', value: 'Senior' },
                        { label: 'Guru', value: 'Guru' },
                      ],
                    },
                    {
                      // Mirrors frontend duration: { value, type } shape.
                      // The computeProjectFields hook converts this to estimatedHours
                      // for pricing/duration calculations.
                      type: 'row',
                      fields: [
                        {
                          name: 'durationValue',
                          type: 'number',
                          required: true,
                          min: 1,
                          label: 'Duration',
                          admin: {
                            width: '50%',
                            description: 'Duration amount (e.g. 2 for "2 weeks").',
                          },
                        },
                        {
                          name: 'durationType',
                          type: 'select',
                          required: true,
                          defaultValue: 'weeks',
                          label: 'Unit',
                          options: [
                            { label: 'Hours', value: 'hours' },
                            { label: 'Days', value: 'days' },
                            { label: 'Weeks', value: 'weeks' },
                          ],
                          admin: { width: '50%' },
                        },
                      ],
                    },

                  ],
                },
              ],
            },
          ],
        },

        // ── 4. Deliverables ────────────────────────────────────────────────
        {
          label: 'Deliverables',
          fields: [
            {
              name: 'generateDeliverablesButton',
              type: 'ui',
              admin: {
                components: {
                  Field: GenerateDeliverablesFromListingsButton,
                },
              },
            },
            {
              name: 'deliverables',
              type: 'array',
              labels: { singular: 'Phase', plural: 'Phases' },
              // Always show; the Generate button will populate it.
              fields: [
                {
                  name: 'phaseLabel',
                  type: 'text',
                  required: true,
                  admin: { description: 'e.g. "Phase One", "Phase Two"' },
                },
                {
                  name: 'phaseName',
                  type: 'text',
                  required: true,
                  admin: { description: 'e.g. "Research", "Design", "Front-End"' },
                },
                {
                  name: 'items',
                  type: 'array',
                  labels: { singular: 'Item', plural: 'Items' },
                  required: true,
                  minRows: 1,
                  fields: [
                    { name: 'text', type: 'text', required: true },
                  ],
                },
              ],
            },
          ],
        },

        // ── 5. Media ───────────────────────────────────────────────────────
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
                  'Optional. Paste a YouTube, Vimeo, or other external video URL.',
              },
              fields: [
                {
                  name: 'externalUrl',
                  type: 'text',
                  admin: {
                    description: 'e.g. https://www.youtube.com/watch?v=...',
                    components: {
                      Field: VideoUrlField,
                    },
                  },
                },
              ],
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
                    hidden: true,
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
                    hidden: true,
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
          ],
        },

        // ── 7. SEO ─────────────────────────────────────────────────────────
        {
          label: 'SEO',
          fields: [
            {
              name: 'seoTitle',
              type: 'text',
              maxLength: 70,
              admin: {
                description:
                  'Page title shown in search results. Max 70 chars. Defaults to project title if empty.',
              },
            },
            {
              name: 'seoDescription',
              type: 'textarea',
              maxLength: 160,
              admin: {
                description:
                  'Meta description shown in search results. Max 160 chars. Defaults to shortDescription if empty.',
              },
            },
          ],
        },
      ],
    },

  ],

  hooks: {
    // Derive Computed-tab fields from the authored doc before persistence.
    // See docs/md/CMS Service/projects/GAP-ANALYSIS.md §2 + §7 Tier 1.
    beforeChange: [computeProjectFields],
    afterChange: [syncProjectToListings],
    afterDelete: [deleteProjectFromListings],
  },
}
