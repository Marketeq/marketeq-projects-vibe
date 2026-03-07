import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('education')
export class Education {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (u) => u.education, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  institution: string;

  @Column()
  degree: string;

  @Column()
  field: string;

  @Column()
  startDate: string;

  @Column({ nullable: true })
  endDate: string;

  @CreateDateColumn()
  createdAt: Date;
}
