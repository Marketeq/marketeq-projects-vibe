import {
  SectionConfig,
  HomepageHero,
  CategoryRef,
  TalentNetworkCta,
} from './homepage.types';

// ── Static configuration — will be replaced by CMS (Payload) later ─────────

export const HOMEPAGE_HERO: HomepageHero = {
  headline: 'Expert Tech Teams on Demand',
  subheadline:
    'Get your project done right with one of our vetted expert teams, fully customizable done-for-you services.',
  backgroundImage: '/sending-emails.png',
  ctaLabel: 'Browse Projects',
  ctaUrl: '/c/development',
};

/**
 * Each entry defines one section on the homepage.
 * Order here = display order.
 * CMS placeholder: when Payload is integrated these will come from the
 * `homepages` collection instead.
 */
export const HOMEPAGE_SECTIONS: SectionConfig[] = [
  {
    key: 'our-favorites',
    title: 'Our Favorite Projects',
    subtitle:
      'Hand-picked projects from our top-rated experts across every category — see what teams are building right now.',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 12, sort: 'newest' },
    ],
  },
  {
    key: 'newest-additions',
    title: 'Newest Additions',
    subtitle:
      'The latest projects and services added to the Marketeq marketplace this week.',
    blocks: [
      { entity: 'projects', type: 'grid', limit: 6, sort: 'newest' },
      { entity: 'services', type: 'grid', limit: 6, sort: 'newest' },
    ],
  },
  {
    key: 'most-popular',
    title: 'Most Popular Projects',
    subtitle:
      'The projects and services generating the most interest from clients across the platform.',
    blocks: [
      { entity: 'projects', type: 'grid', limit: 6, sort: 'newest' },
      { entity: 'services', type: 'grid', limit: 6, sort: 'newest' },
    ],
  },
  {
    key: 'online-sales',
    title: 'Online Sales Funnels',
    subtitle:
      'High-converting funnels, landing pages, and lead capture systems built by proven growth experts.',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, sort: 'newest' },
    ],
  },
  {
    key: 'customer-service',
    title: 'Customer Service Solutions',
    subtitle:
      'Help desks, chatbots, and support workflows designed to scale your customer experience.',
    blocks: [
      { entity: 'services', type: 'carousel', limit: 8, sort: 'newest' },
    ],
  },
  {
    key: 'marketing-automation',
    title: 'Marketing Automation Campaigns',
    subtitle:
      'End-to-end automation workflows across email, SMS, and CRM that turn prospects into customers.',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, sort: 'newest' },
    ],
  },
  {
    key: 'cloud-software',
    title: 'Cloud Software Applications',
    subtitle:
      'Custom SaaS builds, internal tools, and cloud-native applications shipped by senior engineering teams.',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, sort: 'newest' },
    ],
  },
  {
    key: 'mobile-apps',
    title: 'Mobile Applications',
    subtitle:
      'Native and cross-platform iOS and Android apps designed and developed by expert mobile teams.',
    blocks: [
      { entity: 'projects', type: 'carousel', limit: 8, sort: 'newest' },
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
