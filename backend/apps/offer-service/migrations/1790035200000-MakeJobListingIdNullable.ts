// apps/offer-service/migrations/1790035200000-MakeJobListingIdNullable.ts
// BTB-364/D1: "Hire Me" offers are sent directly from a talent's profile
// (frontend/components/hire-me-button.tsx) with no job listing in context
// at all — HireMeButton has no listing/project prop anywhere. offers.job_listing_id
// is NOT NULL at the DB level (see 1706601600000-InitialSchema.ts), which makes
// every listing-less offer create fail before it reaches the service layer's
// own validation. This migration only relaxes that constraint; the matching
// code-level changes (DTO, entity, response/event payload types, every
// mapRawToOffer-pattern reader) are in create-offer.dto.ts, offer.entity.ts,
// offer-event-payloads.ts, offer-response.interface.ts, offers.service.ts,
// counter-offers.service.ts, warning.processor.ts, and expiry.processor.ts.
//
// NOT run by me against the shared cloud/staging DB at 72.61.77.231 — see
// the PR description for how this reaches staging.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeJobListingIdNullable1790035200000 implements MigrationInterface {
  name = 'MakeJobListingIdNullable1790035200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE offer_service.offers
        ALTER COLUMN job_listing_id DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only safe to restore NOT NULL if no listing-less offer has been
    // created since up() ran — otherwise this would fail loudly (or worse,
    // silently require a backfill decision this migration has no business
    // making). Check first; no-op with a loud notice if any NULL rows exist.
    const [{ count }] = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM offer_service.offers
      WHERE job_listing_id IS NULL
    `);

    if (count > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[MakeJobListingIdNullable1790035200000.down] Skipped restoring NOT NULL: ` +
          `${count} offer(s) have a NULL job_listing_id (listing-less "Hire Me" offers). ` +
          `Restoring the constraint would require deciding what to do with those rows first ` +
          `(backfill a placeholder listing, or reject the rollback) — not this migration's call.`,
      );
      return;
    }

    await queryRunner.query(`
      ALTER TABLE offer_service.offers
        ALTER COLUMN job_listing_id SET NOT NULL
    `);
  }
}
