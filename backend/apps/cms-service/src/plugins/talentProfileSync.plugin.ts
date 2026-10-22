import { Plugin } from 'payload/config';
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * TalentProfileSync plugin — adds a reconciliation endpoint.
 * Uses dynamic imports to avoid bundling server-only deps (amqplib) into the admin panel.
 */
export const talentProfileSyncPlugin: Plugin = (incomingConfig) => {
  const config = { ...incomingConfig };
  const existingEndpoints = config.endpoints || [];

  config.endpoints = [
    ...existingEndpoints,
    {
      path: '/cms/reconcile-talent-profiles',
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
            req.payload?.logger?.warn('Unauthorized reconcile-talent-profiles attempt');
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const { CmsEventPublisher } = await import('../rabbitmq/cms-event.publisher');
          const { mapProfileToEvent } = await import('../mappers/talentProfile.mapper');
          const publisher = CmsEventPublisher.getInstance();

          if (!publisher.isConnected()) {
            return res.status(503).json({ error: 'RabbitMQ not connected' });
          }

          const { payload } = req;
          let page = 1;
          let published = 0;
          let failed = 0;
          let totalDocs = 0;
          let hasNextPage = true;
          const PAGE_SIZE = 100;
          const MAX_PAGES = 500;

          while (hasNextPage && page <= MAX_PAGES) {
            const profiles = await payload.find({
              collection: 'talent-profiles',
              limit: PAGE_SIZE,
              page,
              depth: 1,
            });

            totalDocs = profiles.totalDocs;

            for (const profile of profiles.docs) {
              try {
                await publisher.publishTalentProfileSaved(mapProfileToEvent(profile));
                published++;
              } catch (err: any) {
                failed++;
                payload.logger.error(
                  { err },
                  `Reconcile: failed to publish talent profile "${(profile as any).username}"`,
                );
              }
            }

            hasNextPage = profiles.hasNextPage;
            page++;
          }

          return res.json({ status: 'ok', totalProfiles: totalDocs, published, failed });
        } catch (err: any) {
          req.payload?.logger?.error({ err }, 'Reconcile talent profiles failed');
          return res.status(500).json({ error: 'Internal server error' });
        }
      },
    },
  ];

  return config;
};
