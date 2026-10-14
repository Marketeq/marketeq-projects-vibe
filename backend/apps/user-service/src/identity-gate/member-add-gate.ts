import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';

// G7 (Christopher): a person who is added to a team or company by a DIRECT route
// must pass the same verification gate as one who joins by accepting an
// invitation (invitations-service). The gate applies to the RESULTING MEMBERSHIP,
// so the subject is always the person being added - never the owner, admin or
// client doing the adding - and it is always read from identity-verification-
// service, never from anything in the request.
//
// Same HTTP behaviour and error codes as gated invitation acceptance (see
// invitations-service's common/invitation-exceptions.ts, which these mirror; services
// do not import each other's src, so the codes are a deliberate copy):
//   403 VERIFICATION_REQUIRED               gate closed (unverified / expired)
//   503 IDENTITY_VERIFICATION_UNAVAILABLE   gate could not be evaluated (an unanswered gate is a closed gate)
// Envelope `{ success: false, error, message }`, like the invitation exceptions.
//
// Unlike acceptance, the person being refused is not the caller, so the response
// does NOT carry that person's `missingRequirements`: an admin must not learn what
// another account still has to verify (TRVG2 section 6).
export const VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED';
export const IDENTITY_VERIFICATION_UNAVAILABLE = 'IDENTITY_VERIFICATION_UNAVAILABLE';

export class MemberVerificationRequiredException extends HttpException {
  constructor() {
    super(
      {
        success: false,
        error: VERIFICATION_REQUIRED,
        message: 'This person has to verify their account before they can be added.',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class MemberGateUnavailableException extends HttpException {
  constructor() {
    super(
      {
        success: false,
        error: IDENTITY_VERIFICATION_UNAVAILABLE,
        message: "We couldn't confirm the verification status. Please try again shortly.",
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

@Injectable()
export class MemberAddGate {
  constructor(private readonly gateClient: IdentityVerificationGateClient) {}

  /**
   * Refuses unless `memberUserId`'s gate is open (verified, or inside the 30-day
   * grace window). Call it BEFORE the membership row is created and before any
   * event or other side effect. Only the person being added is ever evaluated.
   */
  async assertMayJoin(memberUserId: string): Promise<void> {
    let decision;
    try {
      decision = await this.gateClient.checkGate(memberUserId);
    } catch {
      // No broker, RPC error, timeout, unusable or self-contradicting reply: the
      // client treats every one of them as "unanswered", and an unanswered gate
      // is a closed gate.
      throw new MemberGateUnavailableException();
    }
    if (!decision.gateOpen) throw new MemberVerificationRequiredException();
  }
}
