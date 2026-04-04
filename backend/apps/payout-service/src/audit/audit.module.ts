import { Global, Module } from '@nestjs/common';
import { TypeOrmModule }  from '@nestjs/typeorm';
import { AuditService }   from './audit.service';
import { PayoutAuditLog } from '../entities/payout-audit-log.entity';

@Global()
@Module({
  imports:   [TypeOrmModule.forFeature([PayoutAuditLog])],
  providers: [AuditService],
  exports:   [AuditService],
})
export class AuditModule {}
