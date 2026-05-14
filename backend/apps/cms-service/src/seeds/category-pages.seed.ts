import type { Payload } from 'payload';

type CategoryPageFixture = {
  level: 'l1' | 'l2' | 'l3';
  path: string;
  displayTitle: string;
  featured?: boolean;
  heroBanner?: { title?: string; subtitle?: string };
  intro?: string;
  faq?: { question: string; answer: string }[];
};

const CATEGORY_PAGE_FIXTURES: CategoryPageFixture[] = [
  // ── L1 ─────────────────────────────────────────────────────────────────
  {
    level: 'l1',
    path: 'development',
    displayTitle: 'Development (L1)',
    featured: true,
    heroBanner: {
      title: 'Hire Expert Developers',
      subtitle: 'From web apps to APIs — find vetted engineering talent ready to build.',
    },
    intro:
      'Browse development projects across web, mobile, and infrastructure. Every team on Marketeq is pre-vetted for technical expertise and delivery track record.',
    faq: [
      { question: 'How do I choose the right development team?', answer: 'Filter by technology stack, team size, and past project ratings. Each profile includes portfolio samples and peer reviews.' },
      { question: 'What technologies are covered?', answer: 'Frontend (React, Next.js, Vue), Backend (Node, Python, Go, Java), Mobile (iOS, Android, React Native), and Cloud/DevOps.' },
      { question: 'Are developers available for long-term contracts?', answer: 'Yes. You can hire project-by-project or set up a recurring retainer with your chosen team.' },
      { question: 'What happens if I am not satisfied with the work?', answer: 'Marketeq\'s refund protection covers you if the delivered work does not meet the agreed scope.' },
    ],
  },
  {
    level: 'l1',
    path: 'design',
    displayTitle: 'Design (L1)',
    featured: true,
    heroBanner: {
      title: 'World-Class Design Talent',
      subtitle: 'Brand identity, product UI, and design systems — built by specialists.',
    },
    intro:
      'Explore design projects from top-rated studios and freelancers. Whether you need a brand refresh or a full product redesign, find the right creative partner here.',
    faq: [
      { question: 'Do designers on Marketeq follow accessibility standards?', answer: 'Yes. Profiles include WCAG compliance experience and you can filter by accessibility expertise.' },
      { question: 'Can I see design work before committing?', answer: 'Every designer profile includes a portfolio. You can also request a paid discovery session before the main engagement.' },
      { question: 'What file formats will I receive?', answer: 'Deliverables are agreed upfront — typically Figma source files, exported assets, and brand guidelines PDFs.' },
      { question: 'How long does a typical design project take?', answer: 'A logo and brand kit usually takes 1–2 weeks. A full product UI/UX engagement is typically 4–8 weeks.' },
    ],
  },
  {
    level: 'l1',
    path: 'marketing',
    displayTitle: 'Marketing (L1)',
    featured: false,
    heroBanner: {
      title: 'Grow Faster with Expert Marketers',
      subtitle: 'SEO, paid ads, and content strategy — performance-driven teams.',
    },
    intro:
      'Connect with marketing specialists who combine strategy with execution. From search rankings to paid acquisition, find the team that fits your growth goals.',
    faq: [
      { question: 'How do marketers on Marketeq measure success?', answer: 'Each project scope includes agreed KPIs. Teams report weekly with dashboards you have full access to.' },
      { question: 'Can I hire for a one-off campaign?', answer: 'Absolutely. Many teams offer fixed-scope campaign packages as well as ongoing retainers.' },
      { question: 'Do teams handle both strategy and execution?', answer: 'Most teams on Marketeq are full-service. Filter by "strategy + execution" to find them.' },
      { question: 'What channels are covered?', answer: 'Google Ads, Meta, SEO, email, content marketing, affiliate, and more.' },
    ],
  },
  {
    level: 'l1',
    path: 'content',
    displayTitle: 'Content (L1)',
    featured: false,
    heroBanner: {
      title: 'Content That Converts',
      subtitle: 'Copywriting, blog content, and case studies from domain experts.',
    },
    intro:
      'Find content specialists who understand your industry. Marketeq writers deliver SEO-optimised, audience-tested copy across every format and vertical.',
    faq: [
      { question: 'Are writers familiar with SEO best practices?', answer: 'Yes. You can filter by SEO writing experience and keyword strategy skills.' },
      { question: 'Can I request content in multiple languages?', answer: 'Marketeq has writers covering 20+ languages. Filter by language on the category page.' },
      { question: 'How are revisions handled?', answer: 'Most scopes include at least two revision rounds. The number of revisions is agreed in the project brief.' },
      { question: 'Do writers sign NDAs?', answer: 'NDA templates are available through Marketeq Contracts and can be sent to any writer before work begins.' },
    ],
  },

  // ── L2 ─────────────────────────────────────────────────────────────────
  {
    level: 'l2',
    path: 'development/web-development',
    displayTitle: 'Web Development (L2)',
    featured: true,
    heroBanner: {
      title: 'Full-Stack Web Development',
      subtitle: 'React, Next.js, Node, and more — ship production-ready web apps.',
    },
    intro:
      'From landing pages to complex SaaS platforms, browse teams with proven track records in modern web stacks. Every team is reviewed for code quality and delivery reliability.',
    faq: [
      { question: 'Do teams provide code documentation?', answer: 'Yes. Project scopes on Marketeq include a documentation deliverable by default.' },
      { question: 'Can the team help with hosting and deployment?', answer: 'Most full-stack teams offer DevOps add-ons covering CI/CD setup, cloud hosting, and monitoring.' },
    ],
  },
  {
    level: 'l2',
    path: 'development/mobile-apps',
    displayTitle: 'Mobile Apps (L2)',
    featured: false,
    heroBanner: {
      title: 'iOS & Android App Development',
      subtitle: 'Native and cross-platform — launch faster with experienced mobile teams.',
    },
    intro:
      'Build polished mobile apps with teams that know App Store and Play Store submission inside-out. Filter by platform, framework, and industry vertical.',
    faq: [
      { question: 'Do teams handle App Store submission?', answer: 'Yes. Most mobile teams include App Store and Play Store submission in the launch milestone.' },
      { question: 'React Native or native Swift/Kotlin — what should I choose?', answer: 'Teams can advise during the scoping call. React Native is faster and cheaper for most MVPs; native is better for performance-critical apps.' },
    ],
  },
  {
    level: 'l2',
    path: 'design/ui-ux-design',
    displayTitle: 'UI/UX Design (L2)',
    featured: true,
    heroBanner: {
      title: 'Product UI/UX Design',
      subtitle: 'User research, wireframes, prototypes, and pixel-perfect handoffs.',
    },
    intro:
      'Work with designers who validate ideas before building them. Every engagement includes user research, wireframing, and developer-ready Figma files.',
    faq: [
      { question: 'Do designers conduct user research?', answer: 'Many do. Filter by "UX research" to find teams that offer interview facilitation, usability testing, and synthesis.' },
      { question: 'How are Figma files handed off to developers?', answer: 'Teams deliver annotated Figma files with component specs, spacing tokens, and a design system if applicable.' },
    ],
  },
  {
    level: 'l2',
    path: 'marketing/seo',
    displayTitle: 'SEO (L2)',
    featured: false,
    heroBanner: {
      title: 'Search Engine Optimisation',
      subtitle: 'Technical SEO, content strategy, and link building — rank higher, faster.',
    },
    intro:
      'Find SEO specialists who go beyond keywords. Teams on Marketeq cover technical audits, content gap analysis, and sustainable link-building strategies.',
    faq: [
      { question: 'How long until I see results?', answer: 'SEO timelines vary, but most technical fixes show measurable impact within 60–90 days. Organic content typically shows gains in 3–6 months.' },
      { question: 'Do teams handle both on-page and off-page SEO?', answer: 'Yes. You can scope one or both. Most full-service SEO teams on Marketeq cover technical, on-page, and link acquisition.' },
    ],
  },
];

