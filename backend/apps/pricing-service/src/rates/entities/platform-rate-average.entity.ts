import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn } from 'typeorm';

// Composite unique constraint enforces one record per role-region-experience-schedule.
// The daily refresh job upserts into this constraint.
@Entity({ name: 'ps_platform_rate_averages' })
@Index(['role', 'region', 'experienceLevel', 'schedule'], { unique: true })
export class PlatformRateAverage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── COMPOSITE KEY DIMENSIONS ───────────────────────────────────
  // Role title as it appears in Marketeq listings.
  // Examples: "UX Designer", "Backend Engineer", "DevOps Engineer".
  // Max 100 characters — same limit as JobListingTask.roleTitle.
  @Column({ type: 'varchar', length: 100 })
  role!: string;

  // Geographic region as defined in the platform taxonomy.
  // Must match one of the eight regions used by listings-service.
  // Values: United States | Canada | United Kingdom | Western Europe |
  //         Eastern Europe | Latin America | South Asia | Southeast Asia.
  @Column({ type: 'varchar', length: 100 })
  region!: string;

  // Experience level.
  // Values: junior | mid | senior.
  @Column({ name: 'experience_level', type: 'varchar', length: 20 })
  experienceLevel!: string;

  // Work schedule.
  // Values: full_time | part_time.
  // Custom schedules are normalised to the nearest standard schedule
  // before rate lookup — custom hours between 1-20 map to part_time,
  // custom hours above 20 map to full_time.
  @Column({ type: 'varchar', length: 20 })
  schedule!: string;

  // ── RATE DISTRIBUTION ─────────────────────────────────────────
  // All rate columns store USD cents (integer).
  // 10th percentile of the rate distribution from historical payouts.
  // Displayed as the "Low" tier in the price guide hover modal.
  @Column({ name: 'hourly_rate_low_usd_cents', type: 'int' })
  hourlyRateLowUsdCents!: number;

  // 50th percentile (median). Used for budget calculator default.
  // Displayed as the "Median" tier in the price guide hover modal.
  @Column({ name: 'hourly_rate_median_usd_cents', type: 'int' })
  hourlyRateMedianUsdCents!: number;

  // 90th percentile. Displayed as the "High" tier in the price guide hover modal.
  @Column({ name: 'hourly_rate_high_usd_cents', type: 'int' })
  hourlyRateHighUsdCents!: number;

  // ── DATA QUALITY ───────────────────────────────────────────────
  // Number of completed transactions used to compute this record.
  // Used to assess statistical reliability. Low sample sizes
  // (< 5) indicate the rate may not be representative.
  @Column({ name: 'sample_size', type: 'int', default: 0 })
  sampleSize!: number;

  // UTC timestamp of the last successful refresh of this record.
  // Compared against RATE_STALE_THRESHOLD_HOURS to determine
  // whether to return is_stale: true in the API response.
  @UpdateDateColumn({ name: 'last_updated', type: 'timestamptz' })
  lastUpdated!: Date;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
