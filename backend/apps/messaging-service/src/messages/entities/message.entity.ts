import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Thread } from '../../threads/entities/thread.entity';
import { Attachment } from './attachment.entity';

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'file' | 'gif';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  threadId: string;

  @ManyToOne(() => Thread, (t) => t.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'threadId' })
  thread: Thread;

  @Column('uuid')
  senderId: string;

  @Column('text', { nullable: true })
  content: string;

  @Column({ nullable: true })
  replyToMessageId: string;

  @Column({ nullable: true })
  forwardedFromId: string;

  @Column({ type: 'enum', enum: ['sent', 'delivered', 'read'], default: 'sent' })
  status: MessageStatus;

  @Column({ type: 'enum', enum: ['text', 'file', 'gif'], default: 'text' })
  messageType: MessageType;

  @Column({ default: false })
  edited: boolean;

  @Column({ default: false })
  pinned: boolean;

  @Column({ default: false })
  starred: boolean;

  @Column({ default: false })
  deleted: boolean;

  @OneToMany(() => Attachment, (a) => a.message, { cascade: true })
  attachments: Attachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