async function upsertCategoryPage(
  payload: Payload,
  fixture: CategoryPageFixture,
): Promise<void> {
  const existing = await payload.find({
    collection: 'category-pages',
    where: { path: { equals: fixture.path } },
    limit: 1,
    overrideAccess: true,
  });

  const data: Record<string, any> = {
    level: fixture.level,
    path: fixture.path,
    displayTitle: fixture.displayTitle,
    featured: fixture.featured ?? false,
    _status: 'published',
    heroBanner: fixture.heroBanner
      ? {
          title: fixture.heroBanner.title ?? null,
          subtitle: fixture.heroBanner.subtitle ?? null,
          image: null,
        }
      : null,
    intro: fixture.intro ?? null,
    faq: fixture.faq ?? [],
  };

  if (existing.totalDocs > 0) {
    await payload.update({
      collection: 'category-pages',
      id: existing.docs[0].id as any,
      data,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'category-pages',
      data,
      overrideAccess: true,
      disableVerificationEmail: true,
    });
  }
}

export async function seedCategoryPages(payload: Payload): Promise<void> {
  console.log(`Seeding ${CATEGORY_PAGE_FIXTURES.length} category pages...`);
  let seeded = 0;
  for (const fixture of CATEGORY_PAGE_FIXTURES) {
    await upsertCategoryPage(payload, fixture);
    seeded++;
    console.log(`  ✓ ${fixture.path}`);
  }
  console.log(`Done — ${seeded} category pages seeded.`);
}
