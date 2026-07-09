#!/usr/bin/env node
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { Client } = require('pg');

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://94ccb1ac46d66f225f369bd07f044f56.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '020b9b97a526421028214dacadd810f3',
    secretAccessKey: 'a6de0a9c8438a1fcd3f4991ded970c4f9cf46068578f5e3319a056794d9a346d',
  },
});

function download(url, max = 5) {
  return new Promise((resolve, reject) => {
    if (max <= 0) return reject(new Error('Too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'Marketeq/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location, max - 1));
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

const images = {
  'qualitative-research-interviews-service': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop&q=80',
  'data-visualization-reporting-service': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop&q=80',
  'academic-research-assistant-service': 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&h=500&fit=crop&q=80',
  'sentiment-analysis-social-listening': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=500&fit=crop&q=80',
  'industry-benchmarking-analysis-service': 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=500&fit=crop&q=80',
  'api-design-integration-service': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=500&fit=crop&q=80',
  'mobile-app-development-service': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=500&fit=crop&q=80',
  'brand-identity-design-system-service': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=500&fit=crop&q=80',
};

async function main() {
  const db = new Client({
    connectionString: 'postgres://supabase_admin:VVLjT29C33ZrP4vzhzmBEGEit3529MAa@72.61.77.231:5433/postgres',
  });
  await db.connect();

  for (const [slug, url] of Object.entries(images)) {
    try {
      console.log(`Downloading ${slug}...`);
      const buf = await download(url);
      const key = `media/covers/${slug}-${uuidv4().split('-')[0]}.jpg`;
      await s3.send(new PutObjectCommand({ Bucket: 'marketeq-profile-images', Key: key, Body: buf, ContentType: 'image/jpeg' }));
      const r2Url = `https://pub-4789db6a57d64de3ad7b5e8c316d125b.r2.dev/${key}`;
      const r = await db.query('UPDATE listings.services SET "mediaUrls" = ARRAY[$1] WHERE slug = $2 RETURNING title', [r2Url, slug]);
      console.log(`  ✅ ${r.rows[0]?.title || 'not found'}`);
    } catch (err) {
      console.error(`  ❌ ${slug}: ${err.message}`);
    }
  }

  await db.end();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
