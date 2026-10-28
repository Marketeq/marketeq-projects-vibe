#!/usr/bin/env node
/**
 * Seed sample projects, services, and team associations into the listings schema.
 * Run: node seed-sample-projects.js
 *
 * This is ADDITIVE — it will not delete existing data.
 * It creates the tables if they don't exist, then inserts sample data.
 */

const { Client } = require('pg');

// The connection string comes from the environment (stored in Doppler); never commit it.
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Export it, or run with: doppler run -- node <this script>');
  process.exit(1);
}

const SCHEMA = 'listings';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  // Ensure schema exists
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);

  // Create projects table
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      slug TEXT,
      category TEXT,
      skills TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      industry TEXT[] DEFAULT '{}',
      "mediaUrls" TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'published',
      budget DECIMAL(10,2),
      duration TEXT,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT now(),
      "updatedAt" TIMESTAMPTZ DEFAULT now()
    )
  `);

  // Create services table
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      slug TEXT,
      category TEXT,
      skills TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      industry TEXT[] DEFAULT '{}',
      "mediaUrls" TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'published',
      "priceMin" DECIMAL(10,2),
      "priceMax" DECIMAL(10,2),
      "deliveryTime" TEXT,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT now(),
      "updatedAt" TIMESTAMPTZ DEFAULT now()
    )
  `);

  // Create jobs table
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      slug TEXT,
      category TEXT,
      skills TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      industry TEXT[] DEFAULT '{}',
      "mediaUrls" TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'published',
      "jobType" TEXT,
      location TEXT,
      "salaryMin" DECIMAL(10,2),
      "salaryMax" DECIMAL(10,2),
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT now(),
      "updatedAt" TIMESTAMPTZ DEFAULT now()
    )
  `);

  // Create teams table
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      slug TEXT,
      category TEXT,
      skills TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      industry TEXT[] DEFAULT '{}',
      "mediaUrls" TEXT[] DEFAULT '{}',
      "memberIds" TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'published',
      "teamSize" INTEGER,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT now(),
      "updatedAt" TIMESTAMPTZ DEFAULT now()
    )
  `);

  console.log('Tables created/verified');

  // Get a sample user ID from user_service to use as createdBy
  const userResult = await client.query(
    `SELECT id FROM user_service.users WHERE "userType" = 'client' LIMIT 1`
  );
  let creatorId;
  if (userResult.rows.length > 0) {
    creatorId = userResult.rows[0].id;
  } else {
    // Fallback: use any user
    const anyUser = await client.query(`SELECT id FROM user_service.users LIMIT 1`);
    creatorId = anyUser.rows.length > 0 ? anyUser.rows[0].id : '00000000-0000-0000-0000-000000000000';
  }
  console.log('Using creatorId:', creatorId);

  // Get some talent user IDs for team members
  const talentResult = await client.query(
    `SELECT id, "firstName", "lastName", username FROM user_service.users WHERE "userType" = 'talent' LIMIT 10`
  );
  const talentIds = talentResult.rows.map(r => r.id);
  console.log(`Found ${talentIds.length} talent users for team associations`);

  // ── Sample Projects ──
  const projects = [
    {
      title: 'AI-Powered Customer Support Platform',
      description: `Build an intelligent customer support platform that uses AI and natural language processing to handle customer inquiries, route tickets, and provide automated responses. The system includes a real-time dashboard for support agents, sentiment analysis, and integration with popular CRM tools.\n\nKey features:\n- AI chatbot with GPT-4 integration\n- Ticket routing and prioritization engine\n- Real-time analytics dashboard\n- Multi-channel support (email, chat, social)\n- CRM integrations (Salesforce, HubSpot)\n- Knowledge base with auto-suggestions`,
      slug: 'ai-powered-customer-support-platform',
      category: 'software-development',
      skills: ['Python', 'React', 'TypeScript', 'OpenAI', 'PostgreSQL', 'Redis'],
      tags: ['AI', 'Customer Support', 'SaaS', 'NLP'],
      industry: ['Technology', 'Customer Service'],
      budget: 75000,
      duration: '16 weeks',
    },
    {
      title: 'E-Commerce Marketplace Redesign',
      description: `Complete redesign and rebuild of an existing e-commerce marketplace serving 50,000+ monthly active users. The project involves migrating from a monolithic architecture to microservices, implementing a modern React frontend, and adding new features like real-time inventory tracking, dynamic pricing, and a recommendation engine.\n\nScope includes:\n- Frontend rebuild with Next.js and Tailwind CSS\n- Microservices backend with Node.js\n- Payment processing with Stripe\n- Search with Algolia\n- Real-time inventory management\n- Mobile-responsive design`,
      slug: 'e-commerce-marketplace-redesign',
      category: 'software-development',
      skills: ['Next.js', 'Node.js', 'Stripe', 'Algolia', 'Docker', 'AWS'],
      tags: ['E-Commerce', 'Marketplace', 'Redesign', 'Microservices'],
      industry: ['Retail', 'Technology'],
      budget: 120000,
      duration: '24 weeks',
    },
    {
      title: 'Healthcare Patient Portal',
      description: `Develop a HIPAA-compliant patient portal that allows patients to manage appointments, view medical records, communicate with healthcare providers, and handle billing. The portal must integrate with existing EHR systems and support telemedicine video consultations.\n\nFeatures:\n- Appointment scheduling and reminders\n- Secure messaging with providers\n- Medical records viewer\n- Telemedicine video calls (WebRTC)\n- Insurance and billing management\n- HIPAA-compliant data storage`,
      slug: 'healthcare-patient-portal',
      category: 'software-development',
      skills: ['React', 'Node.js', 'WebRTC', 'PostgreSQL', 'AWS', 'HIPAA'],
      tags: ['Healthcare', 'Patient Portal', 'Telemedicine', 'HIPAA'],
      industry: ['Healthcare', 'Technology'],
      budget: 95000,
      duration: '20 weeks',
    },
    {
      title: 'Real Estate Property Management Dashboard',
      description: `Build a comprehensive property management dashboard for real estate companies managing 500+ rental properties. The dashboard provides rent collection tracking, maintenance request management, tenant screening, lease management, and financial reporting.\n\nIncludes:\n- Multi-property portfolio overview\n- Automated rent collection and reminders\n- Maintenance ticket system\n- Tenant application and screening\n- Lease document management\n- Financial reports and analytics`,
      slug: 'real-estate-property-management-dashboard',
      category: 'software-development',
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Stripe', 'Chart.js'],
      tags: ['Real Estate', 'Dashboard', 'Property Management', 'SaaS'],
      industry: ['Real Estate', 'Finance'],
      budget: 65000,
      duration: '14 weeks',
    },
    {
      title: 'Supply Chain Analytics Platform',
      description: `Design and build a data analytics platform for supply chain optimization. The platform ingests data from multiple sources (ERP systems, IoT sensors, shipping APIs) and provides predictive analytics, demand forecasting, and real-time supply chain visibility.\n\nCapabilities:\n- Data ingestion from 10+ source systems\n- Real-time supply chain visibility map\n- Demand forecasting with ML models\n- Inventory optimization algorithms\n- Supplier performance scorecards\n- Custom report builder`,
      slug: 'supply-chain-analytics-platform',
      category: 'research',
      skills: ['Python', 'React', 'Apache Kafka', 'TensorFlow', 'PostgreSQL', 'D3.js'],
      tags: ['Analytics', 'Supply Chain', 'Machine Learning', 'Data'],
      industry: ['Manufacturing', 'Logistics'],
      budget: 110000,
      duration: '22 weeks',
    },
    {
      title: 'Mobile Banking Application',
      description: `Develop a modern mobile banking application for a regional bank with 200,000 customers. The app must support account management, fund transfers, bill payments, mobile check deposit, and personal financial management tools.\n\nFeatures:\n- Biometric authentication (Face ID, Touch ID)\n- Real-time transaction notifications\n- P2P money transfers\n- Mobile check deposit with OCR\n- Budget tracking and spending insights\n- Card management (freeze/unfreeze)`,
      slug: 'mobile-banking-application',
      category: 'software-development',
      skills: ['React Native', 'TypeScript', 'Node.js', 'PostgreSQL', 'Plaid', 'AWS'],
      tags: ['FinTech', 'Mobile', 'Banking', 'Security'],
      industry: ['Finance & Banking', 'Technology'],
      budget: 150000,
      duration: '28 weeks',
    },
    {
      title: 'EdTech Learning Management System',
      description: `Create a comprehensive learning management system (LMS) for an education technology company. The platform supports course creation, live virtual classrooms, progress tracking, assessments, and certification management.\n\nComponents:\n- Course builder with drag-and-drop editor\n- Live classroom with screen sharing\n- Quiz and assessment engine\n- Student progress analytics\n- Certificate generation\n- API for third-party integrations`,
      slug: 'edtech-learning-management-system',
      category: 'software-development',
      skills: ['Next.js', 'TypeScript', 'Node.js', 'WebRTC', 'MongoDB', 'Redis'],
      tags: ['EdTech', 'LMS', 'Education', 'SaaS'],
      industry: ['Education', 'Technology'],
      budget: 85000,
      duration: '18 weeks',
    },
    {
      title: 'Market Research Intelligence Dashboard',
      description: `Build an interactive market research dashboard that aggregates data from multiple research sources, provides competitive intelligence, and generates automated research reports. Designed for market research analysts and business strategists.\n\nCapabilities:\n- Multi-source data aggregation\n- Interactive data visualization\n- Competitor tracking and alerts\n- Automated report generation\n- Survey builder and analysis\n- Trend detection with AI`,
      slug: 'market-research-intelligence-dashboard',
      category: 'research',
      skills: ['React', 'Python', 'D3.js', 'PostgreSQL', 'OpenAI', 'AWS'],
      tags: ['Market Research', 'Analytics', 'Intelligence', 'Dashboard'],
      industry: ['Research', 'Consulting'],
      budget: 70000,
      duration: '14 weeks',
    },
  ];

  for (const p of projects) {
    const existing = await client.query(
      `SELECT id FROM ${SCHEMA}.projects WHERE slug = $1`,
      [p.slug]
    );
    if (existing.rows.length > 0) {
      console.log(`  Project "${p.title}" already exists, skipping`);
      continue;
    }

    await client.query(
      `INSERT INTO ${SCHEMA}.projects (title, description, slug, category, skills, tags, industry, status, budget, duration, "createdBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8, $9, $10)`,
      [p.title, p.description, p.slug, p.category, p.skills, p.tags, p.industry, p.budget, p.duration, creatorId]
    );
    console.log(`  ✅ Created project: ${p.title}`);
  }

  // ── Sample Services (recurring scope — same page as projects but with monthly pricing) ──
  const services = [
    {
      title: 'Managed Cloud Infrastructure Service',
      description: `Ongoing cloud infrastructure management including monitoring, security patching, scaling, backup management, and 24/7 incident response. We handle your AWS/GCP/Azure infrastructure so you can focus on your product.\n\nIncludes monthly:\n- Infrastructure monitoring and alerting\n- Security patching and updates\n- Auto-scaling configuration\n- Daily backups and disaster recovery\n- Monthly performance reports\n- 24/7 incident response`,
      slug: 'managed-cloud-infrastructure-service',
      category: 'software-development',
      skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Prometheus', 'Linux'],
      tags: ['DevOps', 'Cloud', 'Managed Service', 'Infrastructure'],
      industry: ['Technology'],
      priceMin: 5000,
      priceMax: 15000,
      deliveryTime: 'Monthly',
    },
    {
      title: 'UX Research & User Testing Service',
      description: `Ongoing user research and usability testing service. Each month includes user interviews, usability tests, heuristic evaluations, and actionable recommendations to improve your product's user experience.\n\nMonthly deliverables:\n- 8 user interviews\n- 2 usability test sessions\n- Heuristic evaluation report\n- UX recommendations document\n- Competitive UX benchmarking\n- Monthly insights presentation`,
      slug: 'ux-research-user-testing-service',
      category: 'research',
      skills: ['User Research', 'Usability Testing', 'Figma', 'Analytics', 'A/B Testing'],
      tags: ['UX Research', 'User Testing', 'Design Research'],
      industry: ['Technology', 'Design'],
      priceMin: 8000,
      priceMax: 12000,
      deliveryTime: 'Monthly',
    },
  ];

  for (const s of services) {
    const existing = await client.query(
      `SELECT id FROM ${SCHEMA}.services WHERE slug = $1`,
      [s.slug]
    );
    if (existing.rows.length > 0) {
      console.log(`  Service "${s.title}" already exists, skipping`);
      continue;
    }

    await client.query(
      `INSERT INTO ${SCHEMA}.services (title, description, slug, category, skills, tags, industry, status, "priceMin", "priceMax", "deliveryTime", "createdBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8, $9, $10, $11)`,
      [s.title, s.description, s.slug, s.category, s.skills, s.tags, s.industry, s.priceMin, s.priceMax, s.deliveryTime, creatorId]
    );
    console.log(`  ✅ Created service: ${s.title}`);
  }

  console.log('\n✅ Seed complete!');

  // Print summary
  const projectCount = await client.query(`SELECT count(*) FROM ${SCHEMA}.projects`);
  const serviceCount = await client.query(`SELECT count(*) FROM ${SCHEMA}.services`);
  console.log(`  Projects: ${projectCount.rows[0].count}`);
  console.log(`  Services: ${serviceCount.rows[0].count}`);

  // Print project IDs and slugs for reference
  const allProjects = await client.query(`SELECT id, slug, title FROM ${SCHEMA}.projects ORDER BY "createdAt"`);
  console.log('\nProject URLs:');
  for (const p of allProjects.rows) {
    const shortId = p.id.split('-')[0];
    console.log(`  /c/${p.slug.includes('research') || p.title.includes('Research') ? 'research' : 'software-development'}/projects/${p.slug}-${shortId}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
