import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_public_keys')
export class UserPublicKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('uuid')
  userId: string;

  @Column('text')
  publicKey: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
