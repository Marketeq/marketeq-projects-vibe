import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('giftcards')
export class GiftCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column('decimal')
  amount: number;

  @Column({ default: false })
  redeemed: boolean;

  @Column({ nullable: true })
  redeemedBy: string;

  @Column({ nullable: true })
  redeemedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}