import { CollectionAfterChangeHook } from 'payload/types';
import { CmsEventPublisher } from '../../rabbitmq/cms-event.publisher';

export const syncTestimonial: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (req.context?.skipSync) return doc;

  const publisher = CmsEventPublisher.getInstance();
  if (!publisher.isConnected()) return doc;

  try {
    await publisher.publishTestimonialSaved({
      id: doc.id,
      sourceId: 'cms-service', // Recursion Guard
      authorName: doc.authorName,
      authorTitle: doc.authorTitle,
      authorCompany: doc.authorCompany,
      avatarUrl: typeof doc.avatar === 'object' ? doc.avatar?.url : null,
      quote: doc.quote,
      rating: doc.rating,
      featured: doc.featured,
      status: doc.status,
    });
    
    req.payload.logger.info(`Published testimonial.saved for "${doc.authorName}"`);
  } catch (err) {
    req.payload.logger.error({ err }, '[syncTestimonial] publish failed');
  }

  return doc;
};
