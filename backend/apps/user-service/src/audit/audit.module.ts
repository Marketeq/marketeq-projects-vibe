import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { SettingsAuditLog } from './entities/settings-audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SettingsAuditLog])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
