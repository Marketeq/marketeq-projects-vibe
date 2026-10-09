import { IsNotEmpty, IsString } from 'class-validator';

// Sandbox-only diagnostic input. Unlike the real two-stage flow — which
// only ever pulls a portrait out of an already-approved document-check
// session (see TwoStageVerificationService.beginBiometricVerification) —
// this DTO accepts a raw reference portrait directly from the dev harness
// UI, with no document or profile behind it. Never accepted on any
// production-facing route.
export class SandboxBeginBiometricSessionRequestDto {
  @IsString()
  @IsNotEmpty()
  portraitImageBase64!: string;
}
