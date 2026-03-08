import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  username: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: 'EMAIL' })
  provider: string;

  @Column({ default: false })
  hasPassword: boolean;
}
