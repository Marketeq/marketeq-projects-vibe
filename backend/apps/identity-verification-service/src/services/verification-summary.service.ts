import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { HostedKycSession } from '../entities/hosted-kyc-session.entity';
import { HostedKycSessionStatus } from '../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import {
  ACTIVE_HOSTED_SESSION_STATUSES,
  getHostedKycCycleAttemptCount,
} from '../common/attempt-limit/hosted-kyc-attempt-cycle';
import { buildVerificationSummary, VerificationSummary } from '../common/status/verification-summary';

// Read-only: computes the backward-compatible verification summary for a profile
// from hosted Free KYC data only (current-cycle attempts and the existence of an
// unfinished hosted session). Legacy document-pipeline rows never count, and
// nothing here writes, locks, or calls Didit.
@Injectable()
export class VerificationSummaryService {
  constructor(
    @InjectRepository(HostedKycSession)
    private readonly sessionRepository: Repository<HostedKycSession>,
    @InjectRepository(VerificationAttempt)
    private readonly attemptRepository: Repository<VerificationAttempt>,
  ) {}

  async summarize(profile: IdentityVerificationProfile, nowMs: number = Date.now()): Promise<VerificationSummary> {
    const hostedCycleAttempts = await getHostedKycCycleAttemptCount(
      { sessionRepository: this.sessionRepository, attemptRepository: this.attemptRepository },
      profile.id,
    );
    // Resumable (created / in progress) drives continue_identity. "Unfinished" also
    // includes a session waiting in review, and is what hasActiveSession reports.
    const resumable = await this.sessionRepository.findOne({
      where: { profileId: profile.id, status: In(ACTIVE_HOSTED_SESSION_STATUSES) },
    });
    const hasResumable = resumable !== null && resumable !== undefined;
    const inReview = hasResumable
      ? null
      : await this.sessionRepository.findOne({
          where: { profileId: profile.id, status: In([HostedKycSessionStatus.IN_REVIEW]) },
        });

    return buildVerificationSummary({
      identityStatus: profile.identityVerificationStatus,
      locationStatus: profile.locationVerificationStatus,
      failedFinalAt: profile.failedFinalAt,
      hostedCycleAttempts,
      hasActiveHostedSession: hasResumable,
      hasUnfinishedHostedSession: hasResumable || (inReview !== null && inReview !== undefined),
      verifiedHomeCountry: profile.verifiedHomeCountry,
      verifiedHomeCountryConfirmedAt: profile.verifiedHomeCountryConfirmedAt,
      travelModeActive: profile.travelModeActive,
      travelClassification: profile.travelClassification,
      travelModeActivatedAt: profile.travelModeActivatedAt,
      declaredDuration: profile.declaredDuration,
      nowMs,
    });
  }
}
