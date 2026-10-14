// apps/payout-service/src/identity-gate/payout-execution-gate.service.ts
// G9: the verification gate is re-evaluated at EVERY step that can move a
// contractor's money, not only when the withdrawal is requested.
//
//   request      PayoutWithdrawalGateGuard (initiate)             - unchanged
//   confirm      MagicLinkService.verifyEmailToken / PayoutService.verifyMagicLink
//                                          BEFORE the token is consumed and BEFORE the balance hold
//   dequeue      PayoutQueueProcessor                              - before the executors
//   provider     Bank / Card / Crypto executors                    - before PROCESSING and the provider call
//   in-flight    between the two Stripe legs, before the Wise transfer, before EVERY crypto retry attempt
//   scheduled    ScheduleExecutionCron                             - before the balance hold of each scheduled payout
//
// The subject is ALWAYS the contractor stored on the payout / schedule record,
// never anything in a request. A closed or unanswered gate stops the step before
// the provider is called; nothing is debited, and a reservation already held is
// released through the existing payout.failed event (earnings-service restores
// available_balance), so the contractor's balance is intact. An unanswered gate
// is a closed gate (IDENTITY_VERIFICATION_UNAVAILABLE).
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PayoutError } from '../common/errors/payout.error';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { IdentityVerificationUnavailableException, VerificationRequiredException } from './identity-gate.exceptions';

export type GateOutcome =
  | { state: 'open' }
  | { state: 'closed'; missingRequirements: 'identity' | 'location' | 'both' }
  | { state: 'unavailable' };

// Stable failure codes, in the style of KYC_SUSPENDED_AT_EXECUTION.
export const VERIFICATION_REQUIRED_AT_EXECUTION = 'VERIFICATION_REQUIRED_AT_EXECUTION';
export const VERIFICATION_UNAVAILABLE_AT_EXECUTION = 'IDENTITY_VERIFICATION_UNAVAILABLE_AT_EXECUTION';

@Injectable()
export class PayoutExecutionGate {
  private readonly logger = new Logger(PayoutExecutionGate.name);

  constructor(
    private readonly gateClient: IdentityVerificationGateClient,
    @InjectRepository(PayoutRequest) private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
  ) {}

  /** The gate for `contractorId`, never throwing: open, closed (with what is missing) or unavailable. */
  async evaluate(contractorId: string): Promise<GateOutcome> {
    try {
      const decision = await this.gateClient.checkGate(contractorId);
      if (decision.gateOpen) return { state: 'open' };
      return { state: 'closed', missingRequirements: decision.missingRequirements as 'identity' | 'location' | 'both' };
    } catch {
      // No broker, RPC error, timeout, unusable or self-contradicting reply: unanswered.
      return { state: 'unavailable' };
    }
  }

  /** Throws the HTTP errors the Verify My Account popup and the existing failure handling expect. */
  async assertOpen(contractorId: string): Promise<void> {
    const outcome = await this.evaluate(contractorId);
    if (outcome.state === 'closed') throw new VerificationRequiredException(outcome.missingRequirements);
    if (outcome.state === 'unavailable') throw new IdentityVerificationUnavailableException();
  }

