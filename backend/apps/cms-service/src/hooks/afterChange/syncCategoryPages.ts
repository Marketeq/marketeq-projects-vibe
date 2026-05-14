import { CollectionAfterChangeHook } from 'payload/types';
import { CmsEventPublisher } from '../../rabbitmq/cms-event.publisher';

/**
 * Payload CategoryPages → category-service sync.
 * 
 * Publishes `category-page.saved` to RMQ so the category-service
 * can project editorial content (hero overrides, FAQ, intro text) 
 * onto its local category nodes.
 */
export const syncCategoryPage: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (req.context?.skipSync) return doc;

  const publisher = CmsEventPublisher.getInstance();
  if (!publisher.isConnected()) {
    req.payload.logger.warn(
      `[syncCategoryPage] publisher not connected — skipping ${doc.id}`,
    );
    return doc;
  }

  try {
    const hero = doc.heroBanner
      ? {
          title: doc.heroBanner.title ?? null,
          subtitle: doc.heroBanner.subtitle ?? null,
          // image is a Payload upload relation — resolved to { url } at depth 1
          imageUrl: doc.heroBanner.image?.url ?? null,
        }
      : null;

    await publisher.publishCategoryPageSaved({
      id: doc.id,
      sourceId: 'cms-service', // Recursion Guard
      categoryId: doc.categoryRef?.categoryId,
      path: doc.path,
      displayTitle: doc.displayTitle,
      level: doc.level,
      heroBanner: hero,
      intro: doc.intro,
      faq: doc.faq || [],
      featured: doc.featured || false,
    });
    
    req.payload.logger.info(
      `Published category-page.saved for path "${doc.path}" (${operation})`,
    );
  } catch (err) {
    req.payload.logger.error(
      { err, id: doc.id },
      '[syncCategoryPage] publish failed',
    );
  }

  return doc;
};
