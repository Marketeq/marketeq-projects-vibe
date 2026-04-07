import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class UserSchemaGuardService implements OnModuleInit {
  private readonly logger = new Logger(UserSchemaGuardService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query(
      `ALTER TABLE IF EXISTS "user_service"."users" ADD COLUMN IF NOT EXISTS "provider" character varying NOT NULL DEFAULT 'EMAIL'`,
    );
    await this.dataSource.query(
      `ALTER TABLE IF EXISTS "user_service"."users" ADD COLUMN IF NOT EXISTS "hasPassword" boolean NOT NULL DEFAULT false`,
    );

    this.logger.log('Ensured auth sync columns exist on user_service.users');
  }
}