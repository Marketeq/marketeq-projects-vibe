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
    this.baseUrl = this.config.getOrThrow('EARNINGS_SERVICE_URL');
    this.serviceToken = this.config.getOrThrow('INTERNAL_SERVICE_TOKEN');
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
}