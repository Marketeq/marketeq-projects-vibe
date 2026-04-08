import { Plugin } from 'payload/config';
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

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
          const configuredKey = process.env.CMS_API_KEY;
          if (!configuredKey) {
            return res.status(500).json({ error: 'CMS_API_KEY not configured' });
          }
          const match = (req.headers['authorization'] ?? '').match(/^API-Key\s+(.+)$/);
          const apiKey = match?.[1];
          if (!apiKey || !safeCompare(apiKey, configuredKey)) {
            req.payload?.logger?.warn('Unauthorized reconcile-categories attempt');
            return res.status(401).json({ error: 'Unauthorized' });
          }

          // Dynamic import to keep amqplib out of the webpack admin bundle
          const { CmsEventPublisher } = await import('../rabbitmq/cms-event.publisher');
          const publisher = CmsEventPublisher.getInstance();

          if (!publisher.isConnected()) {
            return res.status(503).json({ error: 'RabbitMQ not connected' });
          }

          const { payload } = req;
          let page = 1;
          let published = 0;
          let totalDocs = 0;
          let hasNextPage = true;
          const PAGE_SIZE = 100;
          const MAX_PAGES = 500;

          while (hasNextPage && page <= MAX_PAGES) {
            const categories = await payload.find({
              collection: 'categories',
              limit: PAGE_SIZE,
              page,
              depth: 1,
            });

            totalDocs = categories.totalDocs;

            for (const cat of categories.docs) {
              const parentUuid = typeof cat.parent === 'object'
                ? (cat.parent as any)?.uuid
                : null;

              await publisher.publishCategorySaved({
                id: (cat as any).uuid || String(cat.id),
                name: cat.name as string,
                slug: cat.slug as string,
                status: (cat.status as 'active' | 'inactive') || 'active',
                parent: parentUuid || null,
                listingTypes: (cat.listingTypes as string[]) || [],
                sortOrder: cat.sortOrder as number | undefined,
                algoliaFacetOrder: cat.algoliaFacetOrder as number | undefined,
              });
              published++;
            }

            hasNextPage = categories.hasNextPage;
            page++;
          }

          return res.json({
            status: 'ok',
            totalCategories: totalDocs,
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
