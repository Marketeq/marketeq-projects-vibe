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
  headline: 'Expert Tech Teams on Demand',
  subheadline:
    'Get your project done right with one of our vetted expert teams, fully customizable done-for-you services.',
  backgroundImage: '/sending-emails.png',
  ctaLabel: 'Browse Projects',
  ctaUrl: '/c/development',
};

export const HOMEPAGE_SECTIONS: SectionConfig[] = [
  {
    key: 'our-favorites',
    title: 'Our Favorite Projects',
    subtitle:
      'Hand-picked projects from our top-rated experts across every category — see what teams are building right now.',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 12, kind: 'top_rated', sort: 'newest' },
    ],
  },
  {
    key: 'newest-additions',
    title: 'Newest Additions',
    subtitle:
      'The latest projects and services added to the Marketeq marketplace this week.',
    blocks: [
      { entity: 'projects', type: 'grid', limit: 6, kind: 'newest', sort: 'newest' },
      { entity: 'services', type: 'grid', limit: 6, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    key: 'most-popular',
    title: 'Most Popular Projects',
    subtitle:
      'The projects and services generating the most interest from clients across the platform.',
    blocks: [
      { entity: 'projects', type: 'grid', limit: 6, kind: 'most_popular', sort: 'newest' },
      { entity: 'services', type: 'grid', limit: 6, kind: 'most_popular', sort: 'newest' },
    ],
  },
  {
    key: 'online-sales',
    title: 'Online Sales Funnels',
    subtitle:
      'High-converting funnels, landing pages, and lead capture systems built by proven growth experts.',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    key: 'customer-service',
    title: 'Customer Service Solutions',
    subtitle:
      'Help desks, chatbots, and support workflows designed to scale your customer experience.',
    blocks: [
      { entity: 'services', type: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    key: 'marketing-automation',
    title: 'Marketing Automation Campaigns',
    subtitle:
      'End-to-end automation workflows across email, SMS, and CRM that turn prospects into customers.',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    key: 'cloud-software',
    title: 'Cloud Software Applications',
    subtitle:
      'Custom SaaS builds, internal tools, and cloud-native applications shipped by senior engineering teams.',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
    ],
  },
  {
    key: 'mobile-apps',
    title: 'Mobile Applications',
    subtitle:
      'Native and cross-platform iOS and Android apps designed and developed by expert mobile teams.',
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
  headline: 'Join the Marketeq Talent Network',
  description:
    'Apply to join our network of pre-vetted experts and start getting matched with high-quality projects.',
  ctaLabel: 'Apply as Talent',
  ctaUrl: '/sign-up?role=talent',
};

export const HOMEPAGE_FOOTER_NAV: FooterNavColumn[] = [
  {
    heading: 'For Clients',
    links: [
      { label: 'Browse Projects', url: '/c/development' },
      { label: 'Browse Services', url: '/c/design' },
      { label: 'How It Works', url: '/how-it-works' },
      { label: 'Enterprise', url: '/enterprise' },
    ],
  },
  {
    heading: 'For Talent',
    links: [
      { label: 'Apply as Talent', url: '/sign-up?role=talent' },
      { label: 'Talent Dashboard', url: '/talent-dashboard' },
      { label: 'Resources', url: '/resources' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', url: '/about' },
      { label: 'Blog', url: '/blog' },
      { label: 'Careers', url: '/careers' },
      { label: 'Contact', url: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of Service', url: '/terms' },
      { label: 'Privacy Policy', url: '/privacy' },
      { label: 'Cookie Policy', url: '/cookies' },
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
