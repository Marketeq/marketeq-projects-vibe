import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Screenshot } from './screenshots.entity';
import { AdminSettings } from '../entities/admin-settings.entity';
import { R2Service } from '../storage/r2.service';
import { ConfirmScreenshotDto } from './dto/confirm.dto';
import { CreateFlagDto } from './dto/create-flag.dto';
import { ReviewScreenshotDto } from './dto/review-screenshot.dto';
import { ActivityBand, ScreenshotQueryDto } from '../dtos/screenshot-query.dto';
import { EarningsSyncService } from '../services/earnings-sync.service';
import {
  BatchUpdateScreenshotDto,
  DeleteScreenshotDto,
  UpdateScreenshotMetaDto,
} from '../dtos/update-screenshot.dto';
import { Actor, ContractAccessService } from '../contracts/contract-access.service';
import { ScreenshotImageService } from './screenshot-image.service';

// Capture time is what the user sees on every card; upload time drifts when
// the desktop app syncs a backlog after being offline.
const CAPTURED_AT_EXPR = 'COALESCE(s.capturedAt, s.createdAt)';

@Injectable()
export class ScreenshotsService {
  constructor(
    @InjectRepository(Screenshot)
    private readonly repo: Repository<Screenshot>,
    @InjectRepository(AdminSettings)
    private readonly settingsRepo: Repository<AdminSettings>,
    private readonly r2: R2Service,
    private readonly earningsSync: EarningsSyncService,
    private readonly access: ContractAccessService,
    private readonly images: ScreenshotImageService,
  ) {}

  /** The record as sent to a viewer: `url` is replaced by the image they may load. */
  private async present(s: Screenshot): Promise<Screenshot & { thumbnailUrl: string; signedUrl: string }> {
    const imageUrl = await this.images.imageUrl(s);
    return { ...s, url: imageUrl, thumbnailUrl: imageUrl, signedUrl: imageUrl };
  }

  /** Admin rules for the contract a screenshot belongs to. Platform admins skip them. */
  private async rulesFor(actor: Actor, contractId: string | null): Promise<AdminSettings | null> {
    if (this.access.isAdmin(actor) || !contractId) return null;
    return this.getSettings(contractId);
  }

  private assertOwner(actor: Actor, s: Screenshot): void {
    if (!this.access.isAdmin(actor) && s.userId !== actor.userId) {
      throw new ForbiddenException('Only the person who took this screenshot can change it');
    }
  }

  /** A talent can only move time onto a contract they work on. */
  private async assertCanAssignTo(actor: Actor, contractId: string | null | undefined): Promise<void> {
    if (!contractId || this.access.isAdmin(actor)) return;
    if (!(await this.access.isTalentOf(actor.userId, contractId))) {
      throw new BadRequestException('You can only assign screenshots to your own contracts.');
    }
  }

  private resync(s: Screenshot): void {
    if (s.contractId && s.capturedAt) {
      this.earningsSync
        .syncScreenshot({ userId: s.userId, contractId: s.contractId, taskId: s.taskId ?? null, capturedAt: new Date(s.capturedAt) })
        .catch((e) => console.error('EarningsSync error:', e));
    }
  }


  async confirm(dto: ConfirmScreenshotDto): Promise<Screenshot> {
    const keyboard = dto.keyboard ?? 0;
    const mouse = dto.mouse ?? 0;
    // keyboard and mouse values from the desktop are already activity percentages (0-100)
    const keyboardPct = keyboard;
    const mousePct = mouse;

    // Save image locally if base64 data is provided
    let url: string | null = null;
    if ((dto as any).imageBase64 && process.env.NODE_ENV !== 'production') {
      try {
        const fsPromises = await import('fs/promises');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'screenshot-uploads');
        // mkdir with recursive:true already no-ops if the dir exists — the
        // old existsSync pre-check was always redundant, not just slow.
        await fsPromises.mkdir(uploadsDir, { recursive: true });
        const filename = dto.key.replace('screenshots/', '');
        const filePath = path.join(uploadsDir, filename);
        await fsPromises.writeFile(filePath, Buffer.from((dto as any).imageBase64, 'base64'));
        const port = process.env.PORT ?? 3017;
        url = `http://localhost:${port}/api/screenshot-files/${filename}`;
      } catch (err) {
        // Non-fatal — screenshot metadata still saves (dev-only local storage fallback)
      }
    }

