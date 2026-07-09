import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLog } from '../entities/audit-log.entity';
import { AuditService } from '../services/audit.service';

// @Global() makes AuditService injectable across all modules
// without each module needing to import AuditModule explicitly
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}