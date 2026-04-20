import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('conversation_keys')
@Unique(['threadId', 'userId'])
export class ConversationKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  threadId: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column('text')
  encryptedKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