    // iconBase64 is transient — never persisted, only ever used to derive a
    // real iconUrl. In dev (no R2 configured yet) that means writing it to
    // the same local-file fallback the main image uses, above. In every
    // other environment there's nowhere to put it yet, so it's dropped
    // rather than written into the jsonb `apps` column raw — a base64 image
    // blob has no business sitting in a database row.
    let apps = dto.apps ?? null;
    if (apps) {
      const isDev = process.env.NODE_ENV !== 'production';
      const fsPromises = isDev ? await import('fs/promises') : null;
      const path = isDev ? await import('path') : null;
      // Namespaced per user — without this, two different users' icon
      // uploads for the same app name (e.g. both used Chrome) would
      // overwrite each other's file on disk, since the filename was
      // previously keyed on appName alone.
      const safeUserId = isDev ? dto.userId.replace(/[^a-zA-Z0-9_-]/g, '_') : null;
      const uploadsDir =
        path && safeUserId ? path.join(process.cwd(), 'screenshot-uploads', 'icons', safeUserId) : null;
      apps = await Promise.all(
        apps.map(async (app) => {
          // Never trust a client-supplied iconUrl. It's rendered directly as
          // an <img src> to anyone viewing this timesheet later — accepting
          // an arbitrary client-chosen URL here would let a modified desktop
          // client make other users' browsers load attacker-controlled
          // content. The only iconUrl ever stored is one this service
          // derives itself below; the client's own value is always dropped.
          const { iconUrl: _clientSuppliedIconUrl, iconBase64, appName, url } = app;
          const rest = { appName, ...(url !== undefined ? { url } : {}) };
          if (!iconBase64 || !isDev || !fsPromises || !path || !uploadsDir || !safeUserId) {
            return rest;
          }
          try {
            // recursive:true already no-ops if the dir exists — no need
            // for a separate existsSync pre-check.
            await fsPromises.mkdir(uploadsDir, { recursive: true });
            const safeName = app.appName.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `${safeName}.png`;
            await fsPromises.writeFile(path.join(uploadsDir, filename), Buffer.from(iconBase64, 'base64'));
            const port = process.env.PORT ?? 3017;
            return {
              ...rest,
              iconUrl: `http://localhost:${port}/api/screenshot-files/icons/${safeUserId}/${filename}`,
            };
          } catch {
            return rest;
          }
        }),
      );
    }

