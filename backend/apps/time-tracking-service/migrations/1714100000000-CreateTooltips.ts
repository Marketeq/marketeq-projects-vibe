import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTooltips1714100000000 implements MigrationInterface {
  name = 'CreateTooltips1714100000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS public.tooltips (
        id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" text NOT NULL,
        text text NOT NULL,
        CONSTRAINT ux_tooltips_key UNIQUE ("key")
      )
    `);

    // Seed default static tooltips
    await qr.query(`
      INSERT INTO public.tooltips ("key", text) VALUES
        ('timeCalculation', 'We calculate your activity using mouse and keyboard input during tracked hours. Screenshots are taken every 10 minutes to match the activity score.'),
        ('deleteReason',    'This helps us understand why screenshots are being deleted.'),
        ('noActivity',      'No mouse or keyboard activity was detected during this period.'),
        ('manualTime',      'This time was manually added and not tracked via the app.')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS public.tooltips`);
  }
}
