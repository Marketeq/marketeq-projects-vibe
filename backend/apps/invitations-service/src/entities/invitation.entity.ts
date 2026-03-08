import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() inviterId: string;
  @Column() inviteeEmail: string;
  @Column({ nullable: true }) inviteeId: string;
  @Column({ unique: true }) token: string;
  @Column({ default: 'pending' }) status: string; // pending | accepted | expired
  @Column({ nullable: true }) expiresAt: Date;
  @CreateDateColumn() createdAt: Date;
}
