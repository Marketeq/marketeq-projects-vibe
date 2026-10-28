#!/usr/bin/env node
/**
 * Update projects and services with high-res cover images from Unsplash.
 * All images are free for commercial use (Unsplash license).
 */

const { Client } = require('pg');

// The connection string comes from the environment (stored in Doppler); never commit it.
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Export it, or run with: doppler run -- node <this script>');
  process.exit(1);
}

const SCHEMA = 'listings';

// Unsplash images mapped to project slugs — high-res, relevant to each project
const PROJECT_IMAGES = {
  'ai-powered-customer-support-platform':
    'https://images.unsplash.com/photo-1531746790095-e5995fba66f9?w=800&h=500&fit=crop&q=80',
  'e-commerce-marketplace-redesign':
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop&q=80',
  'healthcare-patient-portal':
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop&q=80',
  'real-estate-property-management-dashboard':
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=500&fit=crop&q=80',
  'supply-chain-analytics-platform':
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=500&fit=crop&q=80',
  'mobile-banking-application':
    'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&h=500&fit=crop&q=80',
  'edtech-learning-management-system':
    'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&h=500&fit=crop&q=80',
  'market-research-intelligence-dashboard':
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop&q=80',
  'consumer-behavior-analytics-suite':
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop&q=80',
  'academic-literature-review-platform':
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=500&fit=crop&q=80',
  'competitive-intelligence-tracker':
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=500&fit=crop&q=80',
  'clinical-trial-data-analyzer':
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=500&fit=crop&q=80',
  'survey-research-insights-platform':
    'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=800&h=500&fit=crop&q=80',
  'inventory-management-system':
    'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&h=500&fit=crop&q=80',
  'saas-analytics-dashboard-builder':
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop&q=80',
  'fleet-management-platform':
    'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=500&fit=crop&q=80',
};

const SERVICE_IMAGES = {
  'managed-cloud-infrastructure-service':
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=500&fit=crop&q=80',
  'ux-research-user-testing-service':
    'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=500&fit=crop&q=80',
  'market-research-subscription-service':
    'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=500&fit=crop&q=80',
  'data-science-ml-consulting':
    'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=500&fit=crop&q=80',
  'full-stack-development-retainer':
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&fit=crop&q=80',
  'devops-infrastructure-management':
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=500&fit=crop&q=80',
  'qa-test-automation-service':
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=500&fit=crop&q=80',
};

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  // Update projects
  for (const [slug, imageUrl] of Object.entries(PROJECT_IMAGES)) {
    const result = await client.query(
      `UPDATE ${SCHEMA}.projects SET "mediaUrls" = ARRAY[$1] WHERE slug = $2 RETURNING title`,
      [imageUrl, slug]
    );
    if (result.rows.length > 0) {
      console.log(`  ✅ ${result.rows[0].title}`);
    } else {
      console.log(`  ⚠️  No project found for slug: ${slug}`);
    }
  }

  // Update services
  for (const [slug, imageUrl] of Object.entries(SERVICE_IMAGES)) {
    const result = await client.query(
      `UPDATE ${SCHEMA}.services SET "mediaUrls" = ARRAY[$1] WHERE slug = $2 RETURNING title`,
      [imageUrl, slug]
    );
    if (result.rows.length > 0) {
      console.log(`  ✅ ${result.rows[0].title}`);
    } else {
      console.log(`  ⚠️  No service found for slug: ${slug}`);
    }
  }

  console.log('\n✅ Cover images updated!');
  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
