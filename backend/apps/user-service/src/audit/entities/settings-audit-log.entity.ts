import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * An append-only record of security-relevant changes made through Settings.
 *
 * CODE_REVIEW_SOP 09a Q75 decided this: "Password changes, two-factor changes,
 * device removals, recovery-method changes, and allow-list changes recorded
 * with who and when." Nothing was built, and the history it was meant to
 * capture was being lost every day it did not exist.
 *
 * **Per service, not shared.** `transaction_service.audit_logs` already
 * established that pattern in this codebase, and the schema-per-service model
 * means a single shared table would have to live in somebody's schema and be
 * written across a boundary. The cost is that a cross-service investigation
 * queries more than one table — which is already true today.
 *
 * **Append-only by construction.** AuditService exposes only a write. There is
 * no update or delete path, because an audit trail the application can edit is
 * not an audit trail.
 */
@Entity('settings_audit_logs')
@Index('IDX_settings_audit_subject_created', ['subjectUserId', 'createdAt'])
@Index('IDX_settings_audit_action', ['action'])
export class SettingsAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Who performed the change. Separate from the subject because these differ
   * the moment an admin acts on somebody else's account — and an audit trail
   * that cannot express that is not much use in the case it exists for.
   */
  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  /** Whose account was affected. */
  @Index()
  @Column({ name: 'subject_user_id', type: 'uuid' })
  subjectUserId!: string;

  /** Stable identifier, e.g. `allowed_ip.removed`. Never free prose. */
  @Column({ length: 100 })
  action!: string;

  /**
   * What changed. **Never the secret itself** — record that a password
   * changed, never what it changed to. For an allow-list entry the address is
   * the point of the record, so it is included deliberately.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  /** Where the change came from. Nullable — it is not always resolvable. */
  @Column({ name: 'ip_address', type: 'varchar', length: 255, nullable: true })
  ipAddress?: string | null;

  /**
   * The caller's user agent. Only meaningful once the gateway forwards the
   * header — before that every row here would have read `axios/1.14.0`.
   */
  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
