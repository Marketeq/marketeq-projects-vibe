import {
  SectionConfig,
  HomepageHero,
  CategoryRef,
  TalentNetworkCta,
  FooterNavColumn,
  HomepageSeo,
} from './homepage.types';

// ── Static configuration ────────────────────────────────────────────────────
// These defaults are used when the CMS service is unavailable or not yet
// configured. When Payload CMS is integrated, the HomepageService will
// fetch hero, sections, banner, footer, and SEO from the CMS and fall
// back to these values on error.
// ─────────────────────────────────────────────────────────────────────────────

export const HOMEPAGE_HERO: HomepageHero = {
  intervalMs: 7000,
  slides: [
    {
      eyebrow: 'UI / UX Design',
      title: 'UX / UI Experts on Demand',
      description:
        'Ship pixel-perfect product experiences with senior designers who embed with your team in days, not months.',
      ctaLabel: 'Browse UX / UI experts',
      ctaUrl: '/c/design/ui-ux-design',
      image: '/sending-emails.png',
      accent: 'from-[#1661F6]/40 via-transparent to-[#0B1C3A]/60',
    },
    {
      eyebrow: 'AI & Machine Learning',
      title: 'AI Specialists Who Ship',
      description:
        'From RAG pipelines to production ML — hire AI engineers who turn your data into revenue, not research papers.',
      ctaLabel: 'Explore AI talent',
      ctaUrl: '/c/development/ai-ml',
      image: '/artificial-intelligence.jpeg',
      accent: 'from-[#6E3DF6]/45 via-transparent to-[#0B1C3A]/65',
    },
    {
      eyebrow: 'Cloud & DevOps',
      title: 'Cloud & DevOps, Done Right',
      description:
        'Scale confidently with certified cloud architects — AWS, GCP, Azure, Kubernetes, and CI/CD built to last.',
      ctaLabel: 'Find cloud engineers',
      ctaUrl: '/c/development/cloud-devops',
      image: '/clouds.png',
      accent: 'from-[#0EA5E9]/40 via-transparent to-[#0B1C3A]/65',
    },
    {
      eyebrow: 'Mobile Development',
      title: 'Mobile Teams That Launch',
      description:
        'Native iOS, Android, and cross-platform apps built by teams with App Store and Play Store hits on their resume.',
      ctaLabel: 'Meet mobile teams',
      ctaUrl: '/c/development/mobile-development',
      image: '/design-screens.png',
      accent: 'from-[#F6953D]/35 via-transparent to-[#0B1C3A]/65',
    },
  ],
};

