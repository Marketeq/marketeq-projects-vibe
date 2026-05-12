import type { Payload } from "payload";

import { lexicalText, upsertPlaceholderMedia } from "./seed-utils";

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

export async function seedTalentProfiles(payload: Payload): Promise<void> {
  const placeholderMediaId = await upsertPlaceholderMedia(payload);

  const talentProfileFixtures = [
    {
      sourceId: "11111111-1111-4111-8111-111111111111",
      username: "seed_talent",
      firstName: "Seed",
      lastName: "Talent",
      jobTitles: [
        { headline: "Full-stack engineer", rate: 75 },
      ],
      overview: lexicalText(
        "Full-stack engineer focused on shipping resilient product experiences, clean APIs, and pragmatic developer tooling.",
      ) as any,
      status: "active",
      availability: "40",
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
          url: "https://picsum.photos/seed/market/800/600",
          thumbnail: placeholderMediaId,
          description:
            "End-to-end rebuild of a multi-role marketplace with checkout, search, and profile workflows.",
        },
        {
          title: "Ops Dashboard",
          url: "https://picsum.photos/seed/ops/800/600",
          thumbnail: placeholderMediaId,
          description:
            "Internal dashboard for support, moderation, and reporting teams.",
        },
      ],
    },
    {
      sourceId: "22222222-2222-4222-8222-222222222222",
      username: "seed_product_designer",
      firstName: "Maya",
      lastName: "Chen",
      jobTitles: [
        { headline: "Product designer", rate: 95 },
      ],
      overview: lexicalText(
        "Product designer who turns messy workflows into polished, accessible interfaces with strong UX writing and design systems.",
      ) as any,
      status: "active",
      availability: "30",
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
      firstName: "Jordan",
      lastName: "Reyes",
      jobTitles: [
        { headline: "Data engineer", rate: 85 },
      ],
      overview: lexicalText(
        "Data engineer specializing in reliable pipelines, analytics instrumentation, and self-serve reporting for product teams.",
      ) as any,
      status: "active",
      availability: "20",
      rate: 115,
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
          url: "https://picsum.photos/seed/data1/800/600",
          thumbnail: placeholderMediaId,
          description:
            "Reduced reporting latency by rebuilding the analytics layer and standardizing transformations.",
        },
        {
          title: "Product Analytics Pipeline",
          url: "https://picsum.photos/seed/data2/800/600",
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
}
