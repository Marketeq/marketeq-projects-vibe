import { DataSource } from 'typeorm';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';

/**
 * Seed the marketing-automation services used by the homepage.
 *
 * NOTE: projects are no longer seeded here. They now come from Payload CMS
 * via the `seed:projects` script in cms-service, which uses the same
 * fixture arrays (FEATURED_PROJECTS / NEWEST_PROJECTS / POPULAR_TAB_PROJECTS /
 * THEMED_PROJECTS) exported from this file and runs each one through the
 * Payload Local API. The afterChange sync hook then writes them into
 * listings.projects with payloadId set, so editors can manage them from the
 * CMS admin UI. This file keeps only the services seed — services don't
 * yet have a matching CMS collection, so they stay authored as raw SQL
 * inserts until that work lands.
 *
 * IDEMPOTENT: skips if any service with `createdBy = 'seed:homepage'` exists.
 * To force reseed, delete those rows in the DB first.
 */

export const SEED_MARKER = 'seed:homepage';

// Vetted Unsplash photo IDs reused from the static homepage's SECTION_POOLS
// (frontend/app/(group)/(group)/page.tsx @ commit feb1716^). Same format helper
// so thumbnails match the pre-refactor design intent exactly.
const u = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// ── Helper builders ─────────────────────────────────────────────────────────

export interface ProjectSeed {
  title: string;
  description: string;
  shortDescription?: string;
  categories: string[];
  skills?: string[];
  tags?: string[];
  mediaUrls?: string[];
  status?: ListingStatus;
  budget?: number;
  duration?: string;
  rating?: number;
  reviewCount?: number;
  completionsCount?: number;
  views90d?: number;
  adminBoost?: number;
  featured?: boolean;
  createdAt?: Date;
}

interface ServiceSeed {
  title: string;
  description: string;
  shortDescription?: string;
  categories: string[];
  skills?: string[];
  tags?: string[];
  mediaUrls?: string[];
  status?: ListingStatus;
  priceMin?: number;
  priceMax?: number;
  deliveryTime?: string;
  rating?: number;
  reviewCount?: number;
  completionsCount?: number;
  views90d?: number;
  adminBoost?: number;
  featured?: boolean;
  createdAt?: Date;
}

function projectRow(
  title: string,
  description: string,
  categories: string[],
  opts: {
    featured?: boolean;
    rating?: number;
    reviewCount?: number;
    completionsCount?: number;
    views90d?: number;
    adminBoost?: number;
    budget?: number;
    duration?: string;
    thumbnail?: string;
    daysAgo?: number;
  } = {},
): ProjectSeed {
  return {
    title,
    description,
    shortDescription: description,
    categories,
    skills: categories,
    tags: [],
    mediaUrls: opts.thumbnail ? [opts.thumbnail] : [],
    status: ListingStatus.Published,
    budget: opts.budget ?? 25_000,
    duration: opts.duration ?? '12 weeks',
    rating: opts.rating ?? 4.5,
    reviewCount: opts.reviewCount ?? 12,
    completionsCount: opts.completionsCount ?? 5,
    views90d: opts.views90d ?? 1200,
    adminBoost: opts.adminBoost ?? 0,
    featured: opts.featured ?? false,
    // Stagger createdAt so "newest" ordering is deterministic
    createdAt: new Date(Date.now() - (opts.daysAgo ?? 30) * 24 * 60 * 60 * 1000),
  };
}

function serviceRow(
  title: string,
  description: string,
  categories: string[],
  opts: {
    priceMin?: number;
    priceMax?: number;
    deliveryTime?: string;
    rating?: number;
    reviewCount?: number;
    thumbnail?: string;
    daysAgo?: number;
  } = {},
): ServiceSeed {
  return {
    title,
    description,
    shortDescription: description,
    categories,
    skills: categories,
    tags: [],
    mediaUrls: opts.thumbnail ? [opts.thumbnail] : [],
    status: ListingStatus.Published,
    priceMin: opts.priceMin ?? 2500,
    priceMax: opts.priceMax ?? 7500,
    deliveryTime: opts.deliveryTime ?? 'monthly',
    rating: opts.rating ?? 4.6,
    reviewCount: opts.reviewCount ?? 18,
    completionsCount: 10,
    views90d: 800,
    adminBoost: 0,
    featured: false,
    createdAt: new Date(Date.now() - (opts.daysAgo ?? 30) * 24 * 60 * 60 * 1000),
  };
}

