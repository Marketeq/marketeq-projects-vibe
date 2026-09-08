// apps/payout-service/src/providers/wise.provider.ts
// PS-09 v2.0 §2: Marketeq does NOT call the Wise Transfers API to move money.
// OAuth (see src/oauth/oauth.service.ts) is used only to retrieve the
// contractor's US routing + account number, which is then registered as a
// Stripe external account (bank.service.ts). All execution goes through
// Stripe Connect ACH — the same path as any other bank payout. Do not add a
// createTransfer()/direct-payout method here; that would reintroduce the
// prefunded-balance model PS-32 §2 explicitly eliminated.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WiseProvider {
  constructor(private readonly config: ConfigService) {}
}