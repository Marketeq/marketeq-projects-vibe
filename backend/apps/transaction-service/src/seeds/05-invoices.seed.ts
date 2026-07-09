import { DataSource } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceStatus } from '../entities/enums';

const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

const invoices = [
  {
    id:              '00000000-0000-0000-0000-000000000200',
    status:          InvoiceStatus.PAID,
    amount:          500.00,
    dateIssued:      new Date('2025-01-15'),
    dueDate:         new Date('2025-02-15'),
    stripeInvoiceId: 'in_seed_001',
  },
  {
    id:              '00000000-0000-0000-0000-000000000201',
    status:          InvoiceStatus.PAYMENT_PENDING,
    amount:          750.00,
    dateIssued:      new Date('2025-02-01'),
    dueDate:         new Date('2025-03-01'),
    stripeInvoiceId: 'in_seed_002',
  },
  {
    id:              '00000000-0000-0000-0000-000000000202',
    status:          InvoiceStatus.OVERDUE,
    amount:          300.00,
    dateIssued:      new Date('2025-01-01'),
    dueDate:         new Date('2025-01-31'),
    stripeInvoiceId: null,
  },
  {
    id:              '00000000-0000-0000-0000-000000000203',
    status:          InvoiceStatus.FAILED,
    amount:          200.00,
    dateIssued:      new Date('2025-03-01'),
    dueDate:         new Date('2025-03-31'),
    stripeInvoiceId: null,
  },
  {
    id:              '00000000-0000-0000-0000-000000000204',
    status:          InvoiceStatus.PARTIALLY_PAID,
    amount:          450.00,
    dateIssued:      new Date('2025-02-15'),
    dueDate:         new Date('2025-03-15'),
    stripeInvoiceId: 'in_seed_005',
  },
  {
    id:              '00000000-0000-0000-0000-000000000205',
    status:          InvoiceStatus.PROCESSING,
    amount:          600.00,
    dateIssued:      new Date('2025-03-01'),
    dueDate:         new Date('2025-04-01'),
    stripeInvoiceId: 'in_seed_006',
  },
  {
    id:              '00000000-0000-0000-0000-000000000206',
    status:          InvoiceStatus.SCHEDULED,
    amount:          100.00,
    dateIssued:      new Date('2025-04-01'),
    dueDate:         new Date('2025-05-01'),
    stripeInvoiceId: null,
  },
  // Past-due fixture for overdue cron test (TC-J01, TC-J05)
  {
    id:              '00000000-0000-0000-0000-000000000207',
    status:          InvoiceStatus.PAYMENT_PENDING,
    amount:          999.00,
    dateIssued:      new Date('2025-01-01'),
    dueDate:         new Date('2025-01-02'),
    stripeInvoiceId: null,
  },
];

export async function seedInvoices(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(Invoice);
  for (const invoice of invoices) {
    await repo.save(repo.create({ ...invoice, userId: SEED_USER_ID }));
  }
  console.log(`  ✓ Seeded ${invoices.length} invoices`);
}
