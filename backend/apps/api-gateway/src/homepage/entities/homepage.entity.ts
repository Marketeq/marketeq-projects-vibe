import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('homepages')
export class HomepageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  testGroup: string;

  @Column('jsonb')
  config: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
