import type { Payload } from 'payload';

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
 * don't carry (totalEstimatedHours, timelineValue, pricingModel, priceRange,
 * projectType, deliverables, fullDescription) are filled with sensible
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

// ── Category → stack mapping ──────────────────────────────────────────────
// Keyed off the first category on each fixture. Gives every seeded project
// plausible tags / programming languages / dev techs / subcategories /
// skillsAndTools without 89 bespoke entries. Editors can refine in admin.
interface CategoryStack {
  subcategories: string[];
  tags: string[];
  programmingLanguages: string[];
  developmentTechnologies: string[];
  skillsAndTools: string[];
  galleryPool: string[]; // Unsplash photo IDs used for the gallery tab
}

const CATEGORY_STACKS: Record<string, CategoryStack> = {
  web: {
    subcategories: ['Frontend Engineering', 'Full-Stack', 'Performance'],
    tags: ['react', 'nextjs', 'a11y', 'seo', 'responsive'],
    programmingLanguages: ['TypeScript', 'JavaScript', 'HTML', 'CSS'],
    developmentTechnologies: ['Next.js', 'React', 'Tailwind CSS', 'Vercel', 'PostgreSQL'],
    skillsAndTools: ['Figma', 'GitHub Actions', 'Playwright', 'Vercel'],
    galleryPool: ['1551288049-bebda4e38f71', '1461749280684-dccba630e2f6', '1486312338219-ce68d2c6f44d'],
  },
  mobile: {
    subcategories: ['iOS', 'Android', 'Cross-platform'],
    tags: ['swift', 'kotlin', 'react-native', 'offline', 'push-notifications'],
    programmingLanguages: ['Swift', 'Kotlin', 'TypeScript'],
    developmentTechnologies: ['React Native', 'Expo', 'Fastlane', 'Firebase'],
    skillsAndTools: ['Xcode', 'Android Studio', 'TestFlight', 'Firebase'],
    galleryPool: ['1542831371-29b0f74f9713', '1581091226825-a6a2a5aee158', '1517180102446-f3ece451e9d8'],
  },
  cloud: {
    subcategories: ['Platform Engineering', 'DevOps', 'SRE'],
    tags: ['kubernetes', 'terraform', 'observability', 'cost-optimisation'],
    programmingLanguages: ['Go', 'TypeScript', 'Python'],
    developmentTechnologies: ['Kubernetes', 'Terraform', 'AWS', 'Grafana', 'Prometheus'],
    skillsAndTools: ['AWS', 'Datadog', 'Terraform', 'ArgoCD'],
    galleryPool: ['1614064641938-3bbee52942c7', '1518770660439-4636190af475', '1504868584819-f8e8b4b6d7e3'],
  },
  design: {
    subcategories: ['Brand', 'Product Design', 'Design Systems'],
    tags: ['figma', 'design-system', 'illustration', 'accessibility'],
    programmingLanguages: [],
    developmentTechnologies: ['Figma', 'Framer', 'Storybook'],
    skillsAndTools: ['Figma', 'Framer', 'Notion', 'Loom'],
    galleryPool: ['1558655146-9f40138edfeb', '1454165804606-c3d57bc86b40', '1455390582262-044cdead277a'],
  },
  development: {
    subcategories: ['Backend Engineering', 'Data Engineering', 'AI/ML'],
    tags: ['backend', 'api', 'postgres', 'ml', 'automation'],
    programmingLanguages: ['TypeScript', 'Python', 'Go'],
    developmentTechnologies: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis', 'Docker'],
    skillsAndTools: ['Postman', 'Grafana', 'GitHub Actions', 'Docker'],
    galleryPool: ['1517180102446-f3ece451e9d8', '1551288049-bebda4e38f71', '1581094794329-c8112a89af12'],
  },
  security: {
    subcategories: ['AppSec', 'Identity', 'Compliance'],
    tags: ['soc2', 'pentest', 'oauth', 'audit'],
    programmingLanguages: ['Go', 'TypeScript'],
    developmentTechnologies: ['Vault', 'Auth0', 'Okta', 'SIEM'],
    skillsAndTools: ['Vault', 'Okta', 'Semgrep', 'Snyk'],
    galleryPool: ['1518770660439-4636190af475', '1486406146926-c627a92ad1ab', '1555066931-4365d14bab8c'],
  },
  'digital-marketing': {
    subcategories: ['SEO', 'Paid Media', 'CRO'],
    tags: ['seo', 'ppc', 'attribution', 'content'],
    programmingLanguages: [],
    developmentTechnologies: ['HubSpot', 'GA4', 'Segment', 'Looker'],
    skillsAndTools: ['HubSpot', 'GA4', 'Segment', 'Mixpanel'],
    galleryPool: ['1557838923-2985c318be48', '1432888622747-4eb9a8efeb07', '1533750516457-a7f992034fec'],
  },
  'sales-funnels': {
    subcategories: ['Landing Pages', 'Email Funnels', 'Checkout Optimization'],
    tags: ['landing-page', 'ab-test', 'funnel', 'upsell'],
    programmingLanguages: [],
    developmentTechnologies: ['Webflow', 'ConvertKit', 'Stripe'],
    skillsAndTools: ['Webflow', 'Klaviyo', 'Stripe', 'Hotjar'],
    galleryPool: ['1557838923-2985c318be48', '1460925895917-afdab827c52f', '1486312338219-ce68d2c6f44d'],
  },
  'customer-service': {
    subcategories: ['Helpdesk', 'Live Chat', 'Knowledge Base'],
    tags: ['helpdesk', 'csat', 'sla', 'automation'],
    programmingLanguages: ['TypeScript', 'Python'],
    developmentTechnologies: ['Zendesk', 'Intercom', 'Twilio'],
    skillsAndTools: ['Zendesk', 'Intercom', 'Twilio', 'Notion'],
    galleryPool: ['1486406146926-c627a92ad1ab', '1542744173-8e7e53415bb0', '1517180102446-f3ece451e9d8'],
  },
  'cloud-software': {
    subcategories: ['Internal Tools', 'Integrations', 'Admin Dashboards'],
    tags: ['saas', 'internal-tools', 'integrations', 'admin'],
    programmingLanguages: ['TypeScript', 'Python'],
    developmentTechnologies: ['Retool', 'Hasura', 'Postgres', 'GraphQL'],
    skillsAndTools: ['Retool', 'Hasura', 'Postgres', 'Sentry'],
    galleryPool: ['1461749280684-dccba630e2f6', '1542831371-29b0f74f9713', '1551288049-bebda4e38f71'],
  },
  'mobile-apps': {
    subcategories: ['Consumer Mobile', 'Lifestyle', 'Utilities'],
    tags: ['mobile', 'ux', 'notifications', 'health'],
    programmingLanguages: ['Swift', 'Kotlin', 'TypeScript'],
    developmentTechnologies: ['React Native', 'Expo', 'Firebase'],
    skillsAndTools: ['Xcode', 'Android Studio', 'Firebase', 'Figma'],
    galleryPool: ['1558655146-9f40138edfeb', '1542831371-29b0f74f9713', '1576086213369-97a306d36557'],
  },
};

