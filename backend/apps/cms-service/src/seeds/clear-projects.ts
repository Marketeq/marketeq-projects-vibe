import type { Payload } from "payload";
import {
  FEATURED_PROJECTS,
  NEWEST_PROJECTS,
  POPULAR_TAB_PROJECTS,
  THEMED_PROJECTS,
} from "./homepage-fixtures";

const SEED_OWNER_ID = "00000000-0000-0000-0000-000000000000";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const FIXTURE_SLUGS = Array.from(
  new Set(
    [...FEATURED_PROJECTS, ...NEWEST_PROJECTS, ...POPULAR_TAB_PROJECTS, ...THEMED_PROJECTS].map(
      (p) => slugify(p.title),
    ),
  ),
);

/**
 * Clear all seeded projects from Payload so `seed:projects` can be re-run.
 *
 * Heuristic: delete projects whose slug matches our fixture dataset, which
 * always includes `modern-brand-identity-system`. This keeps the tool simple
 * and avoids depending on a dedicated seed marker field inside the collection.
 */
export async function clearSeededProjects(payload: Payload): Promise<number> {
  // If the canonical fixture doesn't exist for the seed owner, treat as already-cleared.
  const canonical = await payload.find({
    collection: "projects",
    where: {
      and: [
        { slug: { equals: "modern-brand-identity-system" } },
        { ownerId: { equals: SEED_OWNER_ID } },
      ],
    } as any,
    limit: 1,
    overrideAccess: true,
  });

  if (!canonical.totalDocs) {
    payload.logger.info("clear-projects: no fixture projects found — skipping");
    return 0;
  }

  let deleted = 0;
  while (true) {
    const res = await payload.find({
      collection: "projects",
      where: {
        and: [
          { slug: { in: FIXTURE_SLUGS } },
          { ownerId: { equals: SEED_OWNER_ID } },
        ],
      } as any,
      limit: 100,
      pagination: true,
      overrideAccess: true,
      depth: 0,
      sort: "-createdAt",
    });

    if (!res?.docs?.length) break;

    for (const doc of res.docs as Array<{ id: string | number; slug?: string }>) {
      // Only delete items that look like seed fixtures: they always have a slug.
      if (!doc?.id || typeof doc.slug !== "string" || !doc.slug.trim()) continue;
      await payload.delete({
        collection: "projects",
        id: doc.id as any,
        overrideAccess: true,
      });
      deleted += 1;
    }
  }

  payload.logger.info(`clear-projects: deleted ${deleted} project(s)`);
  return deleted;
}
