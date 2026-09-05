import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';
import {
  TravelClassification,
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  AttemptOutcome,
  VpnProxyDetectionResult,
} from '../entities/enums/identity-verification.enums';
import { SubmitDocumentRequestDto } from '../dto/request/submit-document.request.dto';
import { DiditWebhookPayloadDto } from '../dto/webhooks/didit-webhook.payload.dto';
import {
  DuplicateDocumentException,
  RetryLimitExceededException,
  ProfileNotFoundException,
  DocumentNotFoundException,
  NoDetectedLocationException,
  ClassificationRequiredException,
  InvalidWebhookSignatureException,
  UnknownVendorSessionException,
  VpnProxyDetectedException,
} from '../common/errors/domain-exceptions';
import { verifyDiditWebhookSignature } from '../common/utils/verify-didit-webhook-signature';
import {
  DocumentVerificationProvider,
  DOCUMENT_VERIFICATION_PROVIDER,
} from '../providers/document-verification/document-verification-provider.interface';
import {
  VpnProxyDetectionProvider,
  VPN_PROXY_DETECTION_PROVIDER,
} from '../providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import {
  ObjectStorageProvider,
  OBJECT_STORAGE_PROVIDER,
} from '../providers/storage/object-storage-provider.interface';
import {
  NotificationEventPublisher,
  NOTIFICATION_EVENT_PUBLISHER,
} from '../events/notification-event-publisher.interface';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';

const RETRY_LIMIT = 3;
const FIRST_REMINDER_DELAY_MS = 5 * 60 * 1000;

