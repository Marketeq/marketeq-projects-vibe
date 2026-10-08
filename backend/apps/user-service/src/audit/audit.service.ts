import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsAuditLog } from './entities/settings-audit-log.entity';

/** Stable action identifiers. Never build one by string concatenation. */
export const AUDIT_ACTIONS = {
  ALLOWED_IP_ADDED: 'allowed_ip.added',
  ALLOWED_IP_BULK_ADDED: 'allowed_ip.bulk_added',
  ALLOWED_IP_UPDATED: 'allowed_ip.updated',
  ALLOWED_IP_REMOVED: 'allowed_ip.removed',
  IP_RESTRICTION_ENABLED: 'ip_restriction.enabled',
  IP_RESTRICTION_DISABLED: 'ip_restriction.disabled',

  // Q75 asked for more than the allow-list. These are the security-relevant
  // changes this service owns: the account's contact number, the public-facing
  // avatar, and the company record a client's colleagues are attached to.
  // Password and session events live in auth-service and are not recorded yet.
  PHONE_CHANGED: 'profile.phone_changed',
  AVATAR_CHANGED: 'profile.avatar_changed',
  COMPANY_CREATED: 'company.created',
  COMPANY_UPDATED: 'company.updated',
} as const;

/** Who is acting, and from where. Assembled in the controller. */
export interface AuditContext {
  actorUserId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(SettingsAuditLog)
    private readonly repo: Repository<SettingsAuditLog>,
  ) {}

  /**
   * Writes one record.
   *
   * **Deliberately never throws.** A failure to record must not fail the action
   * the person was performing — refusing to remove an allow-list entry because
   * the audit write failed would be a worse outcome than the missing record.
   * The failure is logged at `error` so it is visible.
   *
   * This is the only public method. There is no update and no delete: an audit
   * trail the application can edit is not one.
   */
  async record(
    action: string,
    subjectUserId: string,
    ctx: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      // create() + save() rather than insert(): insert()'s QueryDeepPartial
      // type does not accept a plain object for a jsonb column.
      await this.repo.save(
        this.repo.create({
          action,
          subjectUserId,
          actorUserId: ctx.actorUserId,
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent ?? null,
          metadata: metadata ?? null,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to write audit record ${action} for user ${subjectUserId}: ${message}`,
      );
    }
  }
}
