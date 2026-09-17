import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export type CheckoutDraftTask = {
  id: string;
  title: string;
  description: string | null;
  roleName: string | null;
  location: string[] | null;
  experienceLevel: string | null;
  estimatedHours: number | null;
};

export type CheckoutDraftPhase = {
  id: string;
  phaseName: string;
  order: number;
  tasks: CheckoutDraftTask[];
};

@Entity('checkout_drafts')
@Unique(['clientId', 'listingId'])
export class CheckoutDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @Column()
  listingId: string;

  @Column({ type: 'jsonb', default: [] })
  phases: CheckoutDraftPhase[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  projectCost: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
