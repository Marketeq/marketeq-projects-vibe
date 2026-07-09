import 'dotenv/config';
import { DataSource } from 'typeorm';
import { seedContracts }        from './01-contracts.seed';
import { seedPaymentMethods }   from './02-payment-methods.seed';
import { seedTransactionTypes } from './03-transactions.seed';
import { seedAllStatuses }      from './04-statuses.seed';
import { seedInvoices }         from './05-invoices.seed';
import { seedRefunds }          from './06-refunds.seed';
import { seedWireTransfers }    from './07-wire.seed';

async function run() {
  const ds = new DataSource({
    type:        'postgres',
    url:         process.env.DATABASE_URL,
    schema:      'transaction_service_test',
    entities:    ['src/entities/*.entity.ts'],
    synchronize: false,
  });

  await ds.initialize();

  console.log('Clearing test schema...');
  await ds.query('TRUNCATE TABLE transaction_service_test.transaction_detail CASCADE');
  await ds.query('TRUNCATE TABLE transaction_service_test.transactions CASCADE');
  await ds.query('TRUNCATE TABLE transaction_service_test.invoices CASCADE');
  await ds.query('TRUNCATE TABLE transaction_service_test.contracts CASCADE');
  await ds.query('TRUNCATE TABLE transaction_service_test.payment_methods CASCADE');

  console.log('Seeding...');
  await seedContracts(ds);
  await seedPaymentMethods(ds);
  await seedTransactionTypes(ds);
  await seedAllStatuses(ds);
  await seedInvoices(ds);
  await seedRefunds(ds);
  await seedWireTransfers(ds);

  console.log('Done.');
  await ds.destroy();
}

run().catch(err => { console.error(err); process.exit(1); });

// Run: npx ts-node src/seeds/run.ts
