import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { HostedKycSession } from '../entities/hosted-kyc-session.entity';
import { HostedKycSessionPurpose, HostedKycSessionStatus } from '../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import {
  ACTIVE_HOSTED_SESSION_STATUSES,
  getHostedKycCycleAttemptCount,
} from '../common/attempt-limit/hosted-kyc-attempt-cycle';
import { buildVerificationSummary, VerificationSummary } from '../common/status/verification-summary';
import { isUnfinishedSessionResumable } from '../common/status/unfinished-session-resumability';
import { HOME_COUNTRY_CONFIRMATION_WINDOW_MS } from './free-kyc.service';

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
    const hasUnfinishedCreatedOrInProgress = resumable !== null && resumable !== undefined;
    // continue_identity only while the confirmation the session was started under is
    // still current (15 minutes); past that the user restarts from location detection.
    // Ordinary verification only: a home-country change is resumed under its own
    // pending-claim rules, which this does not alter.
    const ordinary =
      !profile.pendingHomeCountry && resumable?.purpose === HostedKycSessionPurpose.IDENTITY_VERIFICATION;
    const hasResumable =
      hasUnfinishedCreatedOrInProgress &&
      (!ordinary ||
        isUnfinishedSessionResumable({
          confirmedAt: profile.verifiedHomeCountryConfirmedAt,
          sessionCreatedAt: resumable.createdAt,
          nowMs,
          windowMs: HOME_COUNTRY_CONFIRMATION_WINDOW_MS,
        }));
    const inReview = hasUnfinishedCreatedOrInProgress
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
      hasUnfinishedHostedSession: hasUnfinishedCreatedOrInProgress || (inReview !== null && inReview !== undefined),
      verifiedHomeCountry: profile.verifiedHomeCountry,
      verifiedHomeCountryConfirmedAt: profile.verifiedHomeCountryConfirmedAt,
      travelModeActive: profile.travelModeActive,
      travelClassification: profile.travelClassification,
      travelModeActivatedAt: profile.travelModeActivatedAt,
      declaredDuration: profile.declaredDuration,
      pendingHomeCountry: profile.pendingHomeCountry,
      pendingHomeCountryConfirmedAt: profile.pendingHomeCountryConfirmedAt,
      nowMs,
    });
  }
}
