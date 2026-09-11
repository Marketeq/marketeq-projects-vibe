import { identityVerificationDataSourceOptions } from '../src/database/data-source';
import { DataSource } from 'typeorm';

async function main(): Promise<void> {
  const dataSource = new DataSource(identityVerificationDataSourceOptions);
  await dataSource.initialize();

  console.log('--- pending_verification_sessions ceiling-check query ---');
  const pendingPlan = await dataSource.query(
    `EXPLAIN SELECT COUNT(*) FROM identity_verification.pending_verification_sessions
     WHERE profile_id = $1 AND document_id = $2`,
    ['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'],
  );
  pendingPlan.forEach((row: Record<string, string>) => console.log(row['QUERY PLAN']));

  console.log('--- identity_verification_profiles Travel Mode sweep query ---');
  const sweepPlan = await dataSource.query(
    `EXPLAIN SELECT * FROM identity_verification.identity_verification_profiles
     WHERE travel_mode_active = true AND next_travel_reminder_at <= now()`,
  );
  sweepPlan.forEach((row: Record<string, string>) => console.log(row['QUERY PLAN']));

  await dataSource.destroy();
}

main();
