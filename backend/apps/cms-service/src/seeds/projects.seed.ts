import type { Payload } from 'payload';
import { seedCategories } from "./categories.seed";
import { stableHashInt, upsertPlaceholderMedia } from "./seed-utils";

// Fixture arrays are duplicated into cms-service (TypeScript rootDir
// blocks cross-package imports). The listings-service seed now only
// handles services — projects are authored from here.
import {
  FEATURED_PROJECTS,
  NEWEST_PROJECTS,
  POPULAR_TAB_PROJECTS,
  THEMED_PROJECTS,
  type ProjectSeed,
} from './homepage-fixtures';

/**
 * Seed 89 project fixtures directly into Payload CMS so they show up in
 * the admin UI. The afterChange sync hook on the Projects collection
 * fires automatically and writes each project into public.projects, so
 * the homepage frontend keeps rendering the same content without any
 * extra glue.
 *
 * The old listings-service seed used to INSERT into public.projects
 * directly, which left 89 projects invisible in the CMS admin. This
 * script replaces that path — runs once via `npm run seed:projects`
 * from the cms-service package.
 *
 * Required fields on the Projects collection that the listings fixtures
 * don't carry (pricingModel, projectType, deliverables, fullDescription) are filled with sensible
 * defaults so validation passes. Editors can tweak them in admin later.
 *
 * Scoring signals (rating / reviewCount / completionsCount / views90d /
 * adminBoost) are NOT Payload fields — they live only on public.projects
 * as computed columns. After each project syncs, we run a one-shot
 * UPDATE on public.projects to keep the homepage ranking working.
 *
 * IDEMPOTENT: skips if any Payload project has `createdBy = seed:projects`
 * in the sidebar field. To force reseed, delete the rows via admin first
 * (or clear `cms.projects` + `public.projects` WHERE createdBy='cms-sync'
 * via SQL).
 */

const SEED_MARKER = 'seed:projects';

// ── Lexical helpers ────────────────────────────────────────────────────────
// All rich-text content below is built from small Lexical node factories so
// the seeded projects ship with readable markup (headings, lists, inline
// bold) instead of a single flat paragraph. Payload's lexicalEditor({})
// default feature set covers headings, paragraphs, lists, formatting marks,
// links, horizontal-rule, and inline code — no custom block nodes.

function textNode(text: string, format = 0) {
  return {
    type: 'text',
    text,
    format,
    mode: 'normal',
    style: '',
    detail: 0,
    version: 1,
  };
}
function paragraphNode(children: any[]) {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children,
  };
}
function headingNode(tag: 'h2' | 'h3', text: string) {
  return {
    type: 'heading',
    tag,
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [textNode(text)],
  };
}
function bulletListNode(items: string[]) {
  return {
    type: 'list',
    tag: 'ul',
    listType: 'bullet',
    start: 1,
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: items.map((t, i) => ({
      type: 'listitem',
      value: i + 1,
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [textNode(t)],
    })),
  };
}
function lexicalRoot(children: any[]) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children,
    },
  };
}

/** Multi-section Lexical tree used for `fullDescription`. */
function richFullDescription(p: ProjectSeed) {
  const primary = p.categories?.[0] ?? 'software';
  return lexicalRoot([
    headingNode('h2', p.title),
    paragraphNode([
      textNode('Overview. '),
      textNode(p.description),
    ]),
    headingNode('h3', 'What we deliver'),
    bulletListNode([
      `End-to-end ${primary} engineering from discovery through launch`,
      'Weekly async demos plus one live standup per sprint',
      'Full source code, infra-as-code, and runbook handover',
      'Two weeks of bug-fix support after go-live',
    ]),
    headingNode('h3', 'Who this is for'),
    paragraphNode([
      textNode(
        `Teams shipping ${primary} product in the next 12 weeks who need a senior squad to embed, accelerate, and hand back a codebase their own engineers can own.`,
      ),
    ]),
  ]);
}

/** Short Lexical answer for FAQ entries. Uses inline bold to exercise
 *  the lexicalToHtml converter the frontend relies on. */
