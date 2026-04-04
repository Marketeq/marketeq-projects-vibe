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

export async function seedWireTransfers(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(Transaction);

  // Wire transfer payment row
  await repo.save(repo.create({
    transactionId:          'SEED-WIRE-0001',
    date:                   new Date('2025-06-10'),
    descriptionType:        TransactionType.PROJECT_PAYMENT,
    descriptionProjectName: 'Wire Seed Project',
    amount:                 2000.00,
    amountDirection:        AmountDirection.DEBIT,
    status:                 TransactionStatus.PAID,
    paymentMethodType:      PaymentMethodType.BANK_ACH,
    paymentMethodLabel:     'Wire Transfer',
    paymentMethodIdentifier:'WIRE',
    contractType:           ContractType.PROJECT,
    contractId:             SEED_CONTRACT_ID,
    userId:                 SEED_USER_ID,
    usdEquivalent:          2000.00,
    paidAt:                 new Date('2025-06-10'),
  }));

  // Wire transfer fee row -- parentTransactionId points to SEED-WIRE-0001
  await repo.save(repo.create({
    transactionId:          'SEED-WIRE-0002',
    date:                   new Date('2025-06-10'),
    descriptionType:        TransactionType.WIRE_TRANSFER_FEE,
    descriptionProjectName: 'Wire Seed Project',
    amount:                 25.00,
    amountDirection:        AmountDirection.DEBIT,
    status:                 TransactionStatus.PAID,
    paymentMethodType:      PaymentMethodType.BANK_ACH,
    paymentMethodLabel:     'Wire Transfer',
    paymentMethodIdentifier:'WIRE',
    contractType:           ContractType.PROJECT,
    contractId:             SEED_CONTRACT_ID,
    userId:                 SEED_USER_ID,
    usdEquivalent:          25.00,
    parentTransactionId:    'SEED-WIRE-0001',
    paidAt:                 new Date('2025-06-10'),
  }));

  console.log('  ✓ Seeded 1 wire transfer + 1 wire fee record');
}
