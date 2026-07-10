import type { Payload } from "payload";
import crypto from "crypto";

import { seedCategories } from "./categories.seed";
import { seedProjects } from "./projects.seed";
import { seedDefaultHomepage } from "./homepage.seed";
import { seedMvpTalentHomepage } from "./homepage-mvp-talent.seed";
import { seedTalentProfiles } from "./talent-profiles.seed";
import { seedCategoryPages } from "./category-pages.seed";
import { lexicalText, upsertPlaceholderMedia } from "./seed-utils";

function uuid(): string {
  return crypto.randomUUID();
}

async function upsertByWhere(
  payload: Payload,
  collection: any,
  where: any,
  data: any,
): Promise<void> {
  const existing = await payload.find({
    collection,
    where,
    limit: 1,
    overrideAccess: true,
  });
  if (existing.totalDocs > 0) {
    await payload.update({
      collection,
      id: existing.docs[0].id as any,
      data,
      overrideAccess: true,
    });
    return;
  }
  await payload.create({
    collection,
    data,
    overrideAccess: true,
    disableVerificationEmail: true,
  });
}

async function ensureUser(payload: Payload): Promise<number | null> {
  const users = await payload.find({
    collection: "users",
    limit: 1,
    overrideAccess: true,
  });
  if (users.totalDocs > 0) return users.docs[0].id as number;

  // Users collection is auth-enabled => requires email/password.
  const created = await payload.create({
    collection: "users",
    data: {
      name: "Seed Admin",
      email: "seed-admin@marketeq.local",
      password: "seed-admin-password",
      userType: "admin",
      role: "developer",
      status: "active",
    } as any,
    overrideAccess: true,
    disableVerificationEmail: true,
  });
  return created.id as number;
}

