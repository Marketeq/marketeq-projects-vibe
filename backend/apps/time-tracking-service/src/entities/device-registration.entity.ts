import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'device_registrations', schema: 'time_tracking' })
export class DeviceRegistration {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ name: 'user_id', type: 'text' }) userId!: string;
  @Column({ name: 'installation_uuid', type: 'text', unique: true }) installationUuid!: string;
  @Column({ name: 'os_name', type: 'text' }) osName!: string;
  @Column({ name: 'os_version', type: 'text' }) osVersion!: string;
  @Column({ name: 'app_version', type: 'text' }) appVersion!: string;
  @Column({ type: 'text' }) arch!: string;
  @Column({ name: 'last_seen_at', type: 'timestamptz', default: () => 'NOW()' }) lastSeenAt!: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}