function faqAnswer(prefix: string, bold: string, suffix: string) {
  return lexicalRoot([
    paragraphNode([
      textNode(prefix),
      textNode(bold, 1 /* bold bitmask */),
      textNode(suffix),
    ]),
  ]);
}

// Slug lookup — matches how the listings-service project-sync service
// slugifies titles, so we can UPDATE public.projects rows by slug later.
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Fetch an external image and upload the bytes through Payload's normal
 * upload path so MinIO/R2 actually holds the file.
 *
 * Why not just insert a row with `url` set to the CDN URL:
 * the cloud-storage plugin (see payload.config.ts cloudStorage block)
 * defines `generateFileURL` which OVERWRITES the stored url on every
 * read with `${R2_PUBLIC_URL}/${filename}`. That path is resolved by
 * the Next.js rewrite to MinIO/R2 — so if the file isn't actually in
 * the bucket, every `<img>` in admin + frontend 404s.
 *
 * The only way to get real images into the admin is to download them
 * here and hand Payload the buffer. The plugin then:
 *   1. runs the normal PUT into MinIO/R2,
 *   2. stores the final filename on the media doc,
 *   3. reads it back as `${R2_PUBLIC_URL}/${filename}` which resolves.
 *
 * Idempotent: if a row with the target filename already exists we
 * short-circuit and return the existing id.
 */
async function upsertExternalMedia(
  payload: Payload,
  url: string,
): Promise<number | null> {
  // Short deterministic filename from the Unsplash photo ID so reseeding
  // with the same fixtures is a no-op.
  const match = url.match(/photo-([a-z0-9-]+)/);
  const photoId = match?.[1] ?? String(Date.now());
  const filename = `seed-${photoId}.jpg`;

  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
  });
  if (existing.totalDocs > 0) {
    return existing.docs[0].id as number;
  }

  // Node 18+ has a global fetch — the cms-service is pinned to >=18.
  let buffer: Buffer;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      payload.logger.warn(
        `upsertExternalMedia: ${url} → HTTP ${res.status}, skipping`,
      );
      return null;
    }
    buffer = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    payload.logger.warn(
      `upsertExternalMedia: fetch failed for ${url}: ${String(err)}`,
    );
    return null;
  }

  try {
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: `Seed fixture (${photoId})`,
      } as any,
      file: {
        data: buffer,
        mimetype: 'image/jpeg',
        name: filename,
        size: buffer.length,
      } as any,
      overrideAccess: true,
      disableVerificationEmail: true,
    });
    return doc.id as number;
  } catch (err) {
    payload.logger.error(
      `upsertExternalMedia: payload.create failed for ${url}: ${String(err)}`,
    );
    return null;
  }
}

type SeededCategoryParent = { id: number; name: string; slug: string };
type SeededCategoryChild = { id: number; name: string; slug: string; parent: number };

async function loadSeededProjectCategories(payload: Payload): Promise<{
  parents: SeededCategoryParent[];
  childrenByParentId: Map<number, SeededCategoryChild[]>;
}> {
  const parentsRes = await payload.find({
    collection: "categories",
    where: {
      and: [
        { parent: { exists: false } },
        { listingTypes: { contains: "project" } } as any,
        { status: { equals: "active" } },
      ],
    },
    limit: 200,
    overrideAccess: true,
  });

  const parents = (parentsRes.docs as any[]).map((d) => ({
    id: d.id as number,
    name: String(d.name ?? ""),
    slug: String(d.slug ?? ""),
  }));

  const childrenByParentId = new Map<number, SeededCategoryChild[]>();
  if (parents.length === 0) return { parents, childrenByParentId };

  const childrenRes = await payload.find({
    collection: "categories",
    where: {
      and: [
        { parent: { exists: true } },
        { listingTypes: { contains: "project" } } as any,
        { status: { equals: "active" } },
      ],
    },
    limit: 1000,
    overrideAccess: true,
  });

  for (const d of childrenRes.docs as any[]) {
    const parentId = typeof d.parent === "number" ? d.parent : Number(d.parent?.id);
    if (!Number.isFinite(parentId)) continue;
    const row: SeededCategoryChild = {
      id: d.id as number,
      name: String(d.name ?? ""),
      slug: String(d.slug ?? ""),
      parent: parentId,
    };
    const arr = childrenByParentId.get(parentId) ?? [];
    arr.push(row);
    childrenByParentId.set(parentId, arr);
  }

  return { parents, childrenByParentId };
}

