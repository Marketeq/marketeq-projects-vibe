import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BrowsingHistoryItemType {
  PROJECT = 'project',
  SERVICE = 'service',
  TEAM = 'team',
  TALENT = 'talent',
  JOB = 'job',
}

/**
 * Owns the user↔item "viewed" relationship only — never the listing/profile
 * content itself (that stays the source of truth in listings-service /
 * user-service, resolved live via the owner-target gRPC contract at read
 * time). No foreign key to another service's table: cross-schema FKs aren't
 * used anywhere in this platform (see "No Foreign Keys Across Microservices").
 */
@Index(['userId', 'lastViewedAt'])
@Index(['userId', 'itemId'], { unique: true })
@Entity('browsing_history')
export class BrowsingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ length: 100 })
  itemId: string;

  @Column({ type: 'enum', enum: BrowsingHistoryItemType })
  itemType: BrowsingHistoryItemType;

  @CreateDateColumn()
  firstViewedAt: Date;

  @Column({ type: 'timestamp' })
  lastViewedAt: Date;

  /**
   * Confirmed 2026-09-01 as an included field — nullable, not surfaced in
   * any endpoint response yet. Increment behavior (every view vs. a
   * cooldown window) is still an open question; until answered this is
   * simply incremented on every recorded view.
   */
  @Column({ type: 'int', nullable: true, default: 1 })
  viewCount: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