// ── Project seed data ───────────────────────────────────────────────────────

export const FEATURED_PROJECTS: ProjectSeed[] = [
  projectRow('Modern Brand Identity System',      'Logo, type, color, and visual guidelines for a SaaS launch.', ['design', 'web'],             { featured: true, rating: 4.9, reviewCount: 32, completionsCount: 18, views90d: 4200, daysAgo: 2,  thumbnail: u('1558655146-9f40138edfeb') }),
  projectRow('AI Analytics Dashboard',             'Real-time BI with predictive insights and forecasting.',       ['development', 'web'],        { featured: true, rating: 4.8, reviewCount: 27, completionsCount: 14, views90d: 3800, daysAgo: 4,  thumbnail: u('1551288049-bebda4e38f71') }),
  projectRow('Cybersecurity Audit Platform',       'Continuous threat detection and SOC 2 compliance.',            ['security', 'cloud'],         { featured: true, rating: 4.9, reviewCount: 19, completionsCount: 10, views90d: 3100, daysAgo: 6,  thumbnail: u('1518770660439-4636190af475') }),
  projectRow('Cross-Platform Mobile Banking',      'Native iOS and Android with biometric authentication.',        ['mobile', 'development'],     { featured: true, rating: 4.8, reviewCount: 44, completionsCount: 22, views90d: 5200, daysAgo: 8,  thumbnail: u('1542831371-29b0f74f9713') }),
  projectRow('Headless E-commerce Storefront',     'Next.js storefront with Shopify backend, sub-second loads.',   ['web', 'development'],        { featured: true, rating: 4.7, reviewCount: 36, completionsCount: 19, views90d: 4700, daysAgo: 10, thumbnail: u('1461749280684-dccba630e2f6') }),
  projectRow('Series A Pitch Deck',                'Investor-ready narrative with custom illustrations.',          ['design', 'digital-marketing'], { featured: true, rating: 4.9, reviewCount: 28, completionsCount: 15, views90d: 2900, daysAgo: 12, thumbnail: u('1454165804606-c3d57bc86b40') }),
  projectRow('RAG Knowledge Assistant',            'LLM search over 50k internal documents with citations.',       ['development', 'cloud'],      { featured: true, rating: 4.8, reviewCount: 22, completionsCount: 11, views90d: 3400, daysAgo: 14, thumbnail: u('1517180102446-f3ece451e9d8') }),
  projectRow('Marketing Site Rebuild',             'Conversion-optimized landing pages and CMS migration.',        ['digital-marketing', 'web'],  { featured: true, rating: 4.6, reviewCount: 31, completionsCount: 17, views90d: 3900, daysAgo: 16, thumbnail: u('1455390582262-044cdead277a') }),
  projectRow('Fintech KYC Compliance Suite',       'Automated identity verification with Plaid integration.',      ['security', 'development'],   { featured: true, rating: 4.8, reviewCount: 25, completionsCount: 13, views90d: 3300, daysAgo: 18, thumbnail: u('1486406146926-c627a92ad1ab') }),
  projectRow('AR Product Configurator',            'WebXR configurator for retail product customization.',         ['web', 'design'],             { featured: true, rating: 4.7, reviewCount: 21, completionsCount: 9,  views90d: 2600, daysAgo: 20, thumbnail: u('1555066931-4365d14bab8c') }),
  projectRow('Realtime IoT Fleet Tracker',         'GPS + telemetry pipeline serving 10k devices.',                ['cloud', 'development'],      { featured: true, rating: 4.8, reviewCount: 29, completionsCount: 16, views90d: 3500, daysAgo: 22, thumbnail: u('1614064641938-3bbee52942c7') }),
  projectRow('Performance Marketing Overhaul',     'Paid ads, SEO, and analytics refresh across channels.',        ['digital-marketing'],         { featured: true, rating: 4.9, reviewCount: 41, completionsCount: 23, views90d: 4400, daysAgo: 24, thumbnail: u('1557838923-2985c318be48') }),
];

