import { IsOptional, IsString } from 'class-validator';

export class VerificationStatusResponseDto {
  userId: string;
  identityVerificationStatus: string;
  identityRejectionReason: string | null;
  locationVerificationStatus: string;
  verifiedHomeCountry: string | null;
  attemptCount: number;
  attemptLimit: number;
  canRetry: boolean;
}

export class DiditWebhookPayloadDto {
  @IsString()
  sessionId: string;

  @IsString()
  outcome: string;

  @IsOptional()
  @IsString()
  failureCode?: string;

  @IsOptional()
  @IsString()
  verificationDepth?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  issuingCountry?: string;
}

export class VerificationAttemptResponseDto {
  id: string;
  profileId: string;
  documentId: string | null;
  vendorSessionId: string;
  attemptTimestamp: Date;
  attemptOutcome: string;
  failureCode: string | null;
  attemptNumber: number;
  vpnProxyDetectionResult: string;
}
