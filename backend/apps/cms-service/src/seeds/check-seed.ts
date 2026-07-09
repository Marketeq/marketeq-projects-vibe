import payload from "payload";
import dotenv from "dotenv";

dotenv.config();

async function run(): Promise<void> {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || "dev-secret",
    local: true,
  });

  const collections = [
    "categories",
    "projects",
    "media",
    "announcements",
    "testimonials",
    "landing-pages",
    "blog-posts",
    "help-articles",
    "homepages",
    "listings",
    "project-static-contents",
    "category-pages",
    "talent-profiles",
    "feature-flags",
    "orders",
  ] as const;

  for (const c of collections) {
    const res = await payload.find({ collection: c as any, limit: 1, overrideAccess: true });
    payload.logger.info(`[seed-check] ${c}: totalDocs=${res.totalDocs}`);
  }

  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

