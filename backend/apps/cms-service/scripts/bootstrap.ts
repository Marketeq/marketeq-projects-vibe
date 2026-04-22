/**
 * One-shot bootstrap script.
 *
 * Uses Payload's local API to:
 *   1. Create the first admin user (if none exists)
 *   2. Seed a sample CategoryPages doc for the L1 "design" page so the
 *      frontend integration has something real to render
 *   3. Seed project fixtures (see src/seeds/projects.seed.ts) — idempotent;
 *      skipped when SKIP_PROJECT_SEED=1|true. Ensure LISTINGS_SERVICE_URL is
 *      set so the Projects afterChange hook can sync to public.projects.
 *
 * Run with:  npm run bootstrap   (or automatically once before npm run start:dev)
 */
import 'dotenv/config'
import payload from 'payload'
import { seedDefaultHomepage } from '../src/seeds/homepage.seed'
import { seedBlogPosts } from '../src/seeds/blog-posts.seed'
import { seedDefaultContent } from '../src/seeds/default-content.seed'
import { seedProjects } from '../src/seeds/projects.seed'

async function main() {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET environment variable is required')
  }

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info('Payload CMS initialized (bootstrap)')
    },
  })

  // ── 1. First admin ─────────────────────────────────────────────────────────
  const existing = await payload.find({
    collection: 'users',
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  if (existing.totalDocs === 0) {
    const adminEmail = process.env.CMS_ADMIN_EMAIL
    const adminPassword = process.env.CMS_ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      console.warn(
        '• No admin users exist, but CMS_ADMIN_EMAIL / CMS_ADMIN_PASSWORD are not set — skipping admin creation.',
      )
    } else {
      await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          email: adminEmail,
          password: adminPassword,
          name: process.env.CMS_ADMIN_NAME || 'CMS Admin',
          userType: 'admin',
          role: 'admin',
          status: 'active',
        } as any,
      })
      console.log('✔ Created first admin user.')
    }
  } else {
    console.log('• Admin user already exists, skipping.')
  }

  // ── 2. Default homepage seed (idempotent) ──────────────────────────────────
  const skipHomepage =
    process.env.SKIP_HOMEPAGE_SEED === '1' ||
    process.env.SKIP_HOMEPAGE_SEED === 'true'
  if (skipHomepage) {
    console.log('• Homepage seed skipped (SKIP_HOMEPAGE_SEED is set).')
  } else {
    await seedDefaultHomepage(payload)
    console.log('✔ Homepage seed finished (see src/seeds/homepage.seed.ts).')
  }

  // ── 3. Sample CategoryPage for /c/design ───────────────────────────────────
  const slug = 'design'

  const existingPage = await payload.find({
    collection: 'category-pages',
    where: { path: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  })

  if (existingPage.totalDocs === 0) {
    await payload.create({
      collection: 'category-pages',
      overrideAccess: true,
      data: {
        level: 'l1',
        displayTitle: 'Design (L1)',
        path: slug,
        categoryRef: {
          categoryId: 'design',
          slug: 'design',
          name: 'Design',
          breadcrumb: [{ label: 'Design', slug: 'design' }],
        },
        heroBanner: {
          titleOverride: 'Design that moves your brand forward',
          descriptionOverride:
            'Hand-picked design teams, illustrators, and brand strategists. Browse curated collections, compare price ranges, and start a project in minutes.',
          ctaLabel: 'Browse Design Projects',
          ctaHref: '/c/design/projects',
        },
        intro: {
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
                    text: 'Marketeq\u2019s design talent spans brand identity, UI/UX, illustration, motion, and 3D. Every team is vetted for portfolio quality and reliability so you can scope, price, and launch with confidence.',
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
        },
        faq: [
          {
            question: 'How do I pick the right design team for my project?',
            answer:
              'Start by filtering by category (brand, UI/UX, illustration, etc.), then compare portfolios and budgets. You can chat with any team before starting a project.',
          },
          {
            question: 'Can I work with a single designer instead of a team?',
            answer:
              'Yes \u2014 toggle the project type to "Single" on any project listing to see solo creatives only.',
          },
          {
            question: 'What\u2019s included in a fixed-price design project?',
            answer:
              'Each listing spells out deliverables, revision rounds, and timeline. Anything beyond scope is handled with an upsell at checkout.',
          },
        ],
        featuredSubcategories: [
          { subcategorySlug: 'brand-identity', displayLabel: 'Brand Identity', blurb: 'Logos, type systems, and brand guidelines.' },
          { subcategorySlug: 'ui-ux-design', displayLabel: 'UI / UX Design', blurb: 'Product design from wireframes to prototypes.' },
          { subcategorySlug: 'illustration', displayLabel: 'Illustration', blurb: 'Custom illustration, characters, and editorial art.' },
          { subcategorySlug: 'motion-design', displayLabel: 'Motion Design', blurb: 'Animation, explainer videos, and brand motion.' },
        ],
        _status: 'published',
      },
    })
    console.log(`✔ Created sample CategoryPage for /c/${slug}.`)
  } else {
    console.log(`• CategoryPage for /c/${slug} already exists, skipping.`)
  }

  // ── 4. Project fixtures (Payload → listings via afterChange) ─────────────
  const skipProjects =
    process.env.SKIP_PROJECT_SEED === '1' ||
    process.env.SKIP_PROJECT_SEED === 'true'
  if (skipProjects) {
    console.log('• Project seed skipped (SKIP_PROJECT_SEED is set).')
  } else {
    await seedProjects(payload)
    console.log('✔ Project fixtures seed finished (see src/seeds/projects.seed.ts).')
  }

  // ── 5. Blog posts seed (idempotent) ───────────────────────────────────────
  const skipBlogPosts =
    process.env.SKIP_BLOG_POSTS_SEED === '1' ||
    process.env.SKIP_BLOG_POSTS_SEED === 'true'
  if (skipBlogPosts) {
    console.log('• Blog posts seed skipped (SKIP_BLOG_POSTS_SEED is set).')
  } else {
    await seedBlogPosts(payload)
    console.log('✔ Blog posts seed finished (see src/seeds/blog-posts.seed.ts).')
  }

  // ── 6. Default content seed (idempotent, all other collections) ───────────
  const skipDefaultContent =
    process.env.SKIP_DEFAULT_CONTENT_SEED === '1' ||
    process.env.SKIP_DEFAULT_CONTENT_SEED === 'true'
  if (skipDefaultContent) {
    console.log('• Default content seed skipped (SKIP_DEFAULT_CONTENT_SEED is set).')
  } else {
    await seedDefaultContent(payload)
    console.log('✔ Default content seed finished (see src/seeds/default-content.seed.ts).')
  }

  console.log('\nBootstrap complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Bootstrap failed:', err)
  process.exit(1)
})
