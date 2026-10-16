// Sandbox-only diagnostic response — deliberately narrower than the real
// BeginBiometricVerificationResponseDto: only the hosted `url` and
// `sessionId` Didit returned are ever sent to the browser. No `status`
// field, no vendor payload, nothing else Didit's create-session response
// carries.
export class SandboxBiometricSessionResponseDto {
  sessionId!: string;
  url!: string;

  static from(result: { sessionId: string; url: string }): SandboxBiometricSessionResponseDto {
    const dto = new SandboxBiometricSessionResponseDto();
    dto.sessionId = result.sessionId;
    dto.url = result.url;
    return dto;
  }
}
