// apps/payout-service/src/identity-gate/payout-withdrawal-gate.guard.ts
// Account-verification gate G9: a contractor who is not gate_open (verified, or
// inside the 30-day grace period) cannot initiate a withdrawal. Verified and
// in-grace contractors are unaffected.
//
// Runs as a route guard AFTER JwtAuthGuard (an unauthenticated caller learns
// nothing and never triggers an identity lookup) and BEFORE the global
// ValidationPipe and PayoutService.initiate(). A closed or unanswered gate
// therefore reaches none of initiate()'s steps: no idempotency replay, no
// withdrawal rate-limit increment, no pause check, no earnings/KYC calls, no
// payout_request, magic-link token, audit row, email, queue job or event.
//
// Whose gate: the authenticated contractor (JWT subject) - the account whose
// earnings would leave. The existing KYC / first-payout-hold / EDD checks in
// initiate() are separate and unchanged.
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { VerificationRequiredException } from './identity-gate.exceptions';

@Injectable()
export class PayoutWithdrawalGateGuard implements CanActivate {
  constructor(private readonly gateClient: IdentityVerificationGateClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = typeof req.user?.userId === 'string' ? req.user.userId.trim() : '';
    if (!userId) throw new UnauthorizedException('Missing user identity');

    const decision = await this.gateClient.checkGate(userId);
    if (!decision.gateOpen) {
      throw new VerificationRequiredException(
        decision.missingRequirements as 'identity' | 'location' | 'both',
      );
    }
    return true;
  }
}
