import { IdentityDocument } from '../../entities/identity-document.entity';
import { IdentityVerificationStatus } from '../../entities/enums/identity-verification.enums';

export class DocumentCheckResponseDto {
  documentId!: string;
  documentCheckStatus!: string | null;
  warnings!: Array<{ risk: string; logType: string; shortDescription: string }>;
  checkedAt!: string | null;

  static from(document: IdentityDocument): DocumentCheckResponseDto {
    const dto = new DocumentCheckResponseDto();
    dto.documentId = document.id;
    dto.documentCheckStatus = document.documentCheckStatus;
    dto.warnings = document.documentCheckWarnings ?? [];
    dto.checkedAt = document.documentCheckedAt ? document.documentCheckedAt.toISOString() : null;
    return dto;
  }
}

export class BeginBiometricVerificationResponseDto {
  sessionId!: string;
  url!: string;
  resumed!: boolean;

  static from(result: { sessionId: string; url: string; resumed: boolean }): BeginBiometricVerificationResponseDto {
    const dto = new BeginBiometricVerificationResponseDto();
    dto.sessionId = result.sessionId;
    dto.url = result.url;
    dto.resumed = result.resumed;
    return dto;
  }
}

export class TwoStageStatusResponseDto {
  documentCheckStatus!: string | null;
  biometricSessionStatus!: string | null;
  biometricSessionUrl!: string | null;
  overallStatus!: IdentityVerificationStatus;

  static from(status: {
    documentCheckStatus: string | null;
    biometricSessionStatus: string | null;
    biometricSessionUrl: string | null;
    overallStatus: IdentityVerificationStatus;
  }): TwoStageStatusResponseDto {
    const dto = new TwoStageStatusResponseDto();
    dto.documentCheckStatus = status.documentCheckStatus;
    dto.biometricSessionStatus = status.biometricSessionStatus;
    dto.biometricSessionUrl = status.biometricSessionUrl;
    dto.overallStatus = status.overallStatus;
    return dto;
  }
}