export const NEWEST_PROJECTS: ProjectSeed[] = [
  projectRow('Voice AI Customer Onboarding',       'Conversational onboarding flow powered by GPT-4o.',            ['development'],        { daysAgo: 1, thumbnail: u('1581091226825-a6a2a5aee158') }),
  projectRow('Sustainable Brand Refresh',          'Eco-conscious visual identity for a DTC clothing brand.',      ['design'],             { daysAgo: 1, thumbnail: u('1455390582262-044cdead277a') }),
  projectRow('Real-Time Sports Analytics',         'Live data pipelines and dashboards for team performance.',    ['cloud'],              { daysAgo: 1, thumbnail: u('1518186285589-2f7649de83e0') }),
  projectRow('Event Ticketing iOS App',            'Apple Wallet integration with QR check-in.',                  ['mobile'],             { daysAgo: 2, thumbnail: u('1542831371-29b0f74f9713') }),
  projectRow('Telehealth Patient Portal',          'HIPAA-compliant scheduling and video consultations.',         ['web', 'development'], { daysAgo: 2, thumbnail: u('1576086213369-97a306d36557') }),
  projectRow('Web3 Wallet UX Audit',               'Heuristic review and redesign of a multi-chain wallet.',      ['design'],             { daysAgo: 2, thumbnail: u('1558655146-9f40138edfeb') }),
  projectRow('Vector Search Service',              'Pinecone-backed semantic search across 10M docs.',             ['cloud'],              { daysAgo: 3, thumbnail: u('1518770660439-4636190af475') }),
  projectRow('Social Audio Platform',              'Live rooms with low-latency audio streaming.',                 ['mobile'],             { daysAgo: 3, thumbnail: u('1581091226825-a6a2a5aee158') }),
  projectRow('Computer Vision QA System',          'Defect detection on a manufacturing line at 60 fps.',         ['development', 'cloud'], { daysAgo: 3, thumbnail: u('1581094794329-c8112a89af12') }),
];

