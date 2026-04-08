export type BankAccountFormValues = {
  accountType: string;
  accountHolderName: string;
  bankRoutingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  saveDefaultPaymentMethod?: boolean;
};

export type BillingAddressFormValues = {
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  phoneNumber?: string;
  cardNumber?: string;
  cardName?: string;
  expirationDate?: string;
  cvvOrCvc?: string;
  saveDefaultPaymentMethod?: boolean;
  billingAddresses?: BillingAddressFormValues[];
};

export type PaymentMethods = Array<
  | {
      method: "CREDIT_DEBIT_CARD"
      data: BillingAddressFormValues & {
        billingAddresses?: BillingAddressFormValues[]
      }
    }
  | { method: "BANK_ACCOUNT"; data: BankAccountFormValues }
  | {
      method: "GOOGLE_PAY"
    }
  | {
      method: "APPLE_PAY"
    }
>

export type  FormValues = {
  [key: string]: any;
}


export type CurrencyCode = "USD"; // Extend later if needed

export interface Money {
  /**
   * Must match whatever the backend uses (e.g. cents as integer).
   * If backend uses "amountInCents", rename this field to match.
   */
  amount: number;
  currency: CurrencyCode;
}

export interface PriceBreakdown {
  subtotal: Money;          // project or contract base price
  discounts: Money;         // total discounts (gift cards, promos, etc.)
  fees: Money;              // platform or processing fees (if exposed to UI)
  tax: Money;               // total tax
  total: Money;             // final amount the client pays
}


// =========================
// Installment plans
// =========================

export type InstallmentFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export interface InstallmentScheduleItem {
  index: number;            // 1-based installment index
  billedAt: string;         // ISO 8601 date string
  amount: Money;
  isDeposit: boolean;
  isFinalPayment: boolean;
}

export interface InstallmentPlan {
  frequency: InstallmentFrequency;
  totalInstallments: number;    // total # of payments
  depositInstallments: number;  // e.g. 1 for weekly, 2 for biweekly, 1 for monthly
  startDate: string;            // ISO 8601
  endDate: string;              // ISO 8601
  schedule: InstallmentScheduleItem[];
}


// =========================
// Payment methods
// =========================

export type PaymentMethodType =
  | "CARD"        // Credit/debit via Stripe
  | "ACH"         // Bank via Stripe Link/manual entry
  | "APPLE_PAY"
  | "GOOGLE_PAY"
  | "KLARNA"
  | "WIRE";       // Manual wire transfer checkout option

export interface SavedPaymentMethodSummary {
  id: string;                   // internal payment method id
  type: PaymentMethodType;
  brand?: string;               // e.g. "Visa"
  last4?: string;               // last 4 digits
  expiresAt?: string;           // ISO 8601 for cards
  label?: string;               // "Personal Visa", "Company ACH", etc.
}


// =========================
// Project / Contract summary
// =========================

export interface ProjectSummary {
  projectId: string;
  projectTitle: string;
  clientName: string;
}

export interface ContractSummary {
  contractId: string;
  contractTitle: string;
  talentDisplayName: string;
}


// =========================
// Credits: gift cards & balance
// =========================

export interface GiftCardSummary {
  enabled: boolean;        // whether gift cards are applied in this checkout
  code?: string;           // visible code if relevant
  appliedAmount?: Money;   // amount being used in this checkout
  remainingBalance?: Money;
}

export interface BalanceSummary {
  enabled: boolean;        // whether account balance is applied
  appliedAmount?: Money;
  remainingBalance?: Money;
}


// =========================
// Checkout lifecycle
// =========================

export type CheckoutStatus =
  | "DRAFT"
  | "READY"
  | "PROCESSING"
  | "REQUIRES_ACTION"   // 3DS, Klarna redirect, etc.
  | "PENDING_WIRE"      // awaiting incoming wire transfer
  | "SUCCEEDED"
  | "FAILED";

export type CheckoutStep =
  | "PROJECT_SUMMARY"
  | "INSTALLMENT_PLAN"
  | "PAYMENT_METHOD"
  | "REVIEW"
  | "CONFIRMATION";


// =========================
// API boundary objects
// (must align with backend responses)
// =========================

export interface InitializeCheckoutResponse {
  checkoutId: string;
  status: CheckoutStatus;

  // Either project-based or contract-based checkout
  projectSummary?: ProjectSummary;
  contractSummary?: ContractSummary;

  priceBreakdown: PriceBreakdown;

  allowedPaymentMethods: PaymentMethodType[];
  defaultPaymentMethodType: PaymentMethodType;

  defaultInstallmentFrequency: InstallmentFrequency;
  availableFrequencies: InstallmentFrequency[];
  currentInstallmentPlan: InstallmentPlan;

  giftCard?: GiftCardSummary;
  balance?: BalanceSummary;
}

export interface CalculateInstallmentsResponse {
  checkoutId: string;
  installmentPlan: InstallmentPlan;
  priceBreakdown: PriceBreakdown;
}

export interface ConfirmCheckoutResponse {
  checkoutId: string;
  status: CheckoutStatus;

  /**
   * For flows that require an external redirect (3DS, Klarna, etc.)
   */
  redirectUrl?: string;

  /**
   * For wire transfer confirmations, backend can include
   * any instructions or reference data needed for the
   * "Next steps" / "Wire instructions" screen.
   */
  wireInstructions?: WireTransferInstructions;
}


// =========================
// Wire transfer
// =========================

export interface WireTransferInstructions {
  accountName: string;
  bankName: string;
  accountNumberMasked: string;
  routingNumberMasked: string;
  referenceCode: string;       // must match the invoice / DocNumber logic
  totalDue: Money;
  dueDate?: string;            // ISO 8601 if you display it
}
