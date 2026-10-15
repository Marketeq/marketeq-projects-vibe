// apps/payout-service/src/notifications/withdrawal-notifier.service.ts
// PMCM-806: tells the contractor when a withdrawal starts processing (N-01),
// lands (N-02) or fails (N-03). Each one is a push and an email.
//
// Delivery belongs to notification-service. This class only gathers the facts
// it needs (amounts, method label, arrival estimate, plain-language failure
// reason, contact details) and emits one `notification.payout.withdrawal`
// event onto that service's queue. notification-service owns the copy and the
// templates.
//
// Nothing here may affect the money path that triggered it. Every public
// method catches everything and only logs, and callers fire it without
// awaiting.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { UserClient } from '../common/user.client';
import { PayoutService } from '../payout/payout.service';
import { toWithdrawalFailureReason } from './withdrawal-failure-reason';

export type WithdrawalNotificationKind = 'submitted' | 'completed' | 'failed';

/** Wire contract with notification-service's `notification.payout.withdrawal`. */
export interface WithdrawalNotificationEvent {
  kind: WithdrawalNotificationKind;
  recipientId: string;
  recipientEmail: string | null;
  firstName: string | null;
  payoutRequestId: string;
  depositMethodId: string | null;
  /** 2dp USD strings, e.g. "650.00". */
  amountUsd: string;
  feeUsd: string;
  netAmountUsd: string;
  /** e.g. "Chase Bank ••••4553", the same label payout history shows. */
  methodLabel: string;
  /** N-01 only. ISO timestamp, or null when no estimate exists. */
  estimatedArrivalAt: string | null;
  /** N-01 only. e.g. "2 business days", or null. */
  arrivalWindow: string | null;
  /** N-02 only. ISO timestamp. */
  completedAt: string | null;
  /** N-03 only. Always one of the five PMCM-806 lines. */
  failureReason: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Which status each notification is about. A payout that is not (or no
 * longer) in that status gets nothing. That keeps a cancellation, which also
 * travels as payout.failed, from being announced as a failure. */
const EXPECTED_STATUS: Record<WithdrawalNotificationKind, PayoutStatus> = {
  submitted: PayoutStatus.PROCESSING,
  completed: PayoutStatus.COMPLETED,
  failed: PayoutStatus.FAILED,
};

@Injectable()
export class WithdrawalNotifier {
  private readonly logger = new Logger(WithdrawalNotifier.name);

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly userClient: UserClient,
    private readonly moduleRef: ModuleRef,
    @Inject('NOTIFICATIONS_CLIENT') private readonly client: ClientProxy,
  ) {}

  /** N-01: the payout has been handed to the provider and is Processing. */
  async notifySubmitted(payoutRequestId: string): Promise<void> {
    await this.notify('submitted', payoutRequestId);
  }

  /** N-02: the payout reached Completed. */
  async notifyCompleted(payoutRequestId: string): Promise<void> {
    await this.notify('completed', payoutRequestId);
  }

  /** N-03: the payout reached Failed and its hold has been released. The
   * reason comes from the provider or executor code only. See
   * withdrawal-failure-reason.ts for why the free-text reason is not used. */
  async notifyFailed(payoutRequestId: string, failureCode?: string | null): Promise<void> {
    await this.notify('failed', payoutRequestId, failureCode);
  }

  private async notify(
    kind: WithdrawalNotificationKind,
    payoutRequestId: string,
    failureCode?: string | null,
  ): Promise<void> {
    try {
      // Synthetic ids (e.g. the scheduled-payout "schedule-hold-…" rollback)
      // have no payout_requests row. Postgres would also reject them as a
      // uuid, so skip before querying.
      if (!UUID.test(payoutRequestId)) return;

      const payout = await this.payoutRepo.findOne({
        where: { id: payoutRequestId },
        relations: ['depositMethod'],
      });
      if (!payout) {
        this.logger.warn(`Withdrawal ${kind} notification skipped: payout ${payoutRequestId} not found`);
        return;
      }
      if (payout.status !== EXPECTED_STATUS[kind]) {
        this.logger.log(
          `Withdrawal ${kind} notification skipped for ${payoutRequestId}: status is ${payout.status}`,
        );
        return;
      }

      const payoutService = this.payoutService();
      const contact = await this.userClient.getContractorContact(payout.contractorId);
      const estimatedArrivalAt =
        kind === 'submitted' ? payoutService?.estimateArrival(payout) ?? null : null;

      const event: WithdrawalNotificationEvent = {
        kind,
        recipientId: payout.contractorId,
        recipientEmail: contact?.email ?? null,
        firstName: contact?.firstName ?? null,
        payoutRequestId: payout.id,
        depositMethodId: payout.depositMethodId ?? null,
        amountUsd: toUsd2(payout.amountUsd),
        feeUsd: toUsd2(payout.feeUsd),
        netAmountUsd: toUsd2(payout.netAmountUsd),
        methodLabel:
          payoutService?.historyMethodLabel(payout.depositMethod) ??
          payout.depositMethod?.displayLabel ??
          'your payout method',
        estimatedArrivalAt,
        arrivalWindow: estimatedArrivalAt
          ? describeArrivalWindow(payout.processingAt ?? new Date(), new Date(estimatedArrivalAt))
          : null,
        completedAt:
          kind === 'completed'
            ? (payout.completedAt ?? payout.settledAt ?? new Date()).toISOString()
            : null,
        failureReason: kind === 'failed' ? toWithdrawalFailureReason(failureCode) : null,
      };

      this.client.emit('notification.payout.withdrawal', event);
      this.logger.log(`Withdrawal ${kind} notification emitted for ${payoutRequestId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Withdrawal ${kind} notification failed for ${payoutRequestId}: ${message}`);
    }
  }

  /** Resolved lazily: PayoutService's module imports PublishersModule, which
   * hosts this class, so a constructor dependency would be circular. */
  private payoutService(): PayoutService | null {
    try {
      return this.moduleRef.get(PayoutService, { strict: false });
    } catch {
      return null;
    }
  }
}

function toUsd2(value: string | null | undefined): string {
  const n = parseFloat(value ?? '0');
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** "within 30 minutes" / "1 business day" / "3 business days", measured the
 * same way PayoutService.estimateArrival builds the estimate: business days
 * counted forward from when processing started. */
export function describeArrivalWindow(from: Date, arrival: Date): string {
  const diffMs = arrival.getTime() - from.getTime();
  if (diffMs <= 0) return 'within minutes';
  if (diffMs <= 2 * 60 * 60 * 1000) return 'within 30 minutes';

  let days = 0;
  const cursor = new Date(from);
  while (cursor < arrival) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) days++;
  }
  const n = Math.max(days, 1);
  return `${n} business day${n === 1 ? '' : 's'}`;
}
