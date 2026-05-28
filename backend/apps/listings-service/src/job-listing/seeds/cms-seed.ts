// Seed job-listing records into the CMS (Payload) so they appear in the admin UI.
// Run after job-listing.seed.ts has populated the listings-service DB.
//
// Usage (from listings-service root):
//   npx ts-node --project tsconfig.json -r tsconfig-paths/register src/job-listing/seeds/cms-seed.ts

import 'dotenv/config';
import 'reflect-metadata';
import { SEED_IDS } from './job-listing.seed';

const CMS_URL           = process.env.CMS_URL           || 'http://localhost:3020';
const CMS_ADMIN_EMAIL   = process.env.CMS_ADMIN_EMAIL   || 'admin@marketeq.com';
const CMS_ADMIN_PASSWORD = process.env.CMS_ADMIN_PASSWORD || 'password123';
const COLLECTION        = 'job-listings';

// ── Seed records ─────────────────────────────────────────────────────────────

const CMS_RECORDS = [
  {
    sourceId: SEED_IDS.DEVOPS_SERVICE,
    title: 'Cloud Infrastructure DevOps Support',
    ndaEnabled: false,
    industries: [
      { value: 'Technology' },
      { value: 'Cloud Computing' },
    ],
    languages: [
      { value: 'English' },
    ],
    teamMemberRows: [
      {
        roleTitle: 'DevOps Engineer',
        location: 'United States',
        experienceLevel: 'Senior',
        workSchedule: 'full_time',
        contractLengthMonths: 6,
      },
    ],
    roleDescriptions: [
      {
        roleTitle: 'DevOps Engineer',
        overview: 'You will support the cloud infrastructure for a growing SaaS platform, ensuring uptime and scalability.',
        benefits: 'Work with a modern cloud-native stack. Flexible hours, fully remote, and competitive pay.',
        responsibilities: 'You will manage CI/CD pipelines, monitor infrastructure, automate deployments, and respond to incidents.',
        skills: [
          { value: 'AWS' },
          { value: 'Kubernetes' },
          { value: 'Terraform' },
          { value: 'Docker' },
          { value: 'GitHub Actions' },
        ],
      },
    ],
  },
  {
    sourceId: SEED_IDS.ECOMMERCE_PLATFORM,
    title: 'B2B SaaS Analytics Platform',
    ndaEnabled: true,
    industries: [
      { value: 'Technology' },
      { value: 'Finance' },
    ],
    languages: [
      { value: 'English' },
      { value: 'Spanish' },
    ],
    teamMemberRows: [
      {
        roleTitle: 'Full Stack Developer',
        location: 'Western Europe',
        experienceLevel: 'Mid',
        workSchedule: 'full_time',
        contractLengthMonths: 6,
      },
      {
        roleTitle: 'UX Designer',
        location: 'United States',
        experienceLevel: 'Senior',
        workSchedule: 'part_time',
        contractLengthMonths: 3,
      },
    ],
    roleDescriptions: [
      {
        roleTitle: 'Full Stack Developer',
        overview: 'You will build a B2B analytics dashboard used by enterprise finance teams across multiple regions.',
        benefits: 'Join a fast-moving team building product used by Fortune 500 companies. Competitive salary and equity.',
        responsibilities: 'You will develop APIs, build frontend components, write tests, and collaborate closely with design.',
        skills: [
          { value: 'TypeScript' },
          { value: 'React' },
          { value: 'Node.js' },
          { value: 'PostgreSQL' },
          { value: 'REST APIs' },
        ],
      },
      {
        roleTitle: 'UX Designer',
        overview: 'You will design the user experience for a B2B analytics platform targeting finance professionals.',
        benefits: 'Shape the product direction with a collaborative team that values design-led development.',
        responsibilities: 'You will create wireframes, run user research sessions, build prototypes, and deliver final assets.',
        skills: [
          { value: 'Figma' },
          { value: 'User Research' },
          { value: 'Wireframing' },
          { value: 'Prototyping' },
        ],
      },
    ],
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Login
  console.log(`Logging into CMS at ${CMS_URL}...`);
  const loginRes = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: CMS_ADMIN_EMAIL, password: CMS_ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error('CMS login failed:', await loginRes.text());
    process.exit(1);
  }
  const { token } = await loginRes.json() as any;
  console.log('Logged in.');

  const headers = {
    'content-type': 'application/json',
    'Authorization': `JWT ${token}`,
  };

  // 2. Upsert each record
  for (const record of CMS_RECORDS) {
    // Check if already exists by sourceId
    const checkRes = await fetch(
      `${CMS_URL}/api/${COLLECTION}?where[sourceId][equals]=${record.sourceId}&limit=1`,
      { headers },
    );
    const checkData = await checkRes.json() as any;
    const existing = checkData?.docs?.[0];

    if (existing) {
      // Update
      const updateRes = await fetch(`${CMS_URL}/api/${COLLECTION}/${existing.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(record),
      });
      if (updateRes.ok) {
        console.log(`Updated: "${record.title}" (id=${existing.id})`);
      } else {
        console.error(`Update failed for "${record.title}":`, await updateRes.text());
      }
    } else {
      // Create
      const createRes = await fetch(`${CMS_URL}/api/${COLLECTION}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(record),
      });
      if (createRes.ok) {
        const created = await createRes.json() as any;
        console.log(`Created: "${record.title}" (id=${created.doc?.id ?? created.id})`);
      } else {
        console.error(`Create failed for "${record.title}":`, await createRes.text());
      }
    }
  }

  console.log('CMS seed complete.');
}

main().catch((err) => {
  console.error('CMS seed failed:', err);
  process.exit(1);
});
