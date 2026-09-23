// apps/payout-service/src/common/kyc.client.ts
// PS-00 §3.1: kyc-identity-service
//   How called:       HTTP GET /v1/internal/kyc/status/:userId
//   What fetched:     KYC tier, hold flags, first-payout-hold status
//   Failure behaviour: Payout blocked if tier < required or hold active
// PS-00 §5: First payout hold — 5 business days (PAYOUT_FIRST_HOLD_DAYS)
//           kyc-identity-service signals the hold status, payout-service enforces it.
// PS-00 §7: KYC_SERVICE_URL, INTERNAL_SERVICE_TOKEN
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PayoutError } from './errors/payout.error';

export interface KycStatusResponse {
  contractorId: string;
  tier: string;
  firstPayoutHold: boolean;
  suspended: boolean;
  // Doc07 Domain 9 / Doc08 ERR-35/36/37: kyc-identity-service's identity-review
  // status, forwarded through unmodified when present. Optional because the
  // current kyc-identity-service contract only guarantees `tier` — when it
  // omits `status`, callers fall back to the existing tier-based checks so
  // behavior for the already-integrated fields is unchanged.
  status?: 'not_started' | 'in_review' | 'approved' | 'rejected';
  rejectionReason?: string;
  // PS-16 §2: OFAC sanctions-list flag. Optional — kyc-identity-service's
  // gate-status response does not include this field today (confirmed: its
  // response type has no ofacFlagged property), so it reads as undefined
  // and pause-status.service.ts's OFAC_FLAG condition never fires until
  // kyc-identity-service adds it. Reading it here rather than guessing a
  // screening result payout-service has no data to compute itself.
  ofacFlagged?: boolean;
}

// PS-15 §3.1: the exact contract payout-service is documented to call —
// GET /internal/kyc/gate-status/:contractorId, x-service-name/x-service-secret
// headers, nested per-tier response. Distinct from KycStatusResponse above
// (a different, already-integrated flat contract with its own callers —
// see getGateStatus()'s comment for why this is additive, not a replacement).
export interface KycTierStatus {
  status: 'verified' | 'pending' | 'failed' | 'not_started';
  blocksWithdrawal: boolean;
}
export interface KycGateStatusResponse {
  contractorId: string;
  tier1: KycTierStatus;
  tier2: KycTierStatus & { subType: 'ssn' | 'itin' | 'w8ben' | null };
  tier3: { methods: Record<string, KycTierStatus> };
  firstPayoutHoldActive: boolean;
  firstPayoutHoldReleasesAt: string | null;
}

@Injectable()
export class KycClient {
  private readonly logger = new Logger(KycClient.name);
  private readonly baseUrl: string;
  private readonly serviceToken: string;
  private readonly serviceSecret: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get('KYC_SERVICE_URL', '');
    this.serviceToken = this.config.get('INTERNAL_SERVICE_TOKEN', '');
    this.serviceSecret = this.config.get('INTERNAL_SERVICE_SECRET', '') || this.serviceToken;
  }

  /**
   * Fetch contractor KYC tier and hold status.
   * If KYC service is unavailable, block payouts for safety.
   * If KYC_SERVICE_URL is not configured (dev), default to no holds.
   */
  async getStatus(contractorId: string): Promise<KycStatusResponse> {
    // KYC service not configured — dev mode, allow payouts
    if (!this.baseUrl) {
      this.logger.warn('KYC_SERVICE_URL not configured — defaulting to no holds (dev mode)');
      return {
        contractorId,
        tier: 'basic',
        firstPayoutHold: false,
        suspended: false,
      };
    }

    try {
      const { data } = await firstValueFrom(
        this.http.get<KycStatusResponse>(
          `${this.baseUrl}/v1/internal/kyc/status/${contractorId}`,
          {
            headers: { 'X-Service-Token': this.serviceToken },
            timeout: 5000,
          },
        ),
      );
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to fetch KYC status for contractor ${contractorId}: ${message}`,
      );
      // If KYC service is down, block payouts for safety
      return {
        contractorId,
        tier: 'unknown',
        firstPayoutHold: true,
        suspended: false,
      };
    }
  }

  // PS-15 §3.1: the documented gate-status contract. Additive alongside
  // getStatus() above rather than a replacement — getStatus()'s flat shape
  // still backs pause-status.service.ts, schedule.service.ts,
  // card-issuance.service.ts, and crypto-payout-executor.service.ts's OFAC
  // check, none of which are PS-15's "withdrawal initiation" scope and none
  // of which need the tiered breakdown. This is what KycGateService.checkGate()
  // (PS-15 §3.2/§7) calls.
  //
  // PS-15 §8: ERR_KYC_SERVICE_UNAVAILABLE (503) when the call fails —
  // "Withdrawal blocked as safe default." Only applies once KYC_SERVICE_URL
  // is actually configured; unconfigured (local dev, no kyc-identity-service
  // running at all) returns every tier pre-verified so withdrawal initiation
  // isn't permanently blocked in every dev environment — same dev-mode
  // convenience getStatus() above already grants, not a new fail-open path.
  async getGateStatus(contractorId: string): Promise<KycGateStatusResponse> {
    if (!this.baseUrl) {
      this.logger.warn('KYC_SERVICE_URL not configured — defaulting to all tiers verified (dev mode)');
      return {
        contractorId,
        tier1: { status: 'verified', blocksWithdrawal: false },
        tier2: { status: 'verified', blocksWithdrawal: false, subType: null },
        tier3: { methods: {} },
        firstPayoutHoldActive: false,
        firstPayoutHoldReleasesAt: null,
      };
    }

    try {
      const { data } = await firstValueFrom(
        this.http.get<KycGateStatusResponse>(
          `${this.baseUrl}/internal/kyc/gate-status/${contractorId}`,
          {
            headers: {
              'x-service-name': 'payout-service',
              'x-service-secret': this.serviceSecret,
            },
            timeout: 5000,
          },
        ),
      );
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to fetch KYC gate status for contractor ${contractorId}: ${message}`);
      throw new PayoutError(
        'Identity verification service is temporarily unavailable. Please try again shortly.',
        HttpStatus.SERVICE_UNAVAILABLE,
        'ERR_KYC_SERVICE_UNAVAILABLE',
      );
    }
  }
}