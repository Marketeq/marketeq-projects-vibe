// apps/payout-service/src/publishers/payout.publisher.ts
// PS-00 §8.1: Events published by payout-service
//   payout.completed   → earnings-service (PayoutCompletedConsumer),
//                         transaction-service (PayoutConsumer)
//   payout.failed      → earnings-service (PayoutFailedConsumer),
//                         transaction-service (PayoutConsumer)
//   payout.initiated   → transaction-service (PayoutConsumer)
//   payout.schedule.updated → earnings-service
// PS-00 §7: RABBITMQ_URL
//
// Two separate real mechanisms are used here, deliberately, for two
// separate real consumers:
//
// 1. emit() below — NestJS ClientProxy.send() straight into
//    earnings-service's own inbound queue (EARNINGS_RABBITMQ_CLIENT,
//    publishers.module.ts). This was a stub (log-only) with no actual
//    publish; a first attempt used amqplib against a named topic exchange
//    (marketeq.events) — that never reached earnings-service, confirmed via
//    the RabbitMQ management API that its queue had zero binding to that
//    exchange. earnings-service's consumers use @MessagePattern, not
//    @EventPattern, so only send() (not emit()) produces the wire packet
//    type they match.
//
// 2. publishToExchange() below — a direct amqp-connection-manager channel
//    onto the real marketeq.payout topic exchange (declared alongside
//    marketeq.identity in app.module.ts, matching transaction-service's own
//    declaration of the same exchange). This exchange already exists and is
//    already consumed for real — apps/transaction-service/src/consumers/
//    payout.consumer.ts binds payout.initiated/payout.completed/
//    payout.failed to build the contractor's transaction history —
//    payout-service just never published onto it.
//
//    Deliberately NOT @golevelup/nestjs-rabbitmq's AmqpConnection here,
//    despite that package already being a dependency for PS-35's
//    @RabbitSubscribe consumers (app.module.ts). AmqpConnection resolves
//    fine where RabbitMQModule.forRoot() is registered directly (AppModule
//    itself), but injecting it into a *different* module (PublishersModule)
//    requires RabbitMQModule.externallyConfigured() — confirmed live this
//    silently resolves to a connection that never actually delivers: no
//    error, no exchange traffic, nothing. amqp-connection-manager
//    (@golevelup's own underlying dependency, so no new package) sidesteps
//    that entirely with a self-contained, auto-reconnecting channel scoped
//    to this one publisher — the same lazy-client pattern already used for
//    Stripe elsewhere in this service (bank-payout-executor.service.ts).
//
// Field-name note: the public methods below keep their existing parameter
// names (payoutRequestId, amount) since every executor/webhook handler in
// this service already calls them that way — the mapping to what each
// consumer actually reads off the message happens once, here.
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as amqpConnectionManager from 'amqp-connection-manager';
import type { ChannelWrapper } from 'amqp-connection-manager';
import { firstValueFrom, defaultIfEmpty } from 'rxjs';
import { randomUUID } from 'crypto';

/**
 * RMQ rejections are routinely not Error instances: NestJS surfaces the
 * serialized remote payload, which has no `.message`. Reading `err.message` off
 * one of those logged the literal string "undefined", which is exactly what
 * `Failed to publish payout.schedule.updated: undefined` was — an error that
 * named no cause and so was never actionable.
 */
/**
 * A broker that is down rejects with a connection-level code rather than an
 * application error, and NestJS surfaces it as a plain object
 * (`{"err":{"code":"ECONNREFUSED"},"url":"amqp://..."}`) as often as an Error —
 * so both shapes have to be read. Only these are worth a second attempt: an
 * application-level rejection will fail identically however many times it is
 * resent, and retrying it would just delay the caller.
 */
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ETIMEDOUT',
  'EPIPE',
]);

