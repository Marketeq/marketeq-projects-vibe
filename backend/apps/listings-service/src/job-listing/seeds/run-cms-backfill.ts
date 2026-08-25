// Standalone runner to verify the CMS backfill for job-listings.
// Seeds the listings-service DB first, then pushes all records to the CMS.
//
// Usage (from listings-service root):
//   npx ts-node --project tsconfig.json -r tsconfig-paths/register src/job-listing/seeds/run-cms-backfill.ts

import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { JobListing } from '../entities/job-listing.entity';
import { BasicInformation } from '../entities/job-listing-basic-info.entity';
import { JobListingPhase } from '../entities/job-listing-phase.entity';
import { JobListingTask } from '../entities/job-listing-task.entity';
import { TeamMemberRow } from '../entities/job-listing-role-row.entity';
import { RoleDescription } from '../entities/job-listing-role-description.entity';
import { seedJobListings } from './job-listing.seed';

const CMS_URL  = process.env.CMS_URL            || 'http://localhost:3020';
const EMAIL    = process.env.CMS_ADMIN_EMAIL    || 'admin@marketeq.com';
const PASSWORD = process.env.CMS_ADMIN_PASSWORD || 'password123';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: false,
    synchronize: false,
    entities: [JobListing, BasicInformation, JobListingPhase, JobListingTask, TeamMemberRow, RoleDescription],
  });
  await ds.initialize();
  console.log('DB connected.');

  // Step 1 — seed the DB
  console.log('\n── Step 1: Seeding listings-service DB ─────────────────────');
  await seedJobListings(ds);

  // Step 2 — login to CMS
  console.log('\n── Step 2: Logging into CMS ─────────────────────────────────');
  const loginRes = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) { console.error('CMS login failed:', await loginRes.text()); process.exit(1); }
  const { token } = await loginRes.json() as any;
  console.log('Logged in.');
  const headers = { 'content-type': 'application/json', Authorization: `JWT ${token}` };

  // Step 3 — backfill all job listings to CMS
  console.log('\n── Step 3: Backfilling to CMS ───────────────────────────────');
  const listings = await ds.getRepository(JobListing).find();
  console.log(`Found ${listings.length} job listings in DB`);

  let created = 0, skipped = 0, failed = 0;

  for (const listing of listings) {
    // Skip if already exists in CMS
    const checkRes  = await fetch(`${CMS_URL}/api/job-listings?where[sourceId][equals]=${listing.id}&limit=1`, { headers });
    const checkData = await checkRes.json() as any;
    if (checkData?.docs?.length > 0) {
      console.log(`  SKIP  ${listing.id} (already in CMS as id=${checkData.docs[0].id})`);
      skipped++;
      continue;
    }

    const basicInfo  = await ds.getRepository(BasicInformation).findOne({ where: { jobListingId: listing.id } });
    const memberRows = await ds.getRepository(TeamMemberRow).find({ where: { jobListingId: listing.id }, order: { positionOrder: 'ASC' } });
    const roleDescs  = await ds.getRepository(RoleDescription).find({ where: { jobListingId: listing.id } });

    const payload = {
      sourceId:           listing.id,
      title:              basicInfo?.title ?? 'Untitled',
      ndaEnabled:         listing.ndaEnabled,
      ndaScopeVisibility: listing.ndaScopeVisibility,
      industries:         (basicInfo?.industries ?? []).map((v: string) => ({ value: v })),
      languages:          (basicInfo?.languages  ?? []).map((v: string) => ({ value: v })),
      teamMemberRows: memberRows.map((r) => ({
        roleTitle:            r.roleTitle,
        location:             r.location             ?? undefined,
        experienceLevel:      r.experienceLevel      ?? undefined,
        workSchedule:         r.workSchedule,
        customHours:          r.customHours          ?? undefined,
        customFrequency:      r.customFrequency      ?? undefined,
        contractLengthMonths: r.contractLengthMonths ?? undefined,
      })),
      roleDescriptions: roleDescs.map((rd) => ({
        roleTitle:        rd.roleTitle,
        overview:         rd.overview         ?? undefined,
        benefits:         rd.benefits         ?? undefined,
        responsibilities: rd.responsibilities ?? undefined,
        skills:           rd.skills.map((s: string) => ({ value: s })),
      })),
    };

    const createRes = await fetch(`${CMS_URL}/api/job-listings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (createRes.ok) {
      const doc = await createRes.json() as any;
      console.log(`  CREATE "${payload.title}" — sourceId=${listing.id} cmsId=${doc.doc?.id ?? doc.id}`);
      created++;
    } else {
      console.error(`  FAIL  ${listing.id}:`, await createRes.text());
      failed++;
    }
  }

  console.log(`\n── Result ───────────────────────────────────────────────────`);
  console.log(`  Created : ${created}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Failed  : ${failed}`);

  await ds.destroy();
}

main().catch((err) => { console.error(err); process.exit(1); });
