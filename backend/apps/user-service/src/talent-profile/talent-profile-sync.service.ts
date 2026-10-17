import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentProfile } from './entities/talent-profile.entity';
import { TalentProfileSavedEvent } from './interfaces/talent-profile-events';
import { User } from '../user/entities/user.entity';
import { IdentityVerificationGateClient } from '../identity-gate/identity-verification-gate.client';
import { TalentGateStateService } from '../identity-gate/talent-gate-state.service';

// Mirrors TalentEventPayload in algolia-service — keep the two in step, since
// SyncService.syncTalent reads these exact names off the event. Note the rate
// fields are `hourlyRateMin`/`hourlyRateMax`: a lone `hourlyRate` is silently
// ignored downstream and leaves the indexed rate null.
interface AlgoliaTalentPayload {
  id: string;
  name: string;
  username: string;
  createdAt: string | null;
  headline: string | null;
  skills: string[];
  location: string | null;
  industries: string[];
  categories: string[];
  subcategories: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  availability: string | null;
  languages: string[];
  certifications: string[];
  overview: string | null;
  tags: string[];
  experienceLevel: string | null;
  rating: number | null;
  avatarUrl: string | null;
  projectHighlights: string[];
  country: string | null;
  timezone: string | null;
  projectsCompleted: number | null;
  reviewsCount: number | null;
  clientSuccessRate: number | null;
  yearsOfExperience: number | null;
  // G1 discovery gate - see TalentEventPayload in algolia-service. `accountId`
  // is the platform account the profile belongs to; `gateOpen` is identity's
  // decision at `gateCheckedAt`, omitted when it could not be obtained.
  accountId: string | null;
  gateOpen?: boolean;
  gateCheckedAt?: string;
}

/** What identity said about the profile's account, or nothing if it could not be asked. */
interface GateStamp {
  gateOpen?: boolean;
  gateCheckedAt?: string;
}

/**
 * Categories derived from a profile's own text by category-service, rather
 * than stored on the profile. Empty arrays are a normal result — a profile
 * with no job titles, or an unreachable matcher, simply indexes uncategorised.
 */
interface DerivedCategories {
  categories: string[];
  subcategories: string[];
}

/**
 * Bounded so a slow matcher degrades to "no categories" rather than stalling
 * every profile save behind it. Generous enough to cover a cold taxonomy
 * rebuild, which embeds the whole tree on the first request after a restart.
 */
const CATEGORY_MATCH_TIMEOUT_MS = 10_000;

const DEFAULT_GATE_RECONCILE_INTERVAL_MS = 60 * 60 * 1000;
const GATE_RECONCILE_FIRST_RUN_DELAY_MS = 60 * 1000;
const GATE_BACKFILL_BATCH = 100;
const GATE_BACKFILL_TIMEOUT_MS = 30_000;

