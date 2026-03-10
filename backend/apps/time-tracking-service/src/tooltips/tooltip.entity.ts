import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tooltips', schema: 'public' })
export class Tooltip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Unique key used by the frontend to look up tooltip text, e.g. "timeCalculation" */
  @Column({ type: 'text', unique: true })
  key!: string;

  @Column({ type: 'text' })
  text!: string;
}
