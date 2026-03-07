import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Message } from './message.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  messageId: string;

  @ManyToOne(() => Message, (m) => m.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @Column()
  fileUrl: string;

  @Column()
  fileType: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  fileName: string;

  @CreateDateColumn()
  createdAt: Date;
}
