// apps/payout-service/src/providers/paypal.provider.ts
// PS-00 §3.1: PayPal Payouts API — OAuth 2.0 bearer token
// Retry 3 attempts — then fail payout
// Full implementation in PS-08
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaypalProvider {
  constructor(private readonly config: ConfigService) {}

  // createPayout()   — PS-08
  // refreshToken()   — PS-08
}