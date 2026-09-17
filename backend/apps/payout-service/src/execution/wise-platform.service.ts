// apps/payout-service/src/execution/wise-platform.service.ts
// PS-34 §5 + PS-36: Wise Platform API — B2B infrastructure integration for
// India, Japan, GCC, and any other country outside Stripe Connect's
// cross-border coverage. Separate product and separate credentials from the
// Wise OAuth path in providers/wise.provider.ts (PS-09 v2.0) — that path
// retrieves a contractor's OWN Wise account routing number for Stripe ACH;
// this path submits the contractor's local bank details to Wise, which
// executes the local delivery (NEFT/IMPS for India, Zengin for Japan, local
// IBAN rails for GCC, SWIFT otherwise) directly from Marketeq's own Wise
// Platform balance. The contractor never needs a Wise account.
//
// Requires WISE_PLATFORM_API_KEY / WISE_PLATFORM_PROFILE_ID from Wise
// Platform partner onboarding (https://platform.wise.com). Until Marketeq's
// partner application is approved these env vars are unset, so every call
// here throws a clear PayoutError rather than silently no-opping or
// fabricating a result — same fail-closed contract as PS-35 §5's identity
// gate. Do not remove that guard once credentials exist; it also protects
// against a misconfigured empty-string env var in any environment.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayoutError } from '../common/errors/payout.error';

export interface WiseQuote {
  quoteId: string;
  feeUsd: number;
  estimatedDelivery: string | null;
  exchangeRate: number;
  targetAmount: number;
}

@Injectable()
export class WisePlatformService {
  private readonly logger = new Logger(WisePlatformService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly profileId: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get('WISE_PLATFORM_API_URL', '');
    this.apiKey = this.config.get('WISE_PLATFORM_API_KEY', '');
    this.profileId = this.config.get('WISE_PLATFORM_PROFILE_ID', '');
  }

  isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey && this.profileId);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new PayoutError(
        'International bank transfers via Wise Platform are not available yet.',
        HttpStatus.SERVICE_UNAVAILABLE,
        'ERR_WISE_PLATFORM_NOT_CONFIGURED',
      );
    }
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  // Wise's error body shape is `{ errors: [{ code, message }] }` — extract
  // the first message when present, fall back to the HTTP status otherwise.
  private async describeError(res: Response): Promise<string> {
    try {
      const body: any = await res.json();
      return body.errors?.[0]?.message ?? String(res.status);
    } catch {
      return String(res.status);
    }
  }

  // ── Step 1: Get quote ──────────────────────────────────────────
  // POST /v3/profiles/{profileId}/quotes
  // Docs: https://docs.wise.com/api-docs/api-reference/quote
  // Quotes expire — callers must fetch a fresh one at confirmation time,
  // never reuse one shown earlier in the flow.
  async getQuote(params: {
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount: number;
  }): Promise<WiseQuote> {
    this.assertConfigured();

    const res = await fetch(`${this.baseUrl}/v3/profiles/${this.profileId}/quotes`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        sourceCurrency: params.sourceCurrency,
        targetCurrency: params.targetCurrency,
        sourceAmount: params.sourceAmount,
        profile: this.profileId,
        payOut: 'BANK_TRANSFER',
      }),
    });

    if (!res.ok) {
      const message = await this.describeError(res);
      this.logger.error(`Wise Platform quote failed: ${message}`);
      throw new PayoutError(`Wise Platform quote failed: ${message}`, HttpStatus.BAD_GATEWAY, 'ERR_WISE_PLATFORM_QUOTE_FAILED');
    }

    const data: any = await res.json();
    const option = data.paymentOptions?.find((o: any) => o.payOut === 'BANK_TRANSFER' && !o.disabled);
    if (!option) {
      throw new PayoutError(
        'No bank transfer option available for this currency corridor.',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_WISE_PLATFORM_NO_BANK_TRANSFER',
      );
    }

    return {
      quoteId: data.id,
      feeUsd: option.fee?.total ?? 0.99,
      estimatedDelivery: option.estimatedDelivery ?? null,
      exchangeRate: data.rate,
      targetAmount: option.targetAmount,
    };
  }

  // ── Step 2: Get account requirements ─────────────────────────────
  // GET /v1/account-requirements — the authoritative field names/rules for a
  // given country. PS-36 §6: call once per country during setup (not on
  // every payout) to confirm field names before creating a recipient — field
  // names are not guaranteed stable and must not be hardcoded blind.
  // Docs: https://docs.wise.com/api-docs/api-reference/bank-account-requirements
  async getAccountRequirements(params: {
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount: number;
  }): Promise<any[]> {
    this.assertConfigured();

    const qs = new URLSearchParams({
      source: params.sourceCurrency,
      target: params.targetCurrency,
      sourceAmount: String(params.sourceAmount),
    });
    const res = await fetch(`${this.baseUrl}/v1/account-requirements?${qs}`, { headers: this.headers() });
    if (!res.ok) {
      throw new PayoutError(
        'Failed to fetch Wise account requirements.',
        HttpStatus.BAD_GATEWAY,
        'ERR_WISE_PLATFORM_REQUIREMENTS_FAILED',
      );
    }
    return res.json();
  }

  // ── Validate bank account ────────────────────────────────────────
  // India-specific IFSC registry check (PS-34 §5.2 step 2 / PS-36 has no
  // separate validator endpoint — IFSC is the one country with its own
  // pre-flight check; every other country's validation happens implicitly
  // at recipient creation via the account-requirements-driven fields).
  async validateBankAccount(params: {
    bankCountry: string;
    currency: string;
    fields: Record<string, string>;
  }): Promise<{ valid: boolean; errorMessage?: string }> {
    this.assertConfigured();

    if (params.bankCountry.toUpperCase() === 'IN' && params.fields.ifscCode) {
      const res = await fetch(
        `${this.baseUrl}/v1/validators/ifsc?ifscCode=${encodeURIComponent(params.fields.ifscCode)}`,
        { headers: this.headers() },
      );
      if (!res.ok) return { valid: false, errorMessage: 'IFSC validation unavailable' };
      const data: any = await res.json();
      return { valid: data.valid === true };
    }

    return { valid: true };
  }

  // ── Step 3: Create recipient ─────────────────────────────────────
  // POST /v1/accounts — recipients are reused for future payouts to the same
  // method (stored on deposit_methods.wisePlatformRecipientId), never
  // recreated per payout.
  // Docs: https://docs.wise.com/api-docs/api-reference/recipient
  async createRecipient(params: {
    currency: string;
    bankCountry: string;
    accountHolderName: string;
    recipientType: string; // e.g. 'indian', 'japanese', 'emirates' — confirm via getAccountRequirements()
    bankDetails: Record<string, string>;
  }): Promise<string> {
    this.assertConfigured();

    const res = await fetch(`${this.baseUrl}/v1/accounts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        currency: params.currency,
        type: params.recipientType,
        profile: this.profileId,
        // false = Marketeq is sending to this person; they don't own a Wise account
        ownedByCustomer: false,
        accountHolderName: params.accountHolderName,
        details: params.bankDetails,
      }),
    });

    if (!res.ok) {
      const message = await this.describeError(res);
      this.logger.error(`Wise Platform recipient creation failed: ${message}`);
      throw new PayoutError(
        `Wise Platform recipient creation failed: ${message}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_WISE_PLATFORM_RECIPIENT_FAILED',
      );
    }

    const data: any = await res.json();
    return String(data.id);
  }

  // ── Step 4: Create transfer ────────────────────────────────────────
  // POST /v3/profiles/{profileId}/transfers — money has not moved yet; only
  // executeTransfer's fund step (below) actually debits Marketeq's balance.
  // Docs: https://docs.wise.com/api-docs/api-reference/transfer
  private async createTransfer(params: {
    quoteId: string;
    recipientId: string;
    payoutRequestId: string;
    reference?: string;
  }): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v3/profiles/${this.profileId}/transfers`, {
      method: 'POST',
      // X-Idempotency-Key (not customerTransactionId alone) is what Wise
      // uses to dedupe a retried createTransfer call for the same payout.
      headers: this.headers({ 'X-Idempotency-Key': params.payoutRequestId }),
      body: JSON.stringify({
        targetAccount: parseInt(params.recipientId, 10),
        quoteUuid: params.quoteId,
        customerTransactionId: params.payoutRequestId,
        details: { reference: params.reference ?? `Marketeq payout ${params.payoutRequestId}` },
      }),
    });

    if (!res.ok) {
      const message = await this.describeError(res);
      this.logger.error(`Wise Platform transfer creation failed: ${message}`);
      throw new PayoutError(
        `Wise Platform transfer creation failed: ${message}`,
        HttpStatus.BAD_GATEWAY,
        'ERR_WISE_PLATFORM_TRANSFER_FAILED',
      );
    }

    const data: any = await res.json();
    return String(data.id);
  }

  // ── Step 5: Fund transfer ────────────────────────────────────────
  // POST /v3/profiles/{profileId}/transfers/{transferId}/payments — debits
  // Marketeq's Wise Platform balance and starts local-rail delivery. After
  // this call, money is moving; PS-36 §9 says not to retry without checking
  // transfer status first — a 422 "already funded" from a network-error
  // retry means a previous attempt already succeeded, not a failure.
  private async fundTransfer(transferId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v3/profiles/${this.profileId}/transfers/${transferId}/payments`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ type: 'BALANCE' }),
    });

    if (!res.ok) {
      let alreadyFunded = false;
      try {
        const err: any = await res.json();
        alreadyFunded = !!err.errors?.some(
          (e: any) => e.code === 'already.funded' || e.message?.includes('already'),
        );
        if (alreadyFunded) return;
        throw new PayoutError(
          `Wise Platform transfer funding failed: ${err.errors?.[0]?.message ?? res.status}`,
          HttpStatus.BAD_GATEWAY,
          'ERR_WISE_PLATFORM_FUND_FAILED',
        );
      } catch (err) {
        if (err instanceof PayoutError) throw err;
        throw new PayoutError('Wise Platform transfer funding failed.', HttpStatus.BAD_GATEWAY, 'ERR_WISE_PLATFORM_FUND_FAILED');
      }
    }
  }

  // ── Steps 4 + 5 combined — the call site used by BankPayoutExecutorService ──
  async executeTransfer(params: {
    quoteId: string;
    recipientId: string;
    reference: string; // payout request ID — used as idempotency reference
  }): Promise<string> {
    this.assertConfigured();
    const transferId = await this.createTransfer({
      quoteId: params.quoteId,
      recipientId: params.recipientId,
      payoutRequestId: params.reference,
    });
    await this.fundTransfer(transferId);
    return transferId;
  }

  // ── Balance check (PS-36 §11) ────────────────────────────────────
  // GET /v4/profiles/{profileId}/balances?types=STANDARD — Marketeq's own
  // operational Wise Platform float, not per-contractor escrow. Checked
  // before large payouts so an insufficient-balance failure surfaces as a
  // clear pre-flight error rather than a fund-step 502.
  // Docs: https://docs.wise.com/api-docs/api-reference/balance
  async getWisePlatformBalanceUsd(): Promise<number> {
    this.assertConfigured();
    const res = await fetch(`${this.baseUrl}/v4/profiles/${this.profileId}/balances?types=STANDARD`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new PayoutError('Failed to check Wise Platform balance.', HttpStatus.BAD_GATEWAY, 'ERR_WISE_PLATFORM_FUND_FAILED');
    }
    const data: any = await res.json();
    const usdBalance = Array.isArray(data) ? data.find((b: any) => b.currency === 'USD') : null;
    return usdBalance?.amount?.value ?? 0;
  }
}
