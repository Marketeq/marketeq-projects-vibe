import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Message } from '../../messages/entities/message.entity';

@Entity('threads')
export class Thread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { array: true })
  participantIds: string[];

  @Column({ default: false })
  isGroup: boolean;

  @Column({ nullable: true })
  groupName: string;

  @OneToMany(() => Message, (m) => m.thread, { cascade: true })
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
