import { User } from '../user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('conversation_threads')
@Index(['clientUserId', 'talentUserId'], { unique: true })
export class ConversationThread {
  @PrimaryGeneratedColumn('uuid')
  threadId: string;

  @Column('uuid')
  clientUserId: string;

  @Column('uuid')
  talentUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientUserId' })
  client: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'talentUserId' })
  talent: User;

  @OneToMany(() => Message, (message) => message.thread)
  messages: Message[];
}
