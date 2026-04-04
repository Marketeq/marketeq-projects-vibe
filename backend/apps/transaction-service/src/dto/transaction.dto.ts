import { Expose, Exclude, Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethodType,
  ContractType,
  BillingFrequency,
  MembershipTier,
  AmountDirection,
} from '../entities/enums';

// ── List response DTO ──────────────────────────────────────────────────
@Exclude()
export class TransactionResponseDto {

  @Expose()
  id!: string;

  @Expose()
  transactionId!: string;

  @Expose()
  @Transform(({ value }) => value?.toISOString?.().split('T')[0])
  date!: string;

  @Expose()
  descriptionType!: TransactionType;

  @Expose()
  descriptionProjectName!: string | null;

  @Expose()
  descriptionContractorHandle!: string | null;

  @Expose()
  descriptionBillingPeriod!: string | null;

  @Expose()
  invoiceNumber!: string | null;

  @Expose()
  @Transform(({ value }) => parseFloat(value))
  amount!: number;

  @Expose()
  amountDirection!: AmountDirection;

  @Expose()
  status!: TransactionStatus;

  @Expose()
  paymentMethodType!: PaymentMethodType;

  @Expose()
  paymentMethodLabel!: string;

  @Expose()
  contractType!: ContractType;
}

// ── Detail response DTO ────────────────────────────────────────────────
@Exclude()
export class TransactionDetailResponseDto {

  @Expose()
  id!: string;

  @Expose()
  transactionId!: string;

  @Expose()
  @Transform(({ value }) => value?.toISOString?.().split('T')[0])
  date!: string;

  @Expose()
  descriptionType!: TransactionType;

  @Expose()
  descriptionProjectName!: string | null;

  @Expose()
  descriptionContractorHandle!: string | null;

  @Expose()
  descriptionBillingPeriod!: string | null;

  @Expose()
  descriptionHours!: number | null;

  @Expose()
  descriptionMonths!: number | null;

  @Expose()
  invoiceNumber!: string | null;

  @Expose()
  @Transform(({ value }) => parseFloat(value))
  amount!: number;

  @Expose()
  amountDirection!: AmountDirection;

  @Expose()
  status!: TransactionStatus;

  @Expose()
  paymentMethodType!: PaymentMethodType;

  @Expose()
  paymentMethodLabel!: string;

  @Expose()
  paymentMethodIdentifier!: string;

  @Expose()
  contractType!: ContractType;

  @Expose()
  billingFrequency!: BillingFrequency | null;

  @Expose()
  membershipTier!: MembershipTier | null;

  @Expose()
  @Transform(({ value }) => value ? new Date(value).toISOString() : null)
  paidAt!: string | null;

  @Expose()
  parentTransactionId!: string | null;

  @Expose()
  detail!: {
    accountLabel: string;
    transactionTypeLabel: string;
    amount: number;
    paidAt: string | null;
    installmentLabel: string | null;
    descriptionFull: string;
    disclaimerText: string;
  };

  @Expose()
  contract!: {
    id: string;
    type: ContractType;
    clientName: string;
    clientUsername: string;
  };
}

// ── Report transaction DTO ─────────────────────────────────────────────
export enum ReportCategory {
  INCORRECT_AMOUNT    = 'incorrect_amount',
  DUPLICATE_CHARGE    = 'duplicate_charge',
  UNAUTHORIZED        = 'unauthorized',
  REFUND_NOT_RECEIVED = 'refund_not_received',
  OTHER               = 'other',
}

export class ReportTransactionDto {
  @IsEnum(ReportCategory)
  @IsNotEmpty()
  category!: ReportCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string;
}