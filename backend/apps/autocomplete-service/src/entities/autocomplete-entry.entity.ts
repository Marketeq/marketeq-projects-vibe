import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum EntryStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum EntryType {
  SKILL = 'skill',
  TITLE = 'title',
  TOOL = 'tool',
  CERTIFICATION = 'certification',
  LANGUAGE = 'language',
  INDUSTRY = 'industry',
  TAG = 'tag',
  LOCATION = 'location',
}

@Entity('autocomplete_entries')
@Index(['type', 'status'])
@Index(['normalized'])
export class AutocompleteEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  value: string;

  @Column()
  normalized: string;

  @Column({ type: 'enum', enum: EntryType })
  type: EntryType;

  @Column({ type: 'enum', enum: EntryStatus, default: EntryStatus.PENDING })
  status: EntryStatus;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column({ type: 'int', default: 1 })
  frequency: number;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
