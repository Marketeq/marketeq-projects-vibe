import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('thread_user_state')
@Unique(['threadId', 'userId'])
@Index(['userId'])
export class ThreadUserState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  threadId: string;

  @Column('uuid')
  userId: string;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isStarred: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: false })
  isSpam: boolean;

  @Column({ default: false })
  isMuted: boolean;

  @Column({ default: false })
  isTrashed: boolean;

  @Column({ default: false })
  markedUnread: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
