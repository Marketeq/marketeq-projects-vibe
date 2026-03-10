import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserServiceTables1715000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS user_service`);

    // Enable uuid-ossp if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.users (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" text NOT NULL UNIQUE,
        "username" text UNIQUE,
        "firstName" text,
        "lastName" text,
        "avatarUrl" text,
        "bio" text,
        "overview" text,
        "userType" text CHECK ("userType" IN ('client', 'talent')),
        "location" text,
        "timezone" text,
        "availability" text,
        "role" text,
        "industry" text,
        "businessGoals" text,
        "teamName" text,
        "inviteCode" text,
        "rateMin" decimal(10,2),
        "rateMax" decimal(10,2),
        "onboardingDismissed" boolean NOT NULL DEFAULT false,
        "onboardingStatus" text NOT NULL DEFAULT 'pending' CHECK ("onboardingStatus" IN ('pending', 'completed', 'skipped')),
        "isActive" boolean NOT NULL DEFAULT true,
        "onboardedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Education table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.education (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES user_service.users("id") ON DELETE CASCADE,
        "institution" text NOT NULL,
        "degree" text NOT NULL,
        "field" text NOT NULL,
        "startDate" text NOT NULL,
        "endDate" text,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Experience table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.experience (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES user_service.users("id") ON DELETE CASCADE,
        "company" text NOT NULL,
        "role" text NOT NULL,
        "startDate" text NOT NULL,
        "endDate" text,
        "description" text,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Skills table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.skills (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES user_service.users("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "proficiency" text
      )
    `);

    // Languages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.languages (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES user_service.users("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "proficiency" text
      )
    `);

    // Certifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.certifications (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES user_service.users("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "issuingOrganization" text,
        "issueDate" text,
        "expiryDate" text,
        "credentialUrl" text
      )
    `);

    // User Industries table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.user_industries (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES user_service.users("id") ON DELETE CASCADE,
        "name" text NOT NULL
      )
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON user_service.users("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON user_service.users("username")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_user_type ON user_service.users("userType")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_education_user ON user_service.education("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_experience_user ON user_service.experience("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_skills_user ON user_service.skills("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_languages_user ON user_service.languages("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_certifications_user ON user_service.certifications("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_industries_user ON user_service.user_industries("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.user_industries`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.certifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.languages`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.skills`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.experience`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.education`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.users`);
  }
}
