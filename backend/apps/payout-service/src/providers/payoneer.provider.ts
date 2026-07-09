// apps/payout-service/src/providers/payoneer.provider.ts
// PS-00 §3.1: Payoneer API — OAuth 2.0
// Retry 3 attempts — then fail payout
// Full implementation in PS-10
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayoneerProvider {
  constructor(private readonly config: ConfigService) {}

  // createPayment()  — PS-10
}