import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('homepage_banners')
export class HomepageBannerEntity {
  @PrimaryColumn({ default: 'singleton' })
  id: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ nullable: true })
  message: string;

  @Column({ nullable: true })
  ctaLabel: string;

  @Column({ nullable: true })
  ctaUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ default: 'info' })
  bannerType: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
