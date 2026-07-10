import type { Payload } from 'payload';

/**
 * Seed the "MVP Home Page (talent)" homepage document.
 *
 * - Idempotent: only creates the doc if no homepage with `slug = 'mvp-talent'` exists.
 * - Mirrors the default homepage structure but swaps all section entities to 'talent'.
 * - Section titles and subtitles are rewritten to focus on talent discovery.
 */
export async function seedMvpTalentHomepage(payload: Payload): Promise<void> {
  try {
    const existing = await payload.find({
      collection: 'homepages',
      where: { slug: { equals: 'mvp-talent' } },
      limit: 1,
    });

    if (existing.totalDocs > 0) {
      payload.logger.info('Homepages: "MVP Home Page (talent)" already exists — skipping seed');
      return;
    }

    payload.logger.info('Homepages: seeding "MVP Home Page (talent)" document');

    await payload.create({
      collection: 'homepages',
      data: {
        title: 'MVP Home Page (talent)',
        slug: 'mvp-talent',
        status: 'active',
        isDefault: false,

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
                'From RAG pipelines to production ML. Hire AI engineers who turn your data into revenue, not research papers.',
              ctaLabel: 'Explore AI talent',
              ctaUrl: '/c/development/ai-ml',
              imageUrl: '/artificial-intelligence.jpeg',
              accent: 'from-[#6E3DF6]/45 via-transparent to-[#0B1C3A]/65',
            },
            {
              eyebrow: 'Cloud & DevOps',
              title: 'Cloud & DevOps, Done Right',
              description:
                'Scale confidently with certified cloud architects. AWS, GCP, Azure, Kubernetes, and CI/CD built to last.',
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
          ] as any,
        } as any,

        sections: [
          {
            key: 'top-talent',
            title: 'Top Talent',
            subtitle:
              'Hand-picked experts from our highest-rated professionals across every category.',
            ctaLabel: 'View All',
            ctaUrl: '/talent?featured=true',
            manualEnabled: false,
            blocks: [
              {
                entity: 'talent',
                displayType: 'carousel',
                limit: 12,
                kind: 'top_rated',
                sort: 'newest',
                featuredOnly: true,
              },
            ],
          },
          {
            key: 'newest-talent',
            title: 'Newest Additions',
            subtitle: 'The latest talent added to the Marketeq network this week.',
            ctaLabel: 'View More',
            ctaUrl: '/talent?sort=newest',
            manualEnabled: false,
            blocks: [
              { entity: 'talent', displayType: 'grid', limit: 9, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'most-popular-talent',
            title: 'Most Popular Talent',
            subtitle:
              'The professionals generating the most interest from clients across the platform.',
            ctaLabel: 'View More',
            ctaUrl: '/talent?sort=popular',
            manualEnabled: false,
            tabs: [
              { label: 'View All', slug: 'all' },
              { label: 'Top Web Talent', slug: 'web', categoryFilter: 'web' },
              { label: 'Top Mobile Talent', slug: 'mobile', categoryFilter: 'mobile' },
              { label: 'Top Cloud Talent', slug: 'cloud', categoryFilter: 'cloud' },
              {
                label: 'Top Digital Marketing Talent',
                slug: 'digital-marketing',
                categoryFilter: 'digital-marketing',
              },
            ],
            blocks: [
              { entity: 'talent', displayType: 'grid', limit: 9, kind: 'most_popular', sort: 'newest' },
            ],
          },
          {
            key: 'sales-funnel-talent',
            title: 'Online Sales Funnel Experts',
            subtitle:
              'Growth specialists who build high-converting funnels, landing pages, and lead capture systems.',
            ctaLabel: 'View More Talent',
            ctaUrl: '/talent?category=sales-funnels',
            manualEnabled: false,
            blocks: [
              { entity: 'talent', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'customer-service-talent',
            title: 'Customer Service Specialists',
            subtitle:
              'Experts in help desks, chatbots, and support workflows designed to scale your customer experience.',
            ctaLabel: 'View More Talent',
            ctaUrl: '/talent?category=customer-service',
            manualEnabled: false,
            blocks: [
              { entity: 'talent', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'marketing-automation-talent',
            title: 'Marketing Automation Experts',
            subtitle:
              'End-to-end automation specialists across email, SMS, and CRM who turn prospects into customers.',
            ctaLabel: 'View More Talent',
            ctaUrl: '/talent?category=automation',
            manualEnabled: false,
            blocks: [
              { entity: 'talent', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'cloud-software-talent',
            title: 'Cloud Software Engineers',
            subtitle:
              'Senior engineering talent for custom SaaS builds, internal tools, and cloud-native applications.',
            ctaLabel: 'View More Talent',
            ctaUrl: '/talent?category=cloud-software',
            manualEnabled: false,
            blocks: [
              { entity: 'talent', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
            ],
          },
          {
            key: 'mobile-app-talent',
            title: 'Mobile App Developers',
            subtitle:
              'Native and cross-platform iOS and Android developers with App Store and Play Store hits.',
            ctaLabel: 'View More Talent',
            ctaUrl: '/talent?category=mobile-development',
            manualEnabled: false,
            blocks: [
              { entity: 'talent', displayType: 'carousel', limit: 8, kind: 'newest', sort: 'newest' },
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
          metaTitle: 'Marketeq — Expert Tech Talent on Demand',
          metaDescription:
            'Hire pre-vetted expert talent for your next project. Browse professionals across development, design, marketing, and more.',
          canonical: 'https://marketeq.com',
          noindex: false,
        },
      } as any,
    });

    payload.logger.info('Homepages: "MVP Home Page (talent)" seeded successfully');
  } catch (err) {
    payload.logger.error({ err }, 'Homepages: failed to seed "MVP Home Page (talent)"');
  }
}
