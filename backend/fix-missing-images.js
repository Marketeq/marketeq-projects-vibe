#!/usr/bin/env node
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { Client } = require('pg');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / DATABASE_URL must be set in your
// shell env before running (see backend/.env.local.example).
const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://94ccb1ac46d66f225f369bd07f044f56.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
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

async function fix() {
  const db = new Client({
    connectionString: requireEnv('DATABASE_URL'),
  });
  await db.connect();

  const fixes = [
    ['ai-powered-customer-support-platform', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop&q=80'],
    ['mobile-banking-application', 'https://images.unsplash.com/photo-1556742400-b5b7c512f3f0?w=800&h=500&fit=crop&q=80'],
  ];

  for (const [slug, url] of fixes) {
    try {
      console.log('Downloading', slug);
      const buf = await download(url);
      console.log('  Downloaded', (buf.length / 1024).toFixed(0) + 'KB');
      const key = `media/covers/${slug}-${uuidv4().split('-')[0]}.jpg`;
      await s3.send(
        new PutObjectCommand({
          Bucket: 'marketeq-profile-images',
          Key: key,
          Body: buf,
          ContentType: 'image/jpeg',
        })
      );
      const r2Url = `https://pub-4789db6a57d64de3ad7b5e8c316d125b.r2.dev/${key}`;
      const r = await db.query(
        'UPDATE listings.projects SET "mediaUrls" = ARRAY[$1] WHERE slug = $2 RETURNING title',
        [r2Url, slug]
      );
      console.log('  ✅', r.rows[0]?.title || 'not found');
    } catch (err) {
      console.error('  ❌', slug, err.message);
    }
  }
  await db.end();
}

fix().catch((e) => {
  console.error(e);
  process.exit(1);
});