function isConnectionError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const code = (err as any).code ?? (err as any).err?.code;
  if (typeof code === 'string' && CONNECTION_ERROR_CODES.has(code)) return true;
  // amqplib also closes the channel with a bare message on an abrupt drop.
  const message = err instanceof Error ? err.message : (err as any).message;
  return typeof message === 'string' && /connection closed|channel closed|socket closed/i.test(message);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The dropped-event log line is the last record that the event was owed, so it
 * must never be the thing that throws. JSON.stringify raises on a circular
 * payload; falling back keeps the log line intact.
 */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function describeError(err: unknown): string {
  // `err.name` before String(err): an Error carrying an empty message would
  // otherwise serialize to a useless "{}", since its fields are non-enumerable.
  if (err instanceof Error) return err.message || err.name || String(err);
  if (typeof err === 'string') return err;
  try {
    // JSON.stringify returns undefined for undefined/function inputs, and
    // throws on circular ones — both fall back to String().
    return JSON.stringify(err) ?? String(err);
  } catch {
    return String(err);
  }
}

@Injectable()
export class PayoutPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(PayoutPublisher.name);
  private exchangeChannel: ChannelWrapper | null = null;

  constructor(
    @Inject('EARNINGS_RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {
    const rabbitmqUrl = process.env.RABBITMQ_URL;
    if (!rabbitmqUrl) {
      this.logger.warn('RABBITMQ_URL not set — marketeq.payout publishing disabled');
      return;
    }
    const connection = amqpConnectionManager.connect([rabbitmqUrl]);
    this.exchangeChannel = connection.createChannel({
      json: true,
      setup: (channel: any) => channel.assertExchange('marketeq.payout', 'topic', { durable: true }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.exchangeChannel?.close();
  }

  // Publishes onto the real marketeq.payout topic exchange —
  // transaction-service's PayoutConsumer binds to this. Never throws: a
  // failure here must not block the earnings-service-facing emit() above
  // from completing, since that side is the one that actually gates
  // balance state. ChannelWrapper.publish() internally queues messages
  // until the underlying channel/connection is ready (and replays them
  // across reconnects), so this is safe to call immediately after
  // construction without waiting for a connected event.
  private async publishToExchange(routingKey: string, payload: object): Promise<void> {
    if (!this.exchangeChannel) {
      this.logger.warn(`RabbitMQ disabled — skipping marketeq.payout/${routingKey}`);
      return;
    }
    try {
      await this.exchangeChannel.publish('marketeq.payout', routingKey, payload);
    } catch (err: unknown) {
      this.logger.error(`Failed to publish marketeq.payout/${routingKey}: ${describeError(err)}`);
    }
  }

  /**
   * Returns whether the publish actually succeeded, so callers can avoid
   * announcing an event that never left. Every caller used to log
   * "<event> emitted" unconditionally while this swallowed the failure, so a
   * broken publish produced an ERROR and a success line for the same event in
   * the same millisecond. On staging — where RABBITMQ_REQUIRED=false leaves RMQ
   * unprovisioned — that made a permanently dead publish path read as healthy.
   */
  /**
   * A dropped payout.completed is not recoverable from what this used to log.
   * The payout is already marked COMPLETED and audited in this service by the
   * time the publish is attempted (see StripeProvider.handlePayoutPaid), so a
   * lost event leaves earnings-service never debiting the balance, with the two
   * services silently disagreeing about real money. Two changes make that
   * survivable without a new table (payout-service has no migrations that run):
   * a short bounded retry so a momentary broker drop no longer costs the event,
   * and the full payload on the final failure so it can be replayed by hand.
   */
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RETRY_DELAYS_MS = [300, 900];

  private async emit(pattern: string, payload: object): Promise<boolean> {
    let lastErr: unknown;

    for (let attempt = 1; attempt <= PayoutPublisher.MAX_ATTEMPTS; attempt++) {
      try {
        // Every consumer in earnings-service (payout-completed.consumer.ts
        // included) is written with @MessagePattern, not @EventPattern —
        // NestJS's RMQ server treats those as two different wire packet
        // types, and only send() produces the one @MessagePattern matches.
        // emit() looked like the semantically-right fire-and-forget choice,
        // but it actually gets NACK'd with "unsupported event" and dropped —
        // confirmed live against earnings-service's own logs. send() still
        // resolves once the handler returns (its Promise<void> becomes the
        // reply), so this behaves as fire-and-wait-for-ack rather than truly
        // fire-and-forget, which is fine here. In practice the reply
        // Observable completes without ever emitting a value (confirmed live,
        // including in a standalone test client) even though the consumer
        // processes the message correctly every time — defaultIfEmpty stops
        // that from being misreported as a failure below.
        await firstValueFrom(this.client.send(pattern, payload).pipe(defaultIfEmpty(null)));
        if (attempt > 1) {
          this.logger.log(`Published ${pattern} on attempt ${attempt}`);
        }
        return true;
      } catch (err: unknown) {
        lastErr = err;

        // Anything that is not a broker connection failure is deterministic:
        // stop immediately rather than making the caller wait out the backoff
        // for an outcome that cannot change.
        if (!isConnectionError(err) || attempt === PayoutPublisher.MAX_ATTEMPTS) break;

        const delay = PayoutPublisher.RETRY_DELAYS_MS[attempt - 1];
        this.logger.warn(
          `Publish of ${pattern} failed (attempt ${attempt}/${PayoutPublisher.MAX_ATTEMPTS}): ` +
          `${describeError(err)} — retrying in ${delay}ms`,
        );
        await sleep(delay);
      }
    }

    this.logger.error(`Failed to publish ${pattern}: ${describeError(lastErr)}`);
    // Logged separately so the replayable body survives even if the line above
    // is what gets truncated or alert-matched. This is the only remaining
    // record that the event was owed.
    this.logger.error(
      `DROPPED EVENT — ${pattern} was never delivered and must be replayed manually: ` +
      `${safeStringify(payload)}`,
    );
    return false;
  }

  /**
   * PS-00 §8.1: payout.initiated
   * Consumed by: transaction-service (PayoutConsumer.onPayoutInitiated —
   * creates the PROCESSING transaction row). This event previously did not
   * exist anywhere in payout-service — every payout's transaction-history
   * row was never created, only ever updated-by-lookup on completion/failure
   * (a no-op, since nothing to find). Uses payoutRequestId as the
   * correlation id (transaction-service's own transactionId column) so
   * publishPayoutCompleted/Failed below can correlate back to it as
   * originalEventId without a new payout_requests column.
   */
  async publishPayoutInitiated(payload: {
    contractorId: string;
    payoutRequestId: string;
    contractId: string | null;
    amount: string;
    methodType: string;
    methodLabel: string;
    methodIdentifier: string;
    initiatedAt: string;
  }): Promise<void> {
    await this.publishToExchange('payout.initiated', {
      eventId: payload.payoutRequestId,
      contractorId: payload.contractorId,
      contractId: payload.contractId,
      amount: parseFloat(payload.amount),
      payoutMethodType: payload.methodType,
      payoutMethodLabel: payload.methodLabel,
      payoutMethodIdentifier: payload.methodIdentifier,
      initiatedAt: payload.initiatedAt,
    });
    this.logger.log(`payout.initiated published to marketeq.payout for ${payload.payoutRequestId}`);
  }

  /**
   * PS-00 §8.1: payout.completed
   * Consumed by: earnings-service (PayoutCompletedConsumer — debits balance,
   * pushes payout_completed to Ably per PS-27 §2.4)
   */
  async publishPayoutCompleted(payload: {
    contractorId: string;
    payoutRequestId: string;
    amount: string;
    currency: string;
    methodType: string;
    settledAt: string;
    // PS-40 §4: additive, optional — lets earnings-service (or any future
    // consumer) distinguish a Wise-Platform-executed completion from a
    // Stripe one. Existing consumers ignore unknown fields.
    wisePlatformTransferId?: string | null;
  }): Promise<void> {
    const ok = await this.emit('payout.completed', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      payoutId: payload.payoutRequestId,
      payoutAmountUsd: payload.amount,
      currency: payload.currency,
      methodType: payload.methodType,
      settledAt: payload.settledAt,
      wisePlatformTransferId: payload.wisePlatformTransferId ?? null,
    });
    if (ok) {
      this.logger.log(`payout.completed emitted for ${payload.payoutRequestId}`);
    }
    await this.publishToExchange('payout.completed', {
      originalEventId: payload.payoutRequestId,
      contractorId: payload.contractorId,
      amount: parseFloat(payload.amount),
      completedAt: payload.settledAt,
    });
  }

  /**
   * PS-00 §8.1: payout.failed
   * Consumed by: earnings-service (PayoutFailedConsumer — restores balance,
   * pushes payout_failed to Ably per PS-27 §2.4)
   */
  async publishPayoutFailed(payload: {
    contractorId: string;
    payoutRequestId: string;
    amount: string;
    currency: string;
    methodType: string;
    reason: string;
    failedAt: string;
    // PS-40 §4: additive, optional — lets finance reconcile a failed Wise
    // Platform transfer specifically.
    wisePlatformTransferId?: string | null;
  }): Promise<void> {
    const ok = await this.emit('payout.failed', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      payoutId: payload.payoutRequestId,
      payoutAmountUsd: payload.amount,
      currency: payload.currency,
      methodType: payload.methodType,
      failureReason: payload.reason,
      failedAt: payload.failedAt,
      wisePlatformTransferId: payload.wisePlatformTransferId ?? null,
    });
    if (ok) {
      this.logger.log(`payout.failed emitted for ${payload.payoutRequestId}`);
    }
    await this.publishToExchange('payout.failed', {
      originalEventId: payload.payoutRequestId,
      contractorId: payload.contractorId,
      failureReason: payload.reason,
    });
  }

  /**
   * PS-00 §8.1: payout.schedule.updated
   * Consumed by: earnings-service (invalidate balance cache)
   */
  async publishScheduleUpdated(payload: {
    contractorId: string;
    schedule: object;
    updatedAt: string;
  }): Promise<void> {
    const ok = await this.emit('payout.schedule.updated', {
      eventId: randomUUID(),
      ...payload,
    });
    if (ok) {
      this.logger.log(
        `payout.schedule.updated emitted for ${payload.contractorId}`,
      );
    }
  }

  /**
   * PS-16 §7.1/§7.3, PS-23 §3.5: payout.paused
   * Real consumer is notification-service (email + in-app on pause), not
   * earnings-service — this previously went through emit(), which only
   * reaches earnings-service's own inbound queue (no @MessagePattern for
   * 'payouts.paused' exists there, confirmed via grep) and never reached
   * notification-service at all. Switched to publishToExchange onto the
   * real payout-service routing key instead. notification-service has no
   * RabbitMQ consumer at all yet (zero @RabbitSubscribe usages, same as
   * publishScheduleActivated below) — correctly wired but currently
   * unconsumed, not a broken pipe.
   */
  async publishPayoutsPaused(contractorId: string, metadata: object): Promise<void> {
    await this.publishToExchange('payout.paused', {
      eventId: randomUUID(),
      contractorId,
      occurredAt: new Date().toISOString(),
      ...metadata,
    });
    this.logger.log(`payout.paused published for ${contractorId}`);
  }

  /**
   * PS-35 §7: payout.schedule.activated
   * Intended consumer: notification-service — "Your deposit schedule is
   * now active." Published for real onto marketeq.payout; notification-service
   * has no RabbitMQ consumer at all yet (checked: zero @RabbitSubscribe
   * usages anywhere in apps/notification-service), so this is correctly
   * wired but currently unconsumed — a topic-exchange publish with no bound
   * queue is a normal, harmless AMQP no-op, not a broken pipe.
   */
  async publishScheduleActivated(payload: {
    contractorId: string;
    scheduleId: string;
    frequency: string;
    methodType: string;
  }): Promise<void> {
    await this.publishToExchange('payout.schedule.activated', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      scheduleId: payload.scheduleId,
      frequency: payload.frequency,
      methodType: payload.methodType,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * PS-35 §7: payout.biometric.verification_exhausted
   * Intended consumer: notification-service — same unconsumed-for-now
   * caveat as publishScheduleActivated above.
   */
  async publishBiometricVerificationExhausted(payload: {
    contractorId: string;
    depositMethodId: string | null;
  }): Promise<void> {
    await this.publishToExchange('payout.biometric.verification_exhausted', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      depositMethodId: payload.depositMethodId,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * PS-40 §3.1: payout.wise_platform.transfer_sent
   * Published when the Wise Platform webhook confirms outgoing_payment_sent.
   * Consumed by: notification-service, analytics-service.
   */
  async publishWisePlatformTransferSent(payload: {
    payoutRequestId: string;
    contractorId: string;
    wisePlatformTransferId: string;
    amountUsd: number;
    targetCurrency: string;
    targetAmount: number;
    bankCountry: string;
  }): Promise<void> {
    await this.publishToExchange('payout.wise_platform.transfer_sent', {
      eventId: randomUUID(),
      eventType: 'payout.wise_platform.transfer_sent',
      occurredAt: new Date().toISOString(),
      payoutRequestId: payload.payoutRequestId,
      contractorId: payload.contractorId,
      wisePlatformTransferId: payload.wisePlatformTransferId,
      amountUsd: payload.amountUsd,
      targetCurrency: payload.targetCurrency,
      targetAmount: payload.targetAmount,
      bankCountry: payload.bankCountry,
    });
  }

  /**
   * PS-40 §3.2: payout.wise_platform.transfer_failed
   * Published when the Wise Platform webhook confirms funds_refunded.
   * Consumed by: payout-service (restore earnings balance), notification-service,
   * finance alert queue.
   */
  async publishWisePlatformTransferFailed(payload: {
    payoutRequestId: string;
    contractorId: string;
    wisePlatformTransferId: string;
    amountUsd: number;
    failureReason: string;
    bankCountry: string;
  }): Promise<void> {
    await this.publishToExchange('payout.wise_platform.transfer_failed', {
      eventId: randomUUID(),
      eventType: 'payout.wise_platform.transfer_failed',
      occurredAt: new Date().toISOString(),
      payoutRequestId: payload.payoutRequestId,
      contractorId: payload.contractorId,
      wisePlatformTransferId: payload.wisePlatformTransferId,
      amountUsd: payload.amountUsd,
      failureReason: payload.failureReason,
      bankCountry: payload.bankCountry,
    });
  }

  /**
   * PS-40 §3.3: payout.method.stripe_kyc.verified
   * Published when Stripe's account.updated webhook confirms
   * capabilities.transfers = active for a UK/SEPA/AU/CA contractor.
   * Consumed by: notification-service — "Your bank account is verified and
   * ready for payouts."
   */
  async publishStripeKycVerified(payload: {
    contractorId: string;
    depositMethodId: string;
    stripeConnectedAccountId: string;
    bankCountry: string;
  }): Promise<void> {
    await this.publishToExchange('payout.method.stripe_kyc.verified', {
      eventId: randomUUID(),
      eventType: 'payout.method.stripe_kyc.verified',
      occurredAt: new Date().toISOString(),
      contractorId: payload.contractorId,
      depositMethodId: payload.depositMethodId,
      stripeConnectedAccountId: payload.stripeConnectedAccountId,
      bankCountry: payload.bankCountry,
    });
  }

  /**
   * PS-40 §3.4: payout.method.additional_kyc_required
   * Published when Stripe escalates beyond DOB — requires government ID +
   * selfie. Consumed by: notification-service — sends contractor the Stripe
   * Account Link URL to complete additional verification.
   */
  async publishAdditionalKycRequired(payload: {
    contractorId: string;
    depositMethodId: string;
    kycUrl: string;
    requirements: string[];
  }): Promise<void> {
    await this.publishToExchange('payout.method.additional_kyc_required', {
      eventId: randomUUID(),
      eventType: 'payout.method.additional_kyc_required',
      occurredAt: new Date().toISOString(),
      contractorId: payload.contractorId,
      depositMethodId: payload.depositMethodId,
      kycUrl: payload.kycUrl,
      requirements: payload.requirements,
    });
  }

  /**
   * PS-16 §7.2/§7.3, PS-23 §3.5: payout.resumed
   * Mirrors publishPayoutsPaused above — same destination/mechanism fix
   * (publishToExchange onto the real payout-service routing key, not
   * emit() into earnings-service's unconsumed queue).
   */
  async publishPayoutsResumed(contractorId: string, metadata: object): Promise<void> {
    await this.publishToExchange('payout.resumed', {
      eventId: randomUUID(),
      contractorId,
      resolvedCondition: null,
      occurredAt: new Date().toISOString(),
      ...metadata,
    });
    this.logger.log(`payout.resumed published for ${contractorId}`);
  }

  /**
   * PS-14 §10, PS-23 §3.5: payout.cancelled
   * Consumed by: notification-service, earnings-service. Additive to the
   * existing publishPayoutFailed() call the expiry-cancellation job and
   * contractor-initiated cancel() already make (which restores the
   * balance hold) — this is the dedicated event so notification-service
   * gets the spec'd routing key/message instead of only the generic
   * payout.failed.
   */
  async publishPayoutCancelled(payload: {
    payoutRequestId: string;
    contractorId: string;
    reason: string;
    message: string;
  }): Promise<void> {
    await this.publishToExchange('payout.cancelled', {
      eventId: randomUUID(),
      payoutRequestId: payload.payoutRequestId,
      contractorId: payload.contractorId,
      reason: payload.reason,
      message: payload.message,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * PS-15 §6.2, PS-23 §3.5: payout.edd.triggered
   * Consumed by: compliance-service, notification-service.
   */
  async publishEddTriggered(payload: {
    contractorId: string;
    payoutRequestId: string;
    amountUsd: number;
    triggerReason: string;
  }): Promise<void> {
    await this.publishToExchange('payout.edd.triggered', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      payoutRequestId: payload.payoutRequestId,
      amountUsd: payload.amountUsd,
      triggerReason: payload.triggerReason,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * PS-17 §7, PS-23 §3.5: payout.schedule.completed
   * Consumed by: notification-service, analytics-service.
   */
  async publishScheduleCompleted(payload: {
    contractorId: string;
    scheduleId: string;
    payoutRequestId: string;
    amountUsd: number;
  }): Promise<void> {
    await this.publishToExchange('payout.schedule.completed', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      scheduleId: payload.scheduleId,
      payoutRequestId: payload.payoutRequestId,
      amountUsd: payload.amountUsd,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * PS-17 §5.2/§5.3, PS-23 §3.4: payout.scheduled.skipped
   * (PS-23 §3.5 lists this as "payout.schedule.threshold_miss" in the
   * subsidiary table, but §3.4 — the section with the actual payload
   * shape — names the routing key payout.scheduled.skipped and models
   * threshold-miss as one of several skipReason values alongside
   * OUTSIDE_WINDOW/PAUSE_CONDITION/KYC_GATE_FAILED/EDD_TRIGGERED/
   * ZERO_BALANCE. Implemented as §3.4 specifies — one routing key, a
   * skipReason field — since that's the section with the real schema.)
   * Consumed by: notification-service, analytics-service.
   */
  async publishScheduledSkipped(payload: {
    scheduleId: string;
    contractorId: string;
    frequency: string;
    skipReason: 'BELOW_THRESHOLD' | 'OUTSIDE_WINDOW' | 'PAUSE_CONDITION' | 'KYC_GATE_FAILED' | 'EDD_TRIGGERED' | 'ZERO_BALANCE';
    thresholdUSD?: number | null;
    currentBalanceUSD?: number | null;
    consecutiveMissCount?: number | null;
    notifyContractor: boolean;
    pauseCondition?: string | null;
    nextExecutionAt: string;
  }): Promise<void> {
    await this.publishToExchange('payout.scheduled.skipped', {
      eventId: randomUUID(),
      eventType: 'payout.scheduled.skipped',
      occurredAt: new Date().toISOString(),
      scheduleId: payload.scheduleId,
      contractorId: payload.contractorId,
      frequency: payload.frequency,
      skipReason: payload.skipReason,
      thresholdUSD: payload.thresholdUSD ?? null,
      currentBalanceUSD: payload.currentBalanceUSD ?? null,
      consecutiveMissCount: payload.consecutiveMissCount ?? null,
      notifyContractor: payload.notifyContractor,
      pauseCondition: payload.pauseCondition ?? null,
      nextExecutionAt: payload.nextExecutionAt,
    });
  }

  /**
   * PS-17 §8.3, PS-23 §3.5: payout.schedule.partial_failure
   * Published when a split-payout schedule execution completes some but
   * not all legs. Consumed by: notification-service, finance-service.
   */
  async publishSchedulePartialFailure(payload: {
    contractorId: string;
    scheduleId: string;
    splitGroupId: string;
    succeededPayoutIds: string[];
    failedPayoutIds: string[];
  }): Promise<void> {
    await this.publishToExchange('payout.schedule.partial_failure', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      scheduleId: payload.scheduleId,
      splitGroupId: payload.splitGroupId,
      succeededPayoutIds: payload.succeededPayoutIds,
      failedPayoutIds: payload.failedPayoutIds,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * PS-17 §8.4, PS-23 §3.5: payout.secondary.failed
   * Published when a non-primary leg of a split payout fails. Consumed
   * by: finance-service (alert queue).
   */
  async publishSecondaryFailed(payload: {
    contractorId: string;
    scheduleId: string;
    payoutRequestId: string;
    splitGroupId: string;
    reason: string;
  }): Promise<void> {
    await this.publishToExchange('payout.secondary.failed', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      scheduleId: payload.scheduleId,
      payoutRequestId: payload.payoutRequestId,
      splitGroupId: payload.splitGroupId,
      reason: payload.reason,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * PS-23 §3.5 (ACH return handler): payout.method.deactivated
   * Consumed by: notification-service, payout-service (pause evaluator —
   * see pause-status.service.ts's evaluateAndPublishPauseChange, called
   * separately by the same ACH-return call sites).
   */
  async publishMethodDeactivated(payload: {
    contractorId: string;
    depositMethodId: string;
    methodType: string;
    reason: string;
  }): Promise<void> {
    await this.publishToExchange('payout.method.deactivated', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      depositMethodId: payload.depositMethodId,
      methodType: payload.methodType,
      reason: payload.reason,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * PS-23 §3.5 (ACH return handler): payout.trust_safety.escalation
   * Published on ACH return codes indicating fraud/unauthorized-use risk
   * (e.g. R10/R29), not routine NSF/account-closed returns. Consumed by:
   * trust-safety-service.
   */
  async publishTrustSafetyEscalation(payload: {
    contractorId: string;
    depositMethodId: string;
    payoutRequestId: string | null;
    achReturnCode: string;
    reason: string;
  }): Promise<void> {
    await this.publishToExchange('payout.trust_safety.escalation', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      depositMethodId: payload.depositMethodId,
      payoutRequestId: payload.payoutRequestId,
      achReturnCode: payload.achReturnCode,
      reason: payload.reason,
      occurredAt: new Date().toISOString(),
    });
  }
}
