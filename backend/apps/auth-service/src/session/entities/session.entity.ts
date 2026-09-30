import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column()
  refreshTokenHash: string;

  @Column({ default: '' })
  userAgent: string;

  @Column('varchar', { nullable: true })
  browserName?: string;

  @Column('varchar', { nullable: true })
  browserVersion?: string;

  @Column('varchar', { nullable: true })
  osName?: string;

  @Column('varchar', { nullable: true })
  osVersion?: string;

  @Column('varchar', { nullable: true })
  deviceType?: string;

  @Column({ default: '' })
  ipAddress: string;

  @Column('varchar', { nullable: true })
  csrfToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastActiveAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
