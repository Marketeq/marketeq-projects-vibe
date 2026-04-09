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
      admin: { description: 'Hero banner at the top of the homepage.' },
      fields: [
        { name: 'headline', type: 'text', required: true },
        { name: 'subheadline', type: 'textarea' },
        {
          name: 'backgroundImage',
          type: 'upload',
          relationTo: 'media',
        },
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
            condition: (data: any, siblingData: any) => siblingData?.manualEnabled === true,
          },
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