function pickThreeParents(
  seeded: SeededCategoryParent[],
  key: string,
): SeededCategoryParent[] {
  if (seeded.length <= 3) return seeded.slice(0, 3);
  const start = stableHashInt(key) % seeded.length;
  const out: SeededCategoryParent[] = [];
  for (let i = 0; i < seeded.length && out.length < 3; i++) {
    out.push(seeded[(start + i) % seeded.length]);
  }
  return out;
}

function pickChildName(
  childrenByParentId: Map<number, SeededCategoryChild[]>,
  parentId: number,
  key: string,
): string | null {
  const children = childrenByParentId.get(parentId) ?? [];
  if (children.length === 0) return null;
  const idx = stableHashInt(`${key}:${parentId}`) % children.length;
  return children[idx]?.name ?? null;
}

// ── Category → stack mapping ──────────────────────────────────────────────
// Keyed off the first category on each fixture. Gives every seeded project
// plausible tags / subcategories
// without 89 bespoke entries. Editors can refine in admin.
interface CategoryStack {
  subcategories: string[];
  tags: string[];
  galleryPool: string[]; // Unsplash photo IDs used for the gallery tab
  industries: string[];
}

const CATEGORY_STACKS: Record<string, CategoryStack> = {
  web: {
    subcategories: ['Frontend Engineering', 'Full-Stack', 'Performance'],
    tags: ['react', 'nextjs', 'a11y', 'seo', 'responsive'],
    galleryPool: ['1551288049-bebda4e38f71', '1461749280684-dccba630e2f6', '1486312338219-ce68d2c6f44d'],
    industries: ['Technology', 'E-commerce', 'SaaS', 'Media'],
  },
  mobile: {
    subcategories: ['iOS', 'Android', 'Cross-platform'],
    tags: ['swift', 'kotlin', 'react-native', 'offline', 'push-notifications'],
    galleryPool: ['1542831371-29b0f74f9713', '1581091226825-a6a2a5aee158', '1517180102446-f3ece451e9d8'],
    industries: ['Consumer App', 'Fintech', 'Health & Fitness', 'Logistics'],
  },
  cloud: {
    subcategories: ['Platform Engineering', 'DevOps', 'SRE'],
    tags: ['kubernetes', 'terraform', 'observability', 'cost-optimisation'],
    galleryPool: ['1614064641938-3bbee52942c7', '1518770660439-4636190af475', '1504868584819-f8e8b4b6d7e3'],
    industries: ['Cloud Computing', 'Financial Services', 'Cybersecurity', 'Public Sector'],
  },
  design: {
    subcategories: ['Brand', 'Product Design', 'Design Systems'],
    tags: ['figma', 'design-system', 'illustration', 'accessibility'],
    galleryPool: ['1558655146-9f40138edfeb', '1454165804606-c3d57bc86b40', '1455390582262-044cdead277a'],
    industries: ['Creative Agency', 'E-commerce', 'Startup', 'Education'],
  },
  development: {
    subcategories: ['Backend Engineering', 'Data Engineering', 'AI/ML'],
    tags: ['backend', 'api', 'postgres', 'ml', 'automation'],
    galleryPool: ['1517180102446-f3ece451e9d8', '1551288049-bebda4e38f71', '1581094794329-c8112a89af12'],
    industries: ['Enterprise', 'Automotive', 'Logistics', 'Manufacturing'],
  },
  security: {
    subcategories: ['AppSec', 'Identity', 'Compliance'],
    tags: ['soc2', 'pentest', 'oauth', 'audit'],
    galleryPool: ['1563986768609-322da13575f3', '1550751827-4bd374c3f58b', '1510511459019-5dee211c6d27'],
    industries: ['Cybersecurity', 'Financial Services', 'Defense', 'Healthcare'],
  },
  'digital-marketing': {
    subcategories: ['SEO', 'Paid Media', 'CRO'],
    tags: ['seo', 'ppc', 'attribution', 'content'],
    galleryPool: ['1557838923-2985c318be48', '1432888622747-4eb9a8efeb07', '1533750516457-a7f992034fec'],
    industries: ['Marketing', 'E-commerce', 'Entertainment', 'SaaS'],
  },
  'sales-funnels': {
    subcategories: ['Landing Pages', 'Email Funnels', 'Checkout Optimization'],
    tags: ['landing-page', 'ab-test', 'funnel', 'upsell'],
    galleryPool: ['1557838923-2985c318be48', '1460925895917-afdab827c52f', '1486312338219-ce68d2c6f44d'],
    industries: ['E-commerce', 'Real Estate', 'Education', 'Direct to Consumer'],
  },
  'customer-service': {
    subcategories: ['Helpdesk', 'Live Chat', 'Knowledge Base'],
    tags: ['helpdesk', 'csat', 'sla', 'automation'],
    galleryPool: ['1486406146926-c627a92ad1ab', '1542744173-8e7e53415bb0', '1517180102446-f3ece451e9d8'],
    industries: ['SaaS', 'Retail', 'Healthcare', 'Logistics'],
  },
  'cloud-software': {
    subcategories: ['Internal Tools', 'Integrations', 'Admin Dashboards'],
    tags: ['saas', 'internal-tools', 'integrations', 'admin'],
    galleryPool: ['1461749280684-dccba630e2f6', '1542831371-29b0f74f9713', '1551288049-bebda4e38f71'],
    industries: ['SaaS', 'Enterprise', 'Financial Services', 'Legal'],
  },
  'mobile-apps': {
    subcategories: ['Consumer Mobile', 'Lifestyle', 'Utilities'],
    tags: ['mobile', 'ux', 'notifications', 'health'],
    galleryPool: ['1558655146-9f40138edfeb', '1542831371-29b0f74f9713', '1576086213369-97a306d36557'],
    industries: ['Lifestyle', 'Health', 'Productivity', 'Entertainment'],
  },
};