export const POPULAR_TAB_PROJECTS: ProjectSeed[] = [
  // Web projects — 9 total for Most Popular > Top Web tab
  projectRow('Shopify Plus Migration',             'Replatforming from Magento with zero downtime.',              ['web'], { rating: 4.7, completionsCount: 21, views90d: 5100, daysAgo: 30, thumbnail: u('1557838923-2985c318be48') }),
  projectRow('FinTech Onboarding Flow',            'KYC + AML compliant signup with Plaid integration.',          ['web'], { rating: 4.8, completionsCount: 19, views90d: 4800, daysAgo: 32, thumbnail: u('1486406146926-c627a92ad1ab') }),
  projectRow('Next.js Marketing Site',             'Headless CMS, ISR, and A/B testing infrastructure.',          ['web'], { rating: 4.6, completionsCount: 15, views90d: 3900, daysAgo: 34, thumbnail: u('1455390582262-044cdead277a') }),
  projectRow('Progressive Web App Build',          'Offline-first PWA with push notifications.',                   ['web'], { rating: 4.7, completionsCount: 17, views90d: 4100, daysAgo: 36, thumbnail: u('1517245386807-bb43f82c33c4') }),
  projectRow('Jamstack Ecommerce',                  'Static storefront with Stripe Checkout.',                     ['web'], { rating: 4.5, completionsCount: 12, views90d: 3500, daysAgo: 38, thumbnail: u('1461749280684-dccba630e2f6') }),
  projectRow('Design System Component Library',    'React components + Storybook documentation.',                  ['web', 'design'], { rating: 4.8, completionsCount: 20, views90d: 4600, daysAgo: 40, thumbnail: u('1558655146-9f40138edfeb') }),
  projectRow('Auth Service Replatform',            'OAuth, passkeys, and MFA for a multi-tenant app.',             ['web', 'security'], { rating: 4.7, completionsCount: 16, views90d: 3800, daysAgo: 42, thumbnail: u('1518770660439-4636190af475') }),
  projectRow('Real-Time Dashboard',                'Websocket streaming with 100ms end-to-end latency.',          ['web'], { rating: 4.6, completionsCount: 14, views90d: 3700, daysAgo: 44, thumbnail: u('1551288049-bebda4e38f71') }),
  projectRow('Blog Platform Redesign',             'Headless Sanity CMS migration with MDX.',                      ['web'], { rating: 4.5, completionsCount: 11, views90d: 3300, daysAgo: 46, thumbnail: u('1486312338219-ce68d2c6f44d') }),

  // Mobile projects — 9 total for Top Mobile tab
  projectRow('Fitness Tracking iOS App',           'HealthKit integration with custom workout plans.',             ['mobile'], { rating: 4.8, completionsCount: 18, views90d: 4500, daysAgo: 48, thumbnail: u('1542831371-29b0f74f9713') }),
  projectRow('Food Delivery Android App',          'Real-time order tracking and driver dispatch.',                ['mobile'], { rating: 4.7, completionsCount: 22, views90d: 5000, daysAgo: 50, thumbnail: u('1517180102446-f3ece451e9d8') }),
  projectRow('Meditation App Redesign',            'Calm-style guided sessions with offline downloads.',           ['mobile'], { rating: 4.6, completionsCount: 15, views90d: 3900, daysAgo: 52, thumbnail: u('1558655146-9f40138edfeb') }),
  projectRow('Crypto Portfolio Tracker',           'Multi-exchange tracking with on-device price alerts.',         ['mobile'], { rating: 4.7, completionsCount: 17, views90d: 4200, daysAgo: 54, thumbnail: u('1551288049-bebda4e38f71') }),
  projectRow('AR Furniture Preview App',           'ARKit-powered room visualization for retail.',                 ['mobile'], { rating: 4.8, completionsCount: 19, views90d: 4400, daysAgo: 56, thumbnail: u('1555066931-4365d14bab8c') }),
  projectRow('Travel Booking Super-App',           'Flights, hotels, and activities in one experience.',           ['mobile'], { rating: 4.6, completionsCount: 14, views90d: 3800, daysAgo: 58, thumbnail: u('1454165804606-c3d57bc86b40') }),
  projectRow('Telemedicine Companion App',         'Symptom tracking and medication reminders.',                   ['mobile'], { rating: 4.7, completionsCount: 16, views90d: 4000, daysAgo: 60, thumbnail: u('1576086213369-97a306d36557') }),
  projectRow('Parking Finder App',                  'Live availability with in-app payments.',                      ['mobile'], { rating: 4.5, completionsCount: 12, views90d: 3500, daysAgo: 62, thumbnail: u('1581091226825-a6a2a5aee158') }),
  projectRow('Recipe Discovery App',                'ML-powered meal recommendations.',                             ['mobile'], { rating: 4.6, completionsCount: 13, views90d: 3600, daysAgo: 64, thumbnail: u('1532094349884-543bc11b234d') }),

  // Cloud projects — 9 total for Top Cloud tab
  projectRow('Multi-Tenant SaaS Platform',         'Kubernetes-based with row-level security and SSO.',            ['cloud'], { rating: 4.8, completionsCount: 20, views90d: 4700, daysAgo: 66, thumbnail: u('1517180102446-f3ece451e9d8') }),
  projectRow('AWS Migration & Cost Audit',         'Lift-and-shift to AWS with a 40% cost reduction.',             ['cloud'], { rating: 4.7, completionsCount: 17, views90d: 4100, daysAgo: 68, thumbnail: u('1555066931-4365d14bab8c') }),
  projectRow('Kubernetes Cluster Hardening',       'Pod security, network policies, and RBAC review.',             ['cloud', 'security'], { rating: 4.8, completionsCount: 18, views90d: 4200, daysAgo: 70, thumbnail: u('1518770660439-4636190af475') }),
  projectRow('Terraform Modules Library',          'Reusable infra-as-code for 12-factor apps.',                    ['cloud'], { rating: 4.6, completionsCount: 14, views90d: 3800, daysAgo: 72, thumbnail: u('1614064641938-3bbee52942c7') }),
  projectRow('Event-Driven Microservices',         'Kafka pipelines with idempotent consumers.',                    ['cloud'], { rating: 4.7, completionsCount: 16, views90d: 3900, daysAgo: 74, thumbnail: u('1461749280684-dccba630e2f6') }),
  projectRow('Observability Stack Rollout',        'Grafana, Loki, and Tempo with auto-instrumentation.',           ['cloud'], { rating: 4.8, completionsCount: 19, views90d: 4300, daysAgo: 76, thumbnail: u('1504868584819-f8e8b4b6d7e3') }),
  projectRow('CI/CD Pipeline Overhaul',            'GitHub Actions with canary deploys and rollbacks.',             ['cloud'], { rating: 4.7, completionsCount: 15, views90d: 3700, daysAgo: 78, thumbnail: u('1517245386807-bb43f82c33c4') }),
  projectRow('Data Lake Implementation',           'S3 + Athena + Glue catalog with lineage tracking.',             ['cloud'], { rating: 4.6, completionsCount: 13, views90d: 3400, daysAgo: 80, thumbnail: u('1518186285589-2f7649de83e0') }),
  projectRow('GCP Workload Migration',             'Cloud Run services with VPC connectors.',                       ['cloud'], { rating: 4.7, completionsCount: 14, views90d: 3600, daysAgo: 82, thumbnail: u('1581091226825-a6a2a5aee158') }),

  // Digital marketing projects — 9 total for Top Digital Marketing tab
  projectRow('HubSpot Workflow Build',             'Lifecycle stages, lead scoring, and rotation rules.',           ['digital-marketing'], { rating: 4.7, completionsCount: 18, views90d: 4200, daysAgo: 84,  thumbnail: u('1432888622747-4eb9a8efeb07') }),
  projectRow('Email Drip Campaign',                 'Behavioral triggers across a 12-step nurture sequence.',       ['digital-marketing'], { rating: 4.6, completionsCount: 14, views90d: 3500, daysAgo: 86,  thumbnail: u('1533750516457-a7f992034fec') }),
  projectRow('Paid Search Optimization',           'Google Ads + Bing with automated bid management.',              ['digital-marketing'], { rating: 4.8, completionsCount: 19, views90d: 4400, daysAgo: 88,  thumbnail: u('1460925895917-afdab827c52f') }),
  projectRow('SEO Content Strategy',                'Editorial calendar and topic clusters for organic growth.',    ['digital-marketing'], { rating: 4.7, completionsCount: 16, views90d: 3900, daysAgo: 90,  thumbnail: u('1486312338219-ce68d2c6f44d') }),
  projectRow('Conversion Rate Optimization',       'A/B test framework with statistical significance tracking.',    ['digital-marketing'], { rating: 4.8, completionsCount: 17, views90d: 4000, daysAgo: 92,  thumbnail: u('1551836022-d5d88e9218df') }),
  projectRow('Influencer Campaign Platform',       'Discovery, outreach, and ROI tracking in one tool.',            ['digital-marketing'], { rating: 4.6, completionsCount: 13, views90d: 3300, daysAgo: 94,  thumbnail: u('1542744173-8e7e53415bb0') }),
  projectRow('Attribution Modeling Setup',         'Multi-touch attribution with HubSpot and GA4.',                 ['digital-marketing'], { rating: 4.7, completionsCount: 15, views90d: 3800, daysAgo: 96,  thumbnail: u('1557838923-2985c318be48') }),
  projectRow('Social Media Automation',            'Buffer + Sprout integration with custom reporting.',            ['digital-marketing'], { rating: 4.5, completionsCount: 12, views90d: 3200, daysAgo: 98,  thumbnail: u('1454165804606-c3d57bc86b40') }),
  projectRow('Brand Awareness Campaign',            'Multi-channel creative with earned media tracking.',            ['digital-marketing'], { rating: 4.7, completionsCount: 14, views90d: 3600, daysAgo: 100, thumbnail: u('1486406146926-c627a92ad1ab') }),
];

