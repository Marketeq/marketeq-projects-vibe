import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload/types';

/**
 * After a category is created or updated, publish a `category.saved` event
 * to RabbitMQ so category-service can update its cache.
 * Uses dynamic import to avoid bundling amqplib into the admin webpack build.
 */
export const syncCategoryToService: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  try {
    const { CmsEventPublisher } = await import('../../rabbitmq/cms-event.publisher');
    const publisher = CmsEventPublisher.getInstance();
    if (!publisher.isConnected()) {
      req.payload.logger.warn('RabbitMQ not connected — skipping category sync');
      return doc;
    }

    let parentUuid: string | null = null;
    if (doc.parent) {
      if (typeof doc.parent === 'object') {
        parentUuid = doc.parent?.uuid || null;
      } else {
        // parent is a Payload ID (number) — look up the uuid
        try {
          const parentDoc = await req.payload.findByID({
            collection: 'categories', id: doc.parent, depth: 0,
          });
          parentUuid = (parentDoc as any)?.uuid || null;
        } catch { /* parent may have been deleted concurrently */ }
      }
    }

    await publisher.publishCategorySaved({
      id: doc.uuid || String(doc.id),
      name: doc.name,
      slug: doc.slug,
      status: doc.status || 'active',
      parent: parentUuid || null,
      listingTypes: doc.listingTypes || [],
      sortOrder: doc.sortOrder,
      algoliaFacetOrder: doc.algoliaFacetOrder,
    });

    req.payload.logger.info(
      `Published category.saved for "${doc.slug}" (${operation})`,
    );
  } catch (err) {
    req.payload.logger.error({ err }, `Failed to publish category.saved for "${doc.slug}"`);
  }

  return doc;
};

/**
 * After a category is deleted, publish a `category.deleted` event.
 */
export const deleteCategoryFromService: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  try {
    const { CmsEventPublisher } = await import('../../rabbitmq/cms-event.publisher');
    const publisher = CmsEventPublisher.getInstance();
    if (!publisher.isConnected()) {
      req.payload.logger.warn('RabbitMQ not connected — skipping category delete sync');
      return doc;
    }

    await publisher.publishCategoryDeleted({
      id: doc.uuid || String(doc.id),
      slug: doc.slug,
    });

    req.payload.logger.info(`Published category.deleted for "${doc.slug}"`);
  } catch (err) {
    req.payload.logger.error({ err }, `Failed to publish category.deleted for "${doc.slug}"`);
  }

  return doc;
};