function stackFor(p: ProjectSeed): CategoryStack {
  const key = p.categories?.[0] ?? 'web';
  return CATEGORY_STACKS[key] ?? CATEGORY_STACKS.web;
}

const CATEGORY_STACK_KEYS = Object.keys(CATEGORY_STACKS);

/** Publish-project requires exactly 3 distinct category groups. */
function ensureThreeCategorySlugs(seed: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of seed) {
    const t = (raw || '').trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= 3) return out.slice(0, 3);
  }
  for (const key of CATEGORY_STACK_KEYS) {
    if (out.length >= 3) break;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.slice(0, 3);
}

function stackForCategorySlug(slug: string): CategoryStack {
  const key = (slug || 'web').toLowerCase();
  return CATEGORY_STACKS[key] ?? CATEGORY_STACKS.web;
}

function unsplash(id: string, w = 800): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
}

// Build 4 deliverable phases for every project. Each phase references the
// project's primary category so the copy varies by stack without per-row
// customisation.
function buildDeliverables(p: ProjectSeed) {
  const primary = p.categories?.[0] ?? 'software';
  return [
    {
      phaseLabel: 'Phase One',
      phaseName: 'Discovery',
      items: [
        { text: `Stakeholder interviews and goal alignment for the ${primary} track` },
        { text: 'Technical discovery: architecture, risks, and dependencies' },
        { text: 'Success metrics and launch KPIs agreed with the client' },
      ],
    },
    {
      phaseLabel: 'Phase Two',
      phaseName: 'Design',
      items: [
        { text: 'Low-fidelity wireframes covering the golden path' },
        { text: 'Hi-fi Figma mockups with component-level tokens' },
        { text: 'Design-system hand-off package delivered to engineering' },
      ],
    },
    {
      phaseLabel: 'Phase Three',
      phaseName: 'Build',
      items: [
        { text: 'Production-ready implementation in the selected stack' },
        { text: 'Unit + e2e test coverage for critical flows' },
        { text: 'CI pipeline with preview environments per pull request' },
      ],
    },
    {
      phaseLabel: 'Phase Four',
      phaseName: 'Launch',
      items: [
        { text: 'Cutover runbook, monitoring dashboards, and on-call rota' },
        { text: 'Two weeks of post-launch bug-fix support included' },
        { text: 'Documented handover to the client engineering team' },
      ],
    },
  ];
}

