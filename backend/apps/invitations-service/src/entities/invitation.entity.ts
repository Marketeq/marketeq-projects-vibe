import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

export enum InvitationRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

@Entity('invitations')
@Index(['teamId', 'invitedEmail', 'status'], { unique: false })
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'team_id', type: 'uuid' })
  teamId!: string;

  @Column({ name: 'team_name', nullable: true })
  teamName?: string;

  /** Company (user-service) this invitation grants membership to. Nullable
   * because pre-existing team-scoped invitations never had a company. */
  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string;

  @Index()
  @Column({ name: 'invited_email', type: 'text' })
  invitedEmail!: string;

  @Column({ type: 'text' })
  role!: InvitationRole;

  @Column({ type: 'text', nullable: true })
  note?: string;

  /** The 30 granular permission-role ids selected in the invite dialog
   * (select-permissions-panel.tsx), carried through to acceptance so they
   * land on the resulting company_users row. */
  @Column({ type: 'text', array: true, default: '{}' })
  permissions!: string[];

  @Column({ type: 'enum', enumName: 'invitation_status', enum: ['pending', 'accepted', 'canceled', 'expired'], default: 'pending' })
  status!: InvitationStatus;

  /** Legacy plaintext token. No longer written for new invitations, kept
   * nullable and readable only so invitations created before the
   * token_hash migration keep accepting. */
  @Index()
  @Column({ type: 'text', nullable: true })
  token?: string;

  /** bcrypt hash of the per-invitation secret half of the accept token
   * (`<id>.<secret>`). Nothing derived from the secret is stored in
   * plaintext. */
  @Column({ name: 'token_hash', type: 'varchar', length: 255, nullable: true })
  tokenHash?: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'created_by_email', type: 'text', nullable: true })
  createdByEmail?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt?: Date;

  @Column({ name: 'resent_count', type: 'int', default: 0 })
  resentCount!: number;

  /** User ID of the person who accepted this invitation (stored on accept). */
  @Column({ name: 'invitee_user_id', type: 'uuid', nullable: true })
  inviteeUserId?: string;
}
