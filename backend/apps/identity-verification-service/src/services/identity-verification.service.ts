import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { TravelClassification, DeclaredDuration } from '../entities/enums/identity-verification.enums';
import { SubmitDocumentRequestDto } from '../dto/request/submit-document.request.dto';

@Injectable()
export class IdentityVerificationService {
  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private readonly profileRepository: Repository<IdentityVerificationProfile>,
    @InjectRepository(IdentityDocument)
    private readonly documentRepository: Repository<IdentityDocument>,
    @InjectRepository(VerificationAttempt)
    private readonly attemptRepository: Repository<VerificationAttempt>,
  ) {}

  async getOrCreateProfile(userId: string): Promise<IdentityVerificationProfile> {
    throw new NotImplementedException('Implemented in Doc 05.');
  }

  async confirmHomeCountry(userId: string): Promise<IdentityVerificationProfile> {
    throw new NotImplementedException('Implemented in Doc 05. Must throw NoDetectedLocationException if detectedCountry is null.');
  }

  async recordTravelClassification(
    userId: string,
    classification: TravelClassification,
  ): Promise<IdentityVerificationProfile> {
    throw new NotImplementedException('Implemented in Doc 05.');
  }

  async recordTravelDuration(userId: string, duration: DeclaredDuration): Promise<IdentityVerificationProfile> {
    throw new NotImplementedException('Implemented in Doc 05. Must throw ClassificationRequiredException if classification is not temporarily_traveling.');
  }

  async createDocumentUploadUrl(
    userId: string,
    fileExtension: string,
  ): Promise<{ uploadUrl: string; documentImageReference: string; expiresAt: string }> {
    throw new NotImplementedException('Implemented in Doc 05 (Cloudflare R2 pre-signed URL — see Doc 03 §8).');
  }

  async submitDocument(userId: string, dto: SubmitDocumentRequestDto): Promise<IdentityDocument> {
    throw new NotImplementedException(
      'Implemented in Doc 05. Must run the duplicate-detection transaction from Doc 03 §8a and throw DuplicateDocumentException on a cross-profile match.',
    );
  }

  async startVerificationSession(
    userId: string,
    documentId: string,
  ): Promise<{ vendorSessionId: string; vendorSessionUrl: string; attemptNumber: number }> {
    throw new NotImplementedException(
      'Implemented in Doc 05. Must enforce the 3-attempt limit (Doc 03 §8b) via RetryLimitExceededException and check the VPN/proxy signal via VpnProxyDetectedException.',
    );
  }

  async listDocuments(userId: string): Promise<IdentityDocument[]> {
    throw new NotImplementedException('Implemented in Doc 05.');
  }

  async getStatusForInternalCaller(
    userId: string,
  ): Promise<Pick<IdentityVerificationProfile, 'identityVerificationStatus' | 'locationVerificationStatus'>> {
    throw new NotImplementedException('Implemented in Doc 05.');
  }

  async handleDiditWebhook(payload: unknown, signatureHeader: string | undefined): Promise<void> {
    throw new NotImplementedException(
      'Implemented in Doc 05. Must verify the HMAC signature (Doc 03 §10, SVC-30) before processing, and must be idempotent on vendor_session_id (Doc 03 §6c).',
    );
  }
}
