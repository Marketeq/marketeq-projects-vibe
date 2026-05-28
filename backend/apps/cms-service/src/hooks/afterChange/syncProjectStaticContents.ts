import { CollectionAfterChangeHook } from 'payload/types';
import { CmsEventPublisher } from '../../rabbitmq/cms-event.publisher';

/**
 * Payload ProjectStaticContents → listings-service sync.
 * 
 * Publishes `cms.project-static-content.saved` to RMQ so the listings-service
 * can store a local copy of the guarantee blocks, policy links, and 
 * How It Works steps shown on the project details page.
 */
export const syncProjectStaticContent: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (req.context?.skipSync) return doc;

  const publisher = CmsEventPublisher.getInstance();
  if (!publisher.isConnected()) {
    req.payload.logger.warn(
      `[syncProjectStaticContent] publisher not connected — skipping ${doc.id}`,
    );
    return doc;
  }

  try {
    await publisher.publishProjectStaticContentSaved({
      id: doc.id,
      sourceId: 'cms-service', // Recursion Guard
      slug: doc.slug,
      heading: doc.heading,
      guaranteeItems: doc.guaranteeItems || [],
      highlightedNotice: doc.highlightedNotice,
      policy: doc.policy,
      howItWorks: doc.howItWorks,
    });
    
    req.payload.logger.info(
      `Published project-static-content.saved for "${doc.slug}" (${operation})`,
    );
  } catch (err) {
    req.payload.logger.error(
      { err, id: doc.id },
      '[syncProjectStaticContent] publish failed',
    );
  }

  return doc;
};
