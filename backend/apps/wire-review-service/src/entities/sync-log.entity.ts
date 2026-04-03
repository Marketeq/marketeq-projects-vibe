// src/entities/sync-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceReference: string;

  @Column({ default: false })
  verified: boolean;

  @CreateDateColumn()
  verifiedAt: Date;

  @Column('jsonb')
  rawResponse: Record<string, any>;

  @Column({ default: 'system' })
  source: 'system' | 'admin' | 'cron' | 'api' | 'webhook';

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  ipAddress?: string;
}
