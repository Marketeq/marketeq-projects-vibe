import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  username: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: 'EMAIL' })
  provider: string;

  @Column({ default: false })
  hasPassword: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordResetVersion: string | null;

  @Column({ nullable: true, select: false })
  twoFactorSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'text', nullable: true, select: false })
  twoFactorBackupCodes: string;

  @Column({ nullable: true })
  twoFactorMethod: string;

  @Column({ nullable: true, select: false })
  twoFactorPhone: string;

  @Column({ nullable: true, select: false })
  twoFactorOtpCode: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  twoFactorOtpExpiresAt: Date;

  @Column({ type: 'timestamp', nullable: true, select: false })
  twoFactorOtpSentAt: Date;

  /**
   * An address proven to belong to this account, usable for recovery.
   *
   * Kept separate from `pendingRecoveryEmail` so nothing can read an address
   * that has not been proven: an unverified value never lands here. Follows
   * the same split the notification email change uses.
   */
  @Column({ type: 'varchar', length: 320, nullable: true })
  recoveryEmail: string | null;

  /** The waiting room. Requested but not yet confirmed. */
  @Column({ type: 'varchar', length: 320, nullable: true })
  pendingRecoveryEmail: string | null;

  /**
   * SHA-256 of the confirmation token, never the token itself — it grants a
   * change to a recovery address, so a leaked row must not be enough to
   * complete someone else's verification. Lookup is by hash of the presented
   * token, which works because the hash is deterministic.
   */
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  recoveryEmailTokenHash: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, select: false })
  recoveryEmailExpiresAt: Date | null;
}
