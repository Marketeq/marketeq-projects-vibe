// apps/offer-service/src/guards/talent-gate.guard.ts
// Account-verification gate G4: the talent on an offer must satisfy
// gate_open = is_verified OR in_grace for every action that creates, extends
// or commits an offer (create, edit, resend, counter create/edit, accept,
// counter accept). Decline, withdraw and reads are deliberately ungated.
//
// Runs as a guard AFTER OfferPartyGuard/RolesGuard (a non-party learns
// nothing about the gate) and BEFORE the IdempotencyInterceptor and the
// service, so a blocked or unanswered gate has nothing to undo: no Redis lock,
// no DB read-modify-write, no outbox, history, Ably or contract side effect.
//
// The gate subject is always offer.talentId (individual talent only - the
// offer model has no team recipient). For POST /offers there is no offer yet,
// so the subject is body.talentId.
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { IdentityVerificationGateClient } from '../identity-gate/identity-verification-gate.client';
import {
  IdentityVerificationUnavailableException,
  TalentNotHireableException,
  VerificationRequiredException,
} from '../common/exceptions/offer.exceptions';
import { UserRole } from '../common/types/user-role.enum';

@Injectable()
export class TalentGateGuard implements CanActivate {
  constructor(private readonly gateClient: IdentityVerificationGateClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const actorId: string | undefined = request.user?.id || request.user?.sub;
    const existing = request.offer as { talentId?: string } | undefined;

    let talentId: unknown;
    let actorIsTalent: boolean;
    if (existing) {
      // Existing offer / counter-offer routes: OfferPartyGuard already loaded
      // it and derived the acting party from real membership.
      talentId = existing.talentId;
      actorIsTalent = request.partyRole === UserRole.TALENT;
    } else {
      // POST /offers: the acting user is the client; the recipient is in the
      // body. A missing or malformed id is left for CreateOfferDto's
      // validation (422), and a self-hire for the service's own
      // CANNOT_HIRE_SELF check - neither names a talent to gate.
      talentId = (request.body as Record<string, unknown> | undefined)?.talentId;
      actorIsTalent = false;
      if (typeof talentId !== 'string' || !isUUID(talentId)) return true;
      if (talentId === actorId) return true;
    }

    if (typeof talentId !== 'string' || talentId.length === 0) {
      // No resolvable subject on an existing offer is not "open": refuse the
      // same way as an unanswered gate.
      throw new IdentityVerificationUnavailableException();
    }

    const decision = await this.gateClient.checkGate(talentId);
    if (decision.gateOpen) return true;

    if (actorIsTalent) {
      // The talent's own outstanding requirement. parseDecision guarantees a
      // closed gate never reports 'none'.
      throw new VerificationRequiredException(
        decision.missingRequirements as 'identity' | 'location' | 'both',
      );
    }
    // The client learns only that the hire action is closed.
    throw new TalentNotHireableException();
  }
}
