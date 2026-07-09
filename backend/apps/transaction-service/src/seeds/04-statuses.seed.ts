import { DataSource } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import {
  TransactionType,
  TransactionStatus,
  AmountDirection,
  PaymentMethodType,
  ContractType,
} from '../entities/enums';

const SEED_USER_ID     = '00000000-0000-0000-0000-000000000001';
const SEED_CONTRACT_ID = '00000000-0000-0000-0000-000000000010';

const allStatuses = [
  TransactionStatus.PAID,
  TransactionStatus.PROCESSING,
  TransactionStatus.SCHEDULED,
  TransactionStatus.PAYMENT_PENDING,
  TransactionStatus.FAILED,
  TransactionStatus.OVERDUE,
  TransactionStatus.SUCCEEDED,
  TransactionStatus.CREDITED,
  TransactionStatus.REFUNDED,
  TransactionStatus.PENDING,
  TransactionStatus.PARTIALLY_REFUNDED,
  TransactionStatus.CANCELLED,
  TransactionStatus.IN_DISPUTE,
];

export async function seedAllStatuses(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(Transaction);
  for (const [i, status] of allStatuses.entries()) {
    await repo.save(repo.create({
      transactionId:           'SEED-STATUS-' + String(i + 1).padStart(4, '0'),
      date:                    new Date('2025-05-01'),
      descriptionType:         TransactionType.PROJECT_PAYMENT,
      descriptionProjectName:  'Status Seed Project',
      amount:                  250.00,
      amountDirection:         AmountDirection.DEBIT,
      status,
      paymentMethodType:       PaymentMethodType.CREDIT_CARD,
      paymentMethodLabel:      'Visa',
      paymentMethodIdentifier: '4242',
      contractType:            ContractType.PROJECT,
      contractId:              SEED_CONTRACT_ID,
      userId:                  SEED_USER_ID,
      usdEquivalent:           250.00,
    }));
  }
  console.log(`  ✓ Seeded ${allStatuses.length} transaction statuses`);
}
