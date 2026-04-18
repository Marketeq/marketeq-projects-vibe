import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload/types';
import { CmsEventPublisher } from '../../rabbitmq/cms-event.publisher';

interface AnnouncementDoc {
  id: number | string;
  title: string;
  message?: unknown;
  audience?: 'all' | 'clients' | 'talent' | 'admins' | null;
  startDate?: string | null;
  endDate?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  priority?: number | null;
  status: 'draft' | 'published' | 'archived';
}

/**
 * Publish `announcement.published` to RMQ when a published announcement is
 * created or transitions to status=published. Drafts and archived rows do
 * NOT broadcast — consumers (notification-service Ably fan-out, future
 * banner services) only act on live announcements per CS-07 §lines 220-228
 * and Notifications Service §02 (admin.broadcast trigger).
 *
 * Status transitions out of `published` (→ draft / archived) emit the
 * `announcement.deleted` routing key so consumers can recall their cached
 * banners. afterDelete fires the same event for hard deletes.
 */
export const syncAnnouncementToBroadcast: CollectionAfterChangeHook<AnnouncementDoc> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const wasPublished = previousDoc?.status === 'published';
  const isPublished = doc.status === 'published';
  const publisher = CmsEventPublisher.getInstance();
  if (!publisher.isConnected()) {
    req.payload.logger.warn(
      `[syncAnnouncementToBroadcast] publisher not connected — skipping ${doc.id}`,
    );
    return doc;
  }

  try {
    if (isPublished) {
      await publisher.publishAnnouncementPublished({
        id: doc.id,
        title: doc.title,
        message: doc.message ?? null,
        audience: doc.audience ?? null,
        startDate: (doc.startDate as string | null) ?? null,
        endDate: (doc.endDate as string | null) ?? null,
        ctaLabel: doc.ctaLabel ?? null,
        ctaUrl: doc.ctaUrl ?? null,
        priority: doc.priority ?? 0,
        status: doc.status,
      });
      req.payload.logger.info(
        `Published announcement.published for "${doc.title}" (${operation})`,
      );
    } else if (wasPublished && !isPublished) {
      // Status transitioned out of published — recall the broadcast.
      await publisher.publishAnnouncementDeleted({ id: doc.id });
      req.payload.logger.info(
        `Published announcement.deleted for "${doc.title}" (status → ${doc.status})`,
      );
    }
  } catch (err) {
    req.payload.logger.error(
      { err, id: doc.id },
      '[syncAnnouncementToBroadcast] publish failed',
    );
  }
  return doc;
};

export const deleteAnnouncementFromBroadcast: CollectionAfterDeleteHook<AnnouncementDoc> = async ({
  doc,
  req,
}) => {
  const publisher = CmsEventPublisher.getInstance();
  if (!publisher.isConnected()) return;
  try {
    await publisher.publishAnnouncementDeleted({ id: doc.id });
    req.payload.logger.info(`Published announcement.deleted for "${doc.title}" (delete)`);
  } catch (err) {
    req.payload.logger.error(
      { err, id: doc.id },
      '[deleteAnnouncementFromBroadcast] publish failed',
    );
  }
};
