export enum TransactionType {
    DAILY_INSTALLMENT     = 'daily_installment',
    WEEKLY_INSTALLMENT    = 'weekly_installment',
    MONTHLY_INSTALLMENT   = 'monthly_installment',
    QUARTERLY_INSTALLMENT = 'quarterly_installment',
    ANNUAL_INSTALLMENT    = 'annual_installment',
    HOURLY_PAYMENT        = 'hourly_payment',
    FINAL_PAYMENT         = 'final_payment',
    PAID_IN_FULL          = 'paid_in_full',
    REFUND_ISSUED         = 'refund_issued',
    CREDIT_APPLIED        = 'credit_applied',
    DEPOSIT               = 'deposit',
    WIRE_TRANSFER_FEE     = 'wire_transfer_fee',
    PURCHASE              = 'purchase',
    BASIC_MEMBERSHIP      = 'basic_membership',
    PRO_MEMBERSHIP        = 'pro_membership',
    ENTERPRISE_MEMBERSHIP = 'enterprise_membership',
    LEDGER_CORRECTION     = 'ledger_correction',
    CASE                  = 'case',
    PROJECT_PAYMENT       = 'project_payment',
  }
  
  export enum TransactionStatus {
    PAID               = 'paid',
    PROCESSING         = 'processing',
    SCHEDULED          = 'scheduled',
    PAYMENT_PENDING    = 'payment_pending',
    FAILED             = 'failed',
    OVERDUE            = 'overdue',
    SUCCEEDED          = 'succeeded',
    CREDITED           = 'credited',
    REFUNDED           = 'refunded',
    PENDING            = 'pending',
    PARTIALLY_REFUNDED = 'partially_refunded',
    CANCELLED          = 'cancelled',
    IN_DISPUTE         = 'in_dispute',
  }
  
  export enum InvoiceStatus {
    PAID            = 'paid',
    PROCESSING      = 'processing',
    SCHEDULED       = 'scheduled',
    PAYMENT_PENDING = 'payment_pending',
    FAILED          = 'failed',
    OVERDUE         = 'overdue',
    PARTIALLY_PAID  = 'partially_paid',
    CANCELLED       = 'cancelled',    // ← ADDED
  }
  
  export enum PaymentMethodType {
    BANK_ACH    = 'bank_ach',
    CREDIT_CARD = 'credit_card',
    KLARNA      = 'klarna',
    GOOGLE_PAY  = 'google_pay',
    APPLE_PAY   = 'apple_pay',
  }
  
  export enum ContractType {
    PROJECT    = 'project',
    SERVICE    = 'service',
    TEAM       = 'team',
    INDIVIDUAL = 'individual',
  }
  
  export enum BillingFrequency {
    DAILY     = 'daily',
    WEEKLY    = 'weekly',
    BIWEEKLY  = 'biweekly',
    MONTHLY   = 'monthly',
    QUARTERLY = 'quarterly',
    ANNUAL    = 'annual',
  }
  
  export enum MembershipTier {
    BASIC      = 'basic',
    PRO        = 'pro',
    ENTERPRISE = 'enterprise',
    AGENCY     = 'agency',
  }
  
  export enum AmountDirection {
    DEBIT  = 'debit',
    CREDIT = 'credit',
  }
  
  // Statuses after which a transaction record becomes immutable
  export const IMMUTABLE_STATUSES: TransactionStatus[] = [
    TransactionStatus.PAID,
    TransactionStatus.SUCCEEDED,
    TransactionStatus.REFUNDED,
  ];