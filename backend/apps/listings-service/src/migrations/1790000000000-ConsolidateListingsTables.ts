import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidateListingsTables1790000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE listings.project ALTER COLUMN "userId" DROP NOT NULL`);

    // listings.services → listings.project
    await queryRunner.query(`
      INSERT INTO listings.project (
        id, slug, title, "shortDescription", description, categories, subcategories,
        industries, tags, skills, "programmingLanguages", "developmentTech", languages,
        locations, "mediaUrls", "deliveryTime", status, deliverables,
        "createdBy", "createdAt", "updatedAt", "payloadId", "editorialLabel",
        "listingType", category, "videoUrl", faqs, "priceMin", "priceMax"
      )
      SELECT
        s.id, s.slug, s.title, s."shortDescription", s.description, COALESCE(s.categories, '{}'), COALESCE(s.subcategories, '{}'),
        COALESCE(s.industry, '{}'), COALESCE(s.tags, '{}'), COALESCE(s.skills, '{}'), COALESCE(s."programmingLanguages", '{}'), COALESCE(s."developmentTech", '{}'), COALESCE(s.languages, '{}'),
        COALESCE(s.locations, '{}'), COALESCE(s."mediaUrls", '{}'), s."deliveryTime", s.status,
        CASE WHEN s.deliverables IS NULL THEN '[]'::jsonb ELSE to_jsonb(s.deliverables) END,
        s."createdBy", s."createdAt", s."updatedAt", s."payloadId"::varchar, s."editorialLabel",
        'service', s.category, s."videoUrl", s.faqs, s."priceMin", s."priceMax"
      FROM listings.services s
      WHERE s.id NOT IN (SELECT id FROM listings.project)
      ON CONFLICT (id) DO NOTHING
    `);

    // listings.services_v2 → listings.project
    await queryRunner.query(`
      INSERT INTO listings.project (
        id, slug, title, "shortDescription", description, categories, subcategories,
        industries, tags, skills, "programmingLanguages", "developmentTech", languages,
        locations, "mediaUrls", "deliveryTime", status, deliverables,
        "createdBy", "createdAt", "updatedAt", "payloadId", "editorialLabel",
        "listingType", category, "videoUrl", faqs, "priceMin", "priceMax",
        featured, rating, "reviewCount", "completionsCount", "views90d", "adminBoost"
      )
      SELECT
        sv.id, sv.slug, sv.title, sv."shortDescription", sv.description, COALESCE(sv.categories, '{}'), COALESCE(sv.subcategories, '{}'),
        COALESCE(sv.industry, '{}'), COALESCE(sv.tags, '{}'), COALESCE(sv.skills, '{}'), COALESCE(sv."programmingLanguages", '{}'), COALESCE(sv."developmentTech", '{}'), COALESCE(sv.languages, '{}'),
        COALESCE(sv.locations, '{}'), COALESCE(sv."mediaUrls", '{}'), sv."deliveryTime", sv.status,
        CASE WHEN sv.deliverables IS NULL THEN '[]'::jsonb ELSE to_jsonb(sv.deliverables) END,
        sv."createdBy", sv."createdAt", sv."updatedAt", sv."payloadId"::varchar, sv."editorialLabel",
        'service', sv.category, sv."videoUrl", sv.faqs, sv."priceMin", sv."priceMax",
        COALESCE(sv.featured, false), COALESCE(sv.rating, 0), COALESCE(sv."reviewCount", 0),
        COALESCE(sv."completionsCount", 0), COALESCE(sv."views90d", 0), COALESCE(sv."adminBoost", 0)
      FROM listings.services_v2 sv
      WHERE sv.id NOT IN (SELECT id FROM listings.project)
      ON CONFLICT (id) DO NOTHING
    `);

    // listings.projects → listings.project (deliverables not null)
    await queryRunner.query(`
      INSERT INTO listings.project (
        id, slug, title, "shortDescription", description, categories, subcategories,
        industries, tags, skills, "programmingLanguages", "developmentTech", languages,
        locations, "mediaUrls", status, deliverables,
        "createdBy", "createdAt", "updatedAt", "payloadId",
        "listingType", category, "videoUrl", faqs, budget, "estimatedHours", scope, duration
      )
      SELECT
        p.id, p.slug, p.title, p."shortDescription", p.description, COALESCE(p.categories, '{}'), COALESCE(p.subcategories, '{}'),
        COALESCE(p.industry, '{}'), COALESCE(p.tags, '{}'), COALESCE(p.skills, '{}'), COALESCE(p."programmingLanguages", '{}'), COALESCE(p."developmentTech", '{}'), COALESCE(p.languages, '{}'),
        COALESCE(p.locations, '{}'), COALESCE(p."mediaUrls", '{}'), p.status, to_jsonb(p.deliverables),
        p."createdBy", p."createdAt", p."updatedAt", p."payloadId"::varchar,
        'project', p.category, p."videoUrl", p.faqs, p.budget, p."estimatedHours", p.scope, p.duration
      FROM listings.projects p
      WHERE p.id NOT IN (SELECT id FROM listings.project)
        AND p.deliverables IS NOT NULL
      ON CONFLICT (id) DO NOTHING
    `);

    // listings.projects → listings.project (deliverables null)
    await queryRunner.query(`
      INSERT INTO listings.project (
        id, slug, title, "shortDescription", description, categories, subcategories,
        industries, tags, skills, "programmingLanguages", "developmentTech", languages,
        locations, "mediaUrls", status, deliverables,
        "createdBy", "createdAt", "updatedAt", "payloadId",
        "listingType", category, "videoUrl", faqs, budget, "estimatedHours", scope, duration
      )
      SELECT
        p.id, p.slug, p.title, p."shortDescription", p.description, COALESCE(p.categories, '{}'), COALESCE(p.subcategories, '{}'),
        COALESCE(p.industry, '{}'), COALESCE(p.tags, '{}'), COALESCE(p.skills, '{}'), COALESCE(p."programmingLanguages", '{}'), COALESCE(p."developmentTech", '{}'), COALESCE(p.languages, '{}'),
        COALESCE(p.locations, '{}'), COALESCE(p."mediaUrls", '{}'), p.status, '[]'::jsonb,
        p."createdBy", p."createdAt", p."updatedAt", p."payloadId"::varchar,
        'project', p.category, p."videoUrl", p.faqs, p.budget, p."estimatedHours", p.scope, p.duration
      FROM listings.projects p
      WHERE p.id NOT IN (SELECT id FROM listings.project)
        AND p.deliverables IS NULL
      ON CONFLICT (id) DO NOTHING
    `);

    // listings.projects_v2 → listings.project
    await queryRunner.query(`
      INSERT INTO listings.project (
        id, slug, title, "shortDescription", description, categories, subcategories,
        industries, tags, skills, "programmingLanguages", "developmentTech", languages,
        locations, "mediaUrls", status, deliverables,
        "createdBy", "createdAt", "updatedAt", "payloadId",
        "listingType", category, "videoUrl", faqs, budget, "estimatedHours", scope, duration, "recentQuestions"
      )
      SELECT
        pv.id, pv.slug, pv.title, pv."shortDescription", pv.description, COALESCE(pv.categories, '{}'), COALESCE(pv.subcategories, '{}'),
        COALESCE(pv.industries, '{}'), COALESCE(pv.tags, '{}'), COALESCE(pv.skills, '{}'), COALESCE(pv."programmingLanguages", '{}'), COALESCE(pv."developmentTech", '{}'), COALESCE(pv.languages, '{}'),
        COALESCE(pv.locations, '{}'), COALESCE(pv."mediaUrls", '{}'), pv.status, pv.deliverables,
        pv."createdBy", pv."createdAt", pv."updatedAt", pv."payloadId"::varchar,
        COALESCE(pv."projectType", 'project'), pv.category, pv."videoUrl",
        pv.faqs, pv.budget, pv."estimatedHours", pv.scope, pv.duration, pv."recentQuestions"
      FROM listings.projects_v2 pv
      WHERE pv.id NOT IN (SELECT id FROM listings.project)
      ON CONFLICT (id) DO NOTHING
    `);

    // Drop columns not in any entity
    await queryRunner.query(`ALTER TABLE listings.project DROP COLUMN IF EXISTS "fullDescription"`);
    await queryRunner.query(`ALTER TABLE listings.project DROP COLUMN IF EXISTS "subCategories"`);
    await queryRunner.query(`ALTER TABLE listings.project DROP COLUMN IF EXISTS "isPublic"`);
    await queryRunner.query(`ALTER TABLE listings.project DROP COLUMN IF EXISTS "isSearchable"`);
    await queryRunner.query(`ALTER TABLE listings.project DROP COLUMN IF EXISTS "isApproved"`);
    await queryRunner.query(`ALTER TABLE listings.project DROP COLUMN IF EXISTS "isBoosted"`);

    // Drop orphaned tables
    await queryRunner.query(`DROP TABLE IF EXISTS listings.services CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS listings.services_v2 CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS listings.projects CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS listings.projects_v2 CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS listings.teams_v2 CASCADE`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible — data consolidation
  }
}
