import { IdentityVerificationService } from './identity-verification.service';
import {
  AttemptOutcome,
  DocumentType,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
  VpnProxyDetectionResult,
} from '../entities/enums/identity-verification.enums';
import { RetryLimitExceededException } from '../common/errors/domain-exceptions';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';

const ORIGINAL_PEPPER = process.env.DOCUMENT_NUMBER_HASH_PEPPER;

describe('IdentityVerificationService', () => {
  beforeAll(() => {
    process.env.DOCUMENT_NUMBER_HASH_PEPPER = 'test-pepper';
  });
  afterAll(() => {
    process.env.DOCUMENT_NUMBER_HASH_PEPPER = ORIGINAL_PEPPER;
  });

  const buildFakeQueryRunner = () => {
    const manager = {
      create: jest.fn((_entity: unknown, data: unknown) => data),
      save: jest.fn((data: any) => Promise.resolve({ id: 'attempt-1', ...data })),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0),
    };
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      isTransactionActive: true,
      query: jest.fn().mockResolvedValue([]),
      manager,
    };
  };

  const buildService = (overrides: {
    queryRunner?: ReturnType<typeof buildFakeQueryRunner>;
    profileRepository?: Record<string, jest.Mock>;
    documentRepository?: Record<string, jest.Mock>;
    attemptRepository?: Record<string, jest.Mock>;
    pendingSessionRepository?: Record<string, jest.Mock>;
    vpnProxyResult?: VpnProxyDetectionResult;
  } = {}) => {
    const queryRunner = overrides.queryRunner ?? buildFakeQueryRunner();
    const dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };
    const profileRepository = {
      findOne: jest.fn(),
      create: jest.fn((data: any) => data),
      save: jest.fn((data: any) => Promise.resolve({ id: 'profile-1', ...data })),
      update: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
      ...overrides.profileRepository,
    };
    const documentRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      ...overrides.documentRepository,
    };
    const attemptRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      ...overrides.attemptRepository,
    };
    const pendingSessionRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((data: any) => data),
      save: jest.fn((data: any) => Promise.resolve(data)),
      ...overrides.pendingSessionRepository,
    };
    const documentVerificationProvider = {
      startVerificationSession: jest
        .fn()
        .mockResolvedValue({ vendorSessionId: 'vendor-session-1', vendorSessionUrl: 'https://vendor/session-1' }),
    };
    const vpnProxyDetectionProvider = {
      detect: jest.fn().mockResolvedValue(overrides.vpnProxyResult ?? VpnProxyDetectionResult.NONE),
    };
    const objectStorageProvider = { createUploadUrl: jest.fn() };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };

    const service = new IdentityVerificationService(
      profileRepository as any,
      documentRepository as any,
      attemptRepository as any,
      pendingSessionRepository as any,
      dataSource as any,
      documentVerificationProvider as any,
      vpnProxyDetectionProvider as any,
      objectStorageProvider as any,
      events as any,
    );

    return {
      service,
      queryRunner,
      profileRepository,
      documentRepository,
      attemptRepository,
      pendingSessionRepository,
      documentVerificationProvider,
      vpnProxyDetectionProvider,
      events,
    };
  };

  describe('recordTravelClassification (SVC-07)', () => {
    it('resets location status to NOT_VERIFIED for PERMANENTLY_RELOCATED', async () => {
      const profile = {
        userId: 'user-1',
        locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      } as IdentityVerificationProfile;
      const { service, profileRepository } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
      });

      await service.recordTravelClassification('user-1', TravelClassification.PERMANENTLY_RELOCATED);

      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED }),
      );
    });

    it('leaves location status untouched for TEMPORARILY_TRAVELING', async () => {
      const profile = {
        userId: 'user-1',
        locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      } as IdentityVerificationProfile;
      const { service, profileRepository } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
      });

      await service.recordTravelClassification('user-1', TravelClassification.TEMPORARILY_TRAVELING);

      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ locationVerificationStatus: LocationVerificationStatus.VERIFIED }),
      );
    });
  });

  describe('startVerificationSession — account-wide attempt ceiling', () => {
    const profile = { id: 'profile-1', userId: 'user-1' } as IdentityVerificationProfile;
    const document = {
      id: 'doc-1',
      profileId: 'profile-1',
      documentType: DocumentType.PASSPORT,
      captureMethod: 'scan',
    } as unknown as IdentityDocument;

    it('throws RetryLimitExceededException once the ACCOUNT-WIDE total (across any document) reaches 3', async () => {
      const { service } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
        documentRepository: { findOne: jest.fn().mockResolvedValue(document) },
        // 2 settled attempts + 1 pending session = 3, regardless of which
        // document they were against — this is the account-wide scope fix.
        attemptRepository: { count: jest.fn().mockResolvedValue(2) },
        pendingSessionRepository: { count: jest.fn().mockResolvedValue(1) },
      });

      await expect(service.startVerificationSession('user-1', 'doc-1')).rejects.toBeInstanceOf(
        RetryLimitExceededException,
      );
    });

    it('sets status to IN_PROGRESS once the vendor session is created', async () => {
      const { service, profileRepository } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
        documentRepository: { findOne: jest.fn().mockResolvedValue(document) },
      });

      const result = await service.startVerificationSession('user-1', 'doc-1');

      expect(result.attemptNumber).toBe(1);
      expect(profileRepository.update).toHaveBeenCalledWith('profile-1', {
        identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS,
      });
    });
  });

  describe('getStatusForInternalCaller — gate predicates (TRVG2 §2)', () => {
    it('is_verified true, in_grace false, gate_open true when both statuses are VERIFIED', async () => {
      const profile = {
        id: 'profile-1',
        identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
        locationVerificationStatus: LocationVerificationStatus.VERIFIED,
        expiredAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      } as IdentityVerificationProfile;
      const { service } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
      });

      const status = await service.getStatusForInternalCaller('user-1');

      expect(status).toMatchObject({ isVerified: true, inGrace: false, gateOpen: true, attemptCount: 0 });
    });

    it('gate_open stays true within the 30-day grace window even though is_verified is false', async () => {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const profile = {
        id: 'profile-1',
        identityVerificationStatus: IdentityVerificationStatus.EXPIRED,
        locationVerificationStatus: LocationVerificationStatus.VERIFIED,
        expiredAt: fifteenDaysAgo,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      } as IdentityVerificationProfile;
      const { service } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
      });

      const status = await service.getStatusForInternalCaller('user-1');

      expect(status.isVerified).toBe(false);
      expect(status.inGrace).toBe(true);
      expect(status.gateOpen).toBe(true);
      expect(status.failureReason).toBe('document_expired');
    });

    it('gate_open is false once the 30-day grace window has passed', async () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const profile = {
        id: 'profile-1',
        identityVerificationStatus: IdentityVerificationStatus.EXPIRED,
        locationVerificationStatus: LocationVerificationStatus.VERIFIED,
        expiredAt: fortyDaysAgo,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      } as IdentityVerificationProfile;
      const { service } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
      });

      const status = await service.getStatusForInternalCaller('user-1');

      expect(status.inGrace).toBe(false);
      expect(status.gateOpen).toBe(false);
    });
  });

  describe('submitDocument — duplicate detection (SVC-17)', () => {
    it('never stores the plaintext document number as the fingerprint, and blocks with BLOCKED_DUPLICATE on a match', async () => {
      const profile = { id: 'profile-1', userId: 'user-1' } as IdentityVerificationProfile;
      const queryRunner = buildFakeQueryRunner();
      queryRunner.query = jest
        .fn()
        // 1st call: advisory lock (no rows)
        .mockResolvedValueOnce([])
        // 2nd call: duplicate lookup — a match under a different profile
        .mockResolvedValueOnce([{ id: 'other-doc', profile_id: 'other-profile' }]);

      const { service, profileRepository } = buildService({
        queryRunner,
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
      });

      const dto = {
        documentType: DocumentType.PASSPORT,
        issuingCountry: 'US',
        documentNumber: ' x1234567 ',
        expirationDate: '2030-01-01',
        captureMethod: 'scan',
        documentImageReference: 'ref-1',
      } as any;

      await expect(service.submitDocument('user-1', dto)).rejects.toMatchObject({
        code: 'DUPLICATE_DOCUMENT',
      });

      const createdDocument = queryRunner.manager.create.mock.calls[0][1] as {
        documentNumberNormalized: string;
      };
      expect(createdDocument.documentNumberNormalized).not.toContain('X1234567');
      expect(createdDocument.documentNumberNormalized).toMatch(/^[0-9a-f]{64}$/);
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        expect.anything(),
        'profile-1',
        { identityVerificationStatus: IdentityVerificationStatus.BLOCKED_DUPLICATE },
      );
      expect(profileRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('handleDiditWebhook — state transitions (TRVG2 §3)', () => {
    const buildPendingSession = () =>
      ({
        id: 'pending-1',
        profileId: 'profile-1',
        documentId: 'doc-1',
        vendorSessionId: 'vendor-session-1',
        attemptMethod: 'scan',
        attemptDocumentType: DocumentType.PASSPORT,
        attemptNumber: 1,
        vpnProxyDetectionResult: VpnProxyDetectionResult.NONE,
      }) as unknown as PendingVerificationSession;

    const buildPayload = (raw: Record<string, unknown>) => ({
      vendorSessionId: 'vendor-session-1',
      eventType: 'verification.result',
      occurredAt: new Date().toISOString(),
      raw,
    });

    beforeEach(() => {
      process.env.DIDIT_WEBHOOK_SECRET = 'webhook-secret';
    });

    const signedRawBody = () => {
      // verifyDiditWebhookSignature does a real HMAC check; use it to sign.
      const { createHmac } = require('crypto');
      const body = Buffer.from('{}');
      const signature = createHmac('sha256', 'webhook-secret').update(body).digest('hex');
      return { body, signature };
    };

    it('transitions REJECTED to FAILED when the account-wide attempt total stays under the ceiling', async () => {
      const { body, signature } = signedRawBody();
      const queryRunner = buildFakeQueryRunner();
      queryRunner.manager.count = jest.fn().mockResolvedValue(0); // this will be attempt #1

      const { service } = buildService({
        queryRunner,
        pendingSessionRepository: { findOne: jest.fn().mockResolvedValue(buildPendingSession()) },
      });

      await service.handleDiditWebhook(
        buildPayload({ outcome: AttemptOutcome.REJECTED }) as any,
        signature,
        body,
      );

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        expect.anything(),
        'profile-1',
        { identityVerificationStatus: IdentityVerificationStatus.FAILED },
      );
    });

    it('transitions REJECTED to FAILED_FINAL and stamps failedFinalAt once the ceiling is reached', async () => {
      const { body, signature } = signedRawBody();
      const queryRunner = buildFakeQueryRunner();
      queryRunner.manager.count = jest.fn().mockResolvedValue(2); // this will be attempt #3

      const { service } = buildService({
        queryRunner,
        pendingSessionRepository: { findOne: jest.fn().mockResolvedValue(buildPendingSession()) },
      });

      await service.handleDiditWebhook(
        buildPayload({ outcome: AttemptOutcome.REJECTED }) as any,
        signature,
        body,
      );

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        expect.anything(),
        'profile-1',
        {
          identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL,
          failedFinalAt: expect.any(Date),
        },
      );
    });

    it('transitions APPROVED to VERIFIED and publishes IDENTITY_VERIFIED', async () => {
      const { body, signature } = signedRawBody();
      const { service, events, profileRepository } = buildService({
        pendingSessionRepository: { findOne: jest.fn().mockResolvedValue(buildPendingSession()) },
        profileRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'profile-1', userId: 'user-1' }),
        },
      });

      await service.handleDiditWebhook(
        buildPayload({ outcome: AttemptOutcome.APPROVED }) as any,
        signature,
        body,
      );

      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'identity_verified' }),
      );
    });

    it('is idempotent: a vendor_session_id already recorded as an attempt is a no-op', async () => {
      const { service, pendingSessionRepository, queryRunner } = buildService({
        attemptRepository: { findOne: jest.fn().mockResolvedValue({ id: 'existing-attempt' }) },
      });
      const { body, signature } = signedRawBody();

      await service.handleDiditWebhook(buildPayload({ outcome: AttemptOutcome.APPROVED }) as any, signature, body);

      expect(pendingSessionRepository.findOne).not.toHaveBeenCalled();
      expect(queryRunner.connect).not.toHaveBeenCalled();
    });
  });
});
