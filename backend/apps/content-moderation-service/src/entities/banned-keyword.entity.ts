import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('banned_keywords')
export class BannedKeyword {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  keyword: string;

  @Column({ nullable: true })
  category: string;

  @CreateDateColumn()
  createdAt: Date;
}
