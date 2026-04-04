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

const transactionTypes: Array<{
  type: TransactionType;
  direction: AmountDirection;
  contractType: ContractType;
  extras?: Partial<Transaction>;
}> = [
  { type: TransactionType.DAILY_INSTALLMENT,      direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.WEEKLY_INSTALLMENT,     direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.MONTHLY_INSTALLMENT,    direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.QUARTERLY_INSTALLMENT,  direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.ANNUAL_INSTALLMENT,     direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.HOURLY_PAYMENT,         direction: AmountDirection.DEBIT,  contractType: ContractType.INDIVIDUAL,
    extras: { descriptionHours: 8, descriptionContractorHandle: '@dev_seed_001' } },
  { type: TransactionType.FINAL_PAYMENT,          direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.PAID_IN_FULL,           direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.REFUND_ISSUED,          direction: AmountDirection.CREDIT, contractType: ContractType.PROJECT },
  { type: TransactionType.CREDIT_APPLIED,         direction: AmountDirection.CREDIT, contractType: ContractType.PROJECT },
  { type: TransactionType.DEPOSIT,                direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.WIRE_TRANSFER_FEE,      direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.PURCHASE,               direction: AmountDirection.DEBIT,  contractType: ContractType.SERVICE },
  { type: TransactionType.BASIC_MEMBERSHIP,       direction: AmountDirection.DEBIT,  contractType: ContractType.SERVICE },
  { type: TransactionType.PRO_MEMBERSHIP,         direction: AmountDirection.DEBIT,  contractType: ContractType.SERVICE },
  { type: TransactionType.ENTERPRISE_MEMBERSHIP,  direction: AmountDirection.DEBIT,  contractType: ContractType.SERVICE },
  { type: TransactionType.LEDGER_CORRECTION,      direction: AmountDirection.CREDIT, contractType: ContractType.PROJECT },
  { type: TransactionType.CASE,                   direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
  { type: TransactionType.PROJECT_PAYMENT,        direction: AmountDirection.DEBIT,  contractType: ContractType.PROJECT },
];

export async function seedTransactionTypes(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(Transaction);
  for (const [i, entry] of transactionTypes.entries()) {
    await repo.save(repo.create({
      transactionId:               'SEED-TYPE-' + String(i + 1).padStart(4, '0'),
      date:                        new Date('2025-04-' + String((i % 28) + 1).padStart(2, '0')),
      descriptionType:             entry.type,
      descriptionProjectName:      entry.contractType !== ContractType.INDIVIDUAL ? 'Seed Project ' + (i + 1) : null,
      descriptionContractorHandle: entry.extras?.descriptionContractorHandle ?? null,
      descriptionHours:            entry.extras?.descriptionHours ?? null,
      amount:                      100 + (i * 25),
      amountDirection:             entry.direction,
      status:                      TransactionStatus.PAID,
      paymentMethodType:           PaymentMethodType.BANK_ACH,
      paymentMethodLabel:          'Chase Bank',
      paymentMethodIdentifier:     '4553',
      contractType:                entry.contractType,
      contractId:                  SEED_CONTRACT_ID,
      userId:                      SEED_USER_ID,
      usdEquivalent:               100 + (i * 25),
      paidAt:                      new Date(),
      ...entry.extras,
    }));
  }
  console.log(`  ✓ Seeded ${transactionTypes.length} transaction types`);
}
