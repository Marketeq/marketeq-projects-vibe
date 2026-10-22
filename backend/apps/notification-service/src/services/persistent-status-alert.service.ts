import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  PERSISTENT_STATUS_ALERT_TYPES,
  PersistentStatusAlert,
  PersistentStatusAlertType,
} from '../entities/persistent-status-alert.entity';

export interface PersistentStatusAlertPayload {
  recipientId: string;
  type: PersistentStatusAlertType;
  occurrenceKey: string;
  title: string;
  body: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
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

    try {
      const saved = await this.alerts.save(
        this.alerts.create({
          ...identity,
          title,
          body,
          link,
          metadata: payload.metadata ?? null,
          dismissedAt: null,
        }),
      );
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