@Injectable()
export class IdentityVerificationService {
  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private readonly profileRepository: Repository<IdentityVerificationProfile>,
    @InjectRepository(IdentityDocument)
    private readonly documentRepository: Repository<IdentityDocument>,
    @InjectRepository(VerificationAttempt)
    private readonly attemptRepository: Repository<VerificationAttempt>,
    @InjectRepository(PendingVerificationSession)
    private readonly pendingSessionRepository: Repository<PendingVerificationSession>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(DOCUMENT_VERIFICATION_PROVIDER)
    private readonly documentVerificationProvider: DocumentVerificationProvider,
    @Inject(VPN_PROXY_DETECTION_PROVIDER)
    private readonly vpnProxyDetectionProvider: VpnProxyDetectionProvider,
    @Inject(OBJECT_STORAGE_PROVIDER)
    private readonly objectStorageProvider: ObjectStorageProvider,
    @Inject(NOTIFICATION_EVENT_PUBLISHER)
    private readonly events: NotificationEventPublisher,
  ) {}

  async getOrCreateProfile(userId: string): Promise<IdentityVerificationProfile> {
    const existing = await this.profileRepository.findOne({ where: { userId } });
    if (existing) return existing;
    const created = this.profileRepository.create({ userId });
    return this.profileRepository.save(created);
  }

  async confirmHomeCountry(userId: string): Promise<IdentityVerificationProfile> {
    const profile = await this.getOrCreateProfile(userId);
    if (!profile.detectedCountry) {
      throw new NoDetectedLocationException();
    }
    const previousCountry = profile.verifiedHomeCountry;
    const isFirstConfirmation = profile.locationVerificationStatus !== LocationVerificationStatus.VERIFIED;

    profile.verifiedHomeCountry = profile.detectedCountry;
    profile.verifiedHomeCountryConfirmedAt = new Date();
    profile.locationVerificationStatus = LocationVerificationStatus.VERIFIED;
    const saved = await this.profileRepository.save(profile);

    if (isFirstConfirmation) {
      await this.events.publish({
        eventType: IdentityVerificationEventType.LOCATION_VERIFIED,
        profileId: saved.id,
        userId,
        occurredAt: new Date().toISOString(),
      });
    } else if (previousCountry !== saved.verifiedHomeCountry) {
      await this.events.publish({
        eventType: IdentityVerificationEventType.HOME_COUNTRY_UPDATED,
        profileId: saved.id,
        userId,
        occurredAt: new Date().toISOString(),
      });
    }
    return saved;
  }

  async recordTravelClassification(
    userId: string,
    classification: TravelClassification,
  ): Promise<IdentityVerificationProfile> {
    const profile = await this.getOrCreateProfile(userId);
    profile.travelClassification = classification;
    return this.profileRepository.save(profile);
  }

  async recordTravelDuration(
    userId: string,
    duration: DeclaredDuration,
  ): Promise<IdentityVerificationProfile> {
    const profile = await this.getOrCreateProfile(userId);
    if (profile.travelClassification !== TravelClassification.TEMPORARILY_TRAVELING) {
      throw new ClassificationRequiredException();
    }
    const now = new Date();
    profile.declaredDuration = duration;
    profile.travelModeActive = true;
    profile.travelModeActivatedAt = now;
    profile.nextTravelReminderAt = new Date(now.getTime() + FIRST_REMINDER_DELAY_MS);
    const saved = await this.profileRepository.save(profile);

    await this.events.publish({
      eventType: IdentityVerificationEventType.TRAVEL_MODE_ACTIVATED,
      profileId: saved.id,
      userId,
      occurredAt: now.toISOString(),
    });
    return saved;
  }

  async createDocumentUploadUrl(
    userId: string,
    fileExtension: string,
  ): Promise<{ uploadUrl: string; documentImageReference: string; expiresAt: string }> {
    const profile = await this.getOrCreateProfile(userId);
    const result = await this.objectStorageProvider.createUploadUrl({
      profileId: profile.id,
      fileExtension,
    });
    return {
      uploadUrl: result.uploadUrl,
      documentImageReference: result.objectKey,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  async submitDocument(
    userId: string,
    dto: SubmitDocumentRequestDto,
  ): Promise<IdentityDocument> {
    const profile = await this.getOrCreateProfile(userId);
    const documentNumberNormalized = dto.documentNumber.trim().toUpperCase();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SELECT pg_advisory_xact_lock(hashtext($1 || $2 || $3))', [
        documentNumberNormalized,
        dto.issuingCountry,
        dto.documentType,
      ]);

      const matches: Array<{ id: string; profile_id: string }> = await queryRunner.query(
        `SELECT id, profile_id FROM identity_verification.identity_documents
         WHERE document_number_normalized = $1 AND issuing_country = $2
           AND document_type = $3 AND profile_id <> $4
         LIMIT 1`,
        [documentNumberNormalized, dto.issuingCountry, dto.documentType, profile.id],
      );
      const duplicate = matches[0];

      const document = queryRunner.manager.create(IdentityDocument, {
        profileId: profile.id,
        documentType: dto.documentType,
        issuingCountry: dto.issuingCountry,
        documentNumber: dto.documentNumber,
        documentNumberNormalized,
        expirationDate: dto.expirationDate,
        issuingState: dto.issuingState ?? null,
        captureMethod: dto.captureMethod,
        documentImageReference: dto.documentImageReference,
        isDuplicateMatch: !!duplicate,
        duplicateOfDocumentId: duplicate ? duplicate.id : null,
      });
      const saved = await queryRunner.manager.save(document);

      if (duplicate) {
        await queryRunner.manager.update(IdentityVerificationProfile, profile.id, {
          identityVerificationStatus: IdentityVerificationStatus.REJECTED_BLOCKED,
        });
        await queryRunner.commitTransaction();
        throw new DuplicateDocumentException({ documentId: saved.id });
      }

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async startVerificationSession(
    userId: string,
    documentId: string,
  ): Promise<{ vendorSessionId: string; vendorSessionUrl: string; attemptNumber: number }> {
    const profile = await this.getOrCreateProfile(userId);
    const document = await this.documentRepository.findOne({
      where: { id: documentId, profileId: profile.id },
    });
    if (!document) throw new DocumentNotFoundException();

    const existingAttempts = await this.attemptRepository.count({
      where: { profileId: profile.id, documentId: document.id },
    });
    const pendingSessions = await this.pendingSessionRepository.count({
      where: { profileId: profile.id, documentId: document.id },
    });
    if (existingAttempts + pendingSessions >= RETRY_LIMIT) {
      throw new RetryLimitExceededException();
    }

    const vpnProxyResult = await this.vpnProxyDetectionProvider.detect({ ipAddress: '' });
    if (vpnProxyResult !== VpnProxyDetectionResult.NONE) {
      throw new VpnProxyDetectedException();
    }

    const session = await this.documentVerificationProvider.startVerificationSession({
      documentId: document.id,
      documentType: document.documentType,
      issuingCountry: document.issuingCountry,
      documentImageReference: document.documentImageReference,
    });

    const attemptNumber = existingAttempts + pendingSessions + 1;
    const pendingSession = this.pendingSessionRepository.create({
      profileId: profile.id,
      documentId: document.id,
      vendorSessionId: session.vendorSessionId,
      attemptMethod: document.captureMethod,
      attemptDocumentType: document.documentType,
      attemptNumber,
      vpnProxyDetectionResult: vpnProxyResult,
    });
    await this.pendingSessionRepository.save(pendingSession);

    return {
      vendorSessionId: session.vendorSessionId,
      vendorSessionUrl: session.vendorSessionUrl,
      attemptNumber,
    };
  }

  async listDocuments(userId: string): Promise<IdentityDocument[]> {
    const profile = await this.getOrCreateProfile(userId);
    return this.documentRepository.find({ where: { profileId: profile.id } });
  }

  async getStatusForInternalCaller(
    userId: string,
  ): Promise<Pick<IdentityVerificationProfile, 'identityVerificationStatus' | 'locationVerificationStatus'>> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new ProfileNotFoundException();
    return {
      identityVerificationStatus: profile.identityVerificationStatus,
      locationVerificationStatus: profile.locationVerificationStatus,
    };
  }

  async handleDiditWebhook(
    payload: DiditWebhookPayloadDto,
    signatureHeader: string | undefined,
    rawBody: Buffer,
  ): Promise<void> {
    const verified = verifyDiditWebhookSignature(
      rawBody,
      signatureHeader,
      process.env.DIDIT_WEBHOOK_SECRET as string,
    );
    if (!verified) throw new InvalidWebhookSignatureException();

    const existingAttempt = await this.attemptRepository.findOne({
      where: { vendorSessionId: payload.vendorSessionId },
    });
    if (existingAttempt) {
      return;
    }

    const pendingSession = await this.pendingSessionRepository.findOne({
      where: { vendorSessionId: payload.vendorSessionId },
    });
    if (!pendingSession) throw new UnknownVendorSessionException();

    const raw = payload.raw as { outcome?: string; failure_code?: string } | undefined;
    const outcome = raw?.outcome ?? AttemptOutcome.ERROR;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const attempt = queryRunner.manager.create(VerificationAttempt, {
        profileId: pendingSession.profileId,
        documentId: pendingSession.documentId,
        vendorSessionId: pendingSession.vendorSessionId,
        attemptMethod: pendingSession.attemptMethod,
        attemptDocumentType: pendingSession.attemptDocumentType,
        attemptOutcome: outcome,
        attemptNumber: pendingSession.attemptNumber,
        vpnProxyDetectionResult: pendingSession.vpnProxyDetectionResult,
        failureCode: raw?.failure_code ?? null,
      });
      const savedAttempt = await queryRunner.manager.save(attempt);
      await queryRunner.manager.delete(PendingVerificationSession, pendingSession.id);

      if (outcome === AttemptOutcome.APPROVED) {
        await queryRunner.manager.update(IdentityVerificationProfile, savedAttempt.profileId, {
          identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
        });
      }
      await queryRunner.commitTransaction();

      if (outcome === AttemptOutcome.APPROVED) {
        const profile = await this.profileRepository.findOne({ where: { id: savedAttempt.profileId } });
        await this.events.publish({
          eventType: IdentityVerificationEventType.IDENTITY_VERIFIED,
          profileId: savedAttempt.profileId,
          userId: profile?.userId || payload.vendorSessionId,
          occurredAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
