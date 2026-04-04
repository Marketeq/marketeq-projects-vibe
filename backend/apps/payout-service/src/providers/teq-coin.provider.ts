// apps/payout-service/src/providers/teq-coin.provider.ts
// PS-00 §4.2: TEQ Coin — feature-flagged OFF for MVP
// Do not implement TEQ Coin business logic for MVP. Schema and enum only.
//
// When OFF (FEATURE_TEQ_COIN_ENABLED=false, default):
//   • TEQ Coin does not appear in the payout method selection UI
//   • Any API request with methodType=TEQ_COIN returns 400 ERR_PAYOUT_METHOD_UNAVAILABLE
//   • The deposit_methods table accepts TEQ_COIN rows but the service rejects at processing time
//
// When ON (future):
//   • Transfers are internal ledger debits/credits — no external API call
//   • Settlement is instant
//   • No minimum payout threshold applies
import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TeqCoinProvider {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get('FEATURE_TEQ_COIN_ENABLED', 'false') === 'true';
  }

  async transfer(_contractorId: string, _amount: string): Promise<never> {
    // PS-00 §4.2: Always reject for MVP
    throw {
      statusCode: HttpStatus.BAD_REQUEST,
      errorCode: 'ERR_PAYOUT_METHOD_UNAVAILABLE',
      message: 'TEQ Coin payouts are not currently available.',
    };
  }
}