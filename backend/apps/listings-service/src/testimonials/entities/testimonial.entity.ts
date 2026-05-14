import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('testimonials')
export class Testimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  payloadId: string;

  @Column()
  authorName: string;

  @Column({ nullable: true })
  authorTitle: string;

  @Column({ nullable: true })
  authorCompany: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column('text')
  quote: string;

  @Column({ type: 'int', default: 5 })
  rating: number;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ default: 'published' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
