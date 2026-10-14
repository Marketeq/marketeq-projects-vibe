import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { isUUID } from 'class-validator';

// The most accounts remembered as "unknown, please learn" between two reconcile
// flushes. Bounded so a flood of never-seen accounts cannot grow memory.
const MAX_PENDING_LEARN = 5000;

/**
 * G5 - the last known gate_open of every account a client-facing roster shows,
 * kept in listings-service's own table (listings.account_gate_state).
 *
 * Writes come from `identity.gate_changed` events (GateStateConsumer) and the
 * background reconcile (AccountGateReconciler); reads are one local query. A
 * roster is therefore never built from a live identity lookup, and when
 * identity-verification-service or RabbitMQ is down the last known state keeps
 * being served.
 *
 * Three states per account: known open, known closed, never received. Only
 * "known open" is shown; the other two are omitted, so an account whose state
 * has never been received is hidden without affecting any other account.
 */
@Injectable()
export class AccountGateStateService {
  private readonly logger = new Logger(AccountGateStateService.name);
  private readonly pendingLearn = new Set<string>();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Records a decision. An older decision never overwrites a newer one
   * (events can be redelivered or arrive out of order), and a repeat of the same
   * decision is a harmless no-op. Returns whether the row changed.
   */
  async apply(userId: string, gateOpen: boolean, occurredAt: Date): Promise<boolean> {
    if (!isUUID(userId) || typeof gateOpen !== 'boolean' || Number.isNaN(occurredAt.getTime())) return false;
    const rows = await this.dataSource.query(
      `INSERT INTO listings.account_gate_state ("userId", "gateOpen", "occurredAt", "receivedAt")
       VALUES ($1::uuid, $2, $3::timestamptz, now())
       ON CONFLICT ("userId") DO UPDATE
         SET "gateOpen" = EXCLUDED."gateOpen", "occurredAt" = EXCLUDED."occurredAt", "receivedAt" = now()
       WHERE EXCLUDED."occurredAt" >= listings.account_gate_state."occurredAt"
       RETURNING "userId"`,
      [userId, gateOpen, occurredAt.toISOString()],
    );
    this.pendingLearn.delete(userId);
    return rows.length > 0;
  }

  /**
   * The accounts, out of `ids`, whose last known gate is open. One local query.
   * Never throws: if the table cannot be read nobody is shown (never "everyone").
   * Accounts with no recorded state are queued for the background reconcile to
   * learn, so a first-ever sighting is hidden only until it has been learned.
   */
  async knownOpen(ids: Iterable<string | null | undefined>): Promise<Set<string>> {
    const unique = Array.from(
      new Set(Array.from(ids).filter((id): id is string => typeof id === 'string' && isUUID(id))),
    );
    if (unique.length === 0) return new Set();
    try {
      const rows: Array<{ userId: string; gateOpen: boolean }> = await this.dataSource.query(
        `SELECT "userId"::text AS "userId", "gateOpen" FROM listings.account_gate_state WHERE "userId" = ANY($1::uuid[])`,
        [unique],
      );
      const known = new Set(rows.map((r) => r.userId));
      for (const id of unique) {
        if (!known.has(id) && this.pendingLearn.size < MAX_PENDING_LEARN) this.pendingLearn.add(id);
      }
      return new Set(rows.filter((r) => r.gateOpen === true).map((r) => r.userId));
    } catch (err) {
      this.logger.warn(
        `Account gate state unreadable for ${unique.length} account(s); omitting them: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return new Set();
    }
  }

  /** Accounts that were asked about but have no recorded state, drained for the reconcile to learn. */
  takePendingLearn(): string[] {
    const ids = Array.from(this.pendingLearn);
    this.pendingLearn.clear();
    return ids;
  }

  /** Puts accounts back (a learn attempt that could not be answered), within the same bound. */
  requeue(ids: Iterable<string>): void {
    for (const id of ids) if (this.pendingLearn.size < MAX_PENDING_LEARN) this.pendingLearn.add(id);
  }
}
