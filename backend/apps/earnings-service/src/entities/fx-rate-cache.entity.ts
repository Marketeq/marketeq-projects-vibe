import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('fx_rate_cache')
@Index('ux_fx_rate_cache_pair', ['fromCurrency', 'toCurrency'], { unique: true })
@Index('idx_fx_rate_cache_expires', ['expiresAt'])
export class FxRateCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 3 })
  fromCurrency: string;

  @Column({ type: 'varchar', length: 3 })
  toCurrency: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  rate: string;

  @Column({ type: 'timestamptz' })
  fetchedAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
