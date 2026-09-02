import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class UserSchemaGuardService implements OnModuleInit {
  private readonly logger = new Logger(UserSchemaGuardService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Best-effort DDL. This whole service is a boot-time repair pass, so a
   * statement the database refuses must never take the service down with it:
   * onModuleInit rejecting aborts Nest's bootstrap, the process exits, and the
   * old container keeps serving until the next restart — at which point
   * user-service simply does not come back.
   *
   * That is not hypothetical here. The managed database does not grant this
   * role CREATE on every schema (favorites/notifications already need
   * supabase_admin), and CREATE EXTENSION generally requires superuser. Those
   * statements are the ones most likely to be refused, and the correct
   * response is to log and carry on: the migrations own the real schema, this
   * pass only patches drift.
   */
  private async tryDdl(sql: string, label: string): Promise<void> {
    try {
      await this.dataSource.query(sql);
    } catch (err) {
      this.logger.warn(
        `Schema guard skipped ${label}: ${(err as Error).message}`,
      );
    }
  }

  async onModuleInit(): Promise<void> {
    // Staging has experienced repeated drift between the current entity shape
    // and the long-lived shared database. A plain `findOne()` on the User
    // entity selects every mapped column, so a single missing column turns
    // `/user/me` into a 400 "Database error" even though auth itself works.
    // Keep boot resilient by ensuring the known entity-backed columns exist.
    await this.tryDdl(
      `CREATE SCHEMA IF NOT EXISTS "user_service"`,
      'CREATE SCHEMA user_service',
    );
    await this.tryDdl(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      'CREATE EXTENSION uuid-ossp',
    );

    const columnRepairs = [
      `"username" character varying`,
      `"firstName" character varying`,
      `"lastName" character varying`,
      `"avatarUrl" character varying`,
      `"phone" character varying`,
      `"bio" text`,
      `"overview" text`,
      `"userType" character varying`,
      `"location" character varying`,
      `"timezone" character varying`,
      `"availability" character varying`,
      `"role" character varying`,
      `"provider" character varying NOT NULL DEFAULT 'EMAIL'`,
      `"hasPassword" boolean NOT NULL DEFAULT false`,
      `"industry" character varying`,
      `"businessGoals" character varying`,
      `"teamName" character varying`,
      `"inviteCode" character varying`,
      `"onboardingDismissed" boolean NOT NULL DEFAULT false`,
      `"onboardingStatus" character varying`,
      `"isActive" boolean NOT NULL DEFAULT true`,
      `"onboardedAt" timestamptz`,
      `"rate" numeric`,
      `"rateMin" numeric`,
      `"rateMax" numeric`,
      `"jobTitles" jsonb`,
      `"recentJobTitle" character varying`,
      `"industriesWorkedIn" jsonb`,
      `"lookingToWorkWith" jsonb`,
      `"projectTypes" jsonb`,
      `"language" jsonb`,
      `"customAvailability" jsonb`,
      `"isStudent" boolean DEFAULT false`,
      `"gettingStartedStep" integer`,
      `"clientOnboardedAt" timestamptz`,
      `"talentOnboardedAt" timestamptz`,
      `"totalProjectsCompleted" integer`,
      `"clientSuccessRating" numeric`,
      `"repeatHireRate" numeric`,
    ];

    for (const definition of columnRepairs) {
      await this.tryDdl(
        `ALTER TABLE IF EXISTS "user_service"."users" ADD COLUMN IF NOT EXISTS ${definition}`,
        `users column ${definition}`,
      );
    }

    await this.ensureRelationTables();

    this.logger.log(
      'Ensured current user entity tables and columns exist in user_service',
    );
  }

  private async ensureRelationTables(): Promise<void> {
    const tableRepairs = [
      `CREATE TABLE IF NOT EXISTS "user_service"."languages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "fluency" character varying,
        "userId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_service_languages_id" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "user_service"."experience" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" character varying,
        "company" character varying NOT NULL,
        "location" text,
        "startDate" date NOT NULL,
        "endDate" date,
        "isCurrentRole" boolean NOT NULL DEFAULT false,
        "industryType" character varying,
        "skills" text array,
        "userId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_service_experience_id" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "user_service"."education" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "school" character varying NOT NULL,
        "degree" character varying NOT NULL,
        "fieldOfStudy" character varying NOT NULL,
        "startYear" integer NOT NULL,
        "startMonth" integer,
        "endYear" integer,
        "endMonth" integer,
        "isCurrent" boolean NOT NULL DEFAULT false,
        "userId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_service_education_id" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "user_service"."certifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "issuer" character varying NOT NULL,
        "issueDate" date NOT NULL,
        "expirationDate" date,
        "credentialId" character varying,
        "credentialUrl" character varying,
        "skills" text array,
        "userId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_service_certifications_id" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "user_service"."user_industries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "industry" character varying NOT NULL,
        "yearsOfExperience" integer,
        "description" text,
        "userId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_service_user_industries_id" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "user_service"."portfolio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "url" character varying,
        "imageUrl" character varying,
        "tags" text array,
        "userId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_service_portfolio_id" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "user_service"."skills" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "proficiency" character varying,
        "userId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_service_skills_id" PRIMARY KEY ("id")
      )`,
    ];

    for (const sql of tableRepairs) {
      await this.tryDdl(sql, 'relation table create');
    }

    const relationColumnRepairs: Record<string, string[]> = {
      languages: [
        `"name" character varying`,
        `"fluency" character varying`,
        `"userId" uuid`,
        `"createdAt" timestamptz DEFAULT now()`,
        `"updatedAt" timestamptz DEFAULT now()`,
      ],
      experience: [
        `"title" character varying`,
        `"description" character varying`,
        `"company" character varying`,
        `"location" text`,
        `"startDate" date`,
        `"endDate" date`,
        `"isCurrentRole" boolean DEFAULT false`,
        `"industryType" character varying`,
        `"skills" text array`,
        `"userId" uuid`,
        `"createdAt" timestamptz DEFAULT now()`,
        `"updatedAt" timestamptz DEFAULT now()`,
      ],
      education: [
        `"school" character varying`,
        `"degree" character varying`,
        `"fieldOfStudy" character varying`,
        `"startYear" integer`,
        `"startMonth" integer`,
        `"endYear" integer`,
        `"endMonth" integer`,
        `"isCurrent" boolean DEFAULT false`,
        `"userId" uuid`,
        `"createdAt" timestamptz DEFAULT now()`,
        `"updatedAt" timestamptz DEFAULT now()`,
      ],
      certifications: [
        `"name" character varying`,
        `"issuer" character varying`,
        `"issueDate" date`,
        `"expirationDate" date`,
        `"credentialId" character varying`,
        `"credentialUrl" character varying`,
        `"skills" text array`,
        `"userId" uuid`,
        `"createdAt" timestamptz DEFAULT now()`,
        `"updatedAt" timestamptz DEFAULT now()`,
      ],
      user_industries: [
        `"industry" character varying`,
        `"yearsOfExperience" integer`,
        `"description" text`,
        `"userId" uuid`,
        `"createdAt" timestamptz DEFAULT now()`,
        `"updatedAt" timestamptz DEFAULT now()`,
      ],
      portfolio: [
        `"name" character varying`,
        `"description" text`,
        `"url" character varying`,
        `"imageUrl" character varying`,
        `"tags" text array`,
        `"userId" uuid`,
        `"createdAt" timestamptz DEFAULT now()`,
        `"updatedAt" timestamptz DEFAULT now()`,
      ],
      skills: [
        `"name" character varying`,
        `"proficiency" character varying`,
        `"userId" uuid`,
        `"createdAt" timestamptz DEFAULT now()`,
        `"updatedAt" timestamptz DEFAULT now()`,
      ],
    };

    for (const [table, definitions] of Object.entries(relationColumnRepairs)) {
      for (const definition of definitions) {
        await this.tryDdl(
          `ALTER TABLE IF EXISTS "user_service"."${table}" ADD COLUMN IF NOT EXISTS ${definition}`,
          `${table} column ${definition}`,
        );
      }
    }

    const indexedTables = [
      'languages',
      'experience',
      'education',
      'certifications',
      'user_industries',
      'portfolio',
      'skills',
    ];

    for (const table of indexedTables) {
      await this.tryDdl(
        `CREATE INDEX IF NOT EXISTS "IDX_user_service_${table}_userId" ON "user_service"."${table}" ("userId")`,
        `${table} userId index`,
      );
    }
  }
}
