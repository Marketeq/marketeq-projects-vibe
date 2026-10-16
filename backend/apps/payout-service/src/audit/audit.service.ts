import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
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

  // Pass `manager` when logging against a payout_request created in the same
  // open transaction: payout_audit_log.payout_request_id has an FK, and the
  // default repository runs on a separate connection that can't see the
  // uncommitted row yet.
  async log(params: LogParams, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(PayoutAuditLog) : this.auditRepo;
    await repo.save({
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

  async findRecentForContractor(
    contractorId: string,
    actions: string[],
    limit = 20,
  ): Promise<PayoutAuditLog[]> {
    return this.auditRepo.find({
      where: { contractorId, action: In(actions) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}