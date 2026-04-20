import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('thread_list_assignments')
@Unique(['listId', 'threadId'])
@Index(['threadId'])
export class ThreadListAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  listId: string;

  @Column('uuid')
  threadId: string;

  @Column('uuid')
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