function buildFaqs(p: ProjectSeed) {
  const primary = p.categories?.[0] ?? 'software';
  return [
    {
      question: 'How is the project scoped and priced?',
      answer: faqAnswer(
        'Each engagement starts with a fixed discovery phase. Pricing is ',
        'cost-plus on sprint capacity',
        ' — you get a capped estimate before build kicks off.',
      ),
    },
    {
      question: 'Who actually works on the project?',
      answer: faqAnswer(
        `A dedicated squad of senior ${primary} engineers plus a tech lead. `,
        'No hand-offs to junior teams',
        ' — the people you meet in week 1 ship the code in week 12.',
      ),
    },
    {
      question: 'What happens after launch?',
      answer: faqAnswer(
        'Two weeks of bug-fix support are included by default. Extended care plans are available on a ',
        'monthly retainer',
        ' with a four-hour SLA.',
      ),
    },
  ];
}

function buildScope(_p: ProjectSeed) {
  // Matches the current Projects collection schema:
  // tasks require roleName, location, experienceLevel, durationValue, durationType.
  // We keep a deterministic template so all 89 fixtures validate.
  const location = "United States";
  return [
    {
      phaseName: "Discovery & Design",
      order: 1,
      tasks: [
        {
          title: "Requirements & User Research",
          roleName: "User Researcher",
          location,
          experienceLevel: "Senior",
          durationValue: 1,
          durationType: "weeks",
        },
        {
          title: "UI/UX High-fidelity Prototyping",
          roleName: "UI/UX Designer",
          location,
          experienceLevel: "Senior",
          durationValue: 1,
          durationType: "weeks",
        },
      ],
    },
    {
      phaseName: "Implementation",
      order: 2,
      tasks: [
        {
          title: "Core System Architecture",
          roleName: "System Architect",
          location,
          experienceLevel: "Guru",
          durationValue: 1,
          durationType: "weeks",
        },
        {
          title: "Feature Development & API Integration",
          roleName: "Full Stack Developer",
          location,
          experienceLevel: "Medior",
          durationValue: 2,
          durationType: "weeks",
        },
      ],
    },
    {
      phaseName: "Launch Readiness",
      order: 3,
      tasks: [
        {
          title: "QA, UAT & Performance Tuning",
          roleName: "QA Engineer",
          location,
          experienceLevel: "Medior",
          durationValue: 3,
          durationType: "days",
        },
        {
          title: "Production Deployment & Handover",
          roleName: "DevOps Engineer",
          location,
          experienceLevel: "Senior",
          durationValue: 2,
          durationType: "days",
        },
      ],
    },
  ];
}

/**
 * Build the Payload `data` object for a single seeded project. Every
 * optional editorial field gets filled in so the admin UI and the
 * frontend cards both look authored, not scaffolded.
 */
