import { CollectionAfterChangeHook } from 'payload/types';

export const syncTeamListing: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (req.context?.skipSync) return doc;

  const sourceId = doc.sourceId;
  if (!sourceId) {
    req.payload.logger.debug(`[syncTeamListing] No sourceId for "${doc.title}" — skipping`);
    return doc;
  }

  const serviceUrl = process.env.LISTINGS_SERVICE_URL || 'http://localhost:3002';
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  if (!token) {
    req.payload.logger.warn('[syncTeamListing] INTERNAL_SERVICE_TOKEN not set — skipping sync');
    return doc;
  }

  try {
    const res = await fetch(
      `${serviceUrl.replace(/\/$/, '')}/internal/teams/${encodeURIComponent(sourceId)}/cms-sync`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-token': token },
        body: JSON.stringify({
          title: doc.title,
          slug: doc.slug,
          status: doc.status,
          featured: doc.featured,
          editorialLabel: doc.editorialLabel,
          excerpt: doc.excerpt,
        }),
      },
    );
    if (!res.ok) {
      req.payload.logger.error(`[syncTeamListing] ${res.status}: ${await res.text()}`);
    } else {
      req.payload.logger.info(`[syncTeamListing] Synced "${doc.title}" (${operation})`);
    }
  } catch (err) {
    req.payload.logger.error({ err }, `[syncTeamListing] Failed to sync "${doc.title}"`);
  }

  return doc;
};
