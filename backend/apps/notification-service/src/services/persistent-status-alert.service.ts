import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  PERSISTENT_STATUS_ALERT_TYPES,
  PersistentStatusAlert,
  PersistentStatusAlertType,
} from '../entities/persistent-status-alert.entity';

/**
 * One alert this occurrence replaces. A bare type replaces every active alert of that type for
 * the user (Travel Mode: an approved home-country change ends it account-wide). An object names
 * the exact occurrence (the Submitted alert of the verification session being approved), so a
 * delayed approval can never dismiss a newer, unrelated alert of the same type.
 */
export type PersistentStatusAlertSupersedes =
  | PersistentStatusAlertType
  | { type: PersistentStatusAlertType; occurrenceKey: string };

export interface PersistentStatusAlertPayload {
  recipientId: string;
  type: PersistentStatusAlertType;
  occurrenceKey: string;
  title: string;
  body: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  /**
   * What this occurrence replaces for the same user: Verified replaces the Submitted alert of
   * its own session; an approved home-country change replaces Travel Mode and the Submitted
   * alert of its own session. Applied once, in the same transaction that stores the new
   * occurrence. A bare type (the earlier form) is still accepted and stays account-wide.
   */
  supersedes?: PersistentStatusAlertSupersedes[];
}

export interface PersistentStatusAlertView {
  id: string;
  type: PersistentStatusAlertType;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

const allowedTypes = new Set<string>(PERSISTENT_STATUS_ALERT_TYPES);
const MAX_SUPERSEDES = 8;

const supersedesType = (entry: PersistentStatusAlertSupersedes) =>
  typeof entry === 'string' ? entry : entry.type;

function supersedesProblem(entries: unknown, ownType: unknown): string | null {
  if (!Array.isArray(entries) || entries.length > MAX_SUPERSEDES) {
    return 'invalid supersedes';
  }
  for (const entry of entries) {
    if (typeof entry === 'string') {
      if (!allowedTypes.has(entry) || entry === ownType)
        return 'invalid supersedes';
      continue;
    }
    if (
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      !allowedTypes.has(String((entry as any).type)) ||
      (entry as any).type === ownType ||
      typeof (entry as any).occurrenceKey !== 'string' ||
      !(entry as any).occurrenceKey.trim() ||
      (entry as any).occurrenceKey.length > 200
    ) {
      return 'invalid supersedes';
    }
  }
  return null;
}

/** An alert is a status banner, not an inbox: the dashboard shows a short stack. */
export const ACTIVE_STATUS_ALERT_LIMIT = 20;
const MAX_METADATA_BYTES = 4096;
// The link becomes an href: an in-app path or an http(s) URL, never another scheme.
const SAFE_LINK = /^(\/(?!\/)|https?:\/\/)\S*$/i;

export function persistentStatusAlertPayloadProblem(
  payload: Partial<PersistentStatusAlertPayload> | null | undefined,
): string | null {
  if (!payload || typeof payload !== 'object')
    return 'payload is not an object';
  for (const field of [
    'recipientId',
    'occurrenceKey',
    'title',
    'body',
  ] as const) {
    if (typeof payload[field] !== 'string' || !payload[field]?.trim()) {
      return `missing ${field}`;
    }
  }
  if (!allowedTypes.has(String(payload.type))) return 'invalid type';
  if (payload.supersedes != null) {
    const problem = supersedesProblem(payload.supersedes, payload.type);
    if (problem) return problem;
  }
  return null;
}

function requiredText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} is required`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new BadRequestException(`${field} is invalid`);
  }
  return normalized;
}

@Injectable()
export class PersistentStatusAlertService {
  constructor(
    @InjectRepository(PersistentStatusAlert)
    private readonly alerts: Repository<PersistentStatusAlert>,
  ) {}

  async listActive(userId: string): Promise<PersistentStatusAlertView[]> {
    const rows = await this.alerts.find({
      where: {
        userId: requiredText(userId, 'userId', 255),
        dismissedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
      take: ACTIVE_STATUS_ALERT_LIMIT,
    });
    return rows.map((row) => this.present(row));
  }

  async upsert(
    payload: PersistentStatusAlertPayload,
  ): Promise<PersistentStatusAlertView> {
    const problem = persistentStatusAlertPayloadProblem(payload);
    if (problem) throw new BadRequestException(problem);
    const recipientId = requiredText(payload?.recipientId, 'recipientId', 255);
    const occurrenceKey = requiredText(
      payload?.occurrenceKey,
      'occurrenceKey',
      200,
    );
    const title = requiredText(payload?.title, 'title', 255);
    const body = requiredText(payload?.body, 'body', 1000);
    if (!allowedTypes.has(payload?.type)) {
      throw new BadRequestException('type is invalid');
    }

    let link: string | null = null;
    if (payload.link != null) {
      if (typeof payload.link !== 'string' || payload.link.length > 2048) {
        throw new BadRequestException('link is invalid');
      }
      link = payload.link.trim() || null;
      if (link && !SAFE_LINK.test(link)) {
        throw new BadRequestException('link is invalid');
      }
    }
    if (
      payload.metadata != null &&
      (typeof payload.metadata !== 'object' || Array.isArray(payload.metadata))
    ) {
      throw new BadRequestException('metadata is invalid');
    }
    if (
      payload.metadata != null &&
      Buffer.byteLength(JSON.stringify(payload.metadata)) > MAX_METADATA_BYTES
    ) {
      throw new BadRequestException('metadata is too large');
    }

    const identity = {
      userId: recipientId,
      type: payload.type,
      occurrenceKey,
    };
    const existing = await this.alerts.findOne({ where: identity });
    if (existing) return this.present(existing);

    // Account-wide types, and exact occurrences (grouped by type; a type that is already
    // account-wide needs no list).
    const entries = payload.supersedes ?? [];
    const wholeTypes = [
      ...new Set(
        entries.filter(
          (e): e is PersistentStatusAlertType => typeof e === 'string',
        ),
      ),
    ];
    const exact = new Map<PersistentStatusAlertType, Set<string>>();
    for (const entry of entries) {
      if (
        typeof entry === 'string' ||
        wholeTypes.includes(supersedesType(entry))
      )
        continue;
      const keys = exact.get(entry.type) ?? new Set<string>();
      keys.add(entry.occurrenceKey.trim());
      exact.set(entry.type, keys);
    }
    try {
      // Stored and superseding in one transaction, only when this occurrence is new:
      // a redelivery returns early above, so it can never dismiss a later alert.
      const saved = await this.alerts.manager.transaction(async (manager) => {
        const repo = manager.getRepository(PersistentStatusAlert);
        const created = await repo.save(
          repo.create({
            ...identity,
            title,
            body,
            link,
            metadata: payload.metadata ?? null,
            dismissedAt: null,
          }),
        );
        if (wholeTypes.length) {
          await repo.update(
            {
              userId: recipientId,
              type: In(wholeTypes),
              dismissedAt: IsNull(),
            },
            { dismissedAt: new Date() },
          );
        }
        for (const [type, keys] of exact) {
          await repo.update(
            {
              userId: recipientId,
              type,
              occurrenceKey: In([...keys]),
              dismissedAt: IsNull(),
            },
            { dismissedAt: new Date() },
          );
        }
        return created;
      });
      return this.present(saved);
    } catch (error: any) {
      if (error?.code !== '23505') throw error;
      const raced = await this.alerts.findOne({ where: identity });
      if (!raced) throw error;
      return this.present(raced);
    }
  }

  async dismiss(userId: string, id: string): Promise<{ dismissed: true }> {
    const owner = requiredText(userId, 'userId', 255);
    const alertId = requiredText(id, 'id', 255);
    const row = await this.alerts.findOne({
      where: { id: alertId, userId: owner },
    });
    if (!row) throw new NotFoundException('Status alert not found');

    if (!row.dismissedAt) {
      await this.alerts.update(
        { id: alertId, userId: owner, dismissedAt: IsNull() },
        { dismissedAt: new Date() },
      );
    }
    return { dismissed: true };
  }

  private present(row: PersistentStatusAlert): PersistentStatusAlertView {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link ?? null,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt,
    };
  }
}