function stackFor(p: ProjectSeed): CategoryStack {
  const key = p.categories?.[0] ?? 'web';
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

/**
 * Build the Payload `data` object for a single seeded project. Every
 * optional editorial field gets filled in so the admin UI and the
 * frontend cards both look authored, not scaffolded.
 */
function buildProjectData(
  p: ProjectSeed,
  thumbnailMediaId: number,
  galleryMediaIds: number[],
): Record<string, unknown> {
  const short = p.shortDescription ?? p.description;
  const stack = stackFor(p);
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
    categories: (p.categories ?? []).slice(0, 3).map((value) => ({ value })),
    subcategories: stack.subcategories.slice(0, 5).map((value) => ({ value })),
    tags: stack.tags.slice(0, 10).map((value) => ({ value })),
    projectSkills: (p.skills ?? []).slice(0, 25).map((value) => ({ value })),
    programmingLanguages: stack.programmingLanguages
      .slice(0, 10)
      .map((value) => ({ value })),
    developmentTechnologies: stack.developmentTechnologies
      .slice(0, 10)
      .map((value) => ({ value })),
    skillsAndTools: stack.skillsAndTools.slice(0, 10).map((title) => ({ title })),
    deliverables: buildDeliverables(p),
    faqQuestions: buildFaqs(p),
    recentQuestions: [
      { question: 'Can you onboard additional team members mid-project?' },
      { question: 'Do you offer fixed-price engagements for MVPs?' },
    ],
    totalEstimatedHours: 100,
    timelineValue: 12,
    timelineUnit: 'weeks',
    pricingModel: 'biweekly',
    priceViewMode: 'biweekly',
    priceRangeMin: p.budget ?? 10000,
    priceRangeMax: (p.budget ?? 10000) * 2,
    projectType: 'team',
    klarnaPaymentEnabled: false,
    featured: p.featured ?? false,
    chatEnabled: false,
    reportButtonEnabled: true,
    shareButtonEnabled: true,
    helpButtonEnabled: false,
    _status: 'published',
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
      if (!thumbnailUrl) {
        payload.logger.warn(`projects seed: ${slug} has no thumbnail URL, skipping`);
        continue;
      }
      const thumbnailId = await upsertExternalMedia(payload, thumbnailUrl);
      if (thumbnailId == null) {
        payload.logger.warn(
          `projects seed: ${slug} could not upload thumbnail — skipping`,
        );
        continue;
      }

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
        data: buildProjectData(fixture, thumbnailId, galleryIds) as any,
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
