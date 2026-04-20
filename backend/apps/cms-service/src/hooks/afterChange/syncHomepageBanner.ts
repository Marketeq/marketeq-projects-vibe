import type { GlobalAfterChangeHook } from 'payload/types';
import { CmsEventPublisher } from '../../rabbitmq/cms-event.publisher';

interface HomepageBannerDoc {
  enabled?: boolean;
  message?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  expiresAt?: string | null;
  bannerType?: 'info' | 'promo' | 'warning' | null;
}

/**
 * Publish `homepage-banner.saved` to RMQ on every save so the
 * api-gateway HomepageConsumer can flush its hp:home:* Redis cache and
 * the next /homepage request rebuilds with the fresh banner. Without
 * this hook the banner update only surfaces after the 300 s cache TTL
 * (Cache Strategy §6 documented limitation).
 */
export const syncHomepageBannerToBroadcast: GlobalAfterChangeHook<HomepageBannerDoc> = async ({
  doc,
  req,
}) => {
  const publisher = CmsEventPublisher.getInstance();
  if (!publisher.isConnected()) {
    req.payload.logger.warn('[syncHomepageBannerToBroadcast] publisher not connected — skipping');
    return doc;
  }
  try {
    await publisher.publishHomepageBannerSaved({
      enabled: doc.enabled ?? false,
      message: doc.message ?? null,
      ctaLabel: doc.ctaLabel ?? null,
      ctaUrl: doc.ctaUrl ?? null,
      expiresAt: (doc.expiresAt as string | null) ?? null,
      bannerType: doc.bannerType ?? null,
    });
    req.payload.logger.info('Published homepage-banner.saved');
  } catch (err) {
    req.payload.logger.error({ err }, '[syncHomepageBannerToBroadcast] publish failed');
  }
  return doc;
};
