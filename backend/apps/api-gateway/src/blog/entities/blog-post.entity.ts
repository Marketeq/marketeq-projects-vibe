import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  payloadId: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column('jsonb', { nullable: true })
  body: any;

  @Column({ nullable: true })
  authorId: string;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
