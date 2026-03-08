import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { EntryType } from './autocomplete-entry.entity';

@Entity('autocomplete_rejected_entries')
@Index(['normalized', 'type'])
export class AutocompleteRejectedEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  value: string;

  @Column()
  normalized: string;

  @Column({ type: 'enum', enum: EntryType })
  type: EntryType;

  @Column()
  reason: string;

  @Column({ nullable: true })
  source: string;

  @CreateDateColumn()
  createdAt: Date;
}
