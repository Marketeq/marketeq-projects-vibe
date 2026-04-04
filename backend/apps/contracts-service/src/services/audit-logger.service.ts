import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractAudit } from '../entities/audit.entity';

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(
    @InjectRepository(ContractAudit)
    private readonly auditRepo: Repository<ContractAudit>,
  ) {}

  async log(user: any, action: string, details: any = {}) {
    try {
      const audit = this.auditRepo.create({
        userId: user.sub,
        role: user.role,
        action,
        contractId: details.contractId || null,
        groupId: details.groupId || null,
        details,
      });
      await this.auditRepo.save(audit);
      this.logger.debug(`Audit: ${action} by ${user.sub}`);
      return audit;
    } catch (err) {
      this.logger.error(`Failed to save audit log: ${err}`);
    }
  }
}
