import type { Payload } from 'payload'
import crypto from 'node:crypto'

function unsplash(id: string, w = 1200): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`
}

async function upsertExternalMedia(
  payload: Payload,
  url: string,
  alt: string,
): Promise<number | null> {
  const match = url.match(/photo-([a-z0-9-]+)/)
  const photoId = match?.[1] ?? String(Date.now())
  const filename = `seed-${photoId}.jpg`

  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
  })
  if (existing.totalDocs > 0) return existing.docs[0].id as number

  let buffer: Buffer
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    buffer = Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }

  const created = await payload.create({
    collection: 'media',
    data: { alt } as any,
    file: {
      data: buffer,
      mimetype: 'image/jpeg',
      name: filename,
      size: buffer.length,
    } as any,
    overrideAccess: true,
    disableVerificationEmail: true,
  })
  return created.id as number
}

async function ensureUser(
  payload: Payload,
  email: string,
  name: string,
  role: 'admin' | 'developer' | 'content_editor' | 'author',
): Promise<number> {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.totalDocs > 0) return existing.docs[0].id as number

  const created = await payload.create({
    collection: 'users',
    overrideAccess: true,
    disableVerificationEmail: true,
    data: {
      email,
      password: 'SeedUser!2026',
      name,
      userType: 'admin',
      role,
      status: 'active',
    } as any,
  })
  return created.id as number
}

async function seedFeatureFlags(payload: Payload) {
  const flags = [
    {
      key: 'homepage.cms',
      enabled: true,
      rolloutPercentage: 100,
      description: 'Serve homepage content from Payload CMS (homepages collection).',
    },
    {
      key: 'projects.pricingSidebarV2',
      enabled: true,
      rolloutPercentage: 100,
      description: 'Enable new project-details pricing sidebar layout.',
    },
  ]

  for (const flag of flags) {
    const existing = await payload.find({
      collection: 'feature-flags',
      where: { key: { equals: flag.key } },
      limit: 1,
    })
    if (existing.totalDocs > 0) continue
    await payload.create({
      collection: 'feature-flags',
      data: flag as any,
      overrideAccess: true,
    })
  }
}

function lexical(text: string) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          textFormat: 0,
          textStyle: '',
          children: [
            {
              mode: 'normal',
              text,
              type: 'text',
              style: '',
              detail: 0,
              format: 0,
              version: 1,
            },
          ],
        },
      ],
    },
  }
}

async function seedMediaLibrary(payload: Payload) {
  const library = [
    { id: '1558655146-9f40138edfeb', alt: 'Design hero seed image' },
    { id: '1551288049-bebda4e38f71', alt: 'Code editor seed image' },
    { id: '1518770660439-4636190af475', alt: 'Cloud infrastructure seed image' },
    { id: '1517180102446-f3ece451e9d8', alt: 'Mobile app seed image' },
    { id: '1502685104226-ee32379fefbe', alt: 'Profile avatar seed image' },
    { id: '1521737604893-d14cc237f11d', alt: 'Landing page seed image' },
    { id: '1542831371-29b0f74f9713', alt: 'iOS development seed image' },
    { id: '1614064641938-3bbee52942c7', alt: 'Kubernetes seed image' },
    { id: '1461749280684-dccba630e2f6', alt: 'Frontend UI seed image' },
    { id: '1486312338219-ce68d2c6f44d', alt: 'Product design seed image' },
    { id: '1544005313-94ddf0286df2', alt: 'Portfolio seed image' },
    { id: '1555066931-4365d14bab8c', alt: 'Analytics seed image' },
    { id: '1556157382-97eda2d62296', alt: 'Marketing seed image' },
    { id: '1522071820081-009f0129c71c', alt: 'Security seed image' },
    { id: '1519389950473-47ba0277781c', alt: 'Marketplace seed image' },
  ]

  for (const item of library) {
    await upsertExternalMedia(
      payload,
      unsplash(item.id, 1400),
      item.alt,
    )
  }
}

async function seedCategoriesAndPages(payload: Payload) {
  // Rich, homepage-like taxonomy seed for CMS collections.
  // NOTE: Sync to category-service requires RabbitMQ + consumer (not guaranteed in local dev).
  const l1 = [
    {
      name: 'Research',
      slug: 'research',
      description:
        'User research, market insight, positioning, and discovery — everything needed to validate ideas before you build.',
      icon: '1555066931-4365d14bab8c',
      children: [
        { name: 'UX Research', slug: 'ux-research' },
        { name: 'Market Research', slug: 'market-research' },
        { name: 'Usability Testing', slug: 'usability-testing' },
      ],
    },
    {
      name: 'Design',
      slug: 'design',
      description:
        'Brand, UI/UX, systems, and creative direction — design teams that ship production-ready assets.',
      icon: '1558655146-9f40138edfeb',
      children: [
        { name: 'Interaction Design', slug: 'interaction-design' },
        { name: 'UI / UX Design', slug: 'ui-ux-design' },
        { name: 'Design Systems', slug: 'design-systems' },
      ],
    },
    {
      name: 'Development',
      slug: 'development',
      description:
        'Full-stack engineering for web, mobile, cloud, and AI — build fast without sacrificing reliability.',
      icon: '1551288049-bebda4e38f71',
      children: [
        { name: 'Cloud Software', slug: 'cloud-software' },
        { name: 'Mobile Development', slug: 'mobile-development' },
        { name: 'Artificial Intelligence', slug: 'artificial-intelligence' },
        { name: 'Blockchain Development', slug: 'blockchain-development' },
      ],
    },
    {
      name: 'Security',
      slug: 'security',
      description:
        'Threat modeling, audits, and hardening — security work you can deploy confidently.',
      icon: '1522071820081-009f0129c71c',
      children: [
        { name: 'Cloud Security', slug: 'cloud-security' },
        { name: 'Penetration Testing', slug: 'penetration-testing' },
        { name: 'Compliance', slug: 'compliance' },
      ],
    },
    {
      name: 'Digital Marketing',
      slug: 'digital-marketing',
      description:
        'Performance marketing, content, automation, and growth — campaigns that compound.',
      icon: '1556157382-97eda2d62296',
      children: [
        { name: 'Online Sales Funnels', slug: 'sales-funnels' },
        { name: 'Marketing Automation', slug: 'marketing-automation' },
        { name: 'Content Strategy', slug: 'content-strategy' },
      ],
    },
  ]

  async function ensureCategory(params: {
    name: string
    slug: string
    description: string
    iconPhotoId?: string
    parentId?: number
  }): Promise<number> {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: params.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) return existing.docs[0].id as number

    const iconId = params.iconPhotoId
      ? await upsertExternalMedia(
          payload,
          unsplash(params.iconPhotoId, 512),
          `${params.name} icon`,
        )
      : null

    const created = await payload.create({
      collection: 'categories',
      overrideAccess: true,
      data: {
        uuid: crypto.randomUUID(),
        name: params.name,
        slug: params.slug,
        description: params.description,
        icon: iconId ?? undefined,
        parent: params.parentId ?? undefined,
        listingTypes: ['project', 'service'],
        status: 'active',
        sortOrder: 0,
      } as any,
    })
    return created.id as number
  }

  async function ensureCategoryPage(params: {
    level: 'l1' | 'l2'
    path: string
    displayTitle: string
    categoryId: string
    slug: string
    name: string
    heroPhotoId: string
    introText: string
    featured?: boolean
  }) {
    const existing = await payload.find({
      collection: 'category-pages',
      where: { path: { equals: params.path } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) return

    const heroImage = await upsertExternalMedia(
      payload,
      unsplash(params.heroPhotoId, 1600),
      `${params.name} hero`,
    )

    await payload.create({
      collection: 'category-pages',
      overrideAccess: true,
      data: {
        level: params.level,
        displayTitle: params.displayTitle,
        path: params.path,
        categoryRef: {
          categoryId: params.categoryId,
          slug: params.slug,
          name: params.name,
          breadcrumb: [{ label: params.name, slug: params.slug }],
        },
        heroBanner: {
          image: heroImage ?? undefined,
          titleOverride: `${params.name} Projects`,
          descriptionOverride:
            'Browse curated projects, compare budgets and timelines, and connect with teams that ship.',
          ctaLabel: 'Explore projects',
          ctaHref: `/c/${params.path}/projects`,
        },
        intro: lexical(params.introText),
        faq: [
          {
            question: `How do I choose a ${params.name.toLowerCase()} team?`,
            answer:
              'Start with portfolios and outcomes. Shortlist 2–3 teams, ask about delivery cadence, and confirm scope before kickoff.',
          },
          {
            question: 'How does pricing work?',
            answer:
              'Most listings include a starting price with a clear timeline. Complex work can be expanded with add-ons or milestones.',
          },
        ],
        relatedReads: [
          { title: 'Editorial workflow inside Payload', href: '/blog/payload-editorial-workflow-for-blog-content' },
          { title: 'Category-driven discovery', href: '/blog/category-driven-blog-discovery' },
        ],
        featured: params.featured ?? false,
      } as any,
    })
  }

  // L1 + L2 category docs (CMS Categories collection)
  for (const parent of l1) {
    const parentId = await ensureCategory({
      name: parent.name,
      slug: parent.slug,
      description: parent.description,
      iconPhotoId: parent.icon,
    })

    await ensureCategoryPage({
      level: 'l1',
      path: parent.slug,
      displayTitle: `${parent.name} (L1)`,
      categoryId: parent.slug,
      slug: parent.slug,
      name: parent.name,
      heroPhotoId: parent.icon,
      introText: parent.description,
      featured: parent.slug === 'design' || parent.slug === 'development',
    })

    for (const child of parent.children) {
      const childId = await ensureCategory({
        name: child.name,
        slug: child.slug,
        description: `${child.name} specialists who deliver production-ready outcomes with clear milestones and measurable results.`,
        parentId,
      })

      // Use child id only to prevent lint; also useful for future linking.
      void childId

      await ensureCategoryPage({
        level: 'l2',
        path: `${parent.slug}/${child.slug}`,
        displayTitle: `${child.name} (L2)`,
        categoryId: child.slug,
        slug: child.slug,
        name: child.name,
        heroPhotoId: parent.icon,
        introText: `Explore ${child.name.toLowerCase()} projects, compare timelines, and hire teams that ship high-quality work quickly.`,
      })
    }
  }
}

async function seedAnnouncements(payload: Payload) {
  const existing = await payload.find({
    collection: 'announcements',
    where: { title: { equals: 'Welcome to Marketeq (Seed)' } },
    limit: 1,
  })
  if (existing.totalDocs > 0) return

  await payload.create({
    collection: 'announcements',
    overrideAccess: true,
    data: {
      title: 'Welcome to Marketeq (Seed)',
      message: lexical(
        'This is seeded content. You can edit or archive this announcement in Payload at any time.',
      ),
      audience: 'all',
      priority: 10,
      status: 'published',
      ctaLabel: 'Browse projects',
      ctaUrl: '/projects',
    } as any,
  })
}

async function seedTestimonials(payload: Payload) {
  const existing = await payload.find({
    collection: 'testimonials',
    where: { authorName: { equals: 'Amina Patel' } },
    limit: 1,
  })
  if (existing.totalDocs > 0) return

  const avatar = await upsertExternalMedia(
    payload,
    unsplash('1502685104226-ee32379fefbe', 400),
    'Testimonial avatar',
  )

  await payload.create({
    collection: 'testimonials',
    overrideAccess: true,
    data: {
      authorName: 'Amina Patel',
      authorTitle: 'VP Product',
      authorCompany: 'Northwind',
      avatar: avatar ?? undefined,
      quote:
        'Marketeq made it easy to hire a senior team quickly. We shipped our MVP on time with clear communication and predictable weekly delivery.',
      rating: 5,
      featured: true,
      status: 'published',
    } as any,
  })
}

async function seedHelpArticles(payload: Payload) {
  const articles = [
    {
      title: 'Getting started: How to hire a team',
      slug: 'getting-started-hire-a-team',
      topic: 'getting-started',
      body: lexical(
        'Browse projects, compare scope and pricing, then apply to join or chat with the team. Use the sidebar to understand pricing, duration, and current team members.',
      ),
      status: 'published',
    },
    {
      title: 'Payments & milestones',
      slug: 'billing-payments-and-milestones',
      topic: 'billing',
      body: lexical(
        'Payments are securely processed and released based on milestones. You can view policy details in the checkout flow.',
      ),
      status: 'published',
    },
  ]

  for (const a of articles) {
    const existing = await payload.find({
      collection: 'help-articles',
      where: { slug: { equals: a.slug } },
      limit: 1,
    })
    if (existing.totalDocs > 0) continue
    await payload.create({
      collection: 'help-articles',
      overrideAccess: true,
      data: a as any,
    })
  }
}

async function seedLandingPages(payload: Payload) {
  const slug = 'ux-ui-on-demand'
  const existing = await payload.find({
    collection: 'landing-pages',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  if (existing.totalDocs > 0) return

  const image = await upsertExternalMedia(
    payload,
    unsplash('1521737604893-d14cc237f11d', 1200),
    'Landing page section image',
  )

  await payload.create({
    collection: 'landing-pages',
    overrideAccess: true,
    data: {
      title: 'UX / UI Experts on Demand',
      slug,
      hero: {
        headline: 'Design that ships faster',
        subheadline:
          'Embed senior product designers who deliver high-fidelity UX, UI, and design systems — without the long hiring cycle.',
        ctaLabel: 'Browse UX / UI projects',
        ctaUrl: '/projects',
      },
      sections: [
        {
          blockType: 'text',
          content: lexical(
            'This landing page is seeded so you can validate layout, SEO, and editorial workflows immediately.',
          ),
        },
        {
          blockType: 'image',
          image: image ?? undefined,
        },
      ],
      status: 'published',
    } as any,
  })
}

async function seedProjectStaticContents(payload: Payload) {
  const existing = await payload.find({
    collection: 'project-static-contents',
    where: { slug: { equals: 'default' } },
    limit: 1,
  })
  if (existing.totalDocs > 0) return

  const icon1 = await upsertExternalMedia(payload, unsplash('1558655146-9f40138edfeb', 256), 'How it works icon')
  const icon2 = await upsertExternalMedia(payload, unsplash('1518770660439-4636190af475', 256), 'How it works icon')
  const icon3 = await upsertExternalMedia(payload, unsplash('1551288049-bebda4e38f71', 256), 'How it works icon')

  await payload.create({
    collection: 'project-static-contents',
    overrideAccess: true,
    data: {
      title: 'Default Project Details Sidebar Content',
      slug: 'default',
      heading: 'Peace of Mind Guarantee',
      guaranteeItems: [
        {
          icon: 'shield-zap',
          title: 'Secure payments',
          description:
            'Your payment is held securely and only released when you approve the delivery.',
        },
        {
          icon: 'rocket',
          title: 'Launch with confidence',
          description:
            'Clear scope, clear milestones, and a team that ships every week — no surprises.',
        },
      ],
      highlightedNotice: {
        icon: 'shield-dollar',
        description:
          'If a project falls short, you can initiate a dispute and we’ll help mediate a fair outcome.',
      },
      policy: {
        prefixText:
          'We securely process payments and release upon rating. Learn how disputes and milestones work.',
        linkLabel: 'See Policy Details.',
        linkHref: '/policy',
      },
      howItWorks: {
        steps: [
          {
            stepNumber: '1',
            title: 'Customize your scope',
            description:
              'Choose deliverables, timeline, and team size. Add-ons are clearly priced.',
            icon: icon1 ?? undefined,
          },
          {
            stepNumber: '2',
            title: 'Meet your team',
            description:
              'Chat with the current team, align on expectations, and confirm kickoff.',
            icon: icon2 ?? undefined,
          },
          {
            stepNumber: '3',
            title: 'Track delivery',
            description:
              'Milestones keep work moving forward with predictable weekly updates.',
            icon: icon3 ?? undefined,
          },
        ],
      },
    } as any,
  })
}

async function seedListings(payload: Payload) {
  const seeds = [
    {
      slug: 'seed-ai-support-platform',
      title: 'AI Support Platform (Seed Listing)',
      excerpt:
        'Build an AI support platform with smart routing, analytics, and agent tooling. Seeded to validate curated editorial cards.',
      cover: '1517180102446-f3ece451e9d8',
      price: 50000,
      rating: 4.9,
      reviewCount: 18,
      editorialLabel: 'staff_pick',
      featuredOrder: 1,
    },
    {
      slug: 'seed-design-system-refresh',
      title: 'Design System Refresh (Seed Listing)',
      excerpt:
        'Ship a cohesive design system: tokens, components, accessibility, and docs. Seeded to validate design listings.',
      cover: '1558655146-9f40138edfeb',
      price: 22000,
      rating: 5,
      reviewCount: 12,
      editorialLabel: 'top_pick',
      featuredOrder: 2,
    },
    {
      slug: 'seed-cloud-cost-optimisation',
      title: 'Cloud Cost Optimisation (Seed Listing)',
      excerpt:
        'Reduce cloud spend with measurable wins: right-sizing, autoscaling, and visibility. Seeded to validate cloud category cards.',
      cover: '1518770660439-4636190af475',
      price: 18000,
      rating: 4.8,
      reviewCount: 9,
      editorialLabel: 'trending',
      featuredOrder: 3,
    },
    {
      slug: 'seed-security-audit',
      title: 'Security Audit & Hardening (Seed Listing)',
      excerpt:
        'Threat model, fix critical issues, and ship hardening changes with a clear report and roadmap.',
      cover: '1522071820081-009f0129c71c',
      price: 14000,
      rating: 4.7,
      reviewCount: 21,
      editorialLabel: 'new',
      featuredOrder: 4,
    },
  ]

  for (const s of seeds) {
    const existing = await payload.find({
      collection: 'listings',
      where: { slug: { equals: s.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) continue

    const cover = await upsertExternalMedia(
      payload,
      unsplash(s.cover, 1400),
      `${s.title} cover`,
    )

    await payload.create({
      collection: 'listings',
      overrideAccess: true,
      data: {
        sourceId: crypto.randomUUID(),
        listingType: 'project',
        title: s.title,
        slug: s.slug,
        excerpt: s.excerpt,
        featured: true,
        featuredOrder: s.featuredOrder,
        editorialLabel: s.editorialLabel,
        coverImage: cover ?? undefined,
        rating: s.rating,
        reviewCount: s.reviewCount,
        price: s.price,
        status: 'published',
        publishedAt: new Date().toISOString(),
      } as any,
    })
  }
}

async function seedTalentProfiles(payload: Payload) {
  const people = [
    {
      username: 'seed-talent-1',
      name: 'Jordan Kim',
      headline: 'Senior Full‑Stack Engineer (Next.js, Node, Postgres)',
      location: 'Austin, TX',
      tz: 'America/Chicago',
      min: 85,
      max: 120,
      skills: ['Next.js', 'TypeScript', 'PostgreSQL', 'Node.js'],
      industries: ['SaaS', 'Fintech', 'Marketplaces'],
      thumb: '1544005313-94ddf0286df2',
    },
    {
      username: 'seed-talent-2',
      name: 'Priya Nair',
      headline: 'Product Designer (Design Systems + Mobile UX)',
      location: 'San Francisco, CA',
      tz: 'America/Los_Angeles',
      min: 75,
      max: 110,
      skills: ['Figma', 'Design Systems', 'Mobile UX', 'Accessibility'],
      industries: ['Healthcare', 'Consumer', 'B2B'],
      thumb: '1486312338219-ce68d2c6f44d',
    },
    {
      username: 'seed-talent-3',
      name: 'Mateo Silva',
      headline: 'Cloud Engineer (Kubernetes, Terraform, AWS)',
      location: 'New York, NY',
      tz: 'America/New_York',
      min: 95,
      max: 145,
      skills: ['Kubernetes', 'Terraform', 'AWS', 'Observability'],
      industries: ['Enterprise', 'SaaS', 'Logistics'],
      thumb: '1614064641938-3bbee52942c7',
    },
    {
      username: 'seed-talent-4',
      name: 'Leila Hassan',
      headline: 'Security Engineer (Audits, AppSec, Compliance)',
      location: 'Boston, MA',
      tz: 'America/New_York',
      min: 110,
      max: 170,
      skills: ['AppSec', 'Threat Modeling', 'OWASP', 'Compliance'],
      industries: ['Fintech', 'Healthcare', 'Enterprise'],
      thumb: '1522071820081-009f0129c71c',
    },
  ]

  for (const p of people) {
    const existing = await payload.find({
      collection: 'talent-profiles',
      where: { username: { equals: p.username } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) continue

    const thumb = await upsertExternalMedia(
      payload,
      unsplash(p.thumb, 900),
      'Portfolio thumbnail',
    )

    await payload.create({
      collection: 'talent-profiles',
      overrideAccess: true,
      data: {
        uuid: crypto.randomUUID(),
        username: p.username,
        name: p.name,
        headline: p.headline,
        availability: '30',
        isAvailable: true,
        location: p.location,
        country: 'USA',
        timezone: p.tz,
        rateMin: p.min,
        rateMax: p.max,
        overview: lexical(
          `${p.headline}. I collaborate closely with teams to ship outcomes — clean handoffs, measurable milestones, and proactive communication.`,
        ),
        skills: p.skills.map((s) => ({ name: s })),
        industryExpertise: p.industries.map((s) => ({ name: s })),
        languages: [{ language: 'English', fluency: 'native' }],
        certifications: [],
        education: [{ institution: 'Seed University', degree: 'B.S.', graduationYear: 2018 }],
        workExperience: [
          {
            role: 'Lead',
            company: 'Seed Studio',
            startDate: '2022-01-01',
            description:
              'Delivered multiple marketplace and SaaS engagements with weekly demos, clear scopes, and high-quality execution.',
          },
        ],
        portfolio: [
          {
            title: 'Selected work',
            url: 'https://example.com',
            thumbnail: thumb ?? undefined,
            description:
              'A representative project demonstrating craftsmanship, reliability, and attention to detail.',
          },
        ],
        status: 'active',
      } as any,
    })
  }
}

async function seedOrders(payload: Payload) {
  const existing = await payload.find({
    collection: 'orders',
    where: { orderNumber: { equals: 'SEED-0001' } },
    limit: 1,
  })
  if (existing.totalDocs > 0) return

  const clientId = await ensureUser(
    payload,
    'seed-client@marketeq.local',
    'Seed Client',
    'content_editor',
  )

  const listing = await payload.find({
    collection: 'listings',
    where: { slug: { equals: 'seed-ai-support-platform' } },
    limit: 1,
  })
  const listingId = listing.totalDocs > 0 ? (listing.docs[0].id as number) : undefined

  await payload.create({
    collection: 'orders',
    overrideAccess: true,
    data: {
      orderNumber: 'SEED-0001',
      client: clientId,
      listing: listingId,
      orderType: 'project',
      totalAmount: 50000_00,
      currency: 'USD',
      status: 'active',
      notes:
        'Seed order to validate admin dashboards and cross-service read paths. Safe to delete.',
      startDate: '2026-04-01T00:00:00.000Z',
    } as any,
  })
}

export async function seedDefaultContent(payload: Payload): Promise<void> {
  await seedMediaLibrary(payload)
  await seedCategoriesAndPages(payload)
  await seedFeatureFlags(payload)
  await seedAnnouncements(payload)
  await seedTestimonials(payload)
  await seedHelpArticles(payload)
  await seedLandingPages(payload)
  await seedProjectStaticContents(payload)
  await seedListings(payload)
  await seedTalentProfiles(payload)
  await seedOrders(payload)
}

