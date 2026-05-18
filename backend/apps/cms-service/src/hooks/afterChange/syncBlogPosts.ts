import { CollectionAfterChangeHook } from 'payload/types';
import { CmsEventPublisher } from '../../rabbitmq/cms-event.publisher';

export const syncBlogPost: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (req.context?.skipSync) return doc;

  const publisher = CmsEventPublisher.getInstance();
  if (!publisher.isConnected()) return doc;

  try {
    await publisher.publishBlogPostSaved({
      id: doc.id,
      sourceId: 'cms-service', // Recursion Guard
      slug: doc.slug,
      title: doc.title,
      body: doc.body,
      authorId: typeof doc.author === 'object' ? doc.author?.id : doc.author,
      coverImageUrl: typeof doc.coverImage === 'object' ? doc.coverImage?.url : null,
      status: doc.status,
      publishedAt: doc.publishedAt,
    });
    
    req.payload.logger.info(`Published blog-post.saved for "${doc.slug}"`);
  } catch (err) {
    req.payload.logger.error({ err }, '[syncBlogPost] publish failed');
  }

  return doc;
};
