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

// References SEED-TYPE-0001 (daily_installment) as parent
const PARENT_TXN_ID = 'SEED-TYPE-0001';

export async function seedRefunds(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(Transaction);

  // Full refund
  await repo.save(repo.create({
    transactionId:          'SEED-REFUND-0001',
    date:                   new Date('2025-06-01'),
    descriptionType:        TransactionType.REFUND_ISSUED,
    descriptionProjectName: 'Seed Project 1',
    amount:                 100.00,
    amountDirection:        AmountDirection.CREDIT,
    status:                 TransactionStatus.REFUNDED,
    paymentMethodType:      PaymentMethodType.BANK_ACH,
    paymentMethodLabel:     'Chase Bank',
    paymentMethodIdentifier:'4553',
    contractType:           ContractType.PROJECT,
    contractId:             SEED_CONTRACT_ID,
    userId:                 SEED_USER_ID,
    usdEquivalent:          100.00,
    parentTransactionId:    PARENT_TXN_ID,
    paidAt:                 new Date('2025-06-01'),
  }));

  // Partial refund
  await repo.save(repo.create({
    transactionId:          'SEED-REFUND-0002',
    date:                   new Date('2025-06-02'),
    descriptionType:        TransactionType.REFUND_ISSUED,
    descriptionProjectName: 'Seed Project 1',
    amount:                 50.00,
    amountDirection:        AmountDirection.CREDIT,
    status:                 TransactionStatus.PARTIALLY_REFUNDED,
    paymentMethodType:      PaymentMethodType.BANK_ACH,
    paymentMethodLabel:     'Chase Bank',
    paymentMethodIdentifier:'4553',
    contractType:           ContractType.PROJECT,
    contractId:             SEED_CONTRACT_ID,
    userId:                 SEED_USER_ID,
    usdEquivalent:          50.00,
    parentTransactionId:    PARENT_TXN_ID,
    paidAt:                 new Date('2025-06-02'),
  }));

  console.log('  ✓ Seeded 2 refund records');
}
