// apps/offer-service/src/integrations/pricing.client.ts
// OS-29: FX rates for display-only currency conversion. NON-BLOCKING.
// Returns null on any error — frontend renders native rate only.
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';
import { OfferConfig } from '../config/offer.config';

export interface FxRate {
  from: string;
  to: string;
  rate: number;
  fetchedAt: string;
}

@Injectable()
export class PricingClient {
  private readonly logger = new Logger(PricingClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const cfg = config.get<OfferConfig>('offer')!;
    this.baseUrl = cfg.integrations?.pricingServiceUrl ?? cfg.services?.pricingUrl ?? '';
    this.timeoutMs = cfg.integrations?.pricingTimeoutMs ?? 1500;
  }

  async getFxRate(from: string, to: string): Promise<FxRate | null> {
    if (from === to) {
      return { from, to, rate: 1, fetchedAt: new Date().toISOString() };
    }

    const url = `${this.baseUrl}/internal/rates?from=${from}&to=${to}`;

    try {
      const response = await firstValueFrom(
        this.http.get<FxRate>(url).pipe(timeout(this.timeoutMs)),
      );
      return response.data;
    } catch (err) {
      this.logger.warn(
        `pricing-service FX rate unavailable (${from} -> ${to}): ${(err as Error).message}. ` +
        'Displaying native rate only.',
      );
      return null;
    }
  }
}