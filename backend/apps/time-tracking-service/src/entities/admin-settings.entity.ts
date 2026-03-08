import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('admin_settings')
@Index(['scopeId'], { unique: true })
export class AdminSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  scopeId: string;

  @Column({ default: true })
  allowDelete: boolean;

  @Column({ default: true })
  allowBlur: boolean;

  @Column({ default: false })
  autoApproveBlur: boolean;

  @Column({ default: true })
  allowReassign: boolean;

  @Column({ default: true })
  deletedNonBillable: boolean;

  @Column({ default: true })
  blurredBillable: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
