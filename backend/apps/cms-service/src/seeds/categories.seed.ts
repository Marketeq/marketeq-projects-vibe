import type { Payload } from "payload";

type SeedCategory = {
  name: string;
  slug: string;
  listingTypes?: Array<"project" | "service" | "team" | "talent" | "job">;
  children?: Array<{ name: string; slug: string }>;
};

const CATEGORY_FIXTURES: SeedCategory[] = [
  {
    name: "Development",
    slug: "development",
    listingTypes: ["project"],
    children: [
      { name: "Web Development", slug: "web-development" },
      { name: "Mobile Apps", slug: "mobile-apps" },
      { name: "APIs & Integrations", slug: "apis-integrations" },
    ],
  },
  {
    name: "Design",
    slug: "design",
    listingTypes: ["project"],
    children: [
      { name: "UI/UX Design", slug: "ui-ux-design" },
      { name: "Brand Identity", slug: "brand-identity" },
      { name: "Design Systems", slug: "design-systems" },
    ],
  },
  {
    name: "Marketing",
    slug: "marketing",
    listingTypes: ["project"],
    children: [
      { name: "SEO", slug: "seo" },
      { name: "Content Marketing", slug: "content-marketing" },
      { name: "Paid Ads", slug: "paid-ads" },
    ],
  },
  {
    name: "Content",
    slug: "content",
    listingTypes: ["project"],
    children: [
      { name: "Copywriting", slug: "copywriting" },
      { name: "Blog Writing", slug: "blog-writing" },
      { name: "Case Studies", slug: "case-studies" },
    ],
  },
];

async function upsertCategory(payload: Payload, data: any): Promise<any> {
  const existing = await payload.find({
    collection: "categories",
    where: { slug: { equals: data.slug } },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.totalDocs > 0) {
    return await payload.update({
      collection: "categories",
      id: existing.docs[0].id as any,
      data,
      overrideAccess: true,
    });
  }
  return await payload.create({
    collection: "categories",
    data,
    overrideAccess: true,
    disableVerificationEmail: true,
  });
}

export async function seedCategories(payload: Payload): Promise<void> {
  for (const parent of CATEGORY_FIXTURES) {
    const parentDoc = await upsertCategory(payload, {
      name: parent.name,
      slug: parent.slug,
      listingTypes: parent.listingTypes ?? ["project"],
      parent: null,
    });

    for (const child of parent.children ?? []) {
      await upsertCategory(payload, {
        name: child.name,
        slug: child.slug,
        listingTypes: parent.listingTypes ?? ["project"],
        parent: parentDoc.id,
      });
    }
  }
}

