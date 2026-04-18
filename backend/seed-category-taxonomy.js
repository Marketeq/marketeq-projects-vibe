#!/usr/bin/env node
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const DATABASE_URL =
  process.env.CATEGORY_DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/category_db';

const TAXONOMY = [
  {
    name: 'Development',
    children: [
      {
        name: 'Web Development',
        children: [
          'Frontend Development',
          'Backend Development',
          'Full Stack Development',
          'API Integration',
        ],
      },
      {
        name: 'Mobile Development',
        children: [
          'iOS Development',
          'Android Development',
          'React Native',
          'Flutter',
        ],
      },
      {
        name: 'AI & Machine Learning',
        children: [
          'Artificial Intelligence',
          'Machine Learning',
          'Natural Language Processing',
          'Computer Vision',
        ],
      },
    ],
  },
  {
    name: 'Design',
    children: [
      {
        name: 'UI/UX Design',
        children: [
          'UX Research',
          'Wireframing',
          'Prototyping',
          'Interaction Design',
        ],
      },
      {
        name: 'Graphic Design',
        children: [
          'Logo Design',
          'Illustration',
          'Brand Identity',
          'Marketing Creatives',
        ],
      },
      {
        name: 'Product Design',
        children: [
          'Design Systems',
          'User Flows',
          'Usability Testing',
          'Mobile UX',
        ],
      },
    ],
  },
  {
    name: 'Data Science',
    children: [
      {
        name: 'Machine Learning',
        children: [
          'Predictive Modeling',
          'Classification',
          'Clustering',
          'Feature Engineering',
        ],
      },
      {
        name: 'Analytics',
        children: [
          'Dashboarding',
          'Data Visualization',
          'Business Intelligence',
          'Reporting Automation',
        ],
      },
      {
        name: 'Data Engineering',
        children: [
          'ETL Pipelines',
          'Data Warehousing',
          'Streaming Data',
          'BigQuery',
        ],
      },
    ],
  },
];

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

async function upsertCategory(client, name, parentId = null) {
  const slugBase = slugify(name);
  const existing = await client.query(
    'SELECT id, uuid FROM categories_v2 WHERE name = $1 AND COALESCE("parentId", 0) = COALESCE($2, 0) LIMIT 1',
    [name, parentId]
  );

  if (existing.rows[0]) {
    await client.query(
      'UPDATE categories_v2 SET approved = true, published_in_marketplace = true WHERE id = $1',
      [existing.rows[0].id]
    );
    return existing.rows[0];
  }

  let slug = slugBase;
  let suffix = 1;
  while (true) {
    const conflict = await client.query(
      'SELECT 1 FROM categories_v2 WHERE slug = $1 LIMIT 1',
      [slug]
    );
    if (conflict.rowCount === 0) break;
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }

  const inserted = await client.query(
    `INSERT INTO categories_v2 (uuid, name, slug, approved, published_in_marketplace, "parentId")
     VALUES ($1, $2, $3, true, true, $4)
     RETURNING id, uuid`,
    [randomUUID(), name, slug, parentId]
  );
  return inserted.rows[0];
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to category_db');

  for (const root of TAXONOMY) {
    const rootRow = await upsertCategory(client, root.name);
    console.log(`Root: ${root.name}`);

    for (const child of root.children) {
      const childRow = await upsertCategory(client, child.name, rootRow.id);
      console.log(`  Child: ${child.name}`);

      for (const grandchild of child.children) {
        await upsertCategory(client, grandchild, childRow.id);
        console.log(`    Grandchild: ${grandchild}`);
      }
    }
  }

  await client.end();
  console.log('Seed complete');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
