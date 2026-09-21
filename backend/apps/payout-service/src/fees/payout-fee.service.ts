// apps/payout-service/src/fees/payout-fee.service.ts
// PS-34 §3: International payout fee calculation. Every fee is
// contractor-paid and shown upfront before confirmation — Marketeq absorbs
// zero payout costs. US ACH (BANK_STRIPE, or BANK_MANUAL/US) stays free —
// this service only adds a fee for the international BANK_MANUAL paths this
// PR introduces. Wise OAuth (MethodType.WISE) fees are fetched live from
// Wise at quote time (PS-09 v2.0), not computed here.

import { Injectable } from '@nestjs/common';
import { MethodType } from '../entities/deposit-method.entity';

export interface PayoutFeeResult {
  feeUsd: number;
  netAmountUsd: number;
  feeDescription: string;
}

@Injectable()
export class PayoutFeeService {
  // Countries covered by Stripe Connect cross-border payouts from a US
  // platform. Source: https://docs.stripe.com/connect/cross-border-payouts
  // Update this list when Stripe adds new countries.
  private readonly STRIPE_CROSS_BORDER_COUNTRIES = new Set([
    // UK and Crown Dependencies
    'GB', 'GG', 'JE', 'IM',
    // SEPA
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH',
    // Australia and Canada
    'AU', 'CA',
  ]);

  isStripeCrossBorderCountry(bankCountry: string): boolean {
    return this.STRIPE_CROSS_BORDER_COUNTRIES.has(bankCountry.toUpperCase());
  }

  calculateFee(params: {
    amountUsd: number;
    methodType: MethodType;
    bankCountry?: string;
  }): PayoutFeeResult {
    const { amountUsd, methodType, bankCountry } = params;

    // US ACH — free
    if (
      methodType === MethodType.BANK_STRIPE ||
      (methodType === MethodType.BANK_MANUAL && bankCountry?.toUpperCase() === 'US')
    ) {
      return { feeUsd: 0, netAmountUsd: amountUsd, feeDescription: '' };
    }

    if (methodType === MethodType.BANK_MANUAL) {
      if (!bankCountry) {
        return { feeUsd: 0, netAmountUsd: amountUsd, feeDescription: '' };
      }

      // Stripe cross-border countries — 0.25% (min $0.50)
      if (this.isStripeCrossBorderCountry(bankCountry)) {
        const fee = Math.max(0.5, Math.round(amountUsd * 0.0025 * 100) / 100);
        return {
          feeUsd: fee,
          netAmountUsd: Math.round((amountUsd - fee) * 100) / 100,
          feeDescription: `International transfer fee: $${fee.toFixed(2)}`,
        };
      }

      // Wise Platform countries (India, Japan, GCC, others) — $0.99 flat
      const fee = 0.99;
      return {
        feeUsd: fee,
        netAmountUsd: Math.round((amountUsd - fee) * 100) / 100,
        feeDescription: 'Transfer fee: $0.99',
      };
    }

    // WISE OAuth fee is fetched live from Wise at quote time — never
    // computed here. Every other method type (PAYONEER, CRYPTO,
    // MARKETEQ_DEBIT_CARD, TEQ_COIN) has its own fee path elsewhere and
    // never reaches this service.
    return { feeUsd: 0, netAmountUsd: amountUsd, feeDescription: '' };
  }
}
