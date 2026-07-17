#!/usr/bin/env node
/**
 * Download cover images and upload them to Cloudflare R2,
 * then update the database mediaUrls with the R2 public URLs.
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Client } = require('pg');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const DATABASE_URL = requireEnv('DATABASE_URL');

const SCHEMA = 'listings';

// R2 credentials -- set R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in your shell env
// before running (see backend/.env.local.example). Endpoint/bucket/public URL
// below are not secrets, just this script's fixed target.
const R2_ENDPOINT = 'https://94ccb1ac46d66f225f369bd07f044f56.r2.cloudflarestorage.com';
const R2_ACCESS_KEY = requireEnv('R2_ACCESS_KEY_ID');
const R2_SECRET_KEY = requireEnv('R2_SECRET_ACCESS_KEY');
const R2_BUCKET = 'marketeq-profile-images';
const PUBLIC_URL = 'https://pub-4789db6a57d64de3ad7b5e8c316d125b.r2.dev';

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

// Unsplash source images — high quality, relevant to each listing
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

/**
 * Download an image from a URL, following redirects.
 */
function downloadImage(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Marketeq-Seed/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadImage(res.headers.location, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Upload a buffer to R2 and return the public URL.
 */
async function uploadToR2(buffer, slug) {
  const key = `media/covers/${slug}-${uuidv4().split('-')[0]}.jpg`;
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

async function processImages(client, images, table) {
  for (const [slug, sourceUrl] of Object.entries(images)) {
    try {
      console.log(`  Downloading ${slug}...`);
      const buffer = await downloadImage(sourceUrl);
      console.log(`    Downloaded ${(buffer.length / 1024).toFixed(0)}KB`);

      console.log(`    Uploading to R2...`);
      const r2Url = await uploadToR2(buffer, slug);
      console.log(`    Uploaded: ${r2Url}`);

      const result = await client.query(
        `UPDATE ${SCHEMA}.${table} SET "mediaUrls" = ARRAY[$1] WHERE slug = $2 RETURNING title`,
        [r2Url, slug]
      );
      if (result.rows.length > 0) {
        console.log(`  ✅ ${result.rows[0].title}`);
      } else {
        console.log(`  ⚠️  No ${table.slice(0, -1)} found for slug: ${slug}`);
      }
    } catch (err) {
      console.error(`  ❌ Failed for ${slug}:`, err.message);
    }
  }
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database\n');

  console.log('=== Processing Projects ===');
  await processImages(client, PROJECT_IMAGES, 'projects');

  console.log('\n=== Processing Services ===');
  await processImages(client, SERVICE_IMAGES, 'services');

  console.log('\n✅ All cover images uploaded to R2 and database updated!');
  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
