// apps/offer-service/src/integrations/integrations.module.ts
// OS-29: HTTP client for all downstream services.
// @Global(): ListingsClient, PricingClient, LegalClient injectable everywhere.
import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ListingsClient } from './listings.client';
import { PricingClient } from './pricing.client';
import { LegalClient } from './legal.client';
import { OfferConfig } from '../config/offer.config';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cfg = config.get<OfferConfig>('offer')!;
        return {
          timeout: cfg.integrations?.defaultTimeoutMs ?? 3000,
          maxRedirects: 0,
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': cfg.integrations?.internalSecret ?? '',
          },
        };
      },
    }),
  ],
  providers: [ListingsClient, PricingClient, LegalClient],
  exports: [ListingsClient, PricingClient, LegalClient],
})
export class IntegrationsModule {}