    const saved = await this.repo.save({
      userId: dto.userId,
      key: dto.key,
      mimeType: dto.mimeType,
      bytes: dto.bytes,
      capturedAt: dto.timestamp ? new Date(dto.timestamp) : null,
      contractId: dto.contractId ?? null,
      taskId: dto.taskId ?? null,
      keyboard,
      mouse,
      keyboardPct,
      mousePct,
      monitorId: dto.monitorId ?? null,
      groupKey: dto.groupKey ?? null,
      isDeleted: false,
      url: url ?? undefined,
      apps,
    } as any);
    // Sync to earnings_cache (non-blocking)
    if (saved.contractId && saved.capturedAt) {
      this.earningsSync.syncScreenshot({
        userId: saved.userId,
        contractId: saved.contractId,
        taskId: saved.taskId ?? null,
        capturedAt: new Date(saved.capturedAt),
      }).catch(e => console.error('EarningsSync error:', e));
    }
    return saved;
  }

  async listByUser(userId: string, page = 1, limit = 50) {
    const take = Math.min(200, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const items = await this.repo.find({
      where: { userId, isDeleted: false },
      order: { createdAt: 'DESC' as const },
      skip,
      take,
    });

    let total: number;
    try {
      total = await (this.repo as any).count({ where: { userId, isDeleted: false } });
    } catch {
      total = (await this.repo.find({ where: { userId, isDeleted: false } })).length;
    }

    return { items, page: Number(page), limit: take, total };
  }

  /**
   * Soft-delete (idempotent, owner-only). When the contract requires approval
   * for deletes, this only files a request: the screenshot stays, and keeps
   * counting, until the client reviews it (reviewDeleteRequest).
   */
  async deleteScreenshot(
    id: string,
    actor: Actor,
    dto: DeleteScreenshotDto = {},
  ): Promise<{ id: string; isDeleted: boolean; deleteRequested: boolean }> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('Screenshot not found');
    this.assertOwner(actor, existing);
    if (existing.isDeleted) return { id, isDeleted: true, deleteRequested: false };

    // The rules come from the screenshot's own contract — never from the caller.
    const rules = await this.rulesFor(actor, existing.contractId);
    if (rules && !rules.allowDelete) {
      throw new ForbiddenException('Screenshot deletion is not allowed by admin settings');
    }

    const reason = dto.reason?.trim() || null;

    if (rules?.requireDeleteApproval) {
      if (!existing.deleteRequestedAt) {
        await this.repo.update(
          { id, isDeleted: false },
          { deleteRequestedAt: new Date(), deletionReason: reason },
        );
      }
      return { id, isDeleted: false, deleteRequested: true };
    }

    return { id, isDeleted: await this.softDelete(id, existing.userId, reason), deleteRequested: false };
  }

  /**
   * The contract's client (or a platform admin) decides a pending delete
   * request: approving soft-deletes the screenshot, rejecting keeps it.
   */
  async reviewDeleteRequest(
    id: string,
    actor: Actor,
    dto: ReviewScreenshotDto,
  ): Promise<{ id: string; isDeleted: boolean; screenshot: Screenshot }> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    await this.access.assertClientOf(actor, screenshot.contractId);
    if (!screenshot.deleteRequestedAt) {
      throw new BadRequestException('This screenshot has no pending delete request');
    }

    if (dto.status === 'approved') {
      await this.softDelete(id, screenshot.userId, screenshot.deletionReason);
      return { id, isDeleted: true, screenshot };
    }

    screenshot.deleteRequestedAt = null;
    screenshot.deletionReason = null;
    const saved = await this.repo.save(screenshot);
    return { id, isDeleted: false, screenshot: saved };
  }

  /** Raw SQL soft-delete — bypasses TypeORM column mapping quirks. True once deleted. */
  private async softDelete(id: string, userId: string, reason: string | null): Promise<boolean> {
    const now = new Date().toISOString();

    const updated = await (this.repo as any).query(
      `UPDATE time_tracking.screenshots
       SET is_deleted = true, deleted_at = $3, deletion_reason = $4, delete_requested_at = NULL
       WHERE id = $1 AND user_id = $2 AND is_deleted = false
       RETURNING id, contract_id, task_id, captured_at`,
      [id, userId, now, reason],
    );

    // TypeORM returns an UPDATE ... RETURNING result as [rows[], affectedCount],
    // so the row is at updated[0][0]. (A plain SELECT returns rows[] directly.)
    const updatedRows = Array.isArray(updated?.[0])
      ? updated[0]
      : (Array.isArray(updated) ? updated : []);
    if (updatedRows.length > 0) {
      const row = updatedRows[0];
      if (row.contract_id && row.captured_at) {
        this.earningsSync.syncScreenshot({
          userId,
          contractId: row.contract_id,
          taskId: row.task_id ?? null,
          capturedAt: new Date(row.captured_at),
        });
      }
    }

    // No row updated means it was deleted concurrently — still deleted.
    return true;
  }

  // ── Cards (paginated, filtered, sorted) ────────────────────────────

  /**
   * actor null = platform admin listing everything. Otherwise the talent view
   * returns the caller's own screenshots and the client view returns the
   * screenshots on contracts where the caller is the client.
   */
  async findCards(
    actor: Actor | null,
    query: ScreenshotQueryDto,
  ): Promise<{ data: Array<Screenshot & { thumbnailUrl: string }>; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('"from" must be before "to"');
    }

    const qb = this.repo.createQueryBuilder('s').where('s.isDeleted = false');
    if (actor && query.view === 'client') {
      const owned = await this.access.clientContractIds(actor.userId);
      if (!owned.length) return { data: [], total: 0, page, pageSize };
      qb.andWhere('s.contractId IN (:...ownedContractIds)', { ownedContractIds: owned });
    } else if (actor) {
      qb.andWhere('s.userId = :userId', { userId: actor.userId });
    }
    if (query.contractId) qb.andWhere('s.contractId = :contractId', { contractId: query.contractId });
    if (query.taskId) qb.andWhere('s.taskId = :taskId', { taskId: query.taskId });
    if (query.contractIds?.length) qb.andWhere('s.contractId IN (:...contractIds)', { contractIds: query.contractIds });
    if (query.taskIds?.length) qb.andWhere('s.taskId IN (:...taskIds)', { taskIds: query.taskIds });
    if (query.from) qb.andWhere(`${CAPTURED_AT_EXPR} >= :from`, { from: new Date(query.from) });
    if (query.to) qb.andWhere(`${CAPTURED_AT_EXPR} <= :to`, { to: new Date(query.to) });
    if (query.minKeyboard !== undefined) qb.andWhere('s.keyboard >= :minKeyboard', { minKeyboard: query.minKeyboard });
    if (query.maxKeyboard !== undefined) qb.andWhere('s.keyboard <= :maxKeyboard', { maxKeyboard: query.maxKeyboard });
    if (query.minMouse !== undefined) qb.andWhere('s.mouse >= :minMouse', { minMouse: query.minMouse });
    if (query.maxMouse !== undefined) qb.andWhere('s.mouse <= :maxMouse', { maxMouse: query.maxMouse });
    if (query.apps?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s.apps, '[]'::jsonb)) app WHERE lower(app->>'appName') IN (:...appNames))`,
        { appNames: query.apps.map((a) => a.toLowerCase()) },
      );
    }
    if (query.urls?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s.apps, '[]'::jsonb)) app WHERE app->>'url' IN (:...visitedUrls))`,
        { visitedUrls: query.urls },
      );
    }

    // Activity = (keyboard% + mouse%) / 2, the value the web shows on each card.
    const activityExpr = '((s.keyboardPct + s.mousePct) / 2.0)';
    if (query.activityBands?.length) {
      const bandSql: Record<ActivityBand, string> = {
        none: `${activityExpr} = 0`,
        low: `(${activityExpr} > 0 AND ${activityExpr} <= 33)`,
        medium: `(${activityExpr} > 33 AND ${activityExpr} <= 66)`,
        high: `${activityExpr} > 66`,
      };
      qb.andWhere(`(${query.activityBands.map((b) => bandSql[b]).join(' OR ')})`);
    }

    // Cards are screenshots only; manual entries are not in this table, so
    // "manual" on its own matches nothing here.
    if (query.timeEntryTypes?.length) {
      const typeSql: string[] = [];
      if (query.timeEntryTypes.includes('automatic')) typeSql.push('s.editedAt IS NULL');
      if (query.timeEntryTypes.includes('edited')) typeSql.push('s.editedAt IS NOT NULL');
      qb.andWhere(typeSql.length ? `(${typeSql.join(' OR ')})` : '1 = 0');
    }

    const sortField = {
      timestamp: CAPTURED_AT_EXPR,
      keyboard: 's.keyboard',
      mouse: 's.mouse',
      project: 's.contractId',
      activity: activityExpr,
    }[query.sortBy ?? 'timestamp'] ?? CAPTURED_AT_EXPR;

    qb.orderBy(sortField, query.sortOrder ?? 'DESC');
    if (sortField !== CAPTURED_AT_EXPR) qb.addOrderBy(CAPTURED_AT_EXPR, 'DESC');
    qb.addOrderBy('s.id', 'ASC'); // stable paging when timestamps tie
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();

    // Contract names resolved by frontend via contract picker — no cross-schema query
    const contractNameMap = new Map<string, string>();

    // Resolve task names from time_tracking.contract_tasks table
    const taskIds = [...new Set(rows.map(s => s.taskId).filter(Boolean))];
    const taskNameMap = new Map<string, string>();
    if (taskIds.length > 0) {
      try {
        const taskRows: Array<{ id: string; name: string }> = await this.repo.query(
          `SELECT id, name FROM time_tracking.contract_tasks WHERE id = ANY($1)`,
          [taskIds],
        );
        for (const t of taskRows) {
          taskNameMap.set(t.id, t.name);
        }
      } catch {
        // Non-fatal
      }
    }

    const data = await Promise.all(
      rows.map(async (s) => {
        const contractName = s.contractId ? (contractNameMap.get(s.contractId) ?? null) : null;
        const taskName = s.taskId ? (taskNameMap.get(s.taskId) ?? null) : null;
        return { ...(await this.present(s)), contractName, taskName };
      }),
    );

    return { data, total, page, pageSize };
  }

  /**
   * The apps and visited URLs in the caller's screenshots (same scope as the
   * cards), for the Apps and URLs filter lists.
   */
  async findFacets(
    actor: Actor | null,
    view: 'talent' | 'client' | undefined,
  ): Promise<{ apps: Array<{ name: string; iconUrl: string | null }>; urls: string[] }> {
    const params: unknown[] = [];
    let scope = '';
    if (actor && view === 'client') {
      const owned = await this.access.clientContractIds(actor.userId);
      if (!owned.length) return { apps: [], urls: [] };
      params.push(owned);
      scope = `AND s.contract_id = ANY($1)`;
    } else if (actor) {
      params.push(actor.userId);
      scope = `AND s.user_id = $1`;
    }
    const base = `FROM time_tracking.screenshots s,
      jsonb_array_elements(COALESCE(s.apps, '[]'::jsonb)) app
      WHERE s.is_deleted = false ${scope}`;
    const apps: Array<{ name: string; icon_url: string | null }> = await this.repo.query(
      `SELECT app->>'appName' AS name, max(app->>'iconUrl') AS icon_url ${base}
         AND coalesce(app->>'appName', '') <> ''
       GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 200`,
      params,
    );
    const urls: Array<{ url: string }> = await this.repo.query(
      `SELECT app->>'url' AS url ${base}
         AND coalesce(app->>'url', '') <> ''
       GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 200`,
      params,
    );
    return {
      apps: apps.map((a) => ({ name: a.name, iconUrl: a.icon_url })),
      urls: urls.map((u) => u.url),
    };
  }

  async findDetail(id: string, actor: Actor): Promise<Screenshot & { signedUrl: string }> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    await this.access.assertCanView(actor, screenshot);
    return this.present(screenshot);
  }

  async findGrouped(groupKey: string, actor: Actor): Promise<Screenshot[]> {
    const screenshots = await this.repo.find({
      where: { groupKey, isDeleted: false },
      order: { monitorId: 'ASC' },
    });
    if (screenshots.length) await this.access.assertCanView(actor, screenshots[0]);
    return Promise.all(screenshots.map((s) => this.present(s)));
  }

  // ── Full list with filters + sort ──────────────────────────────────

  async listScreenshots(query: ScreenshotQueryDto, actor: Actor): Promise<Array<Screenshot & { signedUrl: string }>> {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('"from" must be before "to"');
    }

    const qb = this.repo.createQueryBuilder('s').where('s.isDeleted = false');

    if (query.view === 'client') {
      const owned = await this.access.clientContractIds(actor.userId);
      if (!owned.length) return [];
      qb.andWhere('s.contractId IN (:...owned)', { owned });
    } else if (!this.access.isAdmin(actor)) {
      qb.andWhere('s.userId = :userId', { userId: actor.userId });
    }

    // timeEntryType=manual → screenshots endpoint returns empty
    if (query.timeEntryType === 'manual') {
      return [];
    }

    if (query.contractId) qb.andWhere('s.contractId = :p', { p: query.contractId });
    if (query.taskId) qb.andWhere('s.taskId = :t', { t: query.taskId });

    if (query.from) qb.andWhere(`${CAPTURED_AT_EXPR} >= :f`, { f: new Date(query.from) });
    if (query.to) qb.andWhere(`${CAPTURED_AT_EXPR} <= :to`, { to: new Date(query.to) });

    if (query.apps?.length) {
      qb.andWhere(
        new Brackets((sub) => {
          query.apps!.forEach((name, idx) => {
            sub[idx === 0 ? 'where' : 'orWhere'](
              `EXISTS (SELECT 1 FROM jsonb_array_elements(s.apps) a WHERE a->>'appName' ILIKE :app${idx})`,
              { [`app${idx}`]: name },
            );
          });
        }),
      );
    }

    if (query.urlContains) {
      qb.andWhere('s.url ILIKE :urlLike', { urlLike: `%${query.urlContains}%` });
    }

    if (typeof query.activityLevel === 'number') {
      qb.andWhere('((s.keyboard + s.mouse) / 2) >= :lvl', { lvl: query.activityLevel });
    }

    const sortField = {
      timestamp: CAPTURED_AT_EXPR,
      keyboard: 's.keyboard',
      mouse: 's.mouse',
      project: 's.contractId',
      activity: '((s.keyboardPct + s.mousePct) / 2.0)',
    }[query.sortBy ?? 'timestamp'] ?? CAPTURED_AT_EXPR;

    qb.orderBy(sortField, query.sortOrder ?? 'DESC');

    const rows = await qb.getMany();

    return Promise.all(rows.map((s) => this.present(s)));
  }

  // ── Signed URL (blur-aware) ────────────────────────────────────────

  async getSignedUrl(id: string, actor: Actor): Promise<{ signedUrl: string }> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    await this.access.assertCanView(actor, screenshot);
    return { signedUrl: await this.images.imageUrl(screenshot) };
  }

  // ── Meta updates ───────────────────────────────────────────────────

  /** Owner and current contract/task, read before a move to tell whether it changed anything. */
  async ownerAndPlacement(
    id: string,
  ): Promise<{ userId: string; contractId: string | null; taskId: string | null } | null> {
    const s = await this.repo.findOneBy({ id, isDeleted: false });
    return s ? { userId: s.userId, contractId: s.contractId, taskId: s.taskId } : null;
  }

  async updateMeta(id: string, actor: Actor, dto: UpdateScreenshotMetaDto): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    this.assertOwner(actor, screenshot);

    const rules = await this.rulesFor(actor, screenshot.contractId);
    if (rules && !rules.allowReassign) {
      throw new ForbiddenException('Reassigning project/task is not allowed by admin settings');
    }
    if (dto.contractId !== undefined && dto.contractId !== screenshot.contractId) {
      await this.assertCanAssignTo(actor, dto.contractId);
    }

    const nextContractId = dto.contractId !== undefined ? dto.contractId : screenshot.contractId;
    if (dto.taskId) await this.assertTaskInContract(dto.taskId, nextContractId);

    const contractChanged = dto.contractId !== undefined && dto.contractId !== screenshot.contractId;
    const taskChanged = dto.taskId !== undefined && dto.taskId !== screenshot.taskId;
    if (dto.contractId !== undefined) screenshot.contractId = dto.contractId;
    if (dto.taskId !== undefined) screenshot.taskId = dto.taskId;
    if (contractChanged || taskChanged) screenshot.editedAt = new Date();
    return this.present(await this.repo.save(screenshot));
  }

  /**
   * A task may only be assigned under the contract it belongs to
   * (US-TT-010–012 task reset). Archived tasks are not assignable either.
   */
  private async assertTaskInContract(taskId: string, contractId: string | null): Promise<void> {
    const rows: Array<{ contract_id: string }> = await this.repo.query(
      `SELECT contract_id FROM time_tracking.contract_tasks WHERE id = $1 AND archived = false`,
      [taskId],
    );
    if (!rows.length || !contractId || rows[0].contract_id !== contractId) {
      throw new BadRequestException(
        'The selected task is not valid for this contract. Please select a different task.',
      );
    }
  }

  async batchUpdateMeta(
    actor: Actor,
    dto: BatchUpdateScreenshotDto,
  ): Promise<{ updated: number; movedOthers: Record<string, number> }> {
    const isAdmin = this.access.isAdmin(actor);
    const userId = actor.userId;

    // Every source contract's rules apply, not one caller-chosen scope.
    const sourceRows: Array<{ contract_id: string | null }> = await this.repo.query(
      `SELECT DISTINCT contract_id FROM time_tracking.screenshots
       WHERE id = ANY($1::uuid[]) AND is_deleted = false AND ($2::boolean OR user_id = $3)`,
      [dto.ids, isAdmin, userId],
    );
    for (const { contract_id } of sourceRows) {
      const rules = await this.rulesFor(actor, contract_id);
      if (rules && !rules.allowReassign) {
        throw new ForbiddenException('Reassigning project/task is not allowed by admin settings');
      }
    }
    if (dto.contractId !== undefined) await this.assertCanAssignTo(actor, dto.contractId);

    if (dto.taskId) {
      let contractId: string | null = dto.contractId ?? null;
      if (dto.contractId === undefined) {
        // Task only: every selected screenshot must already sit on the
        // task's contract.
        const rows: Array<{ contract_id: string | null }> = await this.repo.query(
          `SELECT DISTINCT contract_id FROM time_tracking.screenshots WHERE id = ANY($1::uuid[])`,
          [dto.ids],
        );
        contractId = rows.length === 1 ? rows[0].contract_id : null;
      }
      await this.assertTaskInContract(dto.taskId, contractId);
    }

    const updates: Partial<Screenshot> = {};
    if (dto.contractId !== undefined) updates.contractId = dto.contractId;
    if (dto.taskId !== undefined) updates.taskId = dto.taskId;
    if (dto.contractId !== undefined || dto.taskId !== undefined) updates.editedAt = new Date();

    const qb = this.repo.createQueryBuilder()
      .update(Screenshot)
      .set(updates)
      .whereInIds(dto.ids);

    qb.andWhere('"is_deleted" = false');
    if (!isAdmin) qb.andWhere('"user_id" = :userId', { userId });

    // Only an admin can move someone else's screenshots; those owners get a
    // reassignment alert, counted per person.
    const movedOthers: Record<string, number> = {};
    if (isAdmin && (dto.contractId !== undefined || dto.taskId !== undefined)) {
      const owners: Array<{ user_id: string; n: string }> = await this.repo.query(
        `SELECT user_id, COUNT(*) AS n FROM time_tracking.screenshots
         WHERE id = ANY($1::uuid[]) AND is_deleted = false AND user_id <> $2
         GROUP BY user_id`,
        [dto.ids, userId],
      );
      for (const o of owners) movedOthers[o.user_id] = Number(o.n);
    }

    const result = await qb.execute();
    return { updated: result.affected ?? 0, movedOthers };
  }

  // ── Blur ───────────────────────────────────────────────────────────

  async blur(id: string, actor: Actor, reason?: string): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    this.assertOwner(actor, screenshot);
    if (screenshot.isBlurred) return this.present(screenshot);

    const rules = await this.rulesFor(actor, screenshot.contractId);
    if (rules && !rules.allowBlur) throw new ForbiddenException('Blurring is not allowed by admin settings');

    // The blurred copy must exist before the record says "blurred", or the
    // viewer would get a broken image.
    await this.images.createBlurredCopy(screenshot);

    screenshot.isBlurred = true;
    screenshot.blurredAt = new Date();
    screenshot.blurReason = reason?.trim() || null;
    screenshot.reviewStatus = !rules || rules.autoApproveBlur ? 'approved' : 'pending';

    const saved = await this.repo.save(screenshot);
    this.resync(saved);
    return this.present(saved);
  }

  /**
   * The contract's client asks to see a screenshot the talent blurred. Only
   * the first request is recorded; `firstRequest` says whether to notify.
   */
  async requestAccess(
    id: string,
    actor: Actor,
  ): Promise<{ screenshot: Screenshot; firstRequest: boolean }> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    await this.access.assertClientOf(actor, screenshot.contractId);
    if (!screenshot.isBlurred) throw new BadRequestException('This screenshot is not blurred');
    if (screenshot.accessRequestedAt) {
      return { screenshot: await this.present(screenshot), firstRequest: false };
    }
    screenshot.accessRequestedAt = new Date();
    const saved = await this.repo.save(screenshot);
    return { screenshot: await this.present(saved), firstRequest: true };
  }

  async unblur(id: string, actor: Actor): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    this.assertOwner(actor, screenshot);
    screenshot.isBlurred = false;
    screenshot.blurredAt = null as any;
    screenshot.blurReason = null;
    screenshot.accessRequestedAt = null;
    screenshot.reviewStatus = null as any;
    const saved = await this.repo.save(screenshot);
    this.resync(saved);
    return this.present(saved);
  }

  // ── Moderation: Flag ───────────────────────────────────────────────

  /** The talent who took it, the contract's client, or a platform admin. */
  async flagScreenshot(id: string, actor: Actor, dto: CreateFlagDto): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    await this.access.assertCanView(actor, screenshot);

    screenshot.isFlagged = true;
    screenshot.flaggedBy = actor.userId;
    screenshot.flaggedAt = new Date();
    screenshot.reviewStatus = 'pending';
    screenshot.reviewComment = dto.reason?.trim() || screenshot.reviewComment || null;

    // Flagged time is held out of earnings until it is reviewed.
    const saved = await this.repo.save(screenshot);
    this.resync(saved);
    return this.present(saved);
  }

  /**
   * Items awaiting review: flagged screenshots, blurs that need approval, and
   * delete requests.
   * actor null = platform admin (everything); otherwise contracts where the
   * caller is the client.
   */
  async getFlaggedScreenshots(
    actor: Actor | null,
    page = 1,
    pageSize = 50,
  ): Promise<{ items: Screenshot[]; page: number; pageSize: number; total: number }> {
    const take = Math.min(200, Math.max(1, Number(pageSize)));
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.isDeleted = false')
      .andWhere(
        `(s.isFlagged = true OR (s.isBlurred = true AND s.reviewStatus = 'pending') OR s.deleteRequestedAt IS NOT NULL)`,
      );
    if (actor) {
      const owned = await this.access.clientContractIds(actor.userId);
      if (!owned.length) return { items: [], page: Number(page), pageSize: take, total: 0 };
      qb.andWhere('s.contractId IN (:...owned)', { owned });
    }
    qb.orderBy('COALESCE(s.flaggedAt, s.blurredAt, s.deleteRequestedAt)', 'DESC').addOrderBy('s.id', 'ASC').skip(skip).take(take);

    const [rows, total] = await qb.getManyAndCount();
    const items = await Promise.all(rows.map((s) => this.present(s)));
    return { items, page: Number(page), pageSize: take, total };
  }

  /** The contract's client or a platform admin. Rejecting a blur lifts it. */
  async reviewScreenshot(id: string, actor: Actor, dto: ReviewScreenshotDto): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    await this.access.assertClientOf(actor, screenshot.contractId);
    if (screenshot.reviewStatus !== 'pending') {
      throw new BadRequestException('This screenshot is not awaiting review');
    }

    screenshot.reviewStatus = dto.status;
    screenshot.reviewedBy = actor.userId;
    screenshot.reviewComment = dto.comment ?? null;
    screenshot.isFlagged = false;
    if (dto.status === 'rejected' && screenshot.isBlurred) {
      screenshot.isBlurred = false;
      screenshot.blurredAt = null as any;
    }

    const saved = await this.repo.save(screenshot);
    this.resync(saved);
    return this.present(saved);
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async getSettings(scopeId: string): Promise<AdminSettings> {
    let settings = await this.settingsRepo.findOneBy({ scopeId });
    if (!settings) {
      settings = this.settingsRepo.create({ scopeId });
      await this.settingsRepo.save(settings);
    }
    return settings;
  }
}

