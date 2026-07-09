// apps/listings-service/src/job-listing/seeds/job-listing.seed.ts
//
// Purpose: Pre-populate the database with realistic test records including
// BasicInformation, TeamMemberRows, and RoleDescriptions.

import { DataSource } from 'typeorm';
import { JobListing } from '../entities/job-listing.entity';
import { BasicInformation } from '../entities/job-listing-basic-info.entity';
import { TeamMemberRow } from '../entities/job-listing-role-row.entity';
import { RoleDescription } from '../entities/job-listing-role-description.entity';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { ContractType } from '../enums/contract-type.enum';

export const SEED_IDS = {
  ECOMMERCE_PLATFORM:          'a1000001-0000-0000-0000-000000000001',
  DEVOPS_SERVICE:              'a1000001-0000-0000-0000-000000000002',
  MOBILE_APP:                  'a1000001-0000-0000-0000-000000000003',
  DESIGN_SYSTEM:               'a1000001-0000-0000-0000-000000000004',
  DATA_PIPELINE:               'a1000001-0000-0000-0000-000000000005',
  EXISTING_ACTIVE_LISTING:     'a1000001-0000-0000-0000-000000000006',
  EXISTING_NDA_ACTIVE_LISTING: 'a1000001-0000-0000-0000-000000000007',
  EXISTING_NDA_INACTIVE:       'a1000001-0000-0000-0000-000000000008',
  CLIENT_A:                    'b2000001-0000-0000-0000-000000000001',
};