export const THEMED_PROJECTS: ProjectSeed[] = [
  // Online Sales Funnels — 8
  projectRow('High-Converting SaaS Landing Page',  'Above-the-fold rebuild with A/B test infrastructure.',          ['sales-funnels', 'web'], { daysAgo: 110, thumbnail: u('1557838923-2985c318be48') }),
  projectRow('Webinar Funnel Build',               'Registration, replay, and follow-up sequence end-to-end.',      ['sales-funnels'],        { daysAgo: 112, thumbnail: u('1432888622747-4eb9a8efeb07') }),
  projectRow('Lead Magnet Quiz Funnel',            'Interactive quiz with personalized result pages.',              ['sales-funnels'],        { daysAgo: 114, thumbnail: u('1533750516457-a7f992034fec') }),
  projectRow('Tripwire Sales Funnel',              'Low-ticket front-end with one-click upsell flow.',              ['sales-funnels'],        { daysAgo: 116, thumbnail: u('1460925895917-afdab827c52f') }),
  projectRow('B2B Demo Request Funnel',            'Enterprise lead capture with calendar integration.',            ['sales-funnels'],        { daysAgo: 118, thumbnail: u('1551288049-bebda4e38f71') }),
  projectRow('Membership Site Funnel',             'Free trial onboarding with retention automations.',             ['sales-funnels'],        { daysAgo: 120, thumbnail: u('1454165804606-c3d57bc86b40') }),
  projectRow('Affiliate Sales Funnel',             'Partner-driven evergreen funnel with tracking.',                ['sales-funnels'],        { daysAgo: 122, thumbnail: u('1486406146926-c627a92ad1ab') }),
  projectRow('Cart Recovery Sequence',             'Email + SMS abandonment recovery for Shopify.',                 ['sales-funnels'],        { daysAgo: 124, thumbnail: u('1504868584819-f8e8b4b6d7e3') }),

  // Customer Service Solutions — 8
  projectRow('AI Helpdesk Chatbot',                 'Intercom integration with custom knowledge base.',             ['customer-service'], { daysAgo: 130, thumbnail: u('1517180102446-f3ece451e9d8') }),
  projectRow('Zendesk Macro Optimization',         'Triage workflows and SLA reporting overhaul.',                  ['customer-service'], { daysAgo: 132, thumbnail: u('1454165804606-c3d57bc86b40') }),
  projectRow('24/7 Live Chat Implementation',      'Multilingual support with sentiment routing.',                  ['customer-service'], { daysAgo: 134, thumbnail: u('1486406146926-c627a92ad1ab') }),
  projectRow('Voice Support IVR Build',            'Twilio-powered IVR with natural-language routing.',             ['customer-service'], { daysAgo: 136, thumbnail: u('1532094349884-543bc11b234d') }),
  projectRow('Customer Portal Redesign',           'Self-service knowledge base and ticket tracking.',              ['customer-service'], { daysAgo: 138, thumbnail: u('1558655146-9f40138edfeb') }),
  projectRow('Slack Support Integration',          'Internal escalations from customer chat to engineering.',       ['customer-service'], { daysAgo: 140, thumbnail: u('1542744173-8e7e53415bb0') }),
  projectRow('NPS + CSAT Analytics',                'Closed-loop feedback dashboards for ops teams.',                ['customer-service'], { daysAgo: 142, thumbnail: u('1551288049-bebda4e38f71') }),
  projectRow('Knowledge Base Authoring',           '100+ SEO-optimized help articles with screenshots.',            ['customer-service'], { daysAgo: 144, thumbnail: u('1455390582262-044cdead277a') }),

  // Cloud Software Applications — 8 (distinct from the Cloud tab pool above)
  projectRow('Internal Tools Suite',                'Retool dashboards replacing 20+ ops spreadsheets.',            ['cloud-software', 'cloud'], { daysAgo: 150, thumbnail: u('1461749280684-dccba630e2f6') }),
  projectRow('Workflow Automation SaaS',            'Visual builder with 80+ pre-built integrations.',              ['cloud-software'],          { daysAgo: 152, thumbnail: u('1542831371-29b0f74f9713') }),
  projectRow('Real-Time Collaboration App',         'CRDT-based multi-user editing with presence.',                  ['cloud-software'],          { daysAgo: 154, thumbnail: u('1504868584819-f8e8b4b6d7e3') }),
  projectRow('Headless CMS Implementation',        'Sanity + Next.js with preview environments.',                   ['cloud-software'],          { daysAgo: 156, thumbnail: u('1581091226825-a6a2a5aee158') }),
  projectRow('B2B SaaS Billing System',             'Usage-based billing with Stripe + invoicing.',                  ['cloud-software'],          { daysAgo: 158, thumbnail: u('1486406146926-c627a92ad1ab') }),
  projectRow('Admin Dashboard Build',               'Role-based access with audit logs.',                            ['cloud-software'],          { daysAgo: 160, thumbnail: u('1551288049-bebda4e38f71') }),
  projectRow('Data Sync Pipeline',                  'CDC from Postgres to Snowflake with backfills.',                ['cloud-software'],          { daysAgo: 162, thumbnail: u('1555066931-4365d14bab8c') }),
  projectRow('Notification Service',                'Multi-channel (email/SMS/push) with templating.',               ['cloud-software'],          { daysAgo: 164, thumbnail: u('1460925895917-afdab827c52f') }),

  // Mobile Applications — 8 (distinct from the Mobile tab pool above)
  projectRow('Language Learning App',               'Spaced repetition with gamification and streaks.',              ['mobile-apps', 'mobile'], { daysAgo: 170, thumbnail: u('1558655146-9f40138edfeb') }),
  projectRow('Expense Tracker App',                 'Receipt OCR with auto-categorization.',                         ['mobile-apps'],           { daysAgo: 172, thumbnail: u('1551288049-bebda4e38f71') }),
  projectRow('Workout Companion App',               'Apple Watch integration with custom plans.',                    ['mobile-apps'],           { daysAgo: 174, thumbnail: u('1542831371-29b0f74f9713') }),
  projectRow('Podcast Player Redesign',             'Queue management with offline downloads.',                      ['mobile-apps'],           { daysAgo: 176, thumbnail: u('1581091226825-a6a2a5aee158') }),
  projectRow('Dating App MVP',                       'Profile matching with real-time chat.',                         ['mobile-apps'],           { daysAgo: 178, thumbnail: u('1517180102446-f3ece451e9d8') }),
  projectRow('Ride Sharing Passenger App',          'ETA predictions with driver rating flow.',                      ['mobile-apps'],           { daysAgo: 180, thumbnail: u('1454165804606-c3d57bc86b40') }),
  projectRow('Note Taking App',                      'Markdown editor with end-to-end encryption.',                   ['mobile-apps'],           { daysAgo: 182, thumbnail: u('1486312338219-ce68d2c6f44d') }),
  projectRow('Kids Learning App',                    'COPPA-compliant with parental dashboard.',                      ['mobile-apps'],           { daysAgo: 184, thumbnail: u('1576086213369-97a306d36557') }),
];

