import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SocialIdentity } from './social-identity.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  hasPassword: boolean;

  @Column({ nullable: true })
  twoFactorPhoneNumber: string;

  @Column({ default: false })
  twoFactorVerified: boolean;

  @OneToMany(() => SocialIdentity, (si) => si.user, { cascade: true })
  socialIdentities: SocialIdentity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
