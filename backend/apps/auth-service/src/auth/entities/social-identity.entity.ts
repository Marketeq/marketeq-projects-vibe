import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('social_identities')
@Unique(['provider', 'providerUserId'])
export class SocialIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  provider: string;

  @Column()
  providerUserId: string;

  @Column()
  email: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (u) => u.socialIdentities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