function buildProjectData(
  p: ProjectSeed,
  thumbnailMediaId: number,
  galleryMediaIds: number[],
  seededCategories: {
    parents: SeededCategoryParent[];
    childrenByParentId: Map<number, SeededCategoryChild[]>;
  },
): Record<string, unknown> {
  let short = (p.shortDescription ?? p.description).trim();
  const shortPad =
    ' Scope covers discovery, delivery, QA, and launch support for buyer confidence.';
  while (short.length < 50) {
    short = (short + shortPad).trim();
  }
  short = short.slice(0, 300);
  const stack = stackFor(p);
  const pickedParents = pickThreeParents(seededCategories.parents, p.title);
  const scope = buildScope(p);

  const toHours = (task: any): number => {
    const dv = Number(task?.durationValue);
    const dt = typeof task?.durationType === "string" ? task.durationType : "";
    if (Number.isFinite(dv) && dv > 0 && dt) {
      if (dt === "hours") return dv;
      if (dt === "days") return dv * 24;
      return dv * 168;
    }
    return 0;
  };

  const totalHours = scope.reduce((acc, phase) => {
    const tasks = Array.isArray((phase as any).tasks) ? (phase as any).tasks : [];
    return acc + tasks.reduce((tAcc: number, task: any) => tAcc + toHours(task), 0);
  }, 0);

  return {
    title: p.title,
    slug: slugify(p.title),
    shortDescription: short,
    fullDescription: richFullDescription(p),
    thumbnail: thumbnailMediaId,
    gallery: galleryMediaIds.map((id, i) => ({
      image: id,
      caption: `${p.title} — view ${i + 1}`,
    })),
    videoWalkthrough: {
      externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    categories: pickedParents.map((parent, index) => {
      const rowStack = stackForCategorySlug(parent.slug || parent.name);
      const childName = pickChildName(seededCategories.childrenByParentId, parent.id, p.title);
      return {
        value: parent.name,
        subcategories: [
          {
            value:
              childName ??
              (rowStack.subcategories.length
                ? rowStack.subcategories[index % rowStack.subcategories.length]
                : parent.name),
          },
        ],
      };
    }),
    tags: (stack.tags.length ? stack.tags : ['marketplace']).slice(0, 10).map((value) => ({ value })),
    projectSkills: ((p.skills ?? []).length ? p.skills! : ['JavaScript']).slice(0, 10).map((value) => ({ value })),
    industries: stack.industries.slice(0, 5).map((value) => ({ value })),
    deliverables: buildDeliverables(p),
    faqQuestions: buildFaqs(p),
    recentQuestions: [
      { question: 'Can you onboard additional team members mid-project?' },
      { question: 'Do you offer fixed-price engagements for MVPs?' },
    ],
    scope,
    totalEstimatedHours: totalHours,
    timelineValue: Math.ceil(totalHours / 10), // Rough estimate: 10h/week
    timelineUnit: 'weeks',
    pricingModel: 'biweekly',
    priceViewMode: 'biweekly',
    projectType: 'team',
    klarnaPaymentEnabled: false,
    featured: p.featured ?? false,
    _status: 'published',
    visibility: 'public',
    moderationStatus: 'approved',
    ownerId: '00000000-0000-0000-0000-000000000000', // System user
  };
}

export async function seedProjects(payload: Payload): Promise<void> {
  const existing = await payload.find({
    collection: 'projects',
    where: { slug: { like: 'modern-brand-identity-system' } },
    limit: 1,
  });
  if (existing.totalDocs > 0) {
    payload.logger.info(
      `projects seed: fixture project "${existing.docs[0].slug}" already exists — skipping (delete it in admin to force reseed)`,
    );
    return;
  }

  const allFixtures: ProjectSeed[] = [
    ...FEATURED_PROJECTS,
    ...NEWEST_PROJECTS,
    ...POPULAR_TAB_PROJECTS,
    ...THEMED_PROJECTS,
  ];

  payload.logger.info(
    `projects seed: inserting ${allFixtures.length} fixtures via Payload Local API`,
  );

  let seededCategories = await loadSeededProjectCategories(payload);
  if (seededCategories.parents.length < 3) {
    payload.logger.info("projects seed: categories missing — seeding categories first");
    await seedCategories(payload);
    seededCategories = await loadSeededProjectCategories(payload);
  }

  // Track scoring signals to overlay on public.projects after sync.
  // Keyed by slug so we can match the row the hook upserted.
  const scoringBySlug = new Map<
    string,
    {
      rating: number;
      reviewCount: number;
      completionsCount: number;
      views90d: number;
      adminBoost: number;
      createdAt?: Date;
    }
  >();

  let created = 0;
  for (const fixture of allFixtures) {
    const slug = slugify(fixture.title);
    try {
      const thumbnailUrl = fixture.mediaUrls?.[0];
      const thumbnailId =
        thumbnailUrl ? await upsertExternalMedia(payload, thumbnailUrl) : null;
      const resolvedThumbnailId =
        thumbnailId == null ? await upsertPlaceholderMedia(payload) : thumbnailId;

      // Gallery: pull 3 URLs from the category-specific pool, drop the
      // thumbnail if it happens to overlap, and upsert each into cms.media
      // so the project page has a carousel to show.
      const stack = stackFor(fixture);
      const galleryUrls = stack.galleryPool
        .map((id) => unsplash(id))
        .filter((url) => url !== thumbnailUrl)
        .slice(0, 3);
      const galleryResults = await Promise.all(
        galleryUrls.map((url) => upsertExternalMedia(payload, url)),
      );
      const galleryIds = galleryResults.filter(
        (id): id is number => id != null,
      );

      await payload.create({
        collection: 'projects',
        data: buildProjectData(
          fixture,
          resolvedThumbnailId,
          galleryIds,
          seededCategories,
        ) as any,
        overrideAccess: true,
      });
      scoringBySlug.set(slug, {
        rating: fixture.rating ?? 0,
        reviewCount: fixture.reviewCount ?? 0,
        completionsCount: fixture.completionsCount ?? 0,
        views90d: fixture.views90d ?? 0,
        adminBoost: fixture.adminBoost ?? 0,
        createdAt: fixture.createdAt,
      });
      created++;
    } catch (err) {
      payload.logger.error(
        `projects seed: failed to create "${fixture.title}": ${String(err)}`,
      );
    }
  }

  payload.logger.info(`projects seed: created ${created} / ${allFixtures.length}`);

  // Overlay scoring signals onto public.projects. The afterChange hook
  // already populated each row via the CMS → listings sync endpoint, but
  // rating / reviewCount / views90d / etc. aren't on the sync DTO — they're
  // pure listings-side signals. Run a single batched UPDATE so the
  // homepage ranker has something to sort on.
  await overlayScoringSignals(payload, scoringBySlug);
}

async function overlayScoringSignals(
  payload: Payload,
  scoring: Map<
    string,
    {
      rating: number;
      reviewCount: number;
      completionsCount: number;
      views90d: number;
      adminBoost: number;
      createdAt?: Date;
    }
  >,
): Promise<void> {
  if (scoring.size === 0) return;

  const listingsUrl = process.env.LISTINGS_SERVICE_URL;
  const token = process.env.CMS_SYNC_TOKEN;
  if (!listingsUrl || !token) {
    payload.logger.warn(
      'projects seed: LISTINGS_SERVICE_URL or CMS_SYNC_TOKEN not set — skipping scoring overlay',
    );
    return;
  }

  // Write the overlay via a single HTTP call to a tiny internal endpoint.
  // Rather than add a new endpoint, we reuse the DB connection the CMS
  // already has and run raw SQL against `public.projects`. Because the
  // CMS Payload DB and the listings-service `public.projects` table live
  // in the same Postgres instance (same DATABASE_URL, different schemas),
  // the cms-service pool can update the listings row directly.
  const rawDb = (payload.db as any).drizzle ?? (payload.db as any);
  const pool = (rawDb as any).pool ?? (payload.db as any).pool;
  if (!pool) {
    payload.logger.warn(
      'projects seed: no direct Postgres pool available on payload.db — skipping scoring overlay',
    );
    return;
  }

  let updated = 0;
  for (const [slug, signals] of scoring.entries()) {
    const res = await pool.query(
      `UPDATE public.projects SET
         rating = $1,
         "reviewCount" = $2,
         "completionsCount" = $3,
         "views90d" = $4,
         "adminBoost" = $5,
         "createdAt" = COALESCE($6, "createdAt")
       WHERE slug = $7`,
      [
        signals.rating,
        signals.reviewCount,
        signals.completionsCount,
        signals.views90d,
        signals.adminBoost,
        signals.createdAt ?? null,
        slug,
      ],
    );
    if (res.rowCount && res.rowCount > 0) updated++;
  }
  payload.logger.info(
    `projects seed: overlaid scoring signals on ${updated} / ${scoring.size} listings rows`,
  );
}

// Re-export so the runner can import both the seed and the marker for
// idempotency checks.
export { SEED_MARKER };
