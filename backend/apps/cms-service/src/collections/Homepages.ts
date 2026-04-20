import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper, isContentEditorOrAbove } from '../access/roles';

export const Homepages: CollectionConfig = {
  slug: 'homepages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'isDefault', 'updatedAt'],
    description: 'Homepage variants. One must be marked as default. Supports A/B testing via testGroup.',
  },
  access: {
    read: () => true,
    create: isAdminOrDeveloper,
    update: isContentEditorOrAbove,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [
      // Publish homepage.saved event for cache invalidation
      async ({ doc, req }) => {
        try {
          const { CmsEventPublisher } = await import('../rabbitmq/cms-event.publisher');
          const publisher = CmsEventPublisher.getInstance();
          if (publisher.isConnected()) {
            await publisher.publishWithRoutingKey('homepage.saved', {
              event: 'homepage.saved',
              slug: doc.slug,
              id: String(doc.id),
            });
            req.payload.logger.info(`Published homepage.saved for "${doc.slug}"`);
          }
        } catch (err) {
          req.payload.logger.error({ err }, `Failed to publish homepage.saved for "${doc.slug}"`);
        }

        // On-demand ISR: tell Next.js to bust the cached homepage paths.
        // Mirrors the projects hook — without this, edits to the Homepages
        // collection only show up after the 60s revalidate TTL on
        // frontend/app/(group)/(group)/page.tsx expires.
        const revalidateUrl = process.env.FRONTEND_REVALIDATE_URL;
        const revalidateSecret = process.env.REVALIDATE_SECRET;
        if (revalidateUrl && revalidateSecret) {
          try {
            const res = await fetch(revalidateUrl, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                secret: revalidateSecret,
                // `/` is the default homepage; other variants would live at
                // /c/:l1 etc. once A/B testing is wired. Starting with / is
                // enough for the current routes.
                paths: ['/'],
              }),
            });
            if (!res.ok) {
              const text = await res.text();
              req.payload.logger.warn(
                `[Homepages] revalidate webhook ${res.status}: ${text}`,
              );
            } else {
              req.payload.logger.info(
                `[Homepages] Revalidated frontend "/" for "${doc.slug}"`,
              );
            }
          } catch (revErr) {
            req.payload.logger.warn(
              { err: revErr },
              `[Homepages] Failed to call revalidate webhook for "${doc.slug}"`,
            );
          }
        } else {
          req.payload.logger.warn(
            '[Homepages] FRONTEND_REVALIDATE_URL or REVALIDATE_SECRET not set — skipping revalidate',
          );
        }

        return doc;
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        try {
          const { CmsEventPublisher } = await import('../rabbitmq/cms-event.publisher');
          const publisher = CmsEventPublisher.getInstance();
          if (publisher.isConnected()) {
            await publisher.publishWithRoutingKey('homepage.deleted', {
              event: 'homepage.deleted',
              slug: doc.slug,
              id: String(doc.id),
            });
            req.payload.logger.info(`Published homepage.deleted for "${doc.slug}"`);
          }
        } catch (err) {
          req.payload.logger.error({ err }, `Failed to publish homepage.deleted for "${doc.slug}"`);
        }
        return doc;
      },
    ],
  },
  fields: [
    // ── Identity ──
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Internal name for this homepage variant.' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      defaultValue: 'home',
      admin: { description: 'URL slug. Default homepage should use "home".' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Testing', value: 'testing' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Only one homepage can be the default. Used when no variant cookie matches.' },
    },
    {
      name: 'testGroup',
      type: 'text',
      admin: {
        description: 'A/B test group identifier. Matched against mktq_hp_variant cookie.',
        condition: (data: any) => data?.status === 'testing',
      },
    },

    // ── Hero ──
    {
      name: 'hero',
      type: 'group',
      admin: {
        description:
          'Multi-slide hero carousel. Use the "slides" array to add each rotating slide.',
      },
      fields: [
        {
          name: 'intervalMs',
          type: 'number',
          defaultValue: 7000,
          min: 2000,
          max: 30000,
          admin: { description: 'Auto-advance interval in milliseconds (default 7000).' },
        },
        {
          name: 'slides',
          type: 'array',
          minRows: 1,
          admin: { description: 'One entry per rotating hero slide.' },
          fields: [
            { name: 'eyebrow', type: 'text', admin: { description: 'Small label above the title (e.g. "UI / UX Design").' } },
            { name: 'title', type: 'text', required: true },
            { name: 'description', type: 'textarea' },
            { name: 'ctaLabel', type: 'text' },
            { name: 'ctaUrl', type: 'text' },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Slide background image. Editors should upload one per slide. When empty, the `imageUrl` fallback below is used.',
              },
            },
            {
              name: 'imageUrl',
              type: 'text',
              admin: {
                description:
                  'Fallback URL/path used when no Media upload is attached. Useful for local dev and seeding.',
              },
            },
            {
              name: 'accent',
              type: 'text',
              admin: {
                description:
                  'Optional Tailwind gradient fragment (e.g. "from-[#1661F6]/40 via-transparent to-[#0B1C3A]/60").',
              },
            },
          ],
        },
        // ── Legacy single-slide fields (backwards-compat) ──
        { name: 'headline', type: 'text', admin: { description: 'Legacy single-slide fallback. Prefer the slides array above.' } },
        { name: 'subheadline', type: 'textarea' },
        { name: 'backgroundImage', type: 'upload', relationTo: 'media' },
        { name: 'ctaLabel', type: 'text' },
        { name: 'ctaUrl', type: 'text' },
      ],
    },

    // ── Sections ──
    {
      name: 'sections',
      type: 'array',
      admin: { description: 'Ordered list of content sections. Each section becomes a block on the page.' },
      fields: [
        { name: 'key', type: 'text', required: true, admin: { description: 'Unique section identifier.' } },
        { name: 'title', type: 'text', required: true },
        { name: 'subtitle', type: 'textarea' },
        { name: 'ctaLabel', type: 'text' },
        { name: 'ctaUrl', type: 'text' },
        {
          name: 'manualEnabled',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Enable manual pinning. Pinned items appear first, remaining slots filled by evaluator.' },
        },
        {
          name: 'pinnedItems',
          type: 'relationship',
          relationTo: 'listings',
          hasMany: true,
          admin: {
            description: 'Hand-picked listings to pin at the top of this section. Only used when manualEnabled is true.',
            condition: (_data: any, siblingData: any) => siblingData?.manualEnabled === true,
          },
        },
        {
          name: 'tabs',
          type: 'array',
          admin: {
            description:
              'Optional pill tabs. When set, the section emits one block per tab (e.g. Most Popular: View All / Top Web / Top Mobile / ...).',
          },
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true },
            { name: 'categoryFilter', type: 'text' },
            {
              name: 'kind',
              type: 'select',
              options: [
                { label: 'Newest', value: 'newest' },
                { label: 'Top Rated', value: 'top_rated' },
                { label: 'Trending', value: 'trending' },
                { label: 'Most Popular', value: 'most_popular' },
              ],
              admin: { description: 'Optional per-tab ranking override. Leaves the parent block kind otherwise.' },
            },
          ],
        },
        {
          name: 'blocks',
          type: 'array',
          fields: [
            {
              name: 'entity',
              type: 'select',
              required: true,
              options: [
                { label: 'Projects', value: 'projects' },
                { label: 'Services', value: 'services' },
                { label: 'Teams', value: 'teams' },
                { label: 'Talent', value: 'talent' },
              ],
            },
            {
              name: 'displayType',
              type: 'select',
              required: true,
              defaultValue: 'carousel',
              options: [
                { label: 'Carousel', value: 'carousel' },
                { label: 'Grid', value: 'grid' },
              ],
            },
            {
              name: 'limit',
              type: 'number',
              defaultValue: 8,
              min: 1,
              max: 20,
            },
            {
              name: 'kind',
              type: 'select',
              defaultValue: 'newest',
              options: [
                { label: 'Newest', value: 'newest' },
                { label: 'Top Rated', value: 'top_rated' },
                { label: 'Trending', value: 'trending' },
                { label: 'Most Popular', value: 'most_popular' },
              ],
              admin: { description: 'Ranking algorithm. Evaluator integration required for top_rated/trending/most_popular.' },
            },
            {
              name: 'sort',
              type: 'select',
              defaultValue: 'newest',
              options: [
                { label: 'Newest', value: 'newest' },
                { label: 'Random', value: 'random' },
              ],
              admin: { description: 'Display order within the block (after kind ranking).' },
            },
            { name: 'categoryFilter', type: 'text', admin: { description: 'Optional category slug to filter by.' } },
            {
              name: 'featuredOnly',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description:
                  'Editorial curation: restrict the pool to listings with the "featured" admin flag set to true. Used by "Our Favorite Projects".',
              },
            },
          ],
        },
      ],
    },

    // ── Popular Tabs ──
    {
      name: 'popularTabs',
      type: 'array',
      admin: { description: 'Category tabs shown above the "Most Popular" section.' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'iconUrl', type: 'text' },
      ],
    },

    // ── More Categories ──
    {
      name: 'moreCategoriesList',
      type: 'array',
      admin: { description: 'Category tiles in the "More Categories" grid.' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'iconUrl', type: 'text' },
      ],
    },

    // ── Talent Network CTA ──
    {
      name: 'talentNetworkCta',
      type: 'group',
      fields: [
        { name: 'headline', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'ctaLabel', type: 'text' },
        { name: 'ctaUrl', type: 'text' },
      ],
    },

    // ── Footer Navigation ──
    {
      name: 'footerNav',
      type: 'array',
      admin: { description: 'Footer navigation columns.' },
      fields: [
        { name: 'heading', type: 'text', required: true },
        {
          name: 'links',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'url', type: 'text', required: true },
          ],
        },
      ],
    },

    // ── SEO ──
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea', maxLength: 300 },
        { name: 'canonical', type: 'text' },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
        { name: 'noindex', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
};