  /**
   * Called immediately before an executor does anything that can reach a provider.
   * Returns true when it may proceed.
   *
   * - open: proceed.
   * - closed, first execution (nothing can have reached the provider yet): the payout
   *   is FAILED with an auditable reason and its reservation is released - no provider
   *   call, no debit, balance intact.
   * - closed on a RE-RUN (the payout is already PROCESSING or carries a provider
   *   reference, so a provider call may have happened): never fail/release here - that
   *   could hand the contractor their balance back while money is in flight. Stop
   *   without calling the provider and leave it for review (audited).
   * - unavailable: throws, so the queue's own retry runs the whole step again later
   *   with nothing changed (see PayoutQueueProcessor for the terminal handling).
   */
  async guardBeforeProvider(payout: PayoutRequest, stage: string): Promise<boolean> {
    const outcome = await this.evaluate(payout.contractorId);
    if (outcome.state === 'open') return true;
    if (outcome.state === 'unavailable') throw new IdentityVerificationUnavailableException();

    if (this.mayHaveReachedProvider(payout)) {
      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId: payout.id,
        actorType: 'service',
        actorId: 'payout-service',
        action: 'payout.verification_blocked_on_retry',
        previousStatus: payout.status,
        newStatus: payout.status,
        metadata: { stage },
      });
      this.logger.warn(`Payout ${payout.id} not re-run: verification gate closed and a provider call may already have happened (${stage})`);
      return false;
    }
    await this.failBeforeProvider(payout, 'closed', stage);
    return false;
  }

  /**
   * Called from INSIDE an executor, after it has already marked the payout PROCESSING,
   * immediately before an individual provider call (each Stripe leg, the Wise transfer,
   * each crypto attempt). Returns true when it may proceed.
   *
   * - open: true.
   * - closed/unanswered on the first run: throws PayoutError, which the executor's own
   *   catch turns into FAILED + audit + payout.failed (reservation released), reversing
   *   any Stripe transfer already made.
   * - closed/unanswered on a re-run (`rerun`): returns false without touching state -
   *   a provider call may already have happened, so releasing the balance is unsafe.
   */
  async allowProviderCall(payout: PayoutRequest, stage: string, rerun: boolean): Promise<boolean> {
    const outcome = await this.evaluate(payout.contractorId);
    if (outcome.state === 'open') return true;
    if (rerun) {
      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId: payout.id,
        actorType: 'service',
        actorId: 'payout-service',
        action: 'payout.verification_blocked_on_retry',
        previousStatus: payout.status,
        newStatus: payout.status,
        metadata: { stage, gate: outcome.state },
      });
      return false;
    }
    if (outcome.state === 'closed') {
      throw new PayoutError(
        'This withdrawal could not be sent because account verification is required. Your balance has not been affected.',
        HttpStatus.FORBIDDEN,
        VERIFICATION_REQUIRED_AT_EXECUTION,
      );
    }
    throw new PayoutError(
      'This withdrawal could not be sent because we could not confirm your account verification. Your balance has not been affected. Please try again shortly.',
      HttpStatus.SERVICE_UNAVAILABLE,
      VERIFICATION_UNAVAILABLE_AT_EXECUTION,
    );
  }

  /**
   * FAILED + audit + payout.failed (which releases the reservation), exactly once: the
   * status change is conditional on the payout still being QUEUED/PENDING, so a
   * redelivered job or a duplicate call cannot publish the release twice.
   */
  async failBeforeProvider(payout: PayoutRequest, kind: 'closed' | 'unavailable', stage: string): Promise<boolean> {
    const reason = kind === 'closed' ? VERIFICATION_REQUIRED_AT_EXECUTION : VERIFICATION_UNAVAILABLE_AT_EXECUTION;
    const userMessage =
      kind === 'closed'
        ? 'This withdrawal could not be sent because account verification is required. Your balance has not been affected.'
        : 'This withdrawal could not be sent because we could not confirm your account verification. Your balance has not been affected. Please try again shortly.';

    const result = await this.payoutRepo.update(
      { id: payout.id, status: In([PayoutStatus.QUEUED, PayoutStatus.PENDING_VERIFICATION]) } as any,
      { status: PayoutStatus.FAILED, failedAt: new Date(), failureReason: reason },
    );
    if (!result.affected) return false; // already settled by another delivery

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'payout-service',
      action: 'payout.verification_blocked',
      previousStatus: payout.status,
      newStatus: PayoutStatus.FAILED,
      metadata: { stage, reason },
    });
    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: payout.currency ?? 'USD',
      methodType: payout.depositMethod?.methodType ?? 'UNKNOWN',
      reason: userMessage,
      failedAt: new Date().toISOString(),
    });
    this.logger.warn(`Payout ${payout.id} stopped before any provider call: ${reason} (${stage})`);
    return true;
  }

  private mayHaveReachedProvider(payout: PayoutRequest): boolean {
    return (
      payout.status === PayoutStatus.PROCESSING ||
      !!payout.providerReference ||
      !!payout.externalTransactionId
    );
  }
}
