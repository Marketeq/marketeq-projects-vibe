// apps/listings-service/src/job-listing/seeds/job-listing.seed.ts
//
// Purpose: Pre-populate the database with known, fixed test records so QA
// engineers can run test cases without manually creating data first.
// Run this script once before executing any test cases from JL-12.

import { DataSource } from 'typeorm';
import { JobListing } from '../entities/job-listing.entity';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { ContractType } from '../enums/contract-type.enum';

// Fixed UUIDs for all seed records — used in Postman collection variables.
export const SEED_IDS = {
  DRAFT_PROJECT:               'a1000001-0000-0000-0000-000000000001',
  PUBLISHED_SERVICE:           'a1000001-0000-0000-0000-000000000002',
  STALE_DRAFT:                 'a1000001-0000-0000-0000-000000000003',
  NEEDS_UPDATE:                'a1000001-0000-0000-0000-000000000004',
  PENDING_REVIEW:              'a1000001-0000-0000-0000-000000000005',
  EXISTING_ACTIVE_LISTING:     'a1000001-0000-0000-0000-000000000006',
  EXISTING_NDA_ACTIVE_LISTING: 'a1000001-0000-0000-0000-000000000007',
  EXISTING_NDA_INACTIVE:       'a1000001-0000-0000-0000-000000000008',
  CLIENT_A:                    'b2000001-0000-0000-0000-000000000001',
};

export async function seedJobListings(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(JobListing);

  // ── 1. Draft listing — New Project, Step 3 reached ──────────────────────
  await repo.upsert(Object.assign(new JobListing(), {
    id:                   SEED_IDS.DRAFT_PROJECT,
    clientUserId:         SEED_IDS.CLIENT_A,
    status:               JobListingStatus.DRAFT,
    contractType:         ContractType.NEW,
    workType:             'project',
    hiringType:           'team',
    scopeKnowledge:       'has_scope',
    description:          'We are building a B2B SaaS analytics platform.',
    budgetAmountUsdCents: 500000,
    budgetFrequency:      'per_week',
    durationMonths:       6,
    lastCompletedStep:    3,
    lastActivityAt:       new Date(),
    staleWarningSent:     false,
  }) as any, ['id']);

  // ── 2. Published listing — New Service ──────────────────────────────────
  await repo.upsert(Object.assign(new JobListing(), {
    id:                   SEED_IDS.PUBLISHED_SERVICE,
    clientUserId:         SEED_IDS.CLIENT_A,
    status:               JobListingStatus.PUBLISHED,
    contractType:         ContractType.NEW,
    workType:             'service',
    hiringType:           'individual',
    scopeKnowledge:       'has_scope',
    description:          'Ongoing DevOps support for cloud infrastructure.',
    budgetAmountUsdCents: 200000,
    budgetFrequency:      'per_week',
    isOngoing:            true,
    ndaEnabled:           false,
    algoliaObjectId:      SEED_IDS.PUBLISHED_SERVICE,
    publishedAt:          new Date('2025-01-01'),
    lastActivityAt:       new Date(),
    staleWarningSent:     false,
  }) as any, ['id']);

  // ── 3. Stale draft — 91 days inactive ───────────────────────────────────
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 91);
  await repo.upsert(Object.assign(new JobListing(), {
    id:              SEED_IDS.STALE_DRAFT,
    clientUserId:    SEED_IDS.CLIENT_A,
    status:          JobListingStatus.DRAFT,
    contractType:    ContractType.NEW,
    lastActivityAt:  staleDate,
    staleWarningSent: false,
  }) as any, ['id']);

  // ── 4. Needs-update listing — rejected by moderation ────────────────────
  await repo.upsert(Object.assign(new JobListing(), {
    id:                        SEED_IDS.NEEDS_UPDATE,
    clientUserId:              SEED_IDS.CLIENT_A,
    status:                    JobListingStatus.NEEDS_UPDATE,
    contractType:              ContractType.NEW,
    moderationRejectionReason: 'Title contains prohibited terms.',
    lastActivityAt:            new Date(),
    staleWarningSent:          false,
  }) as any, ['id']);

  // ── 5. Pending review listing ────────────────────────────────────────────
  await repo.upsert(Object.assign(new JobListing(), {
    id:              SEED_IDS.PENDING_REVIEW,
    clientUserId:    SEED_IDS.CLIENT_A,
    status:          JobListingStatus.PENDING_REVIEW,
    contractType:    ContractType.NEW,
    workType:        'project',
    hiringType:      'team',
    lastActivityAt:  new Date(),
    staleWarningSent: false,
  }) as any, ['id']);

  // ── 6. Existing contract — active ───────────────────────────────────────
  await repo.upsert(Object.assign(new JobListing(), {
    id:              SEED_IDS.EXISTING_ACTIVE_LISTING,
    clientUserId:    SEED_IDS.CLIENT_A,
    status:          JobListingStatus.DRAFT,
    contractType:    ContractType.EXISTING,
    lastActivityAt:  new Date(),
    staleWarningSent: false,
  }) as any, ['id']);

  // ── 7. Existing contract — NDA active ───────────────────────────────────
  await repo.upsert(Object.assign(new JobListing(), {
    id:              SEED_IDS.EXISTING_NDA_ACTIVE_LISTING,
    clientUserId:    SEED_IDS.CLIENT_A,
    status:          JobListingStatus.DRAFT,
    contractType:    ContractType.EXISTING,
    ndaEnabled:      true,
    ndaDocumentId:   'c3000001-0000-0000-0000-000000000001',
    lastActivityAt:  new Date(),
    staleWarningSent: false,
  }) as any, ['id']);

  // ── 8. Existing contract — NDA inactive ─────────────────────────────────
  await repo.upsert(Object.assign(new JobListing(), {
    id:              SEED_IDS.EXISTING_NDA_INACTIVE,
    clientUserId:    SEED_IDS.CLIENT_A,
    status:          JobListingStatus.DRAFT,
    contractType:    ContractType.EXISTING,
    ndaEnabled:      false,
    ndaDocumentId:   null,
    lastActivityAt:  new Date(),
    staleWarningSent: false,
  }) as any, ['id']);

  console.log('Seed IDs for reference:');
  console.log('  DRAFT_PROJECT (use in Postman TC-S2-* tests):', SEED_IDS.DRAFT_PROJECT);
  console.log('  CLIENT_A userId:', SEED_IDS.CLIENT_A);
}
