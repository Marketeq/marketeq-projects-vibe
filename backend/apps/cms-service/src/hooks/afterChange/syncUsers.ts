import { CollectionAfterChangeHook } from 'payload/types';

/**
 * Payload Users → user-service sync.
 * 
 * Propagates changes made in the CMS admin panel back to the user-service
 * database. This includes name, email, userType, and status.
 */
export const syncUserToService: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  // skipSync context prevents infinite loops if the change originated from a sync
  if (req.context?.skipSync) {
    return doc;
  }

  // We only sync if we have a sourceId (the UUID in user-service)
  const sourceId = doc.sourceId;
  if (!sourceId) {
    req.payload.logger.debug(`[syncUserToService] No sourceId for user "${doc.email}" — skipping sync`);
    return doc;
  }

  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!internalToken) {
    req.payload.logger.warn('[syncUserToService] INTERNAL_SERVICE_TOKEN not set — skipping sync');
    return doc;
  }

  try {
    const nameParts = (doc.name || '').trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const payload = {
      email: doc.email,
      firstName,
      lastName,
      userType: doc.userType?.toUpperCase(), // client -> CLIENT
      isActive: doc.status === 'active',
    };

    const url = `${userServiceUrl.replace(/\/$/, '')}/internal/users/${encodeURIComponent(sourceId)}/cms-sync`;
    
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
      req.payload.logger.error(`[syncUserToService] ${res.status} from user-service: ${text}`);
    } else {
      req.payload.logger.info(`[syncUserToService] Synced user "${doc.email}" (${operation}) → user-service`);
    }
  } catch (err) {
    req.payload.logger.error({ err }, `[syncUserToService] Failed to sync user "${doc.email}" to user-service`);
  }

  return doc;
};
