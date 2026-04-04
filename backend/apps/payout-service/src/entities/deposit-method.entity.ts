// apps/payout-service/src/entities/deposit-method.entity.ts
// PS-01 §3.2 + PS-10 + PS-13: DepositMethod entity
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MethodType {
  BANK_STRIPE         = 'BANK_STRIPE',
  BANK_MANUAL         = 'BANK_MANUAL',
  PAYPAL              = 'PAYPAL',
  WISE                = 'WISE',
  PAYONEER            = 'PAYONEER',
  CRYPTO              = 'CRYPTO',
  MARKETEQ_DEBIT_CARD = 'MARKETEQ_DEBIT_CARD',
  TEQ_COIN            = 'TEQ_COIN',
}

export enum VerificationStatus {
  PENDING  = 'pending',
  VERIFIED = 'verified',
  FAILED   = 'failed',
  EXPIRED  = 'expired',
  LOCKED   = 'locked',
}

// PS-10 §2: All 9 crypto providers
export enum CryptoProvider {
  RAMP       = 'RAMP',
  TRANSAK    = 'TRANSAK',
  CRYPTO_COM = 'CRYPTO_COM',
  COINBASE   = 'COINBASE',
  METAMASK   = 'METAMASK',
  LEDGER     = 'LEDGER',
  TREZOR     = 'TREZOR',
  KRAKEN     = 'KRAKEN',
  BINANCE    = 'BINANCE',
}

@Entity('deposit_methods')
@Index(['contractorId'])
export class DepositMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  @Column({ name: 'method_type', type: 'enum', enum: MethodType })
  methodType: MethodType;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // -- Display --
  @Column({ nullable: true })
  nickname: string | null;

  @Column({ name: 'display_label', nullable: true })
  displayLabel: string | null;

  // -- Bank fields (BANK_STRIPE and BANK_MANUAL) --
  @Column({ name: 'bank_account_name', nullable: true })
  bankAccountName: string | null;

  @Column({ name: 'bank_account_last4', nullable: true })
  bankAccountLast4: string | null;

  @Column({ name: 'bank_routing_number', nullable: true })
  bankRoutingNumber: string | null;

  @Column({ name: 'bank_iban_last4', nullable: true })
  bankIbanLast4: string | null;

  @Column({ name: 'bank_country', nullable: true })
  bankCountry: string | null;

  @Column({ name: 'bank_currency', nullable: true })
  bankCurrency: string | null;

  @Column({ name: 'stripe_account_id', nullable: true })
  stripeAccountId: string | null;

  @Column({ name: 'stripe_bank_account_id', nullable: true })
  stripeBankAccountId: string | null;

  // -- PayPal fields --
  @Column({ name: 'paypal_email', nullable: true })
  paypalEmail: string | null;

  @Column({ name: 'paypal_account_id', nullable: true })
  paypalAccountId: string | null;

  // -- Wise fields --
  @Column({ name: 'wise_account_id', nullable: true })
  wiseAccountId: string | null;

  @Column({ name: 'wise_profile_id', nullable: true })
  wiseProfileId: string | null;

  @Column({ name: 'wise_recipient_id', nullable: true })
  wiseRecipientId: string | null;

  // -- Payoneer fields --
  @Column({ name: 'payoneer_payee_id', nullable: true })
  payoneerPayeeId: string | null;

  // -- Crypto fields (PS-10) --
  @Column({ name: 'crypto_provider', type: 'enum', enum: CryptoProvider, nullable: true })
  cryptoProvider: CryptoProvider | null;

  @Column({ name: 'crypto_network', nullable: true })
  cryptoNetwork: string | null;

  @Column({ name: 'crypto_currency', nullable: true })
  cryptoCurrency: string | null;

  @Column({ name: 'crypto_address', nullable: true })
  cryptoAddress: string | null;

  @Column({ name: 'wallet_address_last6', type: 'varchar', length: 6, nullable: true })
  walletAddressLast6: string | null;

  @Column({ name: 'conversion_display', type: 'varchar', length: 64, nullable: true })
  conversionDisplay: string | null;

  // -- Debit card fields (PS-13) --
  @Column({ name: 'card_last4', nullable: true })
  cardLast4: string | null;

  @Column({ name: 'card_network', nullable: true })
  cardNetwork: string | null;

  @Column({ name: 'stripe_cardholder_id', nullable: true })
  stripeCardholderId: string | null;

  @Column({ name: 'stripe_card_id', nullable: true })
  stripeCardId: string | null;

  @Column({ name: 'card_type', type: 'varchar', length: 16, nullable: true })
  cardType: string | null;

  @Column({ name: 'card_status', type: 'varchar', length: 16, default: 'inactive' })
  cardStatus: string;

  @Column({ name: 'card_balance_cap', type: 'numeric', precision: 18, scale: 8, default: 10000 })
  cardBalanceCap: string;

  @Column({ name: 'last_payout_at', type: 'timestamptz', nullable: true })
  lastPayoutAt: Date | null;

  // OAuth token fields (PS-09)
  @Column({ name: 'oauth_access_token', nullable: true }) oauthAccessToken: string | null;
  @Column({ name: 'oauth_refresh_token', nullable: true }) oauthRefreshToken: string | null;
  @Column({ name: 'oauth_token_expires_at', type: 'timestamptz', nullable: true }) oauthTokenExpiresAt: Date | null;
  @Column({ name: 'reauth_required', default: false }) reauthRequired: boolean;
  @Column({ name: 'account_email', nullable: true }) accountEmail: string | null;
  @Column({ name: 'account_identifier', nullable: true }) accountIdentifier: string | null;

  // -- Metadata --
  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt: Date | null;

  // PS-19 §3.1: SHA-256 hash of normalised account number for duplicate detection
  @Column({ name: 'account_number_hash', type: 'varchar', length: 64, nullable: true })
  accountNumberHash: string | null;
}