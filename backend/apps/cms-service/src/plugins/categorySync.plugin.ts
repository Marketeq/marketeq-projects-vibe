import { Plugin } from 'payload/config';

/**
 * CategorySync plugin — adds a reconciliation endpoint.
 * Uses dynamic imports to avoid bundling server-only deps (amqplib) into the admin panel.
 */
export const categorySyncPlugin: Plugin = (incomingConfig) => {
  const config = { ...incomingConfig };

  const existingEndpoints = config.endpoints || [];

  config.endpoints = [
    ...existingEndpoints,
    {
      path: '/api/cms/reconcile-categories',
      method: 'post',
      handler: async (req: any, res: any) => {
        try {
          const apiKey = req.headers['authorization']?.replace('API-Key ', '');
          if (apiKey !== process.env.CMS_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          // Dynamic import to keep amqplib out of the webpack admin bundle
          const { CmsEventPublisher } = await import('../rabbitmq/cms-event.publisher');
          const publisher = CmsEventPublisher.getInstance();

          if (!publisher.isConnected()) {
            return res.status(503).json({ error: 'RabbitMQ not connected' });
          }

          const { payload } = req;
          const categories = await payload.find({
            collection: 'categories',
            limit: 10000,
            depth: 1,
          });

          let published = 0;
          for (const cat of categories.docs) {
            const parentId = typeof cat.parent === 'object'
              ? (cat.parent as any)?.id
              : cat.parent;

            await publisher.publishCategorySaved({
              id: String(cat.id),
              name: cat.name as string,
              slug: cat.slug as string,
              status: (cat.status as 'active' | 'inactive') || 'active',
              parent: parentId ? String(parentId) : null,
              listingTypes: (cat.listingTypes as string[]) || [],
              sortOrder: cat.sortOrder as number | undefined,
              algoliaFacetOrder: cat.algoliaFacetOrder as number | undefined,
            });
            published++;
          }

          return res.json({
            status: 'ok',
            totalCategories: categories.totalDocs,
            published,
          });
        } catch (err: any) {
          return res.status(500).json({ error: err.message });
        }
      },
    },
  ];

  return config;
};
