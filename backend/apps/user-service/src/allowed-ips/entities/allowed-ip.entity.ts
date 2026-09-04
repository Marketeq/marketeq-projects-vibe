import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * One entry in a Settings > IP Restrictions allow-list.
 *
 * `address` holds whatever the screen accepted, as typed: a single address
 * ("203.0.113.4") or a range ("203.0.113.0 - 203.0.113.255"). Kept as text
 * rather than split into from/to columns or Postgres `inet`/`cidr`, because the
 * screen offers both single and range entry and shows the value back exactly as
 * it was saved. Normalising here would mean the list no longer reads the way it
 * was entered.
 *
 * `companyId` is nullable and unused for now. Whether the allow-list is
 * personal or account-wide is an open product question; carrying the column
 * from the start means answering it "account-wide" is a query change and a
 * backfill rather than a second migration on a table that already holds
 * customer data. Reads are scoped by `userId` today, which is the
 * private-by-default reading of the two.
 */
@Entity('allowed_ips')
@Unique('uq_allowed_ips_user_address', ['userId', 'address'])
export class AllowedIp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @Column({ length: 255 })
  address!: string;

  // Explicit type: the `string | null` union reflects as Object, which TypeORM
  // cannot map to a Postgres type on its own.
  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
