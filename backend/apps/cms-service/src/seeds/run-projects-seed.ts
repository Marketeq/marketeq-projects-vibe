// apps/cms-service/src/seeds/run-projects-seed.ts
//
// Standalone seed runner for Payload project fixtures.
// Run from the cms-service root:
//   npm run seed:projects
//
// Pre-condition: PAYLOAD_SECRET + DATABASE_URL must be set in .env
// Pre-condition: listings-service must be reachable at LISTINGS_SERVICE_URL
//                so the afterChange sync hook can push each project into
//                public.projects. (The hook logs a warning and skips if
//                unreachable — the CMS rows will still be created.)
//
// Initializes Payload locally (without the Express server), creates each
// fixture project via payload.create(), then overlays homepage scoring
// signals on public.projects and exits. Idempotent.

import 'dotenv/config';
import payload from 'payload';
import { seedProjects } from './projects.seed';

async function main() {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) {
    throw new Error('PAYLOAD_SECRET environment variable is required');
  }

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info('Payload CMS initialized (projects seed runner)');
    },
  });

  await seedProjects(payload);

  payload.logger.info('Projects seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Projects seed failed:', err);
  process.exit(1);
});
