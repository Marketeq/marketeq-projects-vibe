// apps/payout-service/src/common/kyc.client.ts
// PS-00 §3.1: kyc-identity-service
//   How called:       HTTP GET /v1/internal/kyc/status/:userId
//   What fetched:     KYC tier, hold flags, first-payout-hold status
//   Failure behaviour: Payout blocked if tier < required or hold active
// PS-00 §5: First payout hold — 5 business days (PAYOUT_FIRST_HOLD_DAYS)
//           kyc-identity-service signals the hold status, payout-service enforces it.
// PS-00 §7: KYC_SERVICE_URL, INTERNAL_SERVICE_TOKEN
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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

@Injectable()
export class KycClient {
  private readonly logger = new Logger(KycClient.name);
  private readonly baseUrl: string;
  private readonly serviceToken: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get('KYC_SERVICE_URL', '');
    this.serviceToken = this.config.get('INTERNAL_SERVICE_TOKEN', '');
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
    } catch (err: any) {
      this.logger.error(
        `Failed to fetch KYC status for contractor ${contractorId}: ${err.message}`,
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
}