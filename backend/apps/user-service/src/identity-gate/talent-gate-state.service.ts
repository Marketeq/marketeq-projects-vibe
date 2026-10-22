import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { isUUID } from 'class-validator';

/**
 * Where the G1 discovery filter reads from: `user_service.talent_gate_state`, the last known
 * gate_open of every talent account. Discovery queries join it in SQL (see `OPEN_TALENT_SQL`);
 * this service only WRITES it - from `identity.gate_changed` events and the background reconcile.
 *
 * Three states per account: known open, known closed, never received. Only "known open" is
 * shown; the other two are hidden, so an account whose state has not been received yet is hidden
 * without affecting any other account.
 */
export const TALENT_GATE_STATE_TABLE = 'user_service.talent_gate_state';

/**
 * SQL fragment: `account` (a SQL expression for the account id) has a KNOWN OPEN gate. A
 * semi-join, so it adds no rows and no duplicates and is applied before LIMIT/OFFSET and before
 * any COUNT. `account` must be a uuid expression.
 */
export const openTalentSql = (account: string): string =>
  `EXISTS (SELECT 1 FROM ${TALENT_GATE_STATE_TABLE} g WHERE g."userId" = ${account} AND g."gateOpen" = true)`;

/** The same semi-join for an account id held as TEXT (talent profiles store it as a string). */
export const openTalentTextSql = (account: string): string =>
  `EXISTS (SELECT 1 FROM ${TALENT_GATE_STATE_TABLE} g WHERE g."userId"::text = ${account} AND g."gateOpen" = true)`;

@Injectable()
export class TalentGateStateService {
  private readonly logger = new Logger(TalentGateStateService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Records a decision. An older decision never overwrites a newer one (events can be redelivered
   * or arrive out of order) and a repeat is a harmless no-op. Returns whether the row changed.
   */
  async apply(userId: string, gateOpen: boolean, occurredAt: Date): Promise<boolean> {
    if (!isUUID(userId) || typeof gateOpen !== 'boolean' || Number.isNaN(occurredAt.getTime())) return false;
    const rows = await this.dataSource.query(
      `INSERT INTO ${TALENT_GATE_STATE_TABLE} ("userId", "gateOpen", "occurredAt", "receivedAt")
       VALUES ($1::uuid, $2, $3::timestamptz, now())
       ON CONFLICT ("userId") DO UPDATE
         SET "gateOpen" = EXCLUDED."gateOpen", "occurredAt" = EXCLUDED."occurredAt", "receivedAt" = now()
       WHERE EXCLUDED."occurredAt" >= ${TALENT_GATE_STATE_TABLE}."occurredAt"
       RETURNING "userId"`,
      [userId, gateOpen, occurredAt.toISOString()],
    );
    return rows.length > 0;
  }

  /**
   * Records many decisions in ONE statement (the reconcile's batch of up to a few hundred
   * accounts), with the same newer-wins rule per account. Malformed ids are skipped.
   */
  async applyMany(decisions: Array<{ userId: string; gateOpen: boolean }>, decidedAt: Date): Promise<number> {
    const valid = decisions.filter((d) => isUUID(d.userId) && typeof d.gateOpen === 'boolean');
    if (!valid.length || Number.isNaN(decidedAt.getTime())) return 0;
    const rows = await this.dataSource.query(
      `INSERT INTO ${TALENT_GATE_STATE_TABLE} ("userId", "gateOpen", "occurredAt", "receivedAt")
       SELECT d."userId"::uuid, d."gateOpen", $3::timestamptz, now()
       FROM unnest($1::text[], $2::boolean[]) AS d("userId", "gateOpen")
       ON CONFLICT ("userId") DO UPDATE
         SET "gateOpen" = EXCLUDED."gateOpen", "occurredAt" = EXCLUDED."occurredAt", "receivedAt" = now()
       WHERE EXCLUDED."occurredAt" >= ${TALENT_GATE_STATE_TABLE}."occurredAt"
       RETURNING "userId"`,
      [valid.map((d) => d.userId), valid.map((d) => d.gateOpen), decidedAt.toISOString()],
    );
    return rows.length;
  }

  /** True when the table cannot be read (migration not run yet); discovery then shows nobody. */
  isUnreadable(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return /talent_gate_state/i.test(msg);
  }

  warnUnreadable(where: string, err: unknown): void {
    this.logger.warn(
      `Talent gate state unreadable for ${where}; showing no talent: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
