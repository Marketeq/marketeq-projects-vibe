import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { IdentityVerificationGateClient } from '../identity-gate/identity-verification-gate.client';

// G4 (Christopher): /hire-requests is part of the hiring flow, so it is gated on
// the TALENT's verification gate exactly like offers and counter-offers. The
// client/sender is never evaluated. A closed gate is refused with the same
// HTTP status, error code, message and response structure offer-service uses
// (its OfferExceptionFilter envelope), and an unanswered gate is a closed gate.
//
// Services do not import each other's src, so the codes and wording below are a
// deliberate copy of offer-service's common/exceptions/offer.exceptions.ts -
// change them together.

type MissingRequirement = 'identity' | 'location' | 'both';

/** A hire-request gate refusal, rendered in offer-service's envelope by HireRequestGateExceptionFilter. */
export class HireRequestGateException extends HttpException {
  constructor(
    readonly errorCode: string,
    message: string,
    status: HttpStatus,
    readonly missingRequirements?: MissingRequirement,
  ) {
    super({ errorCode, message }, status);
  }
}

/** To the CLIENT: the hire action is closed - never a status, reason or what is missing. */
export const talentNotHireable = () =>
  new HireRequestGateException('TALENT_NOT_HIREABLE', 'This freelancer isn’t available to hire right now', HttpStatus.FORBIDDEN);

/** To the acting TALENT: only their own outstanding requirement. */
export const verificationRequired = (missing: MissingRequirement) =>
  new HireRequestGateException('VERIFICATION_REQUIRED', 'Verify your account to continue.', HttpStatus.FORBIDDEN, missing);

/** The gate could not be evaluated; nothing was done. */
export const identityVerificationUnavailable = () =>
  new HireRequestGateException(
    'IDENTITY_VERIFICATION_UNAVAILABLE',
    "We couldn't complete this action right now. Please try again shortly.",
    HttpStatus.SERVICE_UNAVAILABLE,
  );

@Injectable()
export class HireRequestGate {
  constructor(private readonly gateClient: IdentityVerificationGateClient) {}

  /**
   * Refuses unless the TALENT's gate is open (verified or inside the 30-day
   * grace window). `talentUserId` must come from validated or stored
   * server-side data, never from a client-supplied verification result. The
   * sender's own verification is never read.
   *
   * Callers invoke this before any write, event or other side effect.
   */
  async assertTalentGateOpen(talentUserId: string, actorIsTalent: boolean): Promise<void> {
    let decision;
    try {
      decision = await this.gateClient.checkGate(talentUserId);
    } catch {
      throw identityVerificationUnavailable();
    }
    if (decision.gateOpen) return;
    if (actorIsTalent) {
      // parseDecision guarantees a closed gate never reports 'none'.
      throw verificationRequired(decision.missingRequirements as MissingRequirement);
    }
    throw talentNotHireable();
  }
}

/** Same body as offer-service's OfferExceptionFilter writes for these exceptions. */
@Catch(HireRequestGateException)
export class HireRequestGateExceptionFilter implements ExceptionFilter {
  catch(exception: HireRequestGateException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const payload = exception.getResponse() as { errorCode: string; message: string };
    response.status(status).json({
      statusCode: status,
      error: payload.errorCode,
      message: payload.message,
      ...(exception.missingRequirements ? { missingRequirements: exception.missingRequirements } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request.headers['x-request-id'] as string) ?? randomUUID(),
    });
  }
}
