#!/usr/bin/env node
/**
 * Seed additional projects and services so every category has 6+ items.
 * Run: node seed-more-listings.js
 */

const { Client } = require('pg');

const DATABASE_URL =
  'postgres://supabase_admin:VVLjT29C33ZrP4vzhzmBEGEit3529MAa@72.61.77.231:5433/postgres';

const SCHEMA = 'listings';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  // Get a creator ID
  const userResult = await client.query(
    `SELECT id FROM user_service.users WHERE "userType" = 'client' LIMIT 1`
  );
  let creatorId;
  if (userResult.rows.length > 0) {
    creatorId = userResult.rows[0].id;
  } else {
    const anyUser = await client.query(`SELECT id FROM user_service.users LIMIT 1`);
    creatorId = anyUser.rows.length > 0 ? anyUser.rows[0].id : '00000000-0000-0000-0000-000000000000';
  }

  // ── Additional Research Projects ──
  const projects = [
    {
      title: 'Consumer Behavior Analytics Suite',
      description: `Develop a comprehensive consumer behavior analytics platform that tracks purchasing patterns, sentiment shifts, and demographic trends across multiple channels. Uses machine learning to identify emerging market opportunities and predict consumer demand.\n\nDeliverables:\n- Real-time consumer sentiment dashboard\n- Purchase pattern analysis engine\n- Demographic segmentation tool\n- Predictive demand modeling\n- Cross-channel attribution reporting\n- Custom alert system for trend shifts`,
      slug: 'consumer-behavior-analytics-suite',
      category: 'research',
      skills: ['Python', 'R', 'Tableau', 'SQL', 'TensorFlow', 'BigQuery'],
      tags: ['Consumer Research', 'Analytics', 'Machine Learning', 'Behavior'],
      industry: ['Research', 'Marketing'],
      budget: 88000,
      duration: '18 weeks',
    },
    {
      title: 'Academic Literature Review Platform',
      description: `Build a platform for systematic academic literature reviews with AI-assisted paper discovery, citation network analysis, and automated summarization. Integrates with major academic databases and helps researchers identify gaps in existing literature.\n\nFeatures:\n- AI-powered paper recommendation engine\n- Citation network visualization\n- Automated abstract summarization\n- Collaborative annotation tools\n- Export to multiple citation formats\n- Research gap identification`,
      slug: 'academic-literature-review-platform',
      category: 'research',
      skills: ['Python', 'React', 'NLP', 'Neo4j', 'OpenAI', 'ElasticSearch'],
      tags: ['Academic', 'Literature Review', 'AI', 'Research Tools'],
      industry: ['Education', 'Research'],
      budget: 65000,
      duration: '14 weeks',
    },
    {
      title: 'Competitive Intelligence Tracker',
      description: `Create an automated competitive intelligence platform that monitors competitor activities across web, social, patent filings, and SEC filings. Provides real-time alerts and quarterly competitive landscape reports.\n\nCapabilities:\n- Automated competitor website monitoring\n- Social media sentiment tracking\n- Patent filing alerts\n- Pricing intelligence\n- Market share estimation\n- Executive movement tracking`,
      slug: 'competitive-intelligence-tracker',
      category: 'research',
      skills: ['Python', 'Scrapy', 'React', 'PostgreSQL', 'NLP', 'D3.js'],
      tags: ['Competitive Intelligence', 'Monitoring', 'Analytics'],
      industry: ['Research', 'Consulting', 'Strategy'],
      budget: 72000,
      duration: '16 weeks',
    },
    {
      title: 'Clinical Trial Data Analyzer',
      description: `Develop a HIPAA-compliant clinical trial data analysis platform for pharmaceutical research teams. Supports multi-site trial data aggregation, adverse event tracking, and statistical analysis for regulatory submissions.\n\nComponents:\n- Multi-site data ingestion pipeline\n- Adverse event detection system\n- Statistical analysis toolkit (SAS-compatible)\n- Regulatory report generator (FDA/EMA formats)\n- Patient cohort management\n- Interim analysis dashboard`,
      slug: 'clinical-trial-data-analyzer',
      category: 'research',
      skills: ['Python', 'R', 'SAS', 'PostgreSQL', 'React', 'Docker'],
      tags: ['Clinical Research', 'Pharma', 'Data Analysis', 'HIPAA'],
      industry: ['Healthcare', 'Pharmaceutical', 'Research'],
      budget: 135000,
      duration: '24 weeks',
    },
    {
      title: 'Survey Research & Insights Platform',
      description: `Build an end-to-end survey research platform with advanced question logic, panel management, real-time response analytics, and automated insight generation using GPT-4.\n\nFeatures:\n- Drag-and-drop survey builder with skip logic\n- Panel recruitment and management\n- Real-time response dashboards\n- Cross-tabulation analysis\n- AI-generated insight summaries\n- Multi-language support`,
      slug: 'survey-research-insights-platform',
      category: 'research',
      skills: ['React', 'Node.js', 'PostgreSQL', 'OpenAI', 'Redis', 'TypeScript'],
      tags: ['Survey', 'Research', 'Insights', 'SaaS'],
      industry: ['Research', 'Marketing', 'Consulting'],
      budget: 78000,
      duration: '16 weeks',
    },
    // ── Additional Software Development Projects ──
    {
      title: 'Inventory Management System',
      description: `Build a real-time inventory management system for a retail chain with 200+ locations. Features barcode scanning, automated reorder alerts, warehouse management, and integration with existing POS systems.\n\nScope:\n- Multi-location inventory tracking\n- Barcode/QR scanning mobile app\n- Automated purchase order generation\n- Warehouse bin management\n- POS integration (Square, Shopify)\n- Inventory forecasting with ML`,
      slug: 'inventory-management-system',
      category: 'software-development',
      skills: ['React Native', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Python'],
      tags: ['Inventory', 'Retail', 'Mobile', 'SaaS'],
      industry: ['Retail', 'Logistics'],
      budget: 85000,
      duration: '18 weeks',
    },
    {
      title: 'SaaS Analytics Dashboard Builder',
      description: `Create a white-label analytics dashboard builder that allows SaaS companies to embed custom analytics into their products. Supports drag-and-drop widget creation, real-time data connections, and custom branding.\n\nFeatures:\n- Drag-and-drop dashboard editor\n- 20+ chart types and visualizations\n- Real-time data connectors (SQL, REST, GraphQL)\n- Embeddable iframe and React SDK\n- Role-based access control\n- White-label branding`,
      slug: 'saas-analytics-dashboard-builder',
      category: 'software-development',
      skills: ['React', 'TypeScript', 'D3.js', 'Node.js', 'PostgreSQL', 'WebSocket'],
      tags: ['Analytics', 'Dashboard', 'SaaS', 'Embedded'],
      industry: ['Technology', 'SaaS'],
      budget: 110000,
      duration: '22 weeks',
    },
    {
      title: 'Fleet Management Platform',
      description: `Develop a GPS-based fleet management platform for logistics companies with real-time vehicle tracking, route optimization, driver management, and fuel monitoring.\n\nFeatures:\n- Real-time GPS tracking with geofencing\n- AI route optimization\n- Driver behavior scoring\n- Fuel consumption analytics\n- Maintenance scheduling\n- Customer delivery notifications`,
      slug: 'fleet-management-platform',
      category: 'software-development',
      skills: ['React', 'Node.js', 'PostgreSQL', 'Google Maps API', 'Python', 'Redis'],
      tags: ['Fleet', 'Logistics', 'GPS', 'IoT'],
      industry: ['Logistics', 'Transportation'],
      budget: 95000,
      duration: '20 weeks',
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

  // ── Additional Services ──
  const services = [
    {
      title: 'Market Research Subscription Service',
      description: `Monthly market research reports and competitive analysis for your industry. Each month includes a detailed industry report, competitor activity summary, trend analysis, and strategic recommendations.\n\nMonthly deliverables:\n- Industry landscape report\n- Top 10 competitor activity tracker\n- Emerging trends brief\n- Consumer sentiment pulse\n- Strategic recommendations memo\n- Monthly strategy call`,
      slug: 'market-research-subscription-service',
      category: 'research',
      skills: ['Market Research', 'Data Analysis', 'Strategy', 'PowerPoint', 'SQL'],
      tags: ['Market Research', 'Reports', 'Strategy', 'Subscription'],
      industry: ['Research', 'Consulting'],
      priceMin: 6000,
      priceMax: 10000,
      deliveryTime: 'Monthly',
    },
    {
      title: 'Data Science & ML Consulting',
      description: `Ongoing data science consulting and machine learning model development. Monthly engagement includes model training, performance monitoring, A/B testing support, and data pipeline maintenance.\n\nIncludes monthly:\n- ML model development and tuning\n- Data pipeline monitoring\n- A/B test design and analysis\n- Monthly performance reports\n- Model drift detection\n- Strategy and roadmap consulting`,
      slug: 'data-science-ml-consulting',
      category: 'research',
      skills: ['Python', 'TensorFlow', 'SQL', 'Spark', 'AWS SageMaker'],
      tags: ['Data Science', 'Machine Learning', 'Consulting', 'AI'],
      industry: ['Technology', 'Research'],
      priceMin: 12000,
      priceMax: 20000,
      deliveryTime: 'Monthly',
    },
    {
      title: 'Full-Stack Development Retainer',
      description: `Dedicated full-stack development team on a monthly retainer. Includes sprint planning, development, code review, deployment, and maintenance. Perfect for startups that need ongoing development support.\n\nMonthly includes:\n- 160 development hours\n- Sprint planning and standups\n- Code review and QA\n- CI/CD and deployment\n- Bug fixes and maintenance\n- Architecture consulting`,
      slug: 'full-stack-development-retainer',
      category: 'software-development',
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker'],
      tags: ['Development', 'Retainer', 'Full-Stack', 'Startup'],
      industry: ['Technology', 'SaaS'],
      priceMin: 15000,
      priceMax: 25000,
      deliveryTime: 'Monthly',
    },
    {
      title: 'DevOps & Infrastructure Management',
      description: `Complete DevOps and cloud infrastructure management service. We handle your CI/CD pipelines, monitoring, security, scaling, and incident response so your team can focus on building features.\n\nMonthly includes:\n- CI/CD pipeline management\n- Infrastructure monitoring (24/7)\n- Security patching and audits\n- Auto-scaling optimization\n- Cost optimization reviews\n- Incident response and post-mortems`,
      slug: 'devops-infrastructure-management',
      category: 'software-development',
      skills: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'Prometheus', 'GitHub Actions'],
      tags: ['DevOps', 'Infrastructure', 'Cloud', 'Managed Service'],
      industry: ['Technology'],
      priceMin: 8000,
      priceMax: 18000,
      deliveryTime: 'Monthly',
    },
    {
      title: 'QA & Test Automation Service',
      description: `Ongoing quality assurance and test automation service. Our QA engineers write and maintain automated test suites, perform manual testing for new features, and provide detailed regression reports.\n\nMonthly includes:\n- Automated test suite development\n- Manual feature testing\n- Regression test execution\n- Performance testing\n- Bug report management\n- Test coverage reports`,
      slug: 'qa-test-automation-service',
      category: 'software-development',
      skills: ['Cypress', 'Playwright', 'Jest', 'Selenium', 'TypeScript', 'CI/CD'],
      tags: ['QA', 'Testing', 'Automation', 'Quality'],
      industry: ['Technology', 'SaaS'],
      priceMin: 6000,
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

  // Print summary
  const projectCount = await client.query(`SELECT category, count(*) FROM ${SCHEMA}.projects GROUP BY category ORDER BY category`);
  const serviceCount = await client.query(`SELECT category, count(*) FROM ${SCHEMA}.services GROUP BY category ORDER BY category`);
  console.log('\n✅ Seed complete!');
  console.log('\nProjects by category:');
  projectCount.rows.forEach(r => console.log(`  ${r.category}: ${r.count}`));
  console.log('\nServices by category:');
  serviceCount.rows.forEach(r => console.log(`  ${r.category}: ${r.count}`));

  await client.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
