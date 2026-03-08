import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export enum AuditAction {
  VIEW = 'view',
  EXPORT = 'export',
  PROBLEM_REPORT = 'problem_report',
  SHARE = 'share',
}

@Entity({ schema: 'transaction_service', name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'resource_type', type: 'varchar', length: 50 })
  resourceType: string

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string | null

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
