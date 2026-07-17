import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class UserSchemaGuardService implements OnModuleInit {
  private readonly logger = new Logger(UserSchemaGuardService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    // Staging has experienced repeated drift between the current entity shape
    // and the long-lived shared database. A plain `findOne()` on the User
    // entity selects every mapped column, so a single missing column turns
    // `/user/me` into a 400 "Database error" even though auth itself works.
    // Keep boot resilient by ensuring the known entity-backed columns exist.
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
      await this.dataSource.query(
        `ALTER TABLE IF EXISTS "user_service"."users" ADD COLUMN IF NOT EXISTS ${definition}`,
      );
    }

    this.logger.log('Ensured current user entity columns exist on user_service.users');
  }
}