export async function seedJobListings(dataSource: DataSource): Promise<void> {
  const listingRepo  = dataSource.getRepository(JobListing);
  const basicRepo    = dataSource.getRepository(BasicInformation);
  const memberRepo   = dataSource.getRepository(TeamMemberRow);
  const descRepo     = dataSource.getRepository(RoleDescription);

  // ── 1. E-Commerce Platform Rebuild ─────────────────────────────────────────
  await listingRepo.upsert(Object.assign(new JobListing(), {
    id:                   SEED_IDS.ECOMMERCE_PLATFORM,
    clientUserId:         SEED_IDS.CLIENT_A,
    status:               JobListingStatus.PUBLISHED,
    contractType:         ContractType.NEW,
    workType:             'project',
    hiringType:           'team',
    scopeKnowledge:       'has_scope',
    description:          'Full rebuild of a high-traffic e-commerce platform with React and Node.js.',
    budgetAmountUsdCents: 1200000,
    budgetFrequency:      'per_week',
    durationMonths:       6,
    ndaEnabled:           false,
    publishedAt:          new Date('2025-03-01'),
    lastActivityAt:       new Date(),
    staleWarningSent:     false,
  }) as any, ['id']);

  await basicRepo.upsert(Object.assign(new BasicInformation(), {
    jobListingId: SEED_IDS.ECOMMERCE_PLATFORM,
    title:        'E-Commerce Platform Rebuild',
    jobType:      'E-commerce',
    industries:   ['Retail', 'Technology', 'E-commerce'],
    languages:    ['English'],
  }) as any, ['jobListingId']);

  await memberRepo.delete({ jobListingId: SEED_IDS.ECOMMERCE_PLATFORM });
  await memberRepo.save([
    Object.assign(new TeamMemberRow(), { jobListingId: SEED_IDS.ECOMMERCE_PLATFORM, roleTitle: 'Full Stack Developer', location: 'United States', experienceLevel: 'Senior', workSchedule: 'full_time', contractLengthMonths: 6, positionOrder: 0 }),
    Object.assign(new TeamMemberRow(), { jobListingId: SEED_IDS.ECOMMERCE_PLATFORM, roleTitle: 'UX Designer',          location: 'United States', experienceLevel: 'Mid',    workSchedule: 'part_time', contractLengthMonths: 3, positionOrder: 1 }),
    Object.assign(new TeamMemberRow(), { jobListingId: SEED_IDS.ECOMMERCE_PLATFORM, roleTitle: 'QA Engineer',          location: 'Eastern Europe', experienceLevel: 'Mid',   workSchedule: 'full_time', contractLengthMonths: 6, positionOrder: 2 }),
  ]);

  await descRepo.delete({ jobListingId: SEED_IDS.ECOMMERCE_PLATFORM });
  await descRepo.save([
    Object.assign(new RoleDescription(), {
      jobListingId:     SEED_IDS.ECOMMERCE_PLATFORM,
      roleTitle:        'Full Stack Developer',
      overview:         'You will rebuild a high-traffic e-commerce platform serving over 500,000 monthly users across North America.',
      benefits:         'Work on a modern React and Node.js stack with a collaborative team. Fully remote, competitive pay, and flexible hours.',
      responsibilities: 'You will architect APIs, build reusable frontend components, optimize database queries, and lead code reviews.',
      skills:           ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'REST APIs'],
    }),
    Object.assign(new RoleDescription(), {
      jobListingId:     SEED_IDS.ECOMMERCE_PLATFORM,
      roleTitle:        'UX Designer',
      overview:         'You will design the end-to-end shopping experience for a high-traffic retail platform used by hundreds of thousands of customers.',
      benefits:         'Shape the product with design-led decision making. Work closely with engineering and product leadership.',
      responsibilities: 'You will run user research, create wireframes and high-fidelity prototypes in Figma, and deliver final design assets.',
      skills:           ['Figma', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
    }),
    Object.assign(new RoleDescription(), {
      jobListingId:     SEED_IDS.ECOMMERCE_PLATFORM,
      roleTitle:        'QA Engineer',
      overview:         'You will ensure quality across a large-scale e-commerce platform through automated and manual testing processes.',
      benefits:         'Join a team that prioritises quality. Remote-first with strong engineering culture and clear career growth.',
      responsibilities: 'You will write and maintain automated test suites, perform regression testing, and document bugs with clear reproduction steps.',
      skills:           ['Playwright', 'Jest', 'API Testing', 'CI/CD', 'Test Automation'],
    }),
  ]);

  // ── 2. Cloud DevOps Support Service ────────────────────────────────────────
  await listingRepo.upsert(Object.assign(new JobListing(), {
    id:                   SEED_IDS.DEVOPS_SERVICE,
    clientUserId:         SEED_IDS.CLIENT_A,
    status:               JobListingStatus.PUBLISHED,
    contractType:         ContractType.NEW,
    workType:             'service',
    hiringType:           'individual',
    scopeKnowledge:       'has_scope',
    description:          'Ongoing DevOps and cloud infrastructure support for a growing SaaS company.',
    budgetAmountUsdCents: 800000,
    budgetFrequency:      'per_month',
    isOngoing:            true,
    ndaEnabled:           true,
    ndaScopeVisibility:   'relevant_phases',
    publishedAt:          new Date('2025-02-15'),
    lastActivityAt:       new Date(),
    staleWarningSent:     false,
  }) as any, ['id']);

  await basicRepo.upsert(Object.assign(new BasicInformation(), {
    jobListingId: SEED_IDS.DEVOPS_SERVICE,
    title:        'Cloud Infrastructure DevOps Support',
    jobType:      'SaaS Platform',
    industries:   ['Technology', 'Cloud Computing', 'SaaS'],
    languages:    ['English', 'German'],
  }) as any, ['jobListingId']);

  await memberRepo.delete({ jobListingId: SEED_IDS.DEVOPS_SERVICE });
  await memberRepo.save([
    Object.assign(new TeamMemberRow(), { jobListingId: SEED_IDS.DEVOPS_SERVICE, roleTitle: 'DevOps Engineer', location: 'Western Europe', experienceLevel: 'Senior', workSchedule: 'full_time', contractLengthMonths: 12, positionOrder: 0 }),
  ]);

  await descRepo.delete({ jobListingId: SEED_IDS.DEVOPS_SERVICE });
  await descRepo.save([
    Object.assign(new RoleDescription(), {
      jobListingId:     SEED_IDS.DEVOPS_SERVICE,
      roleTitle:        'DevOps Engineer',
      overview:         'You will own the cloud infrastructure for a fast-growing SaaS platform processing millions of events daily across multiple regions.',
      benefits:         'Work with a cutting-edge cloud-native stack. Fully remote, async-first culture, and strong growth opportunities.',
      responsibilities: 'You will manage CI/CD pipelines, monitor and scale infrastructure, automate deployments, and lead incident response.',
      skills:           ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'GitHub Actions', 'Prometheus'],
    }),
  ]);

  // ── 3. Mobile App — React Native ───────────────────────────────────────────
  await listingRepo.upsert(Object.assign(new JobListing(), {
    id:                   SEED_IDS.MOBILE_APP,
    clientUserId:         SEED_IDS.CLIENT_A,
    status:               JobListingStatus.PUBLISHED,
    contractType:         ContractType.NEW,
    workType:             'project',
    hiringType:           'team',
    scopeKnowledge:       'has_scope',
    description:          'Build a cross-platform mobile app for a healthcare startup.',
    budgetAmountUsdCents: 600000,
    budgetFrequency:      'per_week',
    durationMonths:       3,
    ndaEnabled:           true,
    ndaScopeVisibility:   'full_scope',
    publishedAt:          new Date('2025-04-01'),
    lastActivityAt:       new Date(),
    staleWarningSent:     false,
  }) as any, ['id']);

  await basicRepo.upsert(Object.assign(new BasicInformation(), {
    jobListingId: SEED_IDS.MOBILE_APP,
    title:        'Healthcare Mobile App — React Native',
    jobType:      'Mobile App',
    industries:   ['Healthcare', 'Technology'],
    languages:    ['English', 'Spanish'],
  }) as any, ['jobListingId']);

  await memberRepo.delete({ jobListingId: SEED_IDS.MOBILE_APP });
  await memberRepo.save([
    Object.assign(new TeamMemberRow(), { jobListingId: SEED_IDS.MOBILE_APP, roleTitle: 'React Native Developer', location: 'Latin America', experienceLevel: 'Senior', workSchedule: 'full_time', contractLengthMonths: 3, positionOrder: 0 }),
    Object.assign(new TeamMemberRow(), { jobListingId: SEED_IDS.MOBILE_APP, roleTitle: 'Backend Developer',      location: 'South Asia',    experienceLevel: 'Mid',    workSchedule: 'full_time', contractLengthMonths: 3, positionOrder: 1 }),
  ]);

  await descRepo.delete({ jobListingId: SEED_IDS.MOBILE_APP });
  await descRepo.save([
    Object.assign(new RoleDescription(), {
      jobListingId:     SEED_IDS.MOBILE_APP,
      roleTitle:        'React Native Developer',
      overview:         'You will build a cross-platform mobile app for a healthcare startup helping patients track chronic conditions.',
      benefits:         'Meaningful work in health tech. Flexible hours, remote-first, and direct collaboration with the founding team.',
      responsibilities: 'You will build screens and components in React Native, integrate REST APIs, and deliver iOS and Android builds.',
      skills:           ['React Native', 'TypeScript', 'Expo', 'REST APIs', 'iOS', 'Android'],
    }),
    Object.assign(new RoleDescription(), {
      jobListingId:     SEED_IDS.MOBILE_APP,
      roleTitle:        'Backend Developer',
      overview:         'You will build the API layer powering a healthcare mobile app used by patients and clinicians.',
      benefits:         'Work on impactful health technology with a fast-moving startup. Remote with flexible hours.',
      responsibilities: 'You will design and build RESTful APIs, manage database schemas, implement auth, and ensure HIPAA compliance.',
      skills:           ['Node.js', 'TypeScript', 'PostgreSQL', 'REST APIs', 'AWS'],
    }),
  ]);

  // ── 4. Design System ───────────────────────────────────────────────────────
  await listingRepo.upsert(Object.assign(new JobListing(), {
    id:                   SEED_IDS.DESIGN_SYSTEM,
    clientUserId:         SEED_IDS.CLIENT_A,
    status:               JobListingStatus.DRAFT,
    contractType:         ContractType.NEW,
    workType:             'project',
    hiringType:           'individual',
    description:          'Create a comprehensive design system and component library for a fintech platform.',
    budgetAmountUsdCents: 400000,
    budgetFrequency:      'per_week',
    durationMonths:       3,
    ndaEnabled:           false,
    lastActivityAt:       new Date(),
    staleWarningSent:     false,
  }) as any, ['id']);

  await basicRepo.upsert(Object.assign(new BasicInformation(), {
    jobListingId: SEED_IDS.DESIGN_SYSTEM,
    title:        'Fintech Design System & Component Library',
    jobType:      'Design System',
    industries:   ['Finance', 'Fintech', 'Technology'],
    languages:    ['English'],
  }) as any, ['jobListingId']);

  await memberRepo.delete({ jobListingId: SEED_IDS.DESIGN_SYSTEM });
  await memberRepo.save([
    Object.assign(new TeamMemberRow(), { jobListingId: SEED_IDS.DESIGN_SYSTEM, roleTitle: 'Product Designer', location: 'United States', experienceLevel: 'Senior', workSchedule: 'full_time', contractLengthMonths: 3, positionOrder: 0 }),
  ]);

  await descRepo.delete({ jobListingId: SEED_IDS.DESIGN_SYSTEM });
  await descRepo.save([
    Object.assign(new RoleDescription(), {
      jobListingId:     SEED_IDS.DESIGN_SYSTEM,
      roleTitle:        'Product Designer',
      overview:         'You will create a design system and component library used by a team of 15 engineers building a fintech platform.',
      benefits:         'Define the visual language for an entire product. High autonomy, remote-first, and strong design culture.',
      responsibilities: 'You will audit the existing UI, build a token-based design system in Figma, document components, and support engineering handoff.',
      skills:           ['Figma', 'Design Systems', 'Tokens', 'Component Libraries', 'Accessibility'],
    }),
  ]);

  // ── 5. Data Pipeline ───────────────────────────────────────────────────────
  await listingRepo.upsert(Object.assign(new JobListing(), {
    id:                   SEED_IDS.DATA_PIPELINE,
    clientUserId:         SEED_IDS.CLIENT_A,
    status:               JobListingStatus.PUBLISHED,
    contractType:         ContractType.NEW,
    workType:             'project',
    hiringType:           'team',
    description:          'Build a real-time data pipeline and analytics dashboard for a logistics company.',
    budgetAmountUsdCents: 900000,
    budgetFrequency:      'per_week',
    durationMonths:       6,
    ndaEnabled:           true,
    ndaScopeVisibility:   'relevant_phases',
    publishedAt:          new Date('2025-04-10'),
    lastActivityAt:       new Date(),
    staleWarningSent:     false,
  }) as any, ['id']);

  await basicRepo.upsert(Object.assign(new BasicInformation(), {
    jobListingId: SEED_IDS.DATA_PIPELINE,
    title:        'Real-Time Data Pipeline & Analytics Dashboard',
    jobType:      'Data Pipeline',
    industries:   ['Logistics', 'Technology', 'Analytics'],
    languages:    ['English', 'French'],
  }) as any, ['jobListingId']);

  await memberRepo.delete({ jobListingId: SEED_IDS.DATA_PIPELINE });
  await memberRepo.save([
    Object.assign(new TeamMemberRow(), { jobListingId: SEED_IDS.DATA_PIPELINE, roleTitle: 'Data Engineer',    location: 'Western Europe', experienceLevel: 'Senior', workSchedule: 'full_time', contractLengthMonths: 6, positionOrder: 0 }),
    Object.assign(new TeamMemberRow(), { jobListingId: SEED_IDS.DATA_PIPELINE, roleTitle: 'Frontend Developer', location: 'Eastern Europe', experienceLevel: 'Mid',  workSchedule: 'full_time', contractLengthMonths: 6, positionOrder: 1 }),
  ]);

  await descRepo.delete({ jobListingId: SEED_IDS.DATA_PIPELINE });
  await descRepo.save([
    Object.assign(new RoleDescription(), {
      jobListingId:     SEED_IDS.DATA_PIPELINE,
      roleTitle:        'Data Engineer',
      overview:         'You will build a real-time data pipeline processing 50M+ daily logistics events for a global freight company.',
      benefits:         'Work on high-scale data infrastructure with modern tooling. Remote-first with flexible hours and strong technical culture.',
      responsibilities: 'You will design event-driven pipelines, optimise data models, build ETL workflows, and ensure data quality across all streams.',
      skills:           ['Python', 'Apache Kafka', 'dbt', 'BigQuery', 'Airflow', 'SQL'],
    }),
    Object.assign(new RoleDescription(), {
      jobListingId:     SEED_IDS.DATA_PIPELINE,
      roleTitle:        'Frontend Developer',
      overview:         'You will build an analytics dashboard that gives logistics operations teams real-time visibility into shipment data.',
      benefits:         'Work directly with end-users to shape the product. Remote with async-first culture.',
      responsibilities: 'You will build React data visualisation components, integrate with streaming APIs, and optimise dashboard performance.',
      skills:           ['React', 'TypeScript', 'D3.js', 'REST APIs', 'Chart.js'],
    }),
  ]);

  // ── 6–8. Minimal records (existing contract scenarios) ─────────────────────
  for (const [id, nda] of [
    [SEED_IDS.EXISTING_ACTIVE_LISTING, false],
    [SEED_IDS.EXISTING_NDA_ACTIVE_LISTING, true],
    [SEED_IDS.EXISTING_NDA_INACTIVE, false],
  ] as [string, boolean][]) {
    await listingRepo.upsert(Object.assign(new JobListing(), {
      id,
      clientUserId:    SEED_IDS.CLIENT_A,
      status:          JobListingStatus.DRAFT,
      contractType:    ContractType.EXISTING,
      ndaEnabled:      nda,
      lastActivityAt:  new Date(),
      staleWarningSent: false,
    }) as any, ['id']);
  }

  console.log('Job listing seed complete — 8 records upserted.');
}
