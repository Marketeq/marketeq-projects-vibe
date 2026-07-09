import { Column, Entity, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type InvitationStatus = 'pending' | 'accepted' | 'canceled' | 'expired';
export type InvitationRole = 'admin' | 'editor' | 'viewer';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'team_id', type: 'uuid' })
  teamId!: string;
  
  @Column({ name: 'team_name', nullable: true })
  teamName?: string;

  @Index()
  @Column({ name: 'invited_email', type: 'text' })
  invitedEmail!: string;

  @Column({ type: 'text' })
  role!: InvitationRole;

  @Column({ type: 'enum', enumName: 'invitation_status', enum: ['pending','accepted','canceled','expired'], default: 'pending' })
  status!: InvitationStatus;

  @Index()
  @Column({ type: 'text' })
  token!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

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
}