export const HOMEPAGE_SECTIONS: SectionConfig[] = [
  {
    key: 'our-favorites',
    title: 'Our Favorite Projects',
    subtitle:
      'Hand-picked projects from our top-rated experts across every category — see what teams are building right now.',
    ctaLabel: 'View All',
    ctaUrl: '/projects?featured=true',
    blocks: [
      // Editorial curation: only items with `featured = true`, ranked by top_rated
      // among that featured pool. Matches spec 00-HP §4.4.
      {
        entity: 'projects',
        type: 'carousel',
        limit: 12,
        kind: 'top_rated',
        sort: 'newest',
        featuredOnly: true,
      },
    ],
  },
  {
    key: 'newest-additions',
    title: 'Newest Additions',
    subtitle:
      'The latest projects added to the Marketeq marketplace this week.',
    ctaLabel: 'View More',
    ctaUrl: '/projects?sort=newest',
    blocks: [
      // Spec §5.3: 3-column grid with 9 visible cards (3 rows). Projects only.
      { entity: 'projects', type: 'grid', limit: 9, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    key: 'most-popular',
    title: 'Most Popular Projects',
    subtitle:
      'The projects generating the most interest from clients across the platform.',
    ctaLabel: 'View More',
    ctaUrl: '/projects?sort=popular',
    tabs: [
      { label: 'View All', slug: 'all' },
      { label: 'Top Web Projects', slug: 'web', categoryFilter: 'web' },
      { label: 'Top Mobile Projects', slug: 'mobile', categoryFilter: 'mobile' },
      { label: 'Top Cloud Projects', slug: 'cloud', categoryFilter: 'cloud' },
      {
        label: 'Top Digital Marketing Projects',
        slug: 'digital-marketing',
        categoryFilter: 'digital-marketing',
      },
    ],
    blocks: [
      // Spec §6.5: same 3-column grid as Newest Additions (9 cards per tab).
      { entity: 'projects', type: 'grid', limit: 9, kind: 'most_popular', sort: 'newest' },
    ],
  },
  {
    key: 'top-teams',
    title: 'Top Rated Teams',
    subtitle:
      'Pre-vetted expert teams ready to take on your next project — browse by specialization.',
    blocks: [
      { entity: 'teams', type: 'carousel', limit: 8, kind: 'top_rated', sort: 'newest' },
    ],
  },
  {
    key: 'online-sales',
    title: 'Online Sales Funnels',
    subtitle:
      'High-converting funnels, landing pages, and lead capture systems built by proven growth experts.',
    ctaLabel: 'View More Projects',
    ctaUrl: '/c/marketing/sales-funnels',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    // Spec §7.1.2: "standard project card"
    key: 'customer-service',
    title: 'Customer Service Solutions',
    subtitle:
      'Help desks, chatbots, and support workflows designed to scale your customer experience.',
    ctaLabel: 'View More Projects',
    ctaUrl: '/c/customer-service',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    // Spec §7.1.3 / §7.3: "service card — differs from project cards",
    // monthly-pricing format (e.g. "$5,000/month").
    key: 'marketing-automation',
    title: 'Marketing Automation Campaigns',
    subtitle:
      'End-to-end automation workflows across email, SMS, and CRM that turn prospects into customers.',
    ctaLabel: 'View More Services',
    ctaUrl: '/c/marketing/automation',
    blocks: [
      { entity: 'services', type: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    key: 'cloud-software',
    title: 'Cloud Software Applications',
    subtitle:
      'Custom SaaS builds, internal tools, and cloud-native applications shipped by senior engineering teams.',
    ctaLabel: 'View More Projects',
    ctaUrl: '/c/development/cloud-software',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    key: 'mobile-apps',
    title: 'Mobile Applications',
    subtitle:
      'Native and cross-platform iOS and Android apps designed and developed by expert mobile teams.',
    ctaLabel: 'View More Projects',
    ctaUrl: '/c/development/mobile-development',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
    ],
  },
];

export const HOMEPAGE_POPULAR_TABS: CategoryRef[] = [
  { name: 'Research', slug: 'research', iconUrl: null },
  { name: 'Design', slug: 'design', iconUrl: null },
  { name: 'Development', slug: 'development', iconUrl: null },
  { name: 'Testing', slug: 'testing', iconUrl: null },
  { name: 'Security', slug: 'security', iconUrl: null },
  { name: 'Maintenance', slug: 'maintenance', iconUrl: null },
  { name: 'Digital Marketing', slug: 'digital-marketing', iconUrl: null },
];

export const HOMEPAGE_MORE_CATEGORIES: CategoryRef[] = [
  { name: 'Interaction Design', slug: 'interaction-design', iconUrl: null },
  { name: 'Cloud Security', slug: 'cloud-security', iconUrl: null },
  { name: 'Blockchain Development', slug: 'blockchain-development', iconUrl: null },
  { name: 'Data Science', slug: 'data-science', iconUrl: null },
  { name: 'DevOps', slug: 'devops', iconUrl: null },
  { name: 'AI & Machine Learning', slug: 'ai-machine-learning', iconUrl: null },
];

export const HOMEPAGE_TALENT_CTA: TalentNetworkCta = {
  headline: 'Marketeq Talent Network',
  description:
    'Want the freedom of working from home without competing with overseas rates? Join our national talent network and get a chance to work on exciting projects from top corporations and disruptive startups.',
  ctaLabel: 'Join the talent network',
  ctaUrl: '/sign-up?role=talent',
};

// Footer columns mirror the spec (00-HP §10.1): About / Solutions /
// Industries / Resources. URLs are best-effort defaults — wire to real
// pages or override via CMS as those pages ship.
export const HOMEPAGE_FOOTER_NAV: FooterNavColumn[] = [
  {
    heading: 'About',
    links: [
      { label: 'Why Marketeq?', url: '/about' },
      { label: 'Careers', url: '/careers' },
      { label: 'Partnerships', url: '/partnerships' },
      { label: 'Support', url: '/support' },
      { label: 'Core Values', url: '/about#values' },
      { label: 'Events', url: '/events' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'User Experience (UX)', url: '/c/design/ui-ux-design' },
      { label: 'Interactive Prototyping', url: '/c/design/prototyping' },
      { label: 'Mobile Development', url: '/c/development/mobile' },
      { label: 'Software Engineering', url: '/c/development' },
      { label: 'Digital Marketing', url: '/c/marketing/digital-marketing' },
      { label: 'Growth Strategy', url: '/c/marketing/growth' },
      { label: 'Q/A Testing', url: '/c/development/qa-testing' },
    ],
  },
  {
    heading: 'Industries',
    links: [
      { label: 'Logistics', url: '/industries/logistics' },
      { label: 'Retail', url: '/industries/retail' },
      { label: 'Government', url: '/industries/government' },
      { label: 'Enterprise', url: '/industries/enterprise' },
      { label: 'Fintech', url: '/industries/fintech' },
      { label: 'Medical', url: '/industries/medical' },
      { label: 'Marketing', url: '/industries/marketing' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Help Center', url: '/help' },
      { label: 'Video Library', url: '/resources/videos' },
      { label: 'Articles', url: '/blog' },
      { label: 'Inspiration', url: '/resources/inspiration' },
      { label: 'Project Templates', url: '/resources/templates' },
      { label: 'PartnerUp Offers', url: '/partnerships/offers' },
    ],
  },
];

export const HOMEPAGE_SEO: HomepageSeo = {
  metaTitle: 'Marketeq — Expert Tech Teams on Demand',
  metaDescription:
    'Hire pre-vetted expert teams for your next project. Browse projects, services, and talent across development, design, marketing, and more.',
  canonical: 'https://marketeq.com',
  ogImage: null,
  noindex: false,
};
