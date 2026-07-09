import type { Payload } from 'payload';

/**
 * Seed the default "home" homepage document on first boot.
 *
 * - Idempotent: only creates the doc if no homepage with `slug = 'home'` exists.
 * - Mirrors the static fallback config in api-gateway/homepage.config.ts so the
 *   CMS becomes the single source of truth as soon as it's running.
 * - Safe to re-run: existing documents are left alone (so editors can tweak
 *   published content without the seed stomping their changes).
 *
 * To force a reseed, delete the `home` document in the admin panel first.
 */
export async function seedDefaultHomepage(payload: Payload): Promise<void> {
  try {
    const existing = await payload.find({
      collection: 'homepages',
      where: { slug: { equals: 'home' } },
      limit: 1,
    });

    if (existing.totalDocs > 0) {
      payload.logger.info('Homepages: default "home" document already exists — skipping seed');
      return;
    }

    payload.logger.info('Homepages: seeding default "home" document');

    await payload.create({
      collection: 'homepages',
      data: {
        title: 'Marketeq Home',
        slug: 'home',
        status: 'active',
        isDefault: true,

        hero: {
          intervalMs: 7000,
          slides: [
            {
              eyebrow: 'UI / UX Design',
              title: 'UX / UI Experts on Demand',
              description:
                'Ship pixel-perfect product experiences with senior designers who embed with your team in days, not months.',
              ctaLabel: 'Browse UX / UI experts',
              ctaUrl: '/c/design/ui-ux-design',
              imageUrl: '/sending-emails.png',
              accent: 'from-[#1661F6]/40 via-transparent to-[#0B1C3A]/60',
            },
            {
              eyebrow: 'AI & Machine Learning',
              title: 'AI Specialists Who Ship',
              description:
                'From RAG pipelines to production ML — hire AI engineers who turn your data into revenue, not research papers.',
              ctaLabel: 'Explore AI talent',
              ctaUrl: '/c/development/ai-ml',
              imageUrl: '/artificial-intelligence.jpeg',
              accent: 'from-[#6E3DF6]/45 via-transparent to-[#0B1C3A]/65',
            },
            {
              eyebrow: 'Cloud & DevOps',
              title: 'Cloud & DevOps, Done Right',
              description:
                'Scale confidently with certified cloud architects — AWS, GCP, Azure, Kubernetes, and CI/CD built to last.',
              ctaLabel: 'Find cloud engineers',
              ctaUrl: '/c/development/cloud-devops',
              imageUrl: '/clouds.png',
              accent: 'from-[#0EA5E9]/40 via-transparent to-[#0B1C3A]/65',
            },
            {
              eyebrow: 'Mobile Development',
              title: 'Mobile Teams That Launch',
              description:
                'Native iOS, Android, and cross-platform apps built by teams with App Store and Play Store hits on their resume.',
              ctaLabel: 'Meet mobile teams',
              ctaUrl: '/c/development/mobile-development',
              imageUrl: '/design-screens.png',
              accent: 'from-[#F6953D]/35 via-transparent to-[#0B1C3A]/65',
            },
          ] as any, // image (Media upload) stays null — admin UI can upload real files later
        } as any,

        sections: [
          {
            key: 'our-favorites',
            title: 'Our Favorite Projects',
            subtitle:
              'Hand-picked projects from our top-rated experts across every category — see what teams are building right now.',
            ctaLabel: 'View All',
            ctaUrl: '/projects?featured=true',
            manualEnabled: false,
            blocks: [
              {
                entity: 'projects',
                displayType: 'carousel',
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
            subtitle: 'The latest projects added to the Marketeq marketplace this week.',
            ctaLabel: 'View More',
            ctaUrl: '/projects?sort=newest',
            manualEnabled: false,
            blocks: [
              { entity: 'projects', displayType: 'grid', limit: 9, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'most-popular',
            title: 'Most Popular Projects',
            subtitle:
              'The projects generating the most interest from clients across the platform.',
            ctaLabel: 'View More',
            ctaUrl: '/projects?sort=popular',
            manualEnabled: false,
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
              { entity: 'projects', displayType: 'grid', limit: 9, kind: 'most_popular', sort: 'newest' },
            ],
          },
          {
            key: 'online-sales',
            title: 'Online Sales Funnels',
            subtitle:
              'High-converting funnels, landing pages, and lead capture systems built by proven growth experts.',
            ctaLabel: 'View More Projects',
            ctaUrl: '/c/marketing/sales-funnels',
            manualEnabled: false,
            blocks: [
              { entity: 'projects', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'customer-service',
            title: 'Customer Service Solutions',
            subtitle:
              'Help desks, chatbots, and support workflows designed to scale your customer experience.',
            ctaLabel: 'View More Projects',
            ctaUrl: '/c/customer-service',
            manualEnabled: false,
            blocks: [
              { entity: 'projects', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'marketing-automation',
            title: 'Marketing Automation Campaigns',
            subtitle:
              'End-to-end automation workflows across email, SMS, and CRM that turn prospects into customers.',
            ctaLabel: 'View More Services',
            ctaUrl: '/c/marketing/automation',
            manualEnabled: false,
            blocks: [
              { entity: 'services', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'cloud-software',
            title: 'Cloud Software Applications',
            subtitle:
              'Custom SaaS builds, internal tools, and cloud-native applications shipped by senior engineering teams.',
            ctaLabel: 'View More Projects',
            ctaUrl: '/c/development/cloud-software',
            manualEnabled: false,
            blocks: [
              { entity: 'projects', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'mobile-apps',
            title: 'Mobile Applications',
            subtitle:
              'Native and cross-platform iOS and Android apps designed and developed by expert mobile teams.',
            ctaLabel: 'View More Projects',
            ctaUrl: '/c/development/mobile-development',
            manualEnabled: false,
            blocks: [
              { entity: 'projects', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
            ],
          },
        ] as any,

        popularTabs: [
          { name: 'Research', slug: 'research' },
          { name: 'Design', slug: 'design' },
          { name: 'Development', slug: 'development' },
          { name: 'Testing', slug: 'testing' },
          { name: 'Security', slug: 'security' },
          { name: 'Maintenance', slug: 'maintenance' },
          { name: 'Digital Marketing', slug: 'digital-marketing' },
        ],

        moreCategoriesList: [
          { name: 'Interaction Design', slug: 'interaction-design' },
          { name: 'Cloud Security', slug: 'cloud-security' },
          { name: 'Blockchain Development', slug: 'blockchain-development' },
          { name: 'Data Science', slug: 'data-science' },
          { name: 'DevOps', slug: 'devops' },
          { name: 'AI & Machine Learning', slug: 'ai-machine-learning' },
        ],

        talentNetworkCta: {
          headline: 'Marketeq Talent Network',
          description:
            'Want the freedom of working from home without competing with overseas rates? Join our national talent network and get a chance to work on exciting projects from top corporations and disruptive startups.',
          ctaLabel: 'Join the talent network',
          ctaUrl: '/sign-up?role=talent',
        },

        footerNav: [
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
        ],

        seo: {
          metaTitle: 'Marketeq — Expert Tech Teams on Demand',
          metaDescription:
            'Hire pre-vetted expert teams for your next project. Browse projects, services, and talent across development, design, marketing, and more.',
          canonical: 'https://marketeq.com',
          noindex: false,
        },
      } as any,
    });

    payload.logger.info('Homepages: default "home" document seeded successfully');
  } catch (err) {
    payload.logger.error({ err }, 'Homepages: failed to seed default "home" document');
  }
}
