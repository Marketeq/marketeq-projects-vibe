import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutAuditLog } from '../entities/payout-audit-log.entity';
import { PayoutStatus } from '../entities/payout-request.entity';

interface LogParams {
  contractorId: string;
  payoutRequestId?: string;
  actorType: 'contractor' | 'service' | 'admin';
  actorId: string;
  action: string;
  previousStatus?: PayoutStatus;
  newStatus?: PayoutStatus;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(PayoutAuditLog)
    private readonly auditRepo: Repository<PayoutAuditLog>,
  ) {}

  async log(params: LogParams): Promise<void> {
    await this.auditRepo.save({
      contractorId: params.contractorId,
      payoutRequestId: params.payoutRequestId ?? null,
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      previousStatus: params.previousStatus ?? null,
      newStatus: params.newStatus ?? null,
      metadata: params.metadata ?? null,
    });
  }
}