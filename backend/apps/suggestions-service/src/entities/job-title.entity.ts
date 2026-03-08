import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('suggestion_job_titles')
export class JobTitle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  goal: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
