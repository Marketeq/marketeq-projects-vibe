import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { IdentityVerificationStatus } from '../entities/enums/identity-verification.enums';
import { VerificationStatusResponseDto, VerificationAttemptResponseDto } from '../dto/verification.dto';
import { LocationService } from './location.service';

@Injectable()
export class VerificationService {
  private readonly ATTEMPT_LIMIT = 3;

  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private profileRepository: Repository<IdentityVerificationProfile>,
    @InjectRepository(VerificationAttempt)
    private attemptRepository: Repository<VerificationAttempt>,
    private locationService: LocationService,
  ) {}

  async getVerificationStatus(userId: string): Promise<VerificationStatusResponseDto> {
    const profile = await this.locationService.getOrCreateProfile(userId);

    const attemptCount = await this.attemptRepository.count({
      where: { profileId: profile.id },
    });

    return {
      userId: profile.userId,
      identityVerificationStatus: profile.identityVerificationStatus,
      identityRejectionReason: profile.identityRejectionReason,
      locationVerificationStatus: profile.locationVerificationStatus,
      verifiedHomeCountry: profile.verifiedHomeCountry,
      attemptCount,
      attemptLimit: this.ATTEMPT_LIMIT,
      canRetry: attemptCount < this.ATTEMPT_LIMIT,
    };
  }

  async createAttempt(
    profileId: string,
    documentId: string | null,
    vendorSessionId: string,
    attemptMethod: string,
    attemptDocumentType: string,
  ): Promise<VerificationAttemptResponseDto> {
    const attemptCount = await this.attemptRepository.count({ where: { profileId } });

    if (attemptCount >= this.ATTEMPT_LIMIT) {
      throw new BadRequestException('Attempt limit reached');
    }

    const attempt = this.attemptRepository.create({
      profileId,
      documentId,
      vendorSessionId,
      attemptMethod: attemptMethod as any,
      attemptDocumentType: attemptDocumentType as any,
      attemptNumber: attemptCount + 1,
      attemptOutcome: 'pending',
    });

    await this.attemptRepository.save(attempt);

    return this.mapAttemptToResponse(attempt);
  }

  async completeAttempt(
    vendorSessionId: string,
    outcome: string,
    failureCode?: string,
    verificationDepth?: string,
  ): Promise<VerificationAttemptResponseDto> {
    const attempt = await this.attemptRepository.findOne({
      where: { vendorSessionId },
      relations: ['profile'],
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with session ${vendorSessionId} not found`);
    }

    attempt.attemptOutcome = outcome;
    attempt.failureCode = failureCode || null;

    await this.attemptRepository.save(attempt);

    if (outcome === 'approved') {
      const profile = attempt.profile;
      profile.identityVerificationStatus = IdentityVerificationStatus.VERIFIED;

      if (verificationDepth) {
        if (attempt.document) {
          attempt.document.verificationDepth = verificationDepth as any;
          await this.attemptRepository.manager.save(attempt.document);
        }
      }

      await this.profileRepository.save(profile);
    } else if (outcome === 'rejected') {
      const profile = attempt.profile;
      profile.identityVerificationStatus = IdentityVerificationStatus.REJECTED_BLOCKED;
      profile.identityRejectionReason = failureCode || 'Document verification failed';

      await this.profileRepository.save(profile);
    }

    return this.mapAttemptToResponse(attempt);
  }

  async getAttemptHistory(userId: string): Promise<VerificationAttemptResponseDto[]> {
    const profile = await this.locationService.getOrCreateProfile(userId);

    const attempts = await this.attemptRepository.find({
      where: { profileId: profile.id },
      order: { attemptTimestamp: 'DESC' },
    });

    return attempts.map((attempt) => this.mapAttemptToResponse(attempt));
  }

  async updateIdentityStatus(
    profileId: string,
    status: string,
    rejectionReason?: string,
  ): Promise<void> {
    const profile = await this.profileRepository.findOne({ where: { id: profileId } });

    if (!profile) {
      throw new NotFoundException(`Profile ${profileId} not found`);
    }

    profile.identityVerificationStatus = status as any;
    profile.identityRejectionReason = rejectionReason || null;

    await this.profileRepository.save(profile);
  }

  private mapAttemptToResponse(attempt: VerificationAttempt): VerificationAttemptResponseDto {
    return {
      id: attempt.id,
      profileId: attempt.profileId,
      documentId: attempt.documentId,
      vendorSessionId: attempt.vendorSessionId,
      attemptTimestamp: attempt.attemptTimestamp,
      attemptOutcome: attempt.attemptOutcome,
      failureCode: attempt.failureCode,
      attemptNumber: attempt.attemptNumber,
      vpnProxyDetectionResult: attempt.vpnProxyDetectionResult,
    };
  }
}
