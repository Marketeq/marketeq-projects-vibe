import { CollectionAfterChangeHook } from 'payload/types';

/**
 * Payload Listings → listings-service sync.
 * 
 * Propagates editorial changes (title, status, featured, etc.) back to
 * the authoritative record in listings-service.
 */
export const syncListingToService: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (req.context?.skipSync) return doc;

  const sourceId = doc.sourceId;
  if (!sourceId) {
    req.payload.logger.debug(`[syncListingToService] No sourceId for listing "${doc.title}" — skipping sync`);
    return doc;
  }

  const listingsUrl = process.env.LISTINGS_SERVICE_URL || 'http://localhost:3002';
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!internalToken) {
    req.payload.logger.warn('[syncListingToService] INTERNAL_SERVICE_TOKEN not set — skipping sync');
    return doc;
  }

  try {
    const payload = {
      title: doc.title,
      slug: doc.slug,
      status: doc.status,
      featured: doc.featured,
      listingType: doc.listingType,
      excerpt: doc.excerpt,
    };

    const url = `${listingsUrl.replace(/\/$/, '')}/internal/listings/${encodeURIComponent(sourceId)}/cms-sync`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': internalToken,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      req.payload.logger.error(`[syncListingToService] ${res.status} from listings-service: ${text}`);
    } else {
      req.payload.logger.info(`[syncListingToService] Synced listing "${doc.title}" (${operation}) → listings-service`);
    }
  } catch (err) {
    req.payload.logger.error({ err }, `[syncListingToService] Failed to sync listing "${doc.title}" to listings-service`);
  }

  return doc;
};
