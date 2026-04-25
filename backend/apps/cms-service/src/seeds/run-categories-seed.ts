import payload from "payload";
import dotenv from "dotenv";

import { seedCategories } from "./categories.seed";

dotenv.config();

async function run(): Promise<void> {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || "dev-secret",
    local: true,
  });

  await seedCategories(payload);
  payload.logger.info("✅ Seeded categories");
  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

