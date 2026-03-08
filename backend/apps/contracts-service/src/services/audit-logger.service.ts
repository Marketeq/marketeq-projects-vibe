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

  async log(
    user: { sub: string; role: string },
    action: string,
    details: { contractId?: string; groupId?: string; [key: string]: any } = {},
  ): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          userId: user.sub,
          role: user.role,
          action,
          contractId: details.contractId ?? null,
          groupId: details.groupId ?? null,
          details,
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to write audit log for action ${action}`, err);
    }
  }
}
