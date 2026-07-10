// apps/cms-service/src/seeds/run-homepage-seed.ts
//
// Standalone seed runner for the default Payload "home" document.
// Run from the cms-service root:
//   npm run seed:homepage
//
// Pre-condition: PAYLOAD_SECRET + DATABASE_URL must be set in .env
//
// Initializes Payload locally (without the Express server), runs the seed,
// then exits. Idempotent: skips if a `home` document already exists.

import 'dotenv/config';
import payload from 'payload';
import { seedDefaultHomepage } from './homepage.seed';
import { seedMvpTalentHomepage } from './homepage-mvp-talent.seed';

async function main() {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) {
    throw new Error('PAYLOAD_SECRET environment variable is required');
  }

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info('Payload CMS initialized (seed runner)');
    },
  });

  await seedDefaultHomepage(payload);
  await seedMvpTalentHomepage(payload);

  payload.logger.info('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Homepage seed failed:', err);
  process.exit(1);
});
