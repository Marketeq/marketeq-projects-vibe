import 'dotenv/config';
import payload from 'payload';
import { seedBlogPosts } from './blog-posts.seed';

async function main() {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) {
    throw new Error('PAYLOAD_SECRET environment variable is required');
  }

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info('Payload CMS initialized (blog posts seed runner)');
    },
  });

  await seedBlogPosts(payload);

  payload.logger.info('Blog post seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Blog post seed failed:', err);
  process.exit(1);
});
