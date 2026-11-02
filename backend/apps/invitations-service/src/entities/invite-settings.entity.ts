import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/** "Who Has Access" in the Link Settings card. */
export enum InviteAccessLevel {
  /** Any signed-in Marketeq user who opens the link can join. */
  ANYONE = 'anyone',
  /** Only addresses that already hold a pending invitation. */
  INVITED_GUESTS = 'invited_guests',
  /** Nobody but the account owner, so the link is effectively off. */
  OWNER_ONLY = 'owner_only',
}

/** "Allow Link Expiration After". `CUSTOM` reads `linkExpiresAt` instead. */
export enum LinkExpirationPreset {
  DAYS_15 = '15d',
  DAYS_30 = '30d',
  DAYS_90 = '90d',
  CUSTOM = 'custom',
}

/**
 * Account-wide invite settings — the Manage Invite Settings panel.
 *
 * One row per client account, not per invitation (R3-02/R2-11): the panel is
 * reached from the invite modal but what it changes applies to every team
 * invitation the account sends. `accountId` is the same id the invitation
 * rows carry as `teamId`, which is the client's own user id.
 *
 * Absent row means defaults. Nothing creates a row until somebody changes a
 * setting, so an account that never opens the panel costs no storage and
 * reads the same defaults forever.
 */
@Entity('invite_settings')
export class InviteSettings {
  @PrimaryColumn({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  // --- General Invites ---

  /** Records who opened the link and who joined through it, for audit. */
  @Column({ name: 'user_tracking', type: 'boolean', default: false })
  userTracking!: boolean;

  /** Lets people who cannot invite ask an Administrator to invite someone. */
  @Column({ name: 'guest_sharing', type: 'boolean', default: false })
  guestSharing!: boolean;

  // --- Link Settings ---

  /**
   * The "Who Has Access" switch itself. Off means no restriction at all, so
   * `accessLevel` is only consulted when this is on — the switch and the
   * dropdown are two separate controls in the design and a stored level has
   * to survive the switch being toggled off and back on.
   */
  @Column({ name: 'access_restricted', type: 'boolean', default: false })
  accessRestricted!: boolean;

  @Column({ name: 'access_level', type: 'text', default: InviteAccessLevel.ANYONE })
  accessLevel!: InviteAccessLevel;

  /**
   * Defaults to a live 30-day expiry rather than the panel's drawn state.
   *
   * The panel opens on "Custom" with no date filled in, which is a fine thing
   * to draw and an impossible thing to enforce. 30 days is the window R3-03
   * settles for email invitations, so an account that never touches the panel
   * gets one consistent answer for both halves of the epic.
   */
  @Column({ name: 'link_expiration_enabled', type: 'boolean', default: true })
  linkExpirationEnabled!: boolean;

  @Column({
    name: 'link_expiration_preset',
    type: 'text',
    default: LinkExpirationPreset.DAYS_30,
  })
  linkExpirationPreset!: LinkExpirationPreset;

  /** Absolute cut-off, only when the preset is CUSTOM. */
  @Column({ name: 'link_expires_at', type: 'timestamptz', nullable: true })
  linkExpiresAt?: Date | null;

  @Column({ name: 'password_enabled', type: 'boolean', default: false })
  passwordEnabled!: boolean;

  /**
   * bcrypt hash of the link password. Never returned by any route: the API
   * exposes `passwordSet` instead, so a client can render the control's state
   * without the value ever leaving this table.
   */
  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash?: string | null;

  /**
   * Whether invitees who already have a Marketeq account also get the in-app
   * notification, alongside the email.
   *
   * Defaults to true where the panel draws it off, deliberately: that
   * notification ships today, and a default that silently switched it off for
   * every existing account would be a regression dressed up as a default.
   */
  @Column({ name: 'notification_alerts', type: 'boolean', default: true })
  notificationAlerts!: boolean;

  @Column({ name: 'embed_code', type: 'boolean', default: false })
  embedCode!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
