import { CollectionAfterChangeHook } from 'payload/types';

/**
 * Payload Orders → contracts-service sync.
 * 
 * Propagates changes made in the CMS admin panel (notes, status, etc.)
 * back to the contracts-service database.
 */
export const syncOrderToService: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (req.context?.skipSync) return doc;

  const sourceId = doc.sourceId;
  if (!sourceId) {
    req.payload.logger.debug(`[syncOrderToService] No sourceId for order "${doc.id}" — skipping sync`);
    return doc;
  }

  const contractsUrl = process.env.CONTRACTS_SERVICE_URL || 'http://localhost:3004';
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!internalToken) {
    req.payload.logger.warn('[syncOrderToService] INTERNAL_SERVICE_TOKEN not set — skipping sync');
    return doc;
  }

  try {
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'active': 'active',
      'completed': 'ended',
      'cancelled': 'canceled',
    };

    const payload = {
      status: statusMap[doc.status] || doc.status,
      note: doc.notes,
    };

    const url = `${contractsUrl.replace(/\/$/, '')}/contracts/${encodeURIComponent(sourceId)}/cms-sync`;
    
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
      req.payload.logger.error(`[syncOrderToService] ${res.status} from contracts-service: ${text}`);
    } else {
      req.payload.logger.info(`[syncOrderToService] Synced order "${doc.id}" (${operation}) → contracts-service`);
    }
  } catch (err) {
    req.payload.logger.error({ err }, `[syncOrderToService] Failed to sync order "${doc.id}" to contracts-service`);
  }

  return doc;
};
