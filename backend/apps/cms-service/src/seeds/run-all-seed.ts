import payload from "payload";
import dotenv from "dotenv";

import { seedAll } from "./all.seed";

dotenv.config();

async function run(): Promise<void> {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || "dev-secret",
    local: true,
  });

  await seedAll(payload);
  payload.logger.info("✅ Seeded all CMS collections");
  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