// ── Service seed data ───────────────────────────────────────────────────────

const MARKETING_SERVICES: ServiceSeed[] = [
  serviceRow('HubSpot Workflow Build',              'Lifecycle stages, lead scoring, and rotation rules.',          ['marketing-automation'], { priceMin: 3000, priceMax: 7500, thumbnail: u('1432888622747-4eb9a8efeb07') }),
  serviceRow('Email Drip Automation',               'Behavioral triggers across a 12-step nurture sequence.',       ['marketing-automation'], { priceMin: 2500, priceMax: 6000, thumbnail: u('1533750516457-a7f992034fec') }),
  serviceRow('SMS Marketing Automation',            'Compliance-first SMS flows with opt-in management.',           ['marketing-automation'], { priceMin: 2000, priceMax: 5500, thumbnail: u('1460925895917-afdab827c52f') }),
  serviceRow('CRM Sync Pipeline',                    'Two-way sync between Salesforce and Marketo.',                 ['marketing-automation'], { priceMin: 4000, priceMax: 9000, thumbnail: u('1542744173-8e7e53415bb0') }),
  serviceRow('Lifecycle Email Strategy',            'Welcome, onboarding, churn-save, and winback flows.',          ['marketing-automation'], { priceMin: 3500, priceMax: 8000, thumbnail: u('1557838923-2985c318be48') }),
  serviceRow('Zapier Ops Automation',                '150+ Zaps connecting sales, finance, and ops tools.',         ['marketing-automation'], { priceMin: 2000, priceMax: 5000, thumbnail: u('1551836022-d5d88e9218df') }),
  serviceRow('Marketing Attribution Setup',          'Multi-touch attribution with HubSpot and GA4.',                ['marketing-automation'], { priceMin: 3000, priceMax: 7000, thumbnail: u('1518186285589-2f7649de83e0') }),
  serviceRow('Customer.io Migration',                'From Mailchimp to event-driven lifecycle messaging.',         ['marketing-automation'], { priceMin: 3500, priceMax: 7500, thumbnail: u('1486312338219-ce68d2c6f44d') }),
  serviceRow('Segment CDP Integration',              'Unified customer data across web, mobile, and CRM.',          ['marketing-automation'], { priceMin: 4000, priceMax: 9500, thumbnail: u('1517245386807-bb43f82c33c4') }),
  serviceRow('Retention Campaign Framework',         'Cohort-based lifecycle messaging with measurement.',          ['marketing-automation'], { priceMin: 3000, priceMax: 6500, thumbnail: u('1504868584819-f8e8b4b6d7e3') }),
];

