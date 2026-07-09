// apps/payout-service/src/providers/wise.provider.ts
// PS-00 §3.1: Wise Transfers API — API key auth
// Retry 3 attempts — then fail payout
// Full implementation in PS-09
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WiseProvider {
  constructor(private readonly config: ConfigService) {}

  // createTransfer()  — PS-09
}