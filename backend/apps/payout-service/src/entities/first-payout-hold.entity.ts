// apps/payout-service/src/entities/first-payout-hold.entity.ts
// PS-15 §5: First-payout 5-business-day hold record
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('first_payout_holds')
@Index(['contractorId'], { unique: true })
export class FirstPayoutHold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contractor_id', unique: true })
  contractorId: string;

  @Column({ name: 'applied_at', type: 'timestamptz' })
  appliedAt: Date;

  @Column({ name: 'releases_at', type: 'timestamptz' })
  releasesAt: Date;

  @Column({ default: false })
  released: boolean;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ name: 'released_by', type: 'varchar', length: 64, nullable: true })
  releasedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}