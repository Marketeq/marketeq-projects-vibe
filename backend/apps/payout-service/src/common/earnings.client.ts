// apps/payout-service/src/common/earnings.client.ts
// PS-00 §3.1: earnings-service
//   How called:       HTTP GET /v1/internal/earnings/balance/:userId
//   What fetched:     Available balance, balance updatedAt
//   Failure behaviour: Payout blocked if unavailable or balance insufficient
// PS-00 §5: Balance read strategy — HTTP call before every payout.
//           payout-service never caches balance — reads fresh every time to prevent double-spend.
// PS-00 §7: EARNINGS_SERVICE_URL, INTERNAL_SERVICE_TOKEN
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface BalanceResponse {
  availableBalance: string;
  pendingBalance: string;
  updatedAt: string;
}

@Injectable()
export class EarningsClient {
  private readonly logger = new Logger(EarningsClient.name);
  private readonly baseUrl: string;
  private readonly serviceToken: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    // ecosystem.config.js runs earnings-service on 3026 — EARNINGS_SERVICE_URL
    // is never actually set in any env file, so this fallback is the real
    // value in practice. It previously pointed at 3027, where nothing
    // listens, silently breaking every withdrawal validate-amount/initiate
    // call (ECONNREFUSED -> generic 500 ERR_INTERNAL) and the scheduled
    // payout engine's balance check (schedule.service.ts uses this same
    // client).
    this.baseUrl = this.config.get('EARNINGS_SERVICE_URL') ?? 'http://localhost:3026';
    this.serviceToken = this.config.get('INTERNAL_SERVICE_TOKEN') ?? '';
  }

  /**
   * Fetch contractor available balance — fresh read every time, never cached.
   * If this call fails, the payout is blocked.
   */
  async getBalance(contractorId: string): Promise<BalanceResponse> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<BalanceResponse>(
          `${this.baseUrl}/v1/internal/earnings/balance/${contractorId}`,
          {
            headers: { 'X-Service-Token': this.serviceToken },
            timeout: 5000,
          },
        ),
      );
      return data;
    } catch (err: any) {
      this.logger.error(
        `Failed to fetch balance for contractor ${contractorId}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * Instantly places a hold: debits available_balance and moves the amount
   * into pending_hold_usd, atomically guarded server-side against
   * insufficient funds. Called the moment a withdrawal is confirmed, so the
   * contractor's balance reflects it immediately rather than waiting for the
   * provider's completion webhook. Returns false (does not throw) on
   * insufficient balance — a real, expected outcome the caller must handle;
   * throws on any other failure (network/service down).
   */
  async holdBalance(contractorId: string, amountUsd: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/v1/internal/earnings/balance/${contractorId}/hold`,
          { amountUsd },
          { headers: { 'X-Service-Token': this.serviceToken }, timeout: 5000 },
        ),
      );
      return true;
    } catch (err: any) {
      if ((err as AxiosError)?.response?.status === 422) return false;
      this.logger.error(`Failed to hold balance for contractor ${contractorId}: ${err.message}`);
      throw err;
    }
  }
}