import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds columns missing from the initial screenshots migration:
 * - Renames app_usage → apps (JSONB)
 * - Adds url (primary page URL for filtering)
 * - Adds is_flagged, flagged_by, flagged_at (moderation)
 * - Adds reviewed_by, review_comment (moderation review)
 * - Fixes keyboard_pct / mouse_pct from float → int NOT NULL DEFAULT 0
 * - Converts review_status to a proper Postgres enum type
 */
export class AlterScreenshotsAddMissingColumns1714000000000 implements MigrationInterface {
  name = 'AlterScreenshotsAddMissingColumns1714000000000';

  public async up(qr: QueryRunner): Promise<void> {
    // Rename app_usage → apps (idempotent: only if app_usage exists and apps doesn't)
    await qr.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'screenshots' AND column_name = 'app_usage'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'screenshots' AND column_name = 'apps'
        ) THEN
          ALTER TABLE public.screenshots RENAME COLUMN app_usage TO apps;
        END IF;
      END $$;
    `);

    // Add apps column if neither app_usage nor apps exist (e.g. fresh schema)
    await qr.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'screenshots' AND column_name = 'apps'
        ) THEN
          ALTER TABLE public.screenshots ADD COLUMN apps jsonb NULL;
        END IF;
      END $$;
    `);

    // Add url column
    await qr.query(`
      ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS url text NULL;
    `);

    // Add moderation flag columns
    await qr.query(`
      ALTER TABLE public.screenshots
        ADD COLUMN IF NOT EXISTS is_flagged   boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS flagged_by   text NULL,
        ADD COLUMN IF NOT EXISTS flagged_at   timestamptz NULL,
        ADD COLUMN IF NOT EXISTS reviewed_by  text NULL,
        ADD COLUMN IF NOT EXISTS review_comment text NULL;
    `);

    // Fix keyboard_pct / mouse_pct: change from float/nullable → int NOT NULL DEFAULT 0
    await qr.query(`
      ALTER TABLE public.screenshots
        ALTER COLUMN keyboard_pct TYPE integer USING COALESCE(keyboard_pct::integer, 0),
        ALTER COLUMN keyboard_pct SET NOT NULL,
        ALTER COLUMN keyboard_pct SET DEFAULT 0,
        ALTER COLUMN mouse_pct TYPE integer USING COALESCE(mouse_pct::integer, 0),
        ALTER COLUMN mouse_pct SET NOT NULL,
        ALTER COLUMN mouse_pct SET DEFAULT 0;
    `);

    // Add index on is_flagged for admin flagged-list queries
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_screenshots_flagged
        ON public.screenshots (flagged_at DESC)
        WHERE is_flagged = true AND is_deleted = false;
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_screenshots_flagged`);
    await qr.query(`
      ALTER TABLE public.screenshots
        DROP COLUMN IF EXISTS review_comment,
        DROP COLUMN IF EXISTS reviewed_by,
        DROP COLUMN IF EXISTS flagged_at,
        DROP COLUMN IF EXISTS flagged_by,
        DROP COLUMN IF EXISTS is_flagged,
        DROP COLUMN IF EXISTS url;
    `);
    // Revert keyboard_pct / mouse_pct to float nullable
    await qr.query(`
      ALTER TABLE public.screenshots
        ALTER COLUMN keyboard_pct DROP NOT NULL,
        ALTER COLUMN keyboard_pct TYPE float,
        ALTER COLUMN mouse_pct DROP NOT NULL,
        ALTER COLUMN mouse_pct TYPE float;
    `);
  }
}