@Injectable()
export class TalentProfileSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TalentProfileSyncService.name);

  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject('ALGOLIA_CLIENT')
    private readonly algoliaClient: ClientProxy,
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
    @Inject('CATEGORY_CLIENT')
    private readonly categoryClient: ClientProxy,
    private readonly gateClient: IdentityVerificationGateClient,
    private readonly gateState: TalentGateStateService,
  ) {
    this.logger.log('TalentProfileSyncService initialized');
  }

  private gateTimers: NodeJS.Timeout[] = [];

  /**
   * G1: records that are not yet backfilled stay hidden from marketplace
   * search, so a backfill runs shortly after boot and then on an interval as
   * the reconciliation backstop for any gate change the index missed
   * (TALENT_GATE_RECONCILE_INTERVAL_MS, default 1h; 0 turns the schedule off -
   * `talent-profile.reindex_gate` can still be sent by an operator).
   */
  onModuleInit(): void {
    const every = process.env.TALENT_GATE_RECONCILE_INTERVAL_MS === undefined
      ? DEFAULT_GATE_RECONCILE_INTERVAL_MS
      : Number(process.env.TALENT_GATE_RECONCILE_INTERVAL_MS);
    if (!Number.isFinite(every) || every <= 0) return;
    const run = () =>
      void this.reindexGate().catch((err) =>
        this.logger.warn(`Scheduled talent gate reconcile failed: ${err instanceof Error ? err.message : String(err)}`),
      );
    const first = setTimeout(run, GATE_RECONCILE_FIRST_RUN_DELAY_MS);
    const repeat = setInterval(run, every);
    first.unref?.();
    repeat.unref?.();
    this.gateTimers.push(first, repeat);
  }

  onModuleDestroy(): void {
    this.gateTimers.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    this.gateTimers = [];
  }

  /**
   * The gate decision for one profile's account, stamped with when it was
   * asked. Never throws and never guesses: if identity cannot answer, nothing
   * is sent and the index keeps whatever `gate_open` the record already has
   * (hidden, if it has none).
   */
  private async gateStampFor(profile: TalentProfile): Promise<GateStamp> {
    if (!profile.sourceId) return {};
    try {
      const checkedAt = new Date().toISOString();
      const decisions = await this.gateClient.checkGateBatch([profile.sourceId]);
      const decision = decisions.get(profile.sourceId);
      return decision ? { gateOpen: decision.gateOpen === true, gateCheckedAt: checkedAt } : {};
    } catch {
      return {};
    }
  }

  async upsert(event: TalentProfileSavedEvent): Promise<TalentProfile> {
    const id = event.id;
    let sourceId = event.sourceId ?? null;

    // For CMS-first profiles that don't have a platform user yet, generate a
    // sourceId so we can create a canonical user row. This ensures they are
    // visible in the platform's user-based lists/filters.
    if (!sourceId) {
      // Use the externalId if it's a valid UUID, or generate a new one
      sourceId = event.id.length === 36 ? event.id : null;
      // If we still don't have one, the underlying DB will handle it or we could generate here.
      // Actually, let's generate if still null.
      if (!sourceId) {
        sourceId = require("crypto").randomUUID();
      }
    }

    const data: Partial<TalentProfile> = {
      externalId: id,
      sourceId,
      username: event.username,
      name: event.name,
      avatarUrl: event.avatarUrl ?? null,
      availability: event.availability ?? null,
      rate: event.rate ?? null,
      jobTitles: event.jobTitles ?? [],
      overview: event.overview ?? null,
      skills: event.skills ?? [],
      industryExpertise: event.industryExpertise ?? [],
      languages: event.languages ?? [],
      certifications: event.certifications ?? [],
      education: event.education ?? [],
      workExperience: (event.workExperience ?? []).map((w: any) => ({
        ...w,
        skills: w.skills ?? [],
      })),
      portfolio: (event.portfolio ?? []).map((p) => ({
        ...p,
        thumbnailUrl: null,
      })),
      location: event.location ?? null,
      timezone: event.timezone ?? null,
      status: event.status ?? "active",
    };

    // Use save() which does INSERT ... ON CONFLICT UPDATE when entity has
    // a matching unique key, avoiding race conditions between find and insert.
    const existing = await this.repo.findOne({
      where: { externalId: event.id },
    });

    const emitTalentUpdated = async (
      profile: TalentProfile,
      derived: DerivedCategories,
      gate: GateStamp,
    ) => {
      try {
        await this.client.emit('talent.updated', {
          id: profile.externalId,
          name: profile.name,
          username: profile.username,
          createdAt: profile.createdAt?.toISOString() ?? null,
          headline: profile.jobTitles?.[0]?.headline ?? null,
          skills: profile.skills ?? [],
          location: profile.location ?? null,
          industries: profile.industryExpertise ?? [],
          categories: derived.categories,
          subcategories: derived.subcategories,
          hourlyRateMin: profile.rate ?? null,
          hourlyRateMax: profile.rate ?? null,
          availability: profile.availability ?? null,
          languages: (profile.languages ?? []).map((l) =>
            typeof l === 'string' ? l : l.language,
          ),
          certifications: (profile.certifications ?? []).map((c) =>
            typeof c === 'string' ? c : c.title,
          ),
          overview:
            typeof profile.overview === 'string'
              ? profile.overview
              : profile.overview?.root?.children
                  ?.map((child: any) =>
                    child.children
                      ?.map((c: any) => c.text ?? '')
                      .join('') ?? '',
                  )
                  .join('\n') ?? null,
          tags: [],
          experienceLevel: this.computeExperienceLevel(profile.workExperience ?? []),
          rating: profile.rating != null ? Number(profile.rating) : null,
          avatarUrl: null,
          projectHighlights: [],
          // System-generated stats: owned here, never written by CMS sync.
          // Without these the Talent sidebar's Projects Completed / Average
          // Rating / Client Success Rate filters have nothing to match and
          // the result card can't show its rating or project count.
          country: profile.country ?? null,
          timezone: profile.timezone ?? null,
          projectsCompleted: profile.totalProjectsCompleted ?? null,
          reviewsCount: profile.reviewsCount ?? null,
          clientSuccessRate:
            profile.repeatHireRate != null ? Number(profile.repeatHireRate) : null,
          yearsOfExperience: this.yearsOfExperience(profile),
          accountId: profile.sourceId ?? null,
          ...gate,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to emit talent.updated for "${profile.username}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };

    // Derived once per upsert and handed to both emissions, so the Algolia
    // record and the talent.updated event can never disagree about what
    // categories this profile has.
    const publish = async (saved: TalentProfile) => {
      const derived = await this.deriveCategories(saved);
      const gate = await this.gateStampFor(saved);
      this.emitAlgoliaUpdate(saved, derived, gate);
      await this.syncUserRow(event, sourceId);
      await emitTalentUpdated(saved, derived, gate);
    };

    if (existing) {
      Object.assign(existing, data);
      const saved = await this.repo.save(existing);
      this.logger.log(
        `Updated talent profile "${event.username}" (externalId=${event.id})`,
      );
      await publish(saved);
      return saved;
    }

    try {
      const profile = this.repo.create(data);
      const saved = await this.repo.save(profile);
      this.logger.log(
        `Created talent profile "${event.username}" (externalId=${event.id})`,
      );
      await publish(saved);
      return saved;
    } catch (err: any) {
      // Handle race condition: another process inserted between find and save
      if (err?.code === "23505") {
        this.logger.warn(
          `Duplicate insert race for "${event.username}" — retrying as update`,
        );
        const retryExisting = await this.repo.findOneOrFail({
          where: { externalId: event.id },
        });
        Object.assign(retryExisting, data);
        const saved = await this.repo.save(retryExisting);
        await publish(saved);
        return saved;
      }
      throw err;
    }
  }

  /**
   * Re-derive categories for every active profile and re-emit them downstream.
   *
   * Needed because categories are derived at sync time: profiles that were
   * last synced before semantic matching existed, or before the taxonomy or
   * the match threshold changed, carry stale (or no) categories until
   * something touches them. This backfills without anyone editing the CMS.
   *
   * Processed in batches and sequentially within a batch — the matcher's
   * embedding cache warms as it goes, and this must not saturate
   * category-service ahead of live profile saves.
   */
  async reindexCategories(batchSize = 100): Promise<{
    processed: number;
    categorised: number;
  }> {
    let processed = 0;
    let categorised = 0;
    let skip = 0;

    for (;;) {
      const batch = await this.repo.find({
        where: { status: 'active' },
        order: { id: 'ASC' },
        take: batchSize,
        skip,
      });
      if (!batch.length) break;

      for (const profile of batch) {
        const derived = await this.deriveCategories(profile);
        this.emitAlgoliaUpdate(profile, derived, await this.gateStampFor(profile));
        processed++;
        if (derived.categories.length || derived.subcategories.length) {
          categorised++;
        }
      }

      skip += batch.length;
      this.logger.log(
        `Category reindex progress: ${processed} profiles, ${categorised} categorised`,
      );
    }

    this.logger.log(
      `Category reindex complete: ${processed} profiles, ${categorised} categorised`,
    );
    return { processed, categorised };
  }

  /** Writes decisions identity gave us into the local table; a failure is logged, never thrown. */
  private async recordLocalGateState(
    decisions: Array<{ userId: string; gateOpen: boolean }>,
    decidedAtIso: string,
  ): Promise<void> {
    if (!decisions.length) return;
    try {
      await this.gateState.applyMany(decisions, new Date(decidedAtIso));
    } catch (err) {
      this.logger.warn(`Local gate state not updated: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Asks identity (batches of `batchSize`, never per account) for every talent USER account and
   * records the answers locally, so the browse list - which reads users, not profiles - has a
   * decision for each. Keyset-paged by id, so it never offsets through the table. An account
   * identity cannot answer keeps whatever state it has (none = hidden); the next pass retries it.
   */
  async reconcileUserGateState(batchSize = GATE_BACKFILL_BATCH): Promise<{ processed: number; recorded: number }> {
    let processed = 0;
    let recorded = 0;
    let after: string | null = null;
    for (;;) {
      const qb = this.userRepo
        .createQueryBuilder('u')
        .select(['u.id'])
        .where('u.userType = :userType', { userType: 'talent' })
        .orderBy('u.id', 'ASC')
        .take(batchSize);
      if (after) qb.andWhere('u.id > :after', { after });
      const batch = await qb.getMany();
      if (!batch.length) break;
      processed += batch.length;
      after = batch[batch.length - 1].id;

      const checkedAt = new Date().toISOString();
      try {
        const decisions = await this.gateClient.checkGateBatch(batch.map((u) => u.id));
        const answered = batch.flatMap((u) => {
          const decision = decisions.get(u.id);
          return decision ? [{ userId: u.id, gateOpen: decision.gateOpen === true }] : [];
        });
        await this.recordLocalGateState(answered, checkedAt);
        recorded += answered.length;
      } catch {
        // identity could not answer this batch: those accounts keep their current state
      }
      if (batch.length < batchSize) break;
    }
    return { processed, recorded };
  }

  /**
   * G1: backfill / reconcile `gate_open` on every talent record. Repeatable and
   * idempotent - each pass asks identity for the current decision of every
   * profile's account (one request per 100) and sends it to algolia-service,
   * which applies it as a PARTIAL update (never a delete/recreate, never
   * creating a record). It heals missed or failed gate updates, and is how
   * records indexed before the gate existed (which stay hidden until they have
   * `gate_open:true`) become visible.
   *
   * A batch identity cannot answer, or that algolia-service cannot apply, is
   * skipped and counted - the records keep their previous flag and the next
   * pass retries it.
   */
  async reindexGate(batchSize = GATE_BACKFILL_BATCH): Promise<{
    processed: number;
    sent: number;
    unanswered: number;
    failedBatches: number;
  }> {
    if (this.gateReindexRunning) {
      return { processed: 0, sent: 0, unanswered: 0, failedBatches: 0 };
    }
    this.gateReindexRunning = true;
    let processed = 0;
    let sent = 0;
    let unanswered = 0;
    let failedBatches = 0;
    try {
      for (let skip = 0; ; skip += batchSize) {
        const batch = await this.repo.find({ order: { id: 'ASC' }, take: batchSize, skip });
        if (!batch.length) break;
        processed += batch.length;

        const withAccount = batch.filter((p) => !!p.sourceId);
        unanswered += batch.length - withAccount.length;
        if (!withAccount.length) continue;

        const checkedAt = new Date().toISOString();
        let decisions: Awaited<ReturnType<IdentityVerificationGateClient['checkGateBatch']>>;
        try {
          decisions = await this.gateClient.checkGateBatch(withAccount.map((p) => p.sourceId as string));
        } catch {
          failedBatches++;
          continue;
        }

        // The same decisions also refresh the local last-known gate state the PostgreSQL discovery
        // paths filter by (independent of whether the index accepts them below).
        await this.recordLocalGateState(
          withAccount.flatMap((p) => {
            const decision = decisions.get(p.sourceId as string);
            return decision ? [{ userId: p.sourceId as string, gateOpen: decision.gateOpen === true }] : [];
          }),
          checkedAt,
        );

        const entries = withAccount.flatMap((p) => {
          const decision = decisions.get(p.sourceId as string);
          if (!decision) {
            unanswered++;
            return [];
          }
          return [{ id: p.externalId, accountId: p.sourceId as string, gateOpen: decision.gateOpen === true }];
        });
        if (!entries.length) continue;

        try {
          await firstValueFrom(
            this.algoliaClient
              .send('talent.gate_backfill', { entries, checkedAt })
              .pipe(timeout(GATE_BACKFILL_TIMEOUT_MS)),
          );
          sent += entries.length;
        } catch (err) {
          failedBatches++;
          this.logger.warn(
            `Talent gate backfill batch not applied: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      await this.reconcileUserGateState(batchSize).catch((err) =>
        this.logger.warn(`User gate-state reconcile failed: ${err instanceof Error ? err.message : String(err)}`),
      );
      this.logger.log(
        `Talent gate reindex complete: ${processed} profiles, ${sent} sent, ${unanswered} unanswered, ${failedBatches} failed batches`,
      );
      return { processed, sent, unanswered, failedBatches };
    } finally {
      this.gateReindexRunning = false;
    }
  }

  private gateReindexRunning = false;

  async delete(externalId: string): Promise<void> {
    const result = await this.repo.delete({ externalId });
    if (result.affected) {
      this.logger.log(`Deleted talent profile externalId=${externalId}`);
      try {
        await this.client.emit('talent.deleted', { id: externalId });
      } catch (err) {
        this.logger.warn(
          `Failed to emit talent.deleted for ${externalId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      this.logger.warn(`No talent profile found for externalId=${externalId}`);
    }
  }

  /**
   * Ask category-service to derive this profile's categories from the text it
   * already carries — up to three job titles plus every work-history role.
   *
   * Never throws: an unreachable or slow matcher must not fail a profile save,
   * so the profile indexes with no categories and picks them up on the next
   * sync (or a backfill re-emit).
   */
  private async deriveCategories(
    profile: TalentProfile,
  ): Promise<DerivedCategories> {
    const texts = [
      ...(profile.jobTitles ?? []).map((jt) => jt?.headline),
      ...(profile.workExperience ?? []).map((we: any) => we?.role),
    ].filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

    if (!texts.length) return { categories: [], subcategories: [] };

    try {
      const result = await firstValueFrom(
        this.categoryClient
          .send<DerivedCategories>('category.match', { texts })
          .pipe(timeout(CATEGORY_MATCH_TIMEOUT_MS)),
      );
      return {
        categories: result?.categories ?? [],
        subcategories: result?.subcategories ?? [],
      };
    } catch (err) {
      this.logger.warn(
        `Category matching failed for "${profile.username}": ${
          err instanceof Error ? err.message : String(err)
        } — indexing with no categories`,
      );
      return { categories: [], subcategories: [] };
    }
  }

  private emitAlgoliaUpdate(
    profile: TalentProfile,
    derived: DerivedCategories,
    gate: GateStamp = {},
  ): void {
    const payload = { ...this.buildAlgoliaPayload(profile, derived), ...gate };
    this.algoliaClient.emit<void>('talent.updated', payload).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit talent.updated for ${profile.externalId}: ${err.message}`),
    });
  }

  private buildAlgoliaPayload(
    profile: TalentProfile,
    derived: DerivedCategories,
  ): AlgoliaTalentPayload {
    const headline = profile.jobTitles?.[0]?.headline ?? null;
    return {
      id: profile.externalId,
      name: profile.name,
      username: profile.username,
      createdAt: profile.createdAt?.toISOString() ?? null,
      headline,
      skills: profile.skills ?? [],
      location: profile.location,
      industries: profile.industryExpertise ?? [],
      categories: derived.categories,
      subcategories: derived.subcategories,
      hourlyRateMin: profile.rate ?? null,
      hourlyRateMax: profile.rate ?? null,
      availability: profile.availability,
      languages: (profile.languages ?? []).map((l) =>
        typeof l === 'string' ? l : l.language,
      ),
      certifications: (profile.certifications ?? []).map((c) =>
        typeof c === 'string' ? c : c.title,
      ),
      overview: this.extractOverviewText(profile.overview),
      tags: [],
      experienceLevel: this.computeExperienceLevel(profile.workExperience ?? []),
      rating: profile.rating ? Number(profile.rating) : null,
      avatarUrl: null,
      projectHighlights: (profile.portfolio ?? []).map((p) => p.title),
      country: profile.country ?? null,
      timezone: profile.timezone ?? null,
      projectsCompleted: profile.totalProjectsCompleted ?? null,
      reviewsCount: profile.reviewsCount ?? null,
      clientSuccessRate:
        profile.repeatHireRate != null ? Number(profile.repeatHireRate) : null,
      yearsOfExperience: this.yearsOfExperience(profile),
      accountId: profile.sourceId ?? null,
    };
  }

  private extractOverviewText(overview: Record<string, any> | null): string | null {
    if (!overview) return null;
    if (typeof overview === 'string') return overview;
    try {
      const walk = (node: any): string => {
        if (typeof node?.text === 'string') return node.text;
        if (Array.isArray(node?.children)) return node.children.map(walk).join(' ');
        if (Array.isArray(node?.root?.children)) return node.root.children.map(walk).join(' ');
        return '';
      };
      const text = walk(overview).replace(/\s+/g, ' ').trim();
      return text || null;
    } catch {
      return null;
    }
  }

  private computeExperienceLevel(
    workExp: { startDate: string | null; endDate: string | null }[],
  ): string | null {
    if (!workExp.length) return null;
    const now = new Date();
    let totalMonths = 0;
    for (const exp of workExp) {
      const start = exp.startDate ? new Date(exp.startDate) : null;
      const end = exp.endDate ? new Date(exp.endDate) : now;
      if (!start || isNaN(start.getTime())) continue;
      totalMonths +=
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
    }
    const years = Math.floor(totalMonths / 12);
    if (years < 3) return 'Junior (1-3 years)';
    if (years < 5) return 'Middle (3-5 years)';
    if (years < 7) return 'Senior (5-7 years)';
    if (years < 10) return 'Lead (7-10 years)';
    return 'Super Senior (10+ years)';
  }

  /**
   * Total years of professional experience across the profile's work history,
   * the raw number behind computeExperienceLevel's bucket label.
   *
   * Both are emitted: the label is what the card and any exact-match consumer
   * reads, while the number is what the sidebar's Experience Level filter
   * actually ranges over — matching on the label would break the moment the
   * bucket wording changed on either side, and couldn't support the design's
   * "Custom Range" option at all.
   */
  private yearsOfExperience(profile: TalentProfile): number | null {
    const workExp = profile.workExperience ?? [];
    if (!workExp.length) return null;
    const now = new Date();
    let totalMonths = 0;
    for (const exp of workExp) {
      const start = exp.startDate ? new Date(exp.startDate) : null;
      const end = exp.endDate ? new Date(exp.endDate) : now;
      if (!start || isNaN(start.getTime())) continue;
      totalMonths +=
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
    }
    return totalMonths > 0 ? Math.floor(totalMonths / 12) : null;
  }

  private async syncUserRow(
    event: TalentProfileSavedEvent,
    resolvedSourceId: string | null,
  ): Promise<void> {
    // Keep the canonical user row in sync for endpoints that read from `users`
    // (e.g. /talent/users). Prefer sourceId (auth/user UUID) when provided.
    const sourceId = resolvedSourceId ?? event.sourceId ?? null;
    if (!sourceId) return;

    let user = await this.userRepo.findOne({ where: { id: sourceId } });
    if (!user) {
      this.logger.log(
        `Creating missing user for sourceId=${sourceId} (username="${event.username}")`,
      );
      user = this.userRepo.create({
        id: sourceId,
        email: `${event.username}@example.com`, // Fallback email
        isActive: true,
        provider: "SEED",
      });
    }

    user.userType = "talent";
    user.username = event.username;

    // Sync name to firstName/lastName for the users table
    if (event.name) {
      const parts = event.name.trim().split(/\s+/);
      if (parts.length > 1) {
        user.firstName = parts[0];
        user.lastName = parts.slice(1).join(" ");
      } else {
        user.firstName = parts[0];
        user.lastName = undefined;
      }
    }

    user.availability = event.availability ?? undefined;
    user.avatarUrl = event.avatarUrl ?? user.avatarUrl;
    user.rate = event.rate ?? undefined;
    user.location = event.location ?? undefined;

    // Extract plain text for the users table overview/bio fields
    if (event.overview) {
      if (typeof event.overview === "string") {
        user.overview = event.overview;
      } else if ((event.overview as any).root?.children) {
        const extract = (node: any): string => {
          if (node.text) return node.text;
          if (node.children) {
            return node.children.map(extract).join("");
          }
          return "";
        };
        user.overview = (event.overview as any).root.children
          .map(extract)
          .join("\n");
      }
    } else if (event.headline) {
      user.overview = event.headline;
    }

    try {
      await this.userRepo.save(user);
    } catch (err: any) {
      // Best-effort only; the talent_profiles row is the primary read model for profile pages.
      this.logger.warn(
        `Failed to sync users row for sourceId=${sourceId} username="${event.username}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
