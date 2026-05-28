import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('project_static_contents')
export class ProjectStaticContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Stable key for selection (e.g. "default")
  @Column({ unique: true })
  slug: string;

  @Column()
  heading: string;

  @Column('jsonb')
  guaranteeItems: { icon: string; title: string; description: string }[];

  @Column('jsonb')
  highlightedNotice: { icon: string; description: string };

  @Column('jsonb')
  policy: { prefixText: string; linkLabel: string; linkHref: string };

  @Column('jsonb')
  howItWorks: { steps: { stepNumber: string; title: string; description: string; icon?: string }[] };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
