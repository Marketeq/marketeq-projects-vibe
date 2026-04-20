import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('conversation_raw_keys')
export class ConversationRawKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('uuid')
  threadId: string;

  @Column('text')
  encryptedAesKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
