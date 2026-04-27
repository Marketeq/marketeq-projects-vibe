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

  @Column({ type: 'varchar', nullable: true })
  browserName: string | null;

  @Column({ type: 'varchar', nullable: true })
  browserVersion: string | null;

  @Column({ type: 'varchar', nullable: true })
  osName: string | null;

  @Column({ type: 'varchar', nullable: true })
  osVersion: string | null;

  @Column({ type: 'varchar', nullable: true })
  deviceType: string | null;

  @Column({ default: '' })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastActiveAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
