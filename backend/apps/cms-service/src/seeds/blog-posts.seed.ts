import type { Payload } from 'payload';

const SEEDED_AUTHOR_EMAIL = 'cms-blog-seed@marketeq.local';
const SEEDED_AUTHOR_PASSWORD = 'SeedBlogPosts!2026';

type LexicalNode = Record<string, unknown>;

interface BlogPostSeed {
  title: string;
  slug: string;
  category: {
    slug: string;
    name: string;
    description: string;
  };
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  tags: string[];
  body: LexicalNode;
}

function textNode(text: string, format = 0): LexicalNode {
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

function paragraphNode(children: LexicalNode[]): LexicalNode {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children,
  };
}

function headingNode(tag: 'h2' | 'h3', text: string): LexicalNode {
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

function bulletListNode(items: string[]): LexicalNode {
  return {
    type: 'list',
    tag: 'ul',
    listType: 'bullet',
    start: 1,
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: items.map((item, index) => ({
      type: 'listitem',
      value: index + 1,
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [textNode(item)],
    })),
  };
}

function lexicalRoot(children: LexicalNode[]): LexicalNode {
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

const BLOG_POSTS: BlogPostSeed[] = [
  {
    title: 'How Marketeq Connects CMS Content to Growth-Focused Blog Pages',
    slug: 'cms-blog-integration-foundations',
    category: {
      slug: 'content-strategy',
      name: 'Content Strategy',
      description:
        'Editorial planning, content operations, and publishing workflows.',
    },
    status: 'published',
    publishedAt: '2026-04-10T16:00:00.000Z',
    tags: ['cms', 'blog', 'payload', 'content operations'],
    body: lexicalRoot([
      headingNode('h2', 'Why the integration matters'),
      paragraphNode([
        textNode(
          'A strong CMS-to-blog integration gives editors a clean authoring flow while keeping frontend content predictable, searchable, and ready for reuse across marketing surfaces.',
        ),
      ]),
      headingNode('h3', 'What this setup should support'),
      bulletListNode([
        'Structured authoring with title, slug, body, category, and publish state',
        'Editorial ownership through author attribution and draft review workflows',
        'Predictable REST API responses for downstream services that read blog content',
      ]),
      paragraphNode([
        textNode(
          'This seeded article exists so developers and content editors can verify the end-to-end shape without needing to hand-build the first record in Payload.',
        ),
      ]),
    ]),
  },
  {
    title: 'Editorial Workflow: Draft, Review, and Publish Inside Payload CMS',
    slug: 'payload-editorial-workflow-for-blog-content',
    category: {
      slug: 'content-operations',
      name: 'Content Operations',
      description: 'Processes, approvals, and tooling for editorial teams.',
    },
    status: 'published',
    publishedAt: '2026-04-12T17:30:00.000Z',
    tags: ['editorial workflow', 'payload cms', 'publishing'],
    body: lexicalRoot([
      headingNode('h2', 'A practical publishing loop'),
      paragraphNode([
        textNode(
          'Writers should be able to create blog drafts quickly, editors should be able to review them confidently, and published entries should become immediately available to the services that consume CMS content.',
        ),
      ]),
      bulletListNode([
        'Authors create and refine draft content',
        'Content editors review body copy, category placement, and tags',
        'Published posts become available through the blog-posts collection API',
      ]),
      paragraphNode([
        textNode(
          'Adding seed content makes it much easier to validate list pages, filters, and category relationships during local development.',
        ),
      ]),
    ]),
  },
  {
    title: 'Category-Driven Blog Discovery for Service and Marketplace Content',
    slug: 'category-driven-blog-discovery',
    category: {
      slug: 'seo',
      name: 'SEO',
      description: 'Search visibility, taxonomy, and content discovery.',
    },
    status: 'published',
    publishedAt: '2026-04-14T14:15:00.000Z',
    tags: ['seo', 'taxonomy', 'categories', 'discovery'],
    body: lexicalRoot([
      headingNode('h2', 'Use category relationships intentionally'),
      paragraphNode([
        textNode(
          'When blog posts point to a CMS category, downstream services can cluster content by topic and surface more relevant supporting articles alongside marketplace pages.',
        ),
      ]),
      bulletListNode([
        'Use stable slugs for category matching',
        'Keep category names editor-friendly in the admin panel',
        'Reuse the same category taxonomy across adjacent content experiences when possible',
      ]),
      paragraphNode([
        textNode(
          'This sample post gives the integration a realistic category-linked document to query against.',
        ),
      ]),
    ]),
  },
  {
    title: 'Measuring Blog Performance Across CMS and Frontend Surfaces',
    slug: 'measuring-blog-performance-across-cms-and-frontend',
    category: {
      slug: 'analytics',
      name: 'Analytics',
      description: 'Reporting, attribution, and performance measurement.',
    },
    status: 'draft',
    tags: ['analytics', 'content performance', 'reporting'],
    body: lexicalRoot([
      headingNode('h2', 'Track the right signals early'),
      paragraphNode([
        textNode(
          'Draft content is still useful in development because it exercises moderation rules and helps teams confirm that public reads are limited to published entries.',
        ),
      ]),
      bulletListNode([
        'Separate editor previews from public blog queries',
        'Compare CMS publish state with frontend visibility',
        'Use draft records to test review and QA workflows before launch',
      ]),
    ]),
  },
];

async function ensureSeedAuthor(payload: Payload): Promise<number> {
  const existing = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: SEEDED_AUTHOR_EMAIL,
      },
    },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0) {
    return existing.docs[0].id as number;
  }

  const created = await payload.create({
    collection: 'users',
    data: {
      email: SEEDED_AUTHOR_EMAIL,
      password: SEEDED_AUTHOR_PASSWORD,
      name: 'CMS Blog Seed Author',
      userType: 'admin',
      role: 'author',
      status: 'active',
    } as never,
    overrideAccess: true,
    disableVerificationEmail: true,
  });

  payload.logger.info(`BlogPosts: created seed author ${SEEDED_AUTHOR_EMAIL}`);
  return created.id as number;
}

