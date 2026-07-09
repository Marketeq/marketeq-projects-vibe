// apps/offer-service/migrations/1706601600000-InitialSchema.ts
// OS-17: Migration 001 — Creates offer_service schema and all four tables.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1706601600000 implements MigrationInterface {
  name = 'InitialSchema1706601600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS offer_service`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION offer_service.set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS offer_service.offers (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL,
        talent_id UUID NOT NULL,
        job_listing_id UUID NOT NULL,
        contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('PROJECT','SERVICE','TEAM','CONTRACT')),
        contract_title VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING','ACCEPTED','DECLINED','WITHDRAWN','EXPIRED','COUNTERED')),
        rate INTEGER NOT NULL CHECK (rate >= 1 AND rate <= 9999),
        currency_code CHAR(3) NOT NULL,
        duration_months INTEGER NOT NULL CHECK (duration_months >= 1 AND duration_months <= 60),
        work_schedule JSONB NOT NULL,
        start_date DATE NOT NULL,
        message TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        warning_sent_at TIMESTAMPTZ,
        accepted_at TIMESTAMPTZ,
        declined_at TIMESTAMPTZ,
        declined_reason TEXT,
        declined_chip VARCHAR(30),
        withdrawn_at TIMESTAMPTZ,
        withdrawal_message TEXT,
        expired_at TIMESTAMPTZ,
        original_offer_id UUID REFERENCES offer_service.offers(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_offers PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TRIGGER offers_updated_at
        BEFORE UPDATE ON offer_service.offers
        FOR EACH ROW EXECUTE FUNCTION offer_service.set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS offer_service.counter_offers (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        offer_id UUID NOT NULL REFERENCES offer_service.offers(id) ON DELETE RESTRICT,
        submitted_by VARCHAR(10) NOT NULL CHECK (submitted_by IN ('CLIENT','TALENT')),
        submitted_by_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING','ACCEPTED','DECLINED','WITHDRAWN','EXPIRED','SUPERSEDED')),
        rate INTEGER NOT NULL CHECK (rate >= 1 AND rate <= 9999),
        currency_code CHAR(3) NOT NULL,
        duration_months INTEGER NOT NULL CHECK (duration_months >= 1 AND duration_months <= 60),
        work_schedule JSONB NOT NULL,
        start_date DATE NOT NULL,
        message TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        warning_sent_at TIMESTAMPTZ,
        accepted_at TIMESTAMPTZ,
        declined_at TIMESTAMPTZ,
        withdrawn_at TIMESTAMPTZ,
        withdrawal_message TEXT,
        expired_at TIMESTAMPTZ,
        superseded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_counter_offers PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TRIGGER counter_offers_updated_at
        BEFORE UPDATE ON offer_service.counter_offers
        FOR EACH ROW EXECUTE FUNCTION offer_service.set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS offer_service.offer_history (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        offer_id UUID NOT NULL REFERENCES offer_service.offers(id) ON DELETE RESTRICT,
        counter_offer_id UUID REFERENCES offer_service.counter_offers(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        actor VARCHAR(10) NOT NULL CHECK (actor IN ('CLIENT','TALENT','SYSTEM')),
        actor_id UUID,
        terms JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_offer_history PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS offer_service.outbox (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        aggregate_id UUID NOT NULL,
        aggregate_type VARCHAR(30) NOT NULL DEFAULT 'offer',
        event_type VARCHAR(50) NOT NULL,
        exchange VARCHAR(100) NOT NULL DEFAULT 'marketeq.offers',
        routing_key VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING','PROCESSING','PUBLISHED','FAILED')),
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_outbox PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TRIGGER outbox_updated_at
        BEFORE UPDATE ON offer_service.outbox
        FOR EACH ROW EXECUTE FUNCTION offer_service.set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS offer_service.outbox CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS offer_service.offer_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS offer_service.counter_offers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS offer_service.offers CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS offer_service.set_updated_at() CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS offer_service CASCADE`);
  }
}