import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'ps_currency_rates' })
// Composite unique index ensures one record per currency pair.
@Index(['fromCurrency', 'toCurrency'], { unique: true })
export class CurrencyRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ISO 4217 currency code. Always USD for the platform base currency.
  @Column({ name: 'from_currency', type: 'varchar', length: 3 })
  fromCurrency!: string;

  // ISO 4217 currency code of the target currency.
  // Examples: EUR, GBP, CAD, INR, AUD, BRL, MXN.
  @Column({ name: 'to_currency', type: 'varchar', length: 3 })
  toCurrency!: string;

  // The exchange rate: 1 unit of fromCurrency = rate units of toCurrency.
  // Example: fromCurrency=USD, toCurrency=EUR, rate=0.9231
  // means 1 USD = 0.9231 EUR.
  // Stored as decimal with 6 decimal places for precision.
  @Column({ type: 'decimal', precision: 14, scale: 6 })
  rate!: number;

  // UTC timestamp when this rate was last fetched from the FX API.
  // Used to compute cache age and show stale indicators.
  @UpdateDateColumn({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt!: Date;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
