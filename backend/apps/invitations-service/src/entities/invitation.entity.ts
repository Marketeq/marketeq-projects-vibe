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
  id: string;

  @Index()
  @Column('uuid')
  teamId: string;

  @Index()
  @Column('text')
  invitedEmail: string;

  @Column({ type: 'text' })
  role: InvitationRole;

  @Column({ type: 'text', default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Index()
  @Column('text')
  token: string;

  @Column('timestamptz')
  expiresAt: Date;

  @Column('uuid')
  createdByUserId: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'int', default: 0 })
  resentCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  canceledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