// ── Seed entrypoint ─────────────────────────────────────────────────────────

export async function seedHomepageListings(
  dataSource: DataSource,
  logger: { log: (msg: string) => void } = console,
): Promise<void> {

  // Idempotency — any row created by this seed will have createdBy = SEED_MARKER
  const existing = await dataSource.query(
    `SELECT COUNT(*)::int AS n FROM listings.services WHERE "createdBy" = $1`,
    [SEED_MARKER],
  );
  if (existing[0]?.n > 0) {
    logger.log(
      `homepage-listings seed: ${existing[0].n} seeded services already exist — skipping`,
    );
    return;
  }

  logger.log('homepage-listings seed: inserting service fixtures (projects come from CMS)');

  for (const s of MARKETING_SERVICES) {
    await dataSource.query(
      `INSERT INTO listings.services (
         title, description, slug, categories, skills, tags, "mediaUrls",
         "shortDescription", status, "priceMin", "priceMax", "deliveryTime",
         rating, "reviewCount", "completionsCount", "views90d", "adminBoost", featured,
         "createdBy", "createdAt"
       ) VALUES (
         $1, $2, $3, $4::text[], $5::text[], '{}'::text[], $6::text[],
         $7, $8, $9, $10, $11,
         $12, $13, $14, $15, $16, $17,
         $18, $19
       )`,
      [
        s.title,
        s.description,
        slugify(s.title),
        s.categories,
        s.skills ?? [],
        s.mediaUrls ?? [],
        s.shortDescription ?? s.description,
        s.status ?? ListingStatus.Published,
        s.priceMin ?? null,
        s.priceMax ?? null,
        s.deliveryTime ?? null,
        s.rating ?? 0,
        s.reviewCount ?? 0,
        s.completionsCount ?? 0,
        s.views90d ?? 0,
        s.adminBoost ?? 0,
        s.featured ?? false,
        SEED_MARKER,
        s.createdAt ?? new Date(),
      ],
    );
  }

  logger.log(
    `homepage-listings seed: inserted ${MARKETING_SERVICES.length} services`,
  );
}