export async function seedAll(payload: Payload): Promise<void> {
  const placeholderMediaId = await upsertPlaceholderMedia(payload);
  const userId = await ensureUser(payload);

  await seedCategories(payload);
  await seedDefaultHomepage(payload);
  await seedMvpTalentHomepage(payload);
  await seedProjects(payload);

  console.log("Seeding category pages...");
  await seedCategoryPages(payload);

  // Feature Flags
  for (const ff of [
    {
      key: "projects.enabled",
      enabled: true,
      rolloutPercentage: 100,
      description: "Show projects marketplace.",
    },
    {
      key: "deliverables.ai.enabled",
      enabled: true,
      rolloutPercentage: 100,
      description: "Enable deliverables generator button.",
    },
    {
      key: "cms.seeded",
      enabled: true,
      rolloutPercentage: 100,
      description: "Marker flag for local seed runs.",
    },
  ]) {
    const existing = await payload.find({
      collection: "feature-flags",
      where: { key: { equals: ff.key } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.totalDocs > 0) {
      await payload.update({
        collection: "feature-flags",
        id: existing.docs[0].id as any,
        data: ff as any,
        overrideAccess: true,
      });
    } else {
      await payload.create({
        collection: "feature-flags",
        data: ff as any,
        overrideAccess: true,
        disableVerificationEmail: true,
      });
    }
  }

  // Announcements (published banner)
  await upsertByWhere(
    payload,
    "announcements",
    { title: { equals: "Welcome to Marketeq (local)" } },
    {
      title: "Welcome to Marketeq (local)",
      message: lexicalText(
        "This environment is seeded with sample content for CMS + marketplace testing.",
      ) as any,
      audience: "all",
      priority: 10,
      status: "published",
    },
  );

  // Testimonials
  const testimonialAuthors = ["Ava Johnson", "Noah Chen", "Sophia Martinez"];
  for (const [i, name] of testimonialAuthors.entries()) {
    await upsertByWhere(
      payload,
      "testimonials",
      { authorName: { equals: name } },
      {
        authorName: name,
        authorCompany: "Acme Co.",
        rating: 5,
        featured: i === 0,
        status: "published",
        quote: "High quality work, fast communication, and a clean handoff.",
        avatar: placeholderMediaId,
      },
    );
  }

  // Landing page
  await upsertByWhere(
    payload,
    "landing-pages",
    { slug: { equals: "seed-landing" } },
    {
      title: "Hire a team to ship faster",
      slug: "seed-landing",
      status: "published",
      hero: {
        headline: "Launch in weeks, not months",
        subheadline: "Browse proven teams and fixed-scope projects.",
        ctaLabel: "Explore projects",
        ctaUrl: "/projects",
      },
      sections: [],
    },
  );

  // Blog + Help (published)
  await upsertByWhere(
    payload,
    "blog-posts",
    { slug: { equals: "seed-blog-post" } },
    {
      title: "How Marketeq projects work",
      slug: "seed-blog-post",
      status: "published",
      publishedAt: new Date().toISOString(),
      author: userId,
      coverImage: placeholderMediaId,
      body: lexicalText(
        "This is seeded content. Replace with real editorial copy.",
      ) as any,
      tags: [{ tag: "platform" }, { tag: "projects" }],
    },
  );

  await upsertByWhere(
    payload,
    "help-articles",
    { slug: { equals: "seed-help-article" } },
    {
      title: "Getting started",
      slug: "seed-help-article",
      status: "published",
      topic: "getting-started",
      body: lexicalText("Seeded help content. Add your real FAQ here.") as any,
    },
  );

  // Listings (CMS mirror rows, sourceId is required + unique)
  const listingsExisting = await payload.find({
    collection: "listings",
    limit: 1,
    overrideAccess: true,
  });
  if (listingsExisting.totalDocs === 0) {
    await payload.create({
      collection: "listings",
      data: {
        sourceId: uuid(),
        listingType: "project",
        title: "Seed Listing (Project)",
        slug: "seed-listing-project",
        status: "published",
        featured: true,
        coverImage: placeholderMediaId,
      } as any,
      overrideAccess: true,
      disableVerificationEmail: true,
    });
  }

  // Project static contents (one doc is enough)
  const pscExisting = await payload.find({
    collection: "project-static-contents",
    where: { slug: { equals: "default" } },
    limit: 1,
    overrideAccess: true,
  });
  if (pscExisting.totalDocs === 0) {
    await payload.create({
      collection: "project-static-contents",
      data: {
        title: "Default Project Details Sidebar Content",
        slug: "default",
        _status: "published",
        heading: "Peace of Mind Guarantee",
        guaranteeItems: [
          {
            icon: "shield-zap",
            title: "Refund protection",
            description:
              "If the project falls short, you can initiate a dispute for a full refund.",
          },
          {
            icon: "rocket",
            title: "Fast resolution",
            description:
              "Clear milestones and fast support if anything goes off track.",
          },
        ],
        highlightedNotice: {
          icon: "shield-dollar",
          description:
            "Payments are secured and released only when you approve delivery.",
        },
        policy: {
          prefixText: "We securely process payments and release upon rating.",
          linkLabel: "See Policy Details.",
          linkHref: "/policy",
        },
        howItWorks: {
          steps: [
            {
              stepNumber: "1",
              title: "Pick a project",
              description: "Browse proven teams and project templates.",
            },
            {
              stepNumber: "2",
              title: "Customize scope",
              description: "Tailor deliverables, timeline, and skills.",
            },
            {
              stepNumber: "3",
              title: "Launch",
              description: "Kick off with a clear plan and weekly progress.",
            },
          ],
        },
      } as any,
      overrideAccess: true,
      disableVerificationEmail: true,
    });
  }

  // Talent profiles (delegated to separate seed file for full fixtures)
  await seedTalentProfiles(payload);

  // Orders (minimal, if we have a user)
  const ordersExisting = await payload.find({
    collection: "orders",
    limit: 1,
    overrideAccess: true,
  });
  if (ordersExisting.totalDocs === 0 && userId != null) {
    await payload.create({
      collection: "orders",
      data: {
        orderNumber: "SEED-0001",
        client: userId,
        orderType: "project",
        totalAmount: 250000,
        status: "active",
      } as any,
      overrideAccess: true,
      disableVerificationEmail: true,
    });
  }
}
