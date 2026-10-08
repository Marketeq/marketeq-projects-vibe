import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'admin_settings', schema: 'time_tracking' })
@Index(['scopeId'], { unique: true })
export class AdminSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scope_id', type: 'text', unique: true })
  scopeId: string;

  @Column({ name: 'allow_delete', default: true })
  allowDelete: boolean;

  @Column({ name: 'allow_blur', default: true })
  allowBlur: boolean;

  @Column({ name: 'auto_approve_blur', default: false })
  autoApproveBlur: boolean;

  @Column({ name: 'allow_reassign', default: true })
  allowReassign: boolean;

  @Column({ name: 'deleted_non_billable', default: true })
  deletedNonBillable: boolean;

  @Column({ name: 'blurred_billable', default: true })
  blurredBillable: boolean;

  @Column({ name: 'require_delete_approval', default: false })
  requireDeleteApproval: boolean;

  @Column({ name: 'manual_time_enabled', default: true })
  manualTimeEnabled: boolean;

  @Column({ name: 'manual_time_require_approval', default: true })
  manualTimeRequireApproval: boolean;

  @Column({ name: 'manual_time_require_reason', default: true })
  manualTimeRequireReason: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
