import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload/types';

/**
 * After a talent profile is created or updated, publish a `talent-profile.saved`
 * event to RabbitMQ so user-service can update its local copy.
 * Uses dynamic import to avoid bundling amqplib into the admin webpack build.
 */
export const syncTalentProfileToService: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  try {
    const { CmsEventPublisher } = await import('../../rabbitmq/cms-event.publisher');
    const { mapProfileToEvent } = await import('../../mappers/talentProfile.mapper');
    const publisher = CmsEventPublisher.getInstance();
    if (!publisher.isConnected()) {
      req.payload.logger.warn('RabbitMQ not connected — skipping talent profile sync');
      return doc;
    }

    await publisher.publishTalentProfileSaved(mapProfileToEvent(doc));

    req.payload.logger.info(
      `Published talent-profile.saved for "${doc.username}" (${operation})`,
    );
  } catch (err) {
    req.payload.logger.error({ err }, `Failed to publish talent-profile.saved for "${doc.username}"`);
  }

  return doc;
};

/**
 * After a talent profile is deleted, publish a `talent-profile.deleted` event.
 */
export const deleteTalentProfileFromService: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  try {
    const { CmsEventPublisher } = await import('../../rabbitmq/cms-event.publisher');
    const publisher = CmsEventPublisher.getInstance();
    if (!publisher.isConnected()) {
      req.payload.logger.warn('RabbitMQ not connected — skipping talent profile delete sync');
      return doc;
    }

    await publisher.publishTalentProfileDeleted({
      id: doc.uuid || String(doc.id),
      username: doc.username,
    });

    req.payload.logger.info(`Published talent-profile.deleted for "${doc.username}"`);
  } catch (err) {
    req.payload.logger.error({ err }, `Failed to publish talent-profile.deleted for "${doc.username}"`);
  }

  return doc;
};
