#!/usr/bin/env node
/**
 * Add categories column and populate with proper L1 > L2 > L3 hierarchy.
 * Each project/service can have up to 3 categories displayed in the hero section.
 */

const { Client } = require('pg');

// The connection string comes from the environment (stored in Doppler); never commit it.
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Export it, or run with: doppler run -- node <this script>');
  process.exit(1);
}
const SCHEMA = 'listings';

// Categories for each project slug — [L1, L2, L3] hierarchy
const PROJECT_CATEGORIES = {
  'ai-powered-customer-support-platform': ['Software Development', 'Artificial Intelligence', 'Natural Language Processing'],
  'e-commerce-marketplace-redesign': ['Software Development', 'Web Development', 'E-Commerce'],
  'healthcare-patient-portal': ['Software Development', 'Healthcare IT', 'Telemedicine'],
  'real-estate-property-management-dashboard': ['Software Development', 'SaaS Platforms', 'Property Management'],
  'supply-chain-analytics-platform': ['Data & Analytics', 'Machine Learning', 'Supply Chain'],
  'mobile-banking-application': ['Software Development', 'FinTech', 'Mobile Development'],
  'edtech-learning-management-system': ['Software Development', 'EdTech', 'Learning Platforms'],
  'market-research-intelligence-dashboard': ['Research', 'Market Research', 'Business Intelligence'],
  'consumer-behavior-analytics-suite': ['Research', 'Consumer Research', 'Data Analytics'],
  'academic-literature-review-platform': ['Research', 'Academic Research', 'AI Tools'],
  'competitive-intelligence-tracker': ['Research', 'Competitive Intelligence', 'Data Monitoring'],
  'clinical-trial-data-analyzer': ['Research', 'Clinical Research', 'Pharma'],
  'survey-research-insights-platform': ['Research', 'Survey Research', 'Insights Platforms'],
  'inventory-management-system': ['Software Development', 'Retail Tech', 'Inventory Systems'],
  'saas-analytics-dashboard-builder': ['Software Development', 'SaaS Platforms', 'Embedded Analytics'],
  'fleet-management-platform': ['Software Development', 'Logistics', 'IoT Platforms'],
};

const SERVICE_CATEGORIES = {
  'managed-cloud-infrastructure-service': ['Software Development', 'DevOps', 'Cloud Infrastructure'],
  'ux-research-user-testing-service': ['Design', 'UX Research', 'User Testing'],
  'market-research-subscription-service': ['Research', 'Market Research', 'Strategy'],
  'data-science-ml-consulting': ['Data & Analytics', 'Data Science', 'Machine Learning'],
  'full-stack-development-retainer': ['Software Development', 'Full-Stack', 'Startups'],
  'devops-infrastructure-management': ['Software Development', 'DevOps', 'Infrastructure'],
  'qa-test-automation-service': ['Software Development', 'Quality Assurance', 'Test Automation'],
};

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database\n');

  // Add categories column if it doesn't exist
  for (const table of ['projects', 'services']) {
    await client.query(`
      ALTER TABLE ${SCHEMA}.${table}
      ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}'
    `);
    console.log(`  Added categories column to ${table}`);
  }

  // Update projects
  console.log('\n=== Updating Projects ===');
  for (const [slug, cats] of Object.entries(PROJECT_CATEGORIES)) {
    const result = await client.query(
      `UPDATE ${SCHEMA}.projects SET categories = $1 WHERE slug = $2 RETURNING title`,
      [cats, slug]
    );
    if (result.rows.length > 0) {
      console.log(`  ✅ ${result.rows[0].title} → ${cats.join(' > ')}`);
    } else {
      console.log(`  ⚠️  No project for slug: ${slug}`);
    }
  }

  // Update services
  console.log('\n=== Updating Services ===');
  for (const [slug, cats] of Object.entries(SERVICE_CATEGORIES)) {
    const result = await client.query(
      `UPDATE ${SCHEMA}.services SET categories = $1 WHERE slug = $2 RETURNING title`,
      [cats, slug]
    );
    if (result.rows.length > 0) {
      console.log(`  ✅ ${result.rows[0].title} → ${cats.join(' > ')}`);
    } else {
      console.log(`  ⚠️  No service for slug: ${slug}`);
    }
  }

  console.log('\n✅ Categories populated!');
  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
