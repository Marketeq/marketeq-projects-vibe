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
  @Column({ type: 'varchar', nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', name: 'display_label', nullable: true })
  displayLabel: string | null;

  // -- Bank fields (BANK_STRIPE and BANK_MANUAL) --
  @Column({ type: 'varchar', name: 'bank_account_name', nullable: true })
  bankAccountName: string | null;

  @Column({ type: 'varchar', name: 'bank_account_last4', nullable: true })
  bankAccountLast4: string | null;

  @Column({ type: 'varchar', name: 'bank_routing_number', nullable: true })
  bankRoutingNumber: string | null;

  // AES-256-GCM ciphertext (BankEncryptionService) — needed to send real
  // Stripe ACH micro-deposits (PS-08) for BANK_MANUAL/US accounts, since
  // accountNumberHash below is a one-way SHA-256 used only for duplicate
  // detection and can never be reversed back into the account number.
  @Column({ type: 'text', name: 'bank_account_number_encrypted', nullable: true })
  bankAccountNumberEncrypted: string | null;

  @Column({ type: 'varchar', name: 'bank_iban_last4', nullable: true })
  bankIbanLast4: string | null;

  @Column({ type: 'varchar', name: 'bank_country', nullable: true })
  bankCountry: string | null;

  @Column({ type: 'varchar', name: 'bank_currency', nullable: true })
  bankCurrency: string | null;

  // Financial Connections account id (fca_...) — verification/read access only.
  @Column({ type: 'varchar', name: 'stripe_account_id', nullable: true })
  stripeAccountId: string | null;

  // external_account id (ba_...) attached to stripeConnectAccountId — the
  // actual Connect payout destination, set once attachExternalAccountFromFC
  // completes. Column predates Connect (001_initial_schema.sql) but was
  // never written until now.
  @Column({ type: 'varchar', name: 'stripe_bank_account_id', nullable: true })
  stripeExternalAccountId: string | null;

  // acct_... Connect custom account for this contractor (type: 'custom',
  // capabilities: transfers — recipient-only, no Stripe-hosted dashboard).
  @Column({ type: 'text', name: 'stripe_connect_account_id', nullable: true })
  stripeConnectAccountId: string | null;

  // Mirrors Stripe's account.payouts_enabled, kept in sync via account.updated
  // webhook. A payout must not be attempted while this is false.
  @Column({ type: 'boolean', name: 'connect_payouts_enabled', default: false })
  connectPayoutsEnabled: boolean;

  // Mirrors account.requirements.currently_due for surfacing "action needed"
  // states to the contractor; not read by any payout-gating logic.
  @Column({ type: 'jsonb', name: 'connect_requirements_due', nullable: true })
  connectRequirementsDue: string[] | null;

  // -- Wise fields --
  @Column({ type: 'varchar', name: 'wise_account_id', nullable: true })
  wiseAccountId: string | null;

  @Column({ type: 'varchar', name: 'wise_profile_id', nullable: true })
  wiseProfileId: string | null;

  @Column({ type: 'varchar', name: 'wise_recipient_id', nullable: true })
  wiseRecipientId: string | null;

  // -- Payoneer fields --
  @Column({ type: 'varchar', name: 'payoneer_payee_id', nullable: true })
  payoneerPayeeId: string | null;

  // -- Crypto fields (PS-10) --
  @Column({ name: 'crypto_provider', type: 'enum', enum: CryptoProvider, nullable: true })
  cryptoProvider: CryptoProvider | null;

  @Column({ type: 'varchar', name: 'crypto_network', nullable: true })
  cryptoNetwork: string | null;

  @Column({ type: 'varchar', name: 'crypto_currency', nullable: true })
  cryptoCurrency: string | null;

  @Column({ type: 'varchar', name: 'crypto_address', nullable: true })
  cryptoAddress: string | null;

  @Column({ name: 'wallet_address_last6', type: 'varchar', length: 6, nullable: true })
  walletAddressLast6: string | null;

  @Column({ name: 'conversion_display', type: 'varchar', length: 64, nullable: true })
  conversionDisplay: string | null;

  // -- Debit card fields (PS-13) --
  @Column({ type: 'varchar', name: 'card_last4', nullable: true })
  cardLast4: string | null;

  @Column({ type: 'varchar', name: 'card_network', nullable: true })
  cardNetwork: string | null;

  @Column({ type: 'varchar', name: 'stripe_cardholder_id', nullable: true })
  stripeCardholderId: string | null;

  @Column({ type: 'varchar', name: 'stripe_card_id', nullable: true })
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
  @Column({ name: 'oauth_access_token', type: 'varchar', nullable: true }) oauthAccessToken: string | null;
  @Column({ name: 'oauth_refresh_token', type: 'varchar', nullable: true }) oauthRefreshToken: string | null;
  @Column({ name: 'oauth_token_expires_at', type: 'timestamptz', nullable: true }) oauthTokenExpiresAt: Date | null;
  @Column({ name: 'reauth_required', default: false }) reauthRequired: boolean;
  @Column({ name: 'account_email', nullable: true, type: 'varchar' }) accountEmail: string | null;
  @Column({ name: 'account_identifier', nullable: true, type: 'varchar' }) accountIdentifier: string | null;

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