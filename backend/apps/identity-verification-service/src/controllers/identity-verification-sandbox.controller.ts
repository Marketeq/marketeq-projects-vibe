import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SandboxOnlyGuard } from '../common/guards/sandbox-only.guard';
import { SandboxBeginBiometricSessionRequestDto } from '../dto/request/sandbox-begin-biometric-session.request.dto';
import { SandboxBiometricSessionResponseDto } from '../dto/response/sandbox-biometric-session.response.dto';
import {
  HOSTED_BIOMETRIC_SESSION_PROVIDER,
  HostedBiometricSessionProvider,
} from '../providers/biometric-session/hosted-biometric-session-provider.interface';

// SANDBOX-ONLY DIAGNOSTIC CONTROLLER — not part of the real talent-dashboard
// verification flow. Every route here is gated 404-outside-development by
// SandboxOnlyGuard. Unlike TwoStageVerificationService.beginBiometricVerification,
// this:
//   - takes a reference portrait supplied directly by the caller, instead of
//     pulling one from an approved document-check session
//   - persists nothing (no IdentityDocument row, no BiometricSession row,
//     no attempt-reservation bookkeeping)
//   - returns only Didit's hosted `url` and `sessionId` — DIDIT_API_KEY
//     itself is read server-side only (inside DiditHostedBiometricSessionProvider)
//     and never appears in the response
// It exists solely so a developer can click through the real Didit hosted
// biometric page end to end against the sandbox Didit application, without
// needing an approved document check first.
@Controller('v1/identity-verification/sandbox')
@UseGuards(SandboxOnlyGuard)
export class IdentityVerificationSandboxController {
  constructor(
    @Inject(HOSTED_BIOMETRIC_SESSION_PROVIDER)
    private readonly hostedSessionProvider: HostedBiometricSessionProvider,
  ) {}

  @Post('begin-biometric-session')
  @HttpCode(HttpStatus.OK)
  async beginBiometricSession(
    @Body() dto: SandboxBeginBiometricSessionRequestDto,
  ): Promise<SandboxBiometricSessionResponseDto> {
    const workflowId = process.env.DIDIT_BIOMETRIC_WORKFLOW_ID;
    if (!workflowId) {
      throw new BadRequestException('DIDIT_BIOMETRIC_WORKFLOW_ID is not configured');
    }

    const result = await this.hostedSessionProvider.createSession({
      workflowId,
      portraitImageBase64: dto.portraitImageBase64,
      // Our own correlation key, same purpose as the real flow's use of
      // IdentityDocument.id (see CreateHostedBiometricSessionInput.vendorData) —
      // just a fresh random id here since no document backs this call.
      vendorData: `sandbox-diagnostic-${randomUUID()}`,
    });

    return SandboxBiometricSessionResponseDto.from(result);
  }
}
