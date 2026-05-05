import type { Payload } from "payload";
import crypto from "crypto";

import { seedCategories } from "./categories.seed";
import { seedProjects } from "./projects.seed";
import { seedDefaultHomepage } from "./homepage.seed";
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
  await seedProjects(payload);

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

  // Category pages (minimal shell doc)
  const cpExisting = await payload.find({
    collection: "category-pages",
    where: { path: { equals: "development" } },
    limit: 1,
    overrideAccess: true,
  });
  if (cpExisting.totalDocs === 0) {
    await payload.create({
      collection: "category-pages",
      data: {
        level: "l1",
        displayTitle: "Development (L1)",
        path: "development",
        _status: "published",
        categoryRef: {
          categoryId: "seed-development",
          slug: "development",
          name: "Development",
          breadcrumbs: [{ label: "Development", slug: "development" }],
        },
        hero: {
          title: "Development projects",
          subtitle:
            "Browse seeded projects grouped under development-related categories.",
        },
      } as any,
      overrideAccess: true,
      disableVerificationEmail: true,
    });
  }

  // Talent profiles (fully seeded fixtures)
  const talentProfileFixtures = [
    {
      sourceId: "11111111-1111-4111-8111-111111111111",
      username: "seed_talent",
      name: "Seed Talent",
      headline: "Full-stack engineer",
      overview: lexicalText(
        "Full-stack engineer focused on shipping resilient product experiences, clean APIs, and pragmatic developer tooling.",
      ) as any,
      status: "active",
      availability: "40",
      rateMin: 55,
      rateMax: 90,
      skills: [{ name: "TypeScript" }, { name: "NestJS" }, { name: "React" }],
      industries: [{ name: "SaaS" }, { name: "Marketplaces" }],
      languages: [
        { language: "English", fluency: "native" },
        { language: "Spanish", fluency: "conversational" },
      ],
      certifications: [
        {
          title: "AWS Certified Developer",
          organization: "Amazon Web Services",
          dateAwarded: "2024-03-12",
        },
        {
          title: "Professional Scrum Master I",
          organization: "Scrum.org",
          dateAwarded: "2023-10-08",
        },
      ],
      education: [
        {
          institution: "University of Texas at Austin",
          degree: "B.S. Computer Science",
          graduationYear: 2019,
        },
        {
          institution: "Austin Community College",
          degree: "Software Engineering Certificate",
          graduationYear: 2017,
        },
      ],
      workExperience: [
        {
          role: "Senior Full-stack Engineer",
          company: "Northstar Commerce",
          startDate: "2022-01-01",
          endDate: null,
          description:
            "Led marketplace platform work across checkout, account management, and admin workflows.",
        },
        {
          role: "Software Engineer",
          company: "Brightlane Studio",
          startDate: "2019-07-01",
          endDate: "2021-12-31",
          description:
            "Built customer-facing web apps and internal operations tools for early-stage products.",
        },
      ],
      portfolio: [
        {
          title: "Marketplace Rebuild",
          url: "https://example.com/portfolio/marketplace-rebuild",
          thumbnail: placeholderMediaId,
          description:
            "End-to-end rebuild of a multi-role marketplace with checkout, search, and profile workflows.",
        },
        {
          title: "Ops Dashboard",
          url: "https://example.com/portfolio/ops-dashboard",
          thumbnail: placeholderMediaId,
          description:
            "Internal dashboard for support, moderation, and reporting teams.",
        },
      ],
    },
    {
      sourceId: "22222222-2222-4222-8222-222222222222",
      username: "seed_product_designer",
      name: "Maya Chen",
      headline: "Product designer",
      overview: lexicalText(
        "Product designer who turns messy workflows into polished, accessible interfaces with strong UX writing and design systems.",
      ) as any,
      status: "active",
      availability: "30",
      rateMin: 65,
      rateMax: 110,
      skills: ["Figma", "Design Systems", "UX Research"].map((name) => ({
        name,
      })),
      industries: [{ name: "Fintech" }, { name: "B2B SaaS" }],
      languages: [
        { language: "English", fluency: "fluent" },
        { language: "Mandarin", fluency: "native" },
      ],
      certifications: [
        {
          title: "Google UX Design Certificate",
          organization: "Coursera",
          dateAwarded: "2024-01-18",
        },
      ],
      education: [
        {
          institution: "Royal College of Art",
          degree: "M.A. Interaction Design",
          graduationYear: 2020,
        },
      ],
      workExperience: [
        {
          role: "Lead Product Designer",
          company: "Relay Finance",
          startDate: "2021-05-01",
          endDate: null,
          description:
            "Owned design systems, onboarding, and transaction flows for a regulated financial product.",
        },
        {
          role: "UI/UX Designer",
          company: "Atlas Apps",
          startDate: "2020-02-01",
          endDate: "2021-04-30",
          description:
            "Designed dashboards, user journeys, and lightweight product experiments for SMB SaaS tools.",
        },
      ],
      portfolio: [
        {
          title: "Design System Refresh",
          url: "https://example.com/portfolio/design-system-refresh",
          thumbnail: placeholderMediaId,
          description:
            "Unified components and tokens across a growing product suite.",
        },
        {
          title: "Fintech Onboarding Flow",
          url: "https://example.com/portfolio/fintech-onboarding",
          thumbnail: placeholderMediaId,
          description:
            "Streamlined compliance-heavy onboarding for new account holders.",
        },
      ],
    },
    {
      sourceId: "33333333-3333-4333-8333-333333333333",
      username: "seed_data_engineer",
      name: "Jordan Reyes",
      headline: "Data engineer",
      overview: lexicalText(
        "Data engineer specializing in reliable pipelines, analytics instrumentation, and self-serve reporting for product teams.",
      ) as any,
      status: "suspended",
      availability: "20",
      rateMin: 75,
      rateMax: 130,
      skills: [{ name: "Python" }, { name: "dbt" }, { name: "Snowflake" }],
      industries: [{ name: "Healthcare" }, { name: "Analytics" }],
      languages: [
        { language: "English", fluency: "fluent" },
        { language: "French", fluency: "conversational" },
      ],
      certifications: [
        {
          title: "SnowPro Core Certification",
          organization: "Snowflake",
          dateAwarded: "2023-06-21",
        },
        {
          title: "Certified Analytics Professional",
          organization: "INFORMS",
          dateAwarded: "2022-11-14",
        },
      ],
      education: [
        {
          institution: "University of Toronto",
          degree: "B.Sc. Data Science",
          graduationYear: 2018,
        },
      ],
      workExperience: [
        {
          role: "Senior Data Engineer",
          company: "Northwind Health",
          startDate: "2022-09-01",
          endDate: null,
          description:
            "Built ingestion, transformation, and data quality pipelines for analytics and ML teams.",
        },
        {
          role: "Analytics Engineer",
          company: "Cloud Harbor",
          startDate: "2018-09-01",
          endDate: "2022-08-31",
          description:
            "Maintained dbt models, reporting marts, and product event instrumentation standards.",
        },
      ],
      portfolio: [
        {
          title: "Warehouse Modernization",
          url: "https://example.com/portfolio/warehouse-modernization",
          thumbnail: placeholderMediaId,
          description:
            "Reduced reporting latency by rebuilding the analytics layer and standardizing transformations.",
        },
        {
          title: "Product Analytics Pipeline",
          url: "https://example.com/portfolio/product-analytics-pipeline",
          thumbnail: placeholderMediaId,
          description:
            "Created an end-to-end pipeline from event collection to stakeholder dashboards.",
        },
      ],
    },
  ];

  for (const talentProfile of talentProfileFixtures) {
    await upsertByWhere(
      payload,
      "talent-profiles",
      { username: { equals: talentProfile.username } },
      talentProfile,
    );
  }

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
