import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column()
  refreshTokenHash: string;

  @Column({ default: '' })
  userAgent: string;

  @Column({ default: '' })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastActiveAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
