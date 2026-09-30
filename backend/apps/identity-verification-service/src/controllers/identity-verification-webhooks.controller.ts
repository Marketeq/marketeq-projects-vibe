import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { TwoStageVerificationService } from '../services/two-stage-verification.service';
import { FreeKycService } from '../services/free-kyc.service';
import { DiditWebhookPayloadDto } from '../dto/webhooks/didit-webhook.payload.dto';

@Controller('v1/identity-verification/webhooks')
export class IdentityVerificationWebhooksController {
  constructor(
    private readonly service: IdentityVerificationService,
    private readonly twoStageService: TwoStageVerificationService,
    private readonly freeKycService: FreeKycService,
  ) {}

  // SUPERSEDED for biometric-session events by 'didit-biometric-session'
  // below — left in place, not deleted, since the old
  // PendingVerificationSession-per-attempt path it finalizes is still
  // DI-registered. See the two-stage integration's final report.
  @Post('didit')
  @HttpCode(HttpStatus.OK)
  async handleDiditWebhook(
    @Body() payload: DiditWebhookPayloadDto,
    @Headers('x-didit-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    await this.service.handleDiditWebhook(payload, signature, req.rawBody as Buffer);
    return { received: true };
  }

  // Real, corrected webhook path for the two-stage integration's
  // biometric-session stage. Uses the actual documented headers
  // (X-Signature, X-Timestamp) and the real payload shape — see
  // providers/webhooks/didit-webhook-verification.ts. @Body() is not used
  // here on purpose: parseDiditWebhookEvent reads the raw bytes directly,
  // exactly like the signature check must, rather than a re-serialized
  // copy of the parsed body.
  @Post('didit-biometric-session')
  @HttpCode(HttpStatus.OK)
  async handleBiometricSessionWebhook(
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-timestamp') timestamp: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    await this.twoStageService.handleBiometricSessionWebhook(req.rawBody as Buffer, {
      signature,
      timestamp,
    });
    return { received: true };
  }

  // Free KYC (Didit-hosted workflow) status webhook. Accepts ONLY a valid
  // X-Signature-V2 within the documented timestamp window; reads the raw
  // bytes exactly like the signature check requires. Fails closed if the
  // shared secret is not configured.
  // Not rate-limited by IP: every Didit delivery comes from one static IP, and
  // Didit does not retry a 4xx (including 429). Authenticity is the signature.
  @SkipThrottle()
  @Post('didit-kyc')
  @HttpCode(HttpStatus.OK)
  async handleFreeKycWebhook(
    @Headers('x-signature-v2') signatureV2: string | undefined,
    @Headers('x-timestamp') timestamp: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    await this.freeKycService.handleWebhook(req.rawBody as Buffer, { signatureV2, timestamp });
    return { received: true };
  }
}
