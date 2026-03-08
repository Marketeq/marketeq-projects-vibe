import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('portfolio_items')
export class PortfolioItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() title: string;
  @Column('text', { nullable: true }) description: string;
  @Column({ nullable: true }) coverImageUrl: string;
  @Column('text', { array: true, default: [] }) mediaUrls: string[];
  @Column('text', { array: true, default: [] }) tags: string[];
  @Column({ default: 0 }) sortOrder: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
