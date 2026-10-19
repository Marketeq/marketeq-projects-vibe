export type PaymentMethodId =
  | 'card'
  | 'ach'
  | 'wire'
  | 'google_pay'
  | 'apple_pay'
  | 'klarna';

export type BrowserCheck = 'google_pay' | 'apple_pay' | null;

export type PaymentMethodOption = {
  id: PaymentMethodId;
  available: boolean;
  reason: string | null;
  feeLabel: string;
  processingTime: string | null;
  browserCheck: BrowserCheck;
};

export const KLARNA_MIN_CENTS = 100;
export const KLARNA_MAX_CENTS = 1_000_000;

type PaymentMethodDefinition = {
  id: PaymentMethodId;
  feeLabel: string;
  processingTime: string | null;
  browserCheck: BrowserCheck;
  unavailableReason: (amountDueCents: number) => string | null;
};

const alwaysAvailable = () => null;

const PAYMENT_METHODS: PaymentMethodDefinition[] = [
  {
    id: 'card',
    feeLabel: '2.9% + $0.30 per transaction',
    processingTime: null,
    browserCheck: null,
    unavailableReason: alwaysAvailable,
  },
  {
    id: 'ach',
    feeLabel: '0.8% per transaction',
    processingTime: 'Up to 4 business days',
    browserCheck: null,
    unavailableReason: alwaysAvailable,
  },
  {
    id: 'wire',
    feeLabel: '0.8% per transaction',
    processingTime: '1 to 5 business days',
    browserCheck: null,
    unavailableReason: alwaysAvailable,
  },
  {
    id: 'google_pay',
    feeLabel: '2.9% + $0.30 per transaction',
    processingTime: null,
    browserCheck: 'google_pay',
    unavailableReason: alwaysAvailable,
  },
  {
    id: 'apple_pay',
    feeLabel: '2.9% + $0.30 per transaction',
    processingTime: null,
    browserCheck: 'apple_pay',
    unavailableReason: alwaysAvailable,
  },
  {
    id: 'klarna',
    feeLabel: 'starting at 5.99% + $0.30 per transaction',
    processingTime: null,
    browserCheck: null,
    unavailableReason: (amountDueCents) =>
      amountDueCents < KLARNA_MIN_CENTS || amountDueCents > KLARNA_MAX_CENTS
        ? 'Klarna is not available for this amount'
        : null,
  },
];

export const resolvePaymentMethods = (amountDueCents: number) => {
  if (amountDueCents <= 0) {
    return { noPaymentNeeded: true, methods: [] as PaymentMethodOption[] };
  }

  const methods = PAYMENT_METHODS.map((method) => {
    const reason = method.unavailableReason(amountDueCents);
    return {
      id: method.id,
      available: reason === null,
      reason,
      feeLabel: method.feeLabel,
      processingTime: method.processingTime,
      browserCheck: method.browserCheck,
    };
  });

  return { noPaymentNeeded: false, methods };
};
