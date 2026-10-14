import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccountGateStateService } from './account-gate-state.service';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';

export const ALGOLIA_GATE_CLIENT = 'ALGOLIA_GATE_CLIENT';
const BACKFILL_BATCH = 500;
const BACKFILL_TIMEOUT_MS = 30_000;
const DEFAULT_LEARN_INTERVAL_MS = 30 * 1000;
const DEFAULT_RECONCILE_INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RECONCILE_DELAY_MS = 60 * 1000;
const LEARN_BATCH = 500;

/**
 * Background safety net for the local gate state (G5). Never runs on a request
 * path, so a roster never waits for it.
 *
 *  - learn: accounts a roster asked about that have no recorded state yet (an
 *    account whose event pre-dates this table, or one that has never changed)
 *    are asked of identity-verification-service in batches, every 30 s.
 *  - reconcile: shortly after boot and hourly, every account that appears on a
 *    listing, project, team or role row is re-checked, which also heals an event
 *    that was missed while the consumer was down.
 *
 * If identity or the broker is unavailable the pass is skipped and the last
 * known state keeps being served.
 */
@Injectable()
export class AccountGateReconciler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountGateReconciler.name);
  private timers: NodeJS.Timeout[] = [];
  private running = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly state: AccountGateStateService,
    private readonly gate: IdentityVerificationGateClient,
    @Inject(ALGOLIA_GATE_CLIENT) private readonly algolia: ClientProxy,
  ) {}

  onModuleInit(): void {
    if (process.env.LISTINGS_GATE_RECONCILE_DISABLED === 'true') return;
    const learnEvery = Number(process.env.LISTINGS_GATE_LEARN_INTERVAL_MS);
    const reconcileEvery = Number(process.env.LISTINGS_GATE_RECONCILE_INTERVAL_MS);
    const learn = setInterval(() => void this.learnUnknown(), Number.isFinite(learnEvery) && learnEvery > 0 ? learnEvery : DEFAULT_LEARN_INTERVAL_MS);
    const first = setTimeout(() => void this.reconcileAll(), FIRST_RECONCILE_DELAY_MS);
    const repeat = setInterval(() => void this.reconcileAll(), Number.isFinite(reconcileEvery) && reconcileEvery > 0 ? reconcileEvery : DEFAULT_RECONCILE_INTERVAL_MS);
    for (const t of [learn, first, repeat]) t.unref?.();
    this.timers.push(learn, first, repeat);
  }

  onModuleDestroy(): void {
    this.timers.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    this.timers = [];
  }

  /** Asks identity about accounts no state has been received for. Returns how many were recorded. */
  async learnUnknown(): Promise<number> {
    const ids = this.state.takePendingLearn();
    if (ids.length === 0) return 0;
    return this.check(ids);
  }

  /** Re-checks every account that appears on a listing, project, team or role row. */
  async reconcileAll(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      // One query per source so a table that does not exist in an environment
      // (or a column rename) skips only that source, never the whole pass.
      const sources = [
        `SELECT DISTINCT "userId"::text AS id FROM listings.project WHERE "userId" IS NOT NULL`,
        `SELECT DISTINCT unnest("teamMemberIds")::text AS id FROM listings.project`,
        `SELECT DISTINCT "userId"::text AS id FROM listings.project_members`,
        `SELECT DISTINCT unnest("memberIds")::text AS id FROM listings.teams`,
        `SELECT DISTINCT assigned_user_id::text AS id FROM listings.job_listing_role_rows WHERE assigned_user_id IS NOT NULL`,
      ];
      const rows: Array<{ id: string }> = [];
      for (const sql of sources) {
        try {
          rows.push(...(await this.dataSource.query(sql)));
        } catch (err) {
          this.logger.warn(`Gate state reconcile source skipped: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      const recorded = await this.check(Array.from(new Set(rows.map((r) => r.id).filter(Boolean))));
      await this.backfillIndexOwnerGate();
      return recorded;
    } catch (err) {
      this.logger.warn(`Gate state reconcile skipped: ${err instanceof Error ? err.message : String(err)}`);
      return 0;
    } finally {
      this.running = false;
    }
  }

  /**
   * Re-sends the listing-owner gate of every owned, published listing to the
   * search index (partial updates in algolia-service), so listings indexed before
   * the gate existed - or whose event was missed - are hidden or shown correctly.
   * Skipped (and retried next pass) if the index service cannot be reached.
   */
  async backfillIndexOwnerGate(): Promise<number> {
    let sent = 0;
    try {
      const listings: Array<{ id: string; listingType: string; ownerId: string }> = await this.dataSource.query(
        `SELECT id::text AS id, "listingType", "userId"::text AS "ownerId" FROM listings.project
          WHERE "userId" IS NOT NULL AND status = 'published'`,
      );
      const teams: Array<{ id: string; ownerId: string }> = await this.dataSource
        .query(
          `SELECT id::text AS id, "createdBy" AS "ownerId" FROM listings.teams
            WHERE status = 'published' AND "createdBy" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`,
        )
        .catch(() => []);
      const rows = [
        ...listings.map((l) => ({ index: l.listingType === 'service' ? 'services' : 'projects', id: l.id, ownerId: l.ownerId })),
        ...teams.map((t) => ({ index: 'teams', id: t.id, ownerId: t.ownerId })),
      ];
      if (rows.length === 0) return 0;
      const open = await this.state.knownOpen(rows.map((r) => r.ownerId));
      const checkedAt = new Date().toISOString();
      for (let i = 0; i < rows.length; i += BACKFILL_BATCH) {
        const entries = rows.slice(i, i + BACKFILL_BATCH).map((r) => ({ ...r, ownerGateOpen: open.has(r.ownerId) }));
        await firstValueFrom(this.algolia.send('listing.owner_gate_backfill', { entries, checkedAt }).pipe(timeout(BACKFILL_TIMEOUT_MS)));
        sent += entries.length;
      }
    } catch (err) {
      this.logger.warn(`Listing owner gate backfill to the search index skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
    return sent;
  }

  private async check(ids: string[]): Promise<number> {
    let recorded = 0;
    for (let i = 0; i < ids.length; i += LEARN_BATCH) {
      const slice = ids.slice(i, i + LEARN_BATCH);
      const askedAt = new Date();
      try {
        const decisions = await this.gate.checkGateBatch(slice);
        for (const [userId, decision] of decisions) {
          if (await this.state.apply(userId, decision.gateOpen === true, askedAt)) recorded++;
        }
      } catch {
        // Identity or the broker is unavailable: keep serving the last known
        // state, and try these accounts again on the next pass.
        this.state.requeue(slice);
        this.logger.warn(`Gate state check unavailable for ${slice.length} account(s); keeping last known state.`);
      }
    }
    return recorded;
  }
}
