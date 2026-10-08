// apps/payout-service/src/execution/chainalysis.service.ts
// PS-12 §9.1 / PS-19 §3.5: OFAC wallet-address screening via Chainalysis's
// public Address Screening API before a crypto payout executes.
//
// Built from Chainalysis's long-stable public API shape (GET
// https://public.chainalysis.com/api/v1/address/{address}, header
// Token: <API_KEY>, response { identifications: [{ category, name,
// description, url }] } — a non-empty identifications array with a
// sanctions-related category means the address is flagged). Their current
// docs site now sits behind a support-portal login this environment can't
// reach to re-verify the exact response shape live — same category as
// WisePlatformService's account-requirements API: written against the
// real, documented contract, fail-closed until configured, and worth a
// final schema check against Chainalysis's sandbox before this goes live
// with a real CHAINALYSIS_API_KEY.
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayoutError } from '../common/errors/payout.error';

// Chainalysis's category taxonomy includes sanctions-relevant categories —
// this is the set that must block a payout outright, distinct from merely
// informational categories (e.g. "exchange", "mining pool") a full
// screening product also returns that indicate risk context without
// necessarily requiring an outright reject.
const BLOCKING_CATEGORIES = new Set([
  'sanctions',
  'sanctioned entity',
  'terrorist financing',
  'ofac sdn',
]);

@Injectable()
export class ChainalysisService {
  private readonly logger = new Logger(ChainalysisService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get('CHAINALYSIS_API_URL', 'https://public.chainalysis.com/api/v1');
    this.apiKey = this.config.get('CHAINALYSIS_API_KEY', '');
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Screens one wallet address. Fail-closed: if Chainalysis is unreachable
  // or not configured, the caller must not treat that as "clean" — same
  // "never fail open" reasoning PS-35 §8 states explicitly for the
  // biometric gate, applied here to sanctions screening for the same
  // underlying reason (a silent bypass defeats the control).
  async screenAddress(address: string): Promise<{ blocked: boolean; matchedCategory?: string }> {
    if (!this.isConfigured()) {
      throw new PayoutError(
        'Wallet address screening is temporarily unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
        'ERR_CHAINALYSIS_NOT_CONFIGURED',
      );
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/address/${encodeURIComponent(address)}`, {
        headers: { Token: this.apiKey, Accept: 'application/json' },
      });
    } catch (err: any) {
      this.logger.error(`Chainalysis screening request failed for ${address}: ${err.message}`);
      throw new PayoutError(
        'Wallet address screening is temporarily unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
        'ERR_CHAINALYSIS_UNAVAILABLE',
      );
    }

    if (!res.ok) {
      this.logger.error(`Chainalysis screening returned ${res.status} for ${address}`);
      throw new PayoutError(
        'Wallet address screening is temporarily unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
        'ERR_CHAINALYSIS_UNAVAILABLE',
      );
    }

    const data: any = await res.json();
    const identifications: Array<{ category?: string; name?: string }> = data.identifications ?? [];
    const match = identifications.find((i) => i.category && BLOCKING_CATEGORIES.has(i.category.toLowerCase()));

    return match ? { blocked: true, matchedCategory: match.category } : { blocked: false };
  }
}