async function ensureCategory(
  payload: Payload,
  category: BlogPostSeed['category'],
): Promise<number> {
  const existing = await payload.find({
    collection: 'categories',
    where: {
      slug: {
        equals: category.slug,
      },
    },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0) {
    return existing.docs[0].id as number;
  }

  const created = await payload.create({
    collection: 'categories',
    data: {
      name: category.name,
      slug: category.slug,
      description: category.description,
      listingTypes: ['service'],
      status: 'active',
      sortOrder: 0,
    } as never,
    overrideAccess: true,
  });

  payload.logger.info(`BlogPosts: created category ${category.slug}`);
  return created.id as number;
}

export async function seedBlogPosts(payload: Payload): Promise<void> {
  const authorId = await ensureSeedAuthor(payload);

  for (const post of BLOG_POSTS) {
    const existing = await payload.find({
      collection: 'blog-posts',
      where: {
        slug: {
          equals: post.slug,
        },
      },
      limit: 1,
      overrideAccess: true,
    });

    if (existing.totalDocs > 0) {
      payload.logger.info(`BlogPosts: "${post.slug}" already exists - skipping`);
      continue;
    }

    const categoryId = await ensureCategory(payload, post.category);

    await payload.create({
      collection: 'blog-posts',
      data: {
        title: post.title,
        slug: post.slug,
        body: post.body,
        author: authorId,
        category: categoryId,
        tags: post.tags.map((tag) => ({ tag })),
        status: post.status,
        publishedAt: post.publishedAt,
      } as never,
      overrideAccess: true,
    });

    payload.logger.info(`BlogPosts: seeded "${post.slug}"`);
  }
}
