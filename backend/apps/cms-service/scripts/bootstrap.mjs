/**
 * One-shot bootstrap script.
 *
 * Uses Payload's local API to:
 *   1. Create the first admin user (if none exists)
 *   2. Seed a sample CategoryPages doc for the L1 "design" page so the
 *      frontend integration has something real to render
 *
 * Run with:  node scripts/bootstrap.mjs
 */
import { getPayload } from 'payload'
import config from '../src/payload.config.ts'
import 'dotenv/config'

const payload = await getPayload({ config })

// ── 1. First admin ───────────────────────────────────────────────────────────
const existing = await payload.find({
  collection: 'users',
  limit: 1,
  pagination: false,
  overrideAccess: true,
})

if (existing.totalDocs === 0) {
  await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      email: process.env.CMS_ADMIN_EMAIL || 'chris@marketeqdigital.com',
      password: process.env.CMS_ADMIN_PASSWORD || 'ChangeMe123!',
      name: 'Chris Torres',
      role: 'admin',
    },
  })
  console.log('✔ Created first admin user.')
} else {
  console.log('• Admin user already exists, skipping.')
}

// ── 2. Sample CategoryPage for /c/design ─────────────────────────────────────
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

console.log('\nBootstrap complete.')
process.exit(0)
