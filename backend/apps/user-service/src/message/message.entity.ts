import { User } from '../user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConversationThread } from './conversation-thread.entity';

@Entity('messages')
@Index(['threadId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  threadId: string;

  @Column('uuid')
  clientUserId: string;

  @Column('uuid')
  talentUserId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ConversationThread, (thread) => thread.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'threadId', referencedColumnName: 'threadId' })
  thread: ConversationThread;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientUserId' })
  client: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'talentUserId' })
  talent: User;
}
