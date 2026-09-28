import { createHmac } from 'crypto';
import { TwoStageVerificationService } from './two-stage-verification.service';
import {
  DocumentCheckStatus,
  BiometricSessionStatus,
  IdentityVerificationStatus,
} from '../entities/enums/identity-verification.enums';
import {
  DocumentNotFoundException,
  ProfileNotFoundException,
  DocumentNotEligibleForBiometricVerificationException,
  VendorStageUnavailableException,
  VendorOutcomeUnknownException,
  UnknownBiometricSessionException,
  DuplicateDocumentException,
  RetryLimitExceededException,
} from '../common/errors/domain-exceptions';
import {
  AmbiguousVendorOutcomeError,
  VendorTransportError,
} from '../providers/document-verification/standalone-id-verification.errors';
import { ObjectNotFoundError } from '../providers/storage/object-storage.errors';
import { VendorTransportError as SessionTransportError } from '../providers/biometric-session/hosted-biometric-session.errors';
import {
  InvalidDiditWebhookSignatureError,
  ExpiredOrInvalidDiditWebhookTimestampError,
} from '../providers/webhooks/didit-webhook-verification.errors';

// Offline only: every repository and vendor provider is a Jest mock. No
// database, no network, no real Didit calls.
describe('TwoStageVerificationService', () => {
  const webhookSecret = 'test-webhook-secret';

  const buildFakeQueryRunner = () => {
    const manager = {
      create: jest.fn((_entity: unknown, data: any) => data),
      save: jest.fn((d: any) => Promise.resolve({ id: 'reservation-1', ...d })),
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

  function buildService(overrides: Partial<Record<string, any>> = {}) {
    const profile = { id: 'profile-1', userId: 'user-1', identityVerificationStatus: IdentityVerificationStatus.UNSTARTED };
    const document = {
      id: 'doc-1',
      profileId: 'profile-1',
      issuingCountry: 'US',
      documentType: 'passport',
      documentImageReference: 'front-key',
      backImageReference: null,
      documentNumber: null,
      expirationDate: null,
      documentCheckStatus: null,
      documentCheckWarnings: null,
      documentCheckImageHash: null,
      documentCheckRequestId: null,
      documentCheckedAt: null,
    };

    const documentRepository = {
      findOne: jest.fn().mockResolvedValue(document),
      save: jest.fn((d: any) => Promise.resolve(d)),
      count: jest.fn().mockResolvedValue(0),
      ...overrides.documentRepository,
    };
    const profileRepository = {
      findOne: jest.fn().mockResolvedValue(profile),
      save: jest.fn((p: any) => Promise.resolve(p)),
      ...overrides.profileRepository,
    };
    const biometricSessionRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d: any) => d),
      save: jest.fn((d: any) => Promise.resolve({ id: 'session-row-1', createdAt: new Date(), updatedAt: new Date(), ...d })),
      ...overrides.biometricSessionRepository,
    };
    const processedWebhookEventRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue(undefined),
      ...overrides.processedWebhookEventRepository,
    };
    const attemptRepository = {
      count: jest.fn().mockResolvedValue(0),
      ...overrides.attemptRepository,
    };
    const pendingSessionRepository = {
      count: jest.fn().mockResolvedValue(0),
      ...overrides.pendingSessionRepository,
    };
    const reservationRepository = {
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue(undefined),
      ...overrides.reservationRepository,
    };
    const queryRunner = overrides.queryRunner ?? buildFakeQueryRunner();
    const dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner), ...overrides.dataSource };
    const objectStorageProvider = {
      getObject: jest.fn().mockResolvedValue({ bytes: Buffer.from('front-bytes'), contentType: 'image/jpeg' }),
      ...overrides.objectStorageProvider,
    };
    const documentCheckProvider = {
      checkDocument: jest.fn().mockResolvedValue({
        requestId: 'req-1',
        status: 'Approved',
        warnings: [],
        portraitImage: 'base64portrait',
        documentNumber: null,
        expirationDate: null,
      }),
      ...overrides.documentCheckProvider,
    };
    const hostedSessionProvider = {
      createSession: jest.fn().mockResolvedValue({ sessionId: 'didit-sess-1', url: 'https://verify.didit.me/session/abc', status: 'Not Started' }),
      fetchPortraitFromDocumentCheckSession: jest.fn().mockResolvedValue('base64portrait'),
      ...overrides.hostedSessionProvider,
    };

    const service = new TwoStageVerificationService(
      documentRepository as any,
      profileRepository as any,
      biometricSessionRepository as any,
      processedWebhookEventRepository as any,
      attemptRepository as any,
      pendingSessionRepository as any,
      reservationRepository as any,
      dataSource as any,
      objectStorageProvider as any,
      documentCheckProvider as any,
      hostedSessionProvider as any,
    );

    return {
      service,
      document,
      profile,
      documentRepository,
      profileRepository,
      biometricSessionRepository,
      processedWebhookEventRepository,
      attemptRepository,
      pendingSessionRepository,
      reservationRepository,
      queryRunner,
      dataSource,
      objectStorageProvider,
      documentCheckProvider,
      hostedSessionProvider,
    };
  }

  beforeEach(() => {
    process.env.DIDIT_WEBHOOK_SECRET = webhookSecret;
    process.env.DIDIT_BIOMETRIC_WORKFLOW_ID = 'wf-1';
    process.env.DIDIT_EXPECTED_ENVIRONMENT = 'sandbox';
    process.env.DOCUMENT_NUMBER_HASH_PEPPER = 'test-pepper';
    delete process.env.DIDIT_APPLICATION_ID;
  });

  afterEach(() => {
    delete process.env.DIDIT_WEBHOOK_SECRET;
    delete process.env.DIDIT_BIOMETRIC_WORKFLOW_ID;
    delete process.env.DIDIT_EXPECTED_ENVIRONMENT;
    delete process.env.DOCUMENT_NUMBER_HASH_PEPPER;
    delete process.env.DIDIT_APPLICATION_ID;
  });

  // --- Ownership ---
  describe('ownership', () => {
    it('throws ProfileNotFoundException when no profile exists for the caller', async () => {
      const { service } = buildService({ profileRepository: { findOne: jest.fn().mockResolvedValue(null) } });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        ProfileNotFoundException,
      );
    });

    it('throws DocumentNotFoundException when the document does not belong to the caller\'s profile', async () => {
      const { service } = buildService({ documentRepository: { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() } });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-999')).rejects.toBeInstanceOf(
        DocumentNotFoundException,
      );
    });
  });

  // --- Front/back requirements ---
  describe('front/back image handling', () => {
    it('submits only the front image when no back image is on file', async () => {
      const { service, documentCheckProvider, objectStorageProvider } = buildService();
      await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(objectStorageProvider.getObject).toHaveBeenCalledTimes(1);
      const call = documentCheckProvider.checkDocument.mock.calls[0][0];
      expect(call.backImage).toBeUndefined();
    });

    it('submits both front and back images when a back reference exists', async () => {
      const { service, documentCheckProvider, objectStorageProvider } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({
            id: 'doc-1',
            profileId: 'profile-1',
            documentImageReference: 'front-key',
            backImageReference: 'back-key',
            documentCheckStatus: null,
            documentCheckImageHash: null,
          }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
      });
      await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(objectStorageProvider.getObject).toHaveBeenCalledTimes(2);
      const call = documentCheckProvider.checkDocument.mock.calls[0][0];
      expect(call.backImage).toBeDefined();
    });
  });

  // --- Document check outcomes ---
  describe('checkDocumentWithVendor outcomes', () => {
    it('records an Approved result', async () => {
      const { service, document } = buildService();
      const result = await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(result.documentCheckStatus).toBe(DocumentCheckStatus.APPROVED);
      expect(document.documentCheckRequestId).toBe('req-1');
    });

    it('records a Declined result — never thrown as a vendor error', async () => {
      const { service } = buildService({
        documentCheckProvider: {
          checkDocument: jest.fn().mockResolvedValue({
            requestId: 'req-2', status: 'Declined', warnings: [{ risk: 'DOCUMENT_EXPIRED', logType: 'error', shortDescription: 'x' }], portraitImage: null,
          }),
        },
      });
      const result = await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(result.documentCheckStatus).toBe(DocumentCheckStatus.DECLINED);
    });

    it('maps a vendor transport failure to VendorStageUnavailableException, not a decline', async () => {
      const { service } = buildService({
        documentCheckProvider: { checkDocument: jest.fn().mockRejectedValue(new VendorTransportError()) },
      });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        VendorStageUnavailableException,
      );
    });

    it('maps a storage read failure to VendorStageUnavailableException', async () => {
      const { service } = buildService({
        objectStorageProvider: { getObject: jest.fn().mockRejectedValue(new ObjectNotFoundError('front-key')) },
      });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        VendorStageUnavailableException,
      );
    });

    it('returns the cached result without calling the vendor again when the image is unchanged', async () => {
      const { service, documentCheckProvider } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({
            id: 'doc-1',
            profileId: 'profile-1',
            documentImageReference: 'front-key',
            backImageReference: null,
            documentCheckStatus: DocumentCheckStatus.APPROVED,
            documentCheckImageHash: require('crypto').createHash('sha256').update(Buffer.from('front-bytes')).digest('hex'),
          }),
          save: jest.fn(),
        },
      });
      await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(documentCheckProvider.checkDocument).not.toHaveBeenCalled();
    });

    // --- Attempt-limit gating (account-wide, spans both pipelines) ---
    it('throws RetryLimitExceededException before calling the vendor once the account-wide total reaches 3', async () => {
      const { service, documentCheckProvider } = buildService({
        attemptRepository: { count: jest.fn().mockResolvedValue(2) },
        pendingSessionRepository: { count: jest.fn().mockResolvedValue(1) },
      });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        RetryLimitExceededException,
      );
      expect(documentCheckProvider.checkDocument).not.toHaveBeenCalled();
    });

    it('counts previously-checked two-stage documents toward the same ceiling as the old pipeline', async () => {
      const { service, documentCheckProvider } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({
            id: 'doc-1', profileId: 'profile-1', issuingCountry: 'US', documentType: 'passport',
            documentImageReference: 'front-key', backImageReference: null,
            documentNumber: null, expirationDate: null, documentCheckStatus: null, documentCheckImageHash: null,
          }),
          save: jest.fn((d: any) => Promise.resolve(d)),
          count: jest.fn().mockResolvedValue(3), // 3 other documents already checked for this profile
        },
      });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        RetryLimitExceededException,
      );
      expect(documentCheckProvider.checkDocument).not.toHaveBeenCalled();
    });

    it('does not consume an attempt when the vendor call itself fails (outage)', async () => {
      const { service, documentRepository } = buildService({
        documentCheckProvider: { checkDocument: jest.fn().mockRejectedValue(new VendorTransportError()) },
      });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        VendorStageUnavailableException,
      );
      // documentCheckedAt (the counted marker) is never set on a failed call.
      expect(documentRepository.save).not.toHaveBeenCalled();
    });

    // --- Slow vendor call / lost response: outcome genuinely unknown ---
    it('does NOT release the attempt reservation on a lost response (fetch rejects with no HTTP response received) — must keep counting toward the ceiling', async () => {
      const { service, reservationRepository } = buildService({
        documentCheckProvider: { checkDocument: jest.fn().mockRejectedValue(new AmbiguousVendorOutcomeError(new Error('ECONNRESET'))) },
      });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        VendorOutcomeUnknownException,
      );
      // The reservation created at the top of checkDocumentWithVendor is
      // never deleted for this specific error — contrast with the
      // definite-failure test above/below, which DOES release.
      expect(reservationRepository.delete).not.toHaveBeenCalled();
    });

    it('DOES release the reservation for a definite vendor failure (a real response was received) — contrast case for the test above', async () => {
      const { service, reservationRepository } = buildService({
        documentCheckProvider: { checkDocument: jest.fn().mockRejectedValue(new VendorTransportError()) },
      });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        VendorStageUnavailableException,
      );
      expect(reservationRepository.delete).toHaveBeenCalled();
    });

    it('a still-unresolved ambiguous reservation counts toward the ceiling for the NEXT attempt (simulating a slow call that never returned, then a retry)', async () => {
      // First call: fetch never resolves in time / connection lost -> ambiguous,
      // reservation kept. Second call (e.g. the user retrying): the account-wide
      // count now reflects that unresolved reservation, in addition to 2 other
      // settled attempts, reaching the ceiling.
      const { service, attemptRepository } = buildService({
        documentCheckProvider: { checkDocument: jest.fn().mockRejectedValue(new AmbiguousVendorOutcomeError()) },
      });
      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        VendorOutcomeUnknownException,
      );

      // Simulate the retry: 2 settled old-pipeline attempts + the still-fresh
      // (unreleased) reservation from the call above = 3, at the ceiling.
      attemptRepository.count = jest.fn().mockResolvedValue(2);
      const { service: retryService } = buildService({
        attemptRepository,
        reservationRepository: { count: jest.fn().mockResolvedValue(1), delete: jest.fn() },
      });
      await expect(retryService.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        RetryLimitExceededException,
      );
    });

    // --- Declined document-check finalizes the account, per deriveOverallOutcome ---
    it('marks the profile FAILED on a fresh Declined document-check result, without waiting on a biometric session', async () => {
      const { service, profileRepository } = buildService({
        documentCheckProvider: {
          checkDocument: jest.fn().mockResolvedValue({
            requestId: 'req-2', status: 'Declined', warnings: [], portraitImage: null, documentNumber: null, expirationDate: null,
          }),
        },
      });
      await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ identityVerificationStatus: IdentityVerificationStatus.FAILED }),
      );
    });

    it('marks the profile FAILED_FINAL and stamps failedFinalAt when a Declined document-check reaches the ceiling', async () => {
      // The count is read once BEFORE the vendor call (the retry-limit gate,
      // still under the ceiling — 2) and once AFTER this document's own
      // save (the ceiling check for the decline just recorded — 3, now
      // including this attempt) — a real DB's count() would naturally
      // reflect this; the mock is sequenced to match.
      const { service, profileRepository } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({
            id: 'doc-1', profileId: 'profile-1', issuingCountry: 'US', documentType: 'passport',
            documentImageReference: 'front-key', backImageReference: null,
            documentNumber: null, expirationDate: null, documentCheckStatus: null, documentCheckImageHash: null,
          }),
          save: jest.fn((d: any) => Promise.resolve(d)),
          count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(3),
        },
        documentCheckProvider: {
          checkDocument: jest.fn().mockResolvedValue({
            requestId: 'req-2', status: 'Declined', warnings: [], portraitImage: null, documentNumber: null, expirationDate: null,
          }),
        },
      });
      await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL,
          failedFinalAt: expect.any(Date),
        }),
      );
    });

    // --- documentNumber/expirationDate backfill from the vendor's own extraction (never fabricated) ---
    it('backfills documentNumber and expirationDate from the vendor result when the document has neither yet', async () => {
      const { service, queryRunner } = buildService({
        documentCheckProvider: {
          checkDocument: jest.fn().mockResolvedValue({
            requestId: 'req-1', status: 'Approved', warnings: [], portraitImage: 'x',
            documentNumber: 'X1234567', expirationDate: '2030-01-01',
          }),
        },
      });
      const result = await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(result.documentNumber).toBe('X1234567');
      expect(result.expirationDate).toBe('2030-01-01');
      // 1 call to reserve the attempt slot + 2 for the backfill's own
      // advisory lock and duplicate-lookup SELECT.
      expect(queryRunner.query).toHaveBeenCalledTimes(3);
    });

    it('leaves documentNumber/expirationDate null when the vendor extraction genuinely returns neither', async () => {
      const { service } = buildService();
      const result = await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(result.documentNumber).toBeNull();
      expect(result.expirationDate).toBeNull();
    });

    it('never overwrites an already-known documentNumber with the vendor extraction', async () => {
      const { service, queryRunner } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({
            id: 'doc-1', profileId: 'profile-1', issuingCountry: 'US', documentType: 'passport',
            documentImageReference: 'front-key', backImageReference: null,
            documentNumber: 'ALREADY-SET', expirationDate: null, documentCheckStatus: null, documentCheckImageHash: null,
          }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
        documentCheckProvider: {
          checkDocument: jest.fn().mockResolvedValue({
            requestId: 'req-1', status: 'Approved', warnings: [], portraitImage: 'x',
            documentNumber: 'VENDOR-EXTRACTED', expirationDate: null,
          }),
        },
      });
      const result = await service.checkDocumentWithVendor('user-1', 'doc-1');
      expect(result.documentNumber).toBe('ALREADY-SET');
      // Only the attempt-slot reservation's own advisory lock — no backfill,
      // no duplicate lookup.
      expect(queryRunner.query).toHaveBeenCalledTimes(1);
    });

    it('blocks with DuplicateDocumentException and BLOCKED_DUPLICATE when the extracted number matches another profile', async () => {
      const queryRunner = buildFakeQueryRunner();
      queryRunner.query = jest
        .fn()
        .mockResolvedValueOnce([]) // reservation's own advisory lock
        .mockResolvedValueOnce([]) // backfill's advisory lock
        .mockResolvedValueOnce([{ id: 'other-doc' }]); // duplicate found under another profile

      const { service, profileRepository } = buildService({
        queryRunner,
        documentCheckProvider: {
          checkDocument: jest.fn().mockResolvedValue({
            requestId: 'req-1', status: 'Approved', warnings: [], portraitImage: 'x',
            documentNumber: 'X1234567', expirationDate: null,
          }),
        },
      });

      await expect(service.checkDocumentWithVendor('user-1', 'doc-1')).rejects.toBeInstanceOf(
        DuplicateDocumentException,
      );
      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ identityVerificationStatus: IdentityVerificationStatus.BLOCKED_DUPLICATE }),
      );
    });
  });

  // --- Missing results (eligibility) ---
  describe('beginBiometricVerification eligibility', () => {
    it('rejects when the document has not been checked yet', async () => {
      const { service } = buildService();
      await expect(service.beginBiometricVerification('user-1', 'doc-1')).rejects.toBeInstanceOf(
        DocumentNotEligibleForBiometricVerificationException,
      );
    });

    it('rejects when the document check was Declined', async () => {
      const { service } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: DocumentCheckStatus.DECLINED, documentCheckRequestId: 'req-1' }),
        },
      });
      await expect(service.beginBiometricVerification('user-1', 'doc-1')).rejects.toBeInstanceOf(
        DocumentNotEligibleForBiometricVerificationException,
      );
    });

    it('rejects (not as a decline) when Approved but no portrait is available yet', async () => {
      const { service } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: DocumentCheckStatus.APPROVED, documentCheckRequestId: 'req-1' }),
        },
        hostedSessionProvider: { fetchPortraitFromDocumentCheckSession: jest.fn().mockResolvedValue(null) },
      });
      await expect(service.beginBiometricVerification('user-1', 'doc-1')).rejects.toBeInstanceOf(
        DocumentNotEligibleForBiometricVerificationException,
      );
    });

    it('creates a session when eligible', async () => {
      const { service } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: DocumentCheckStatus.APPROVED, documentCheckRequestId: 'req-1' }),
        },
      });
      const result = await service.beginBiometricVerification('user-1', 'doc-1');
      expect(result).toEqual({ sessionId: 'didit-sess-1', url: 'https://verify.didit.me/session/abc', resumed: false });
    });

    it('resumes an existing CREATED session instead of creating a second one', async () => {
      const { service, hostedSessionProvider } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: DocumentCheckStatus.APPROVED, documentCheckRequestId: 'req-1' }),
        },
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ diditSessionId: 'existing-sess', hostedUrl: 'https://verify.didit.me/session/existing', status: BiometricSessionStatus.CREATED }),
        },
      });
      const result = await service.beginBiometricVerification('user-1', 'doc-1');
      expect(result.resumed).toBe(true);
      expect(hostedSessionProvider.createSession).not.toHaveBeenCalled();
    });

    it('maps a hosted-session vendor failure to VendorStageUnavailableException', async () => {
      const { service } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: DocumentCheckStatus.APPROVED, documentCheckRequestId: 'req-1' }),
        },
        hostedSessionProvider: {
          fetchPortraitFromDocumentCheckSession: jest.fn().mockResolvedValue('base64'),
          createSession: jest.fn().mockRejectedValue(new SessionTransportError()),
        },
      });
      await expect(service.beginBiometricVerification('user-1', 'doc-1')).rejects.toBeInstanceOf(
        VendorStageUnavailableException,
      );
    });
  });

  // --- Webhook handling ---
  describe('handleBiometricSessionWebhook', () => {
    const nowSeconds = 1_800_000_000;

    function signedBody(overrides: Record<string, unknown> = {}) {
      const body = Buffer.from(
        JSON.stringify({
          event_id: 'evt-1',
          session_id: 'didit-sess-1',
          webhook_type: 'status.updated',
          timestamp: nowSeconds - 10,
          created_at: '2026-09-26T00:00:00Z',
          application_id: 'app-1',
          environment: 'sandbox',
          status: 'Approved',
          workflow_id: 'wf-1',
          vendor_data: 'doc-1',
          metadata: null,
          decision: null,
          ...overrides,
        }),
      );
      const signature = createHmac('sha256', webhookSecret).update(body).digest('hex');
      return { body, signature };
    }

    it('rejects an invalid signature', async () => {
      const { service } = buildService();
      const { body } = signedBody();
      await expect(
        service.handleBiometricSessionWebhook(body, { signature: 'wrong', timestamp: String(nowSeconds - 10) }, nowSeconds),
      ).rejects.toBeInstanceOf(InvalidDiditWebhookSignatureError);
    });

    it('rejects a stale timestamp (replay)', async () => {
      const { service } = buildService();
      const { body, signature } = signedBody();
      await expect(
        service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10000) }, nowSeconds),
      ).rejects.toBeInstanceOf(ExpiredOrInvalidDiditWebhookTimestampError);
    });

    it('rejects a webhook for a session this service never created (unknown session)', async () => {
      const { service, biometricSessionRepository } = buildService({
        biometricSessionRepository: { findOne: jest.fn().mockResolvedValue(null) },
      });
      const { body, signature } = signedBody();
      await expect(
        service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds),
      ).rejects.toBeInstanceOf(UnknownBiometricSessionException);
      expect(biometricSessionRepository.findOne).toHaveBeenCalled();
    });

    it('is idempotent on a duplicate event_id found via the pre-check', async () => {
      const { service, biometricSessionRepository, processedWebhookEventRepository } = buildService({
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ profileId: 'profile-1', documentId: 'doc-1', diditSessionId: 'didit-sess-1', status: BiometricSessionStatus.CREATED, lastEventTimestamp: null }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
        processedWebhookEventRepository: {
          findOne: jest.fn().mockResolvedValue({ eventId: 'evt-1' }),
          insert: jest.fn(),
        },
      });
      const { body, signature } = signedBody();
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(processedWebhookEventRepository.insert).not.toHaveBeenCalled();
      expect(biometricSessionRepository.save).not.toHaveBeenCalled();
    });

    it('is idempotent on a concurrent duplicate caught only by the DB unique constraint', async () => {
      const { service, biometricSessionRepository } = buildService({
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ profileId: 'profile-1', documentId: 'doc-1', diditSessionId: 'didit-sess-1', status: BiometricSessionStatus.CREATED, lastEventTimestamp: null }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
        processedWebhookEventRepository: {
          findOne: jest.fn().mockResolvedValue(null), // pre-check sees nothing yet
          insert: jest.fn().mockRejectedValue(new Error('duplicate key value violates unique constraint')),
        },
      });
      const { body, signature } = signedBody();
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(biometricSessionRepository.save).not.toHaveBeenCalled();
    });

    it('ignores an out-of-order event (timestamp at or before the last one processed)', async () => {
      const { service, biometricSessionRepository } = buildService({
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ profileId: 'profile-1', documentId: 'doc-1', diditSessionId: 'didit-sess-1', status: BiometricSessionStatus.APPROVED, lastEventTimestamp: nowSeconds }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
      });
      const { body, signature } = signedBody({ timestamp: nowSeconds - 500, status: 'Declined' });
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(biometricSessionRepository.save).not.toHaveBeenCalled();
    });

    it('updates the session status on a fresh, valid, in-order event', async () => {
      const { service, biometricSessionRepository } = buildService({
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ profileId: 'profile-1', documentId: 'doc-1', diditSessionId: 'didit-sess-1', status: BiometricSessionStatus.CREATED, lastEventTimestamp: null }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
      });
      const { body, signature } = signedBody();
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(biometricSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BiometricSessionStatus.APPROVED }),
      );
    });

    // --- Both-stage approval requirement ---
    it('does NOT mark the profile verified when the biometric session alone is Approved but the document check is still pending', async () => {
      const { service, profileRepository } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: null }),
        },
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ profileId: 'profile-1', documentId: 'doc-1', diditSessionId: 'didit-sess-1', status: BiometricSessionStatus.CREATED, lastEventTimestamp: null }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
      });
      const { body, signature } = signedBody();
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(profileRepository.save).not.toHaveBeenCalled();
    });

    it('marks the profile VERIFIED only once both the document check and the biometric session are Approved', async () => {
      const { service, profileRepository } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: DocumentCheckStatus.APPROVED }),
        },
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ profileId: 'profile-1', documentId: 'doc-1', diditSessionId: 'didit-sess-1', status: BiometricSessionStatus.CREATED, lastEventTimestamp: null }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
      });
      const { body, signature } = signedBody();
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ identityVerificationStatus: IdentityVerificationStatus.VERIFIED }),
      );
    });

    it('marks the profile FAILED when the biometric session is Declined, even if the document check was Approved', async () => {
      const { service, profileRepository } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: DocumentCheckStatus.APPROVED }),
        },
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ profileId: 'profile-1', documentId: 'doc-1', diditSessionId: 'didit-sess-1', status: BiometricSessionStatus.CREATED, lastEventTimestamp: null }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
      });
      const { body, signature } = signedBody({ status: 'Declined' });
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ identityVerificationStatus: IdentityVerificationStatus.FAILED }),
      );
    });

    it('marks the profile FAILED_FINAL and stamps failedFinalAt when a Declined biometric session reaches the account-wide ceiling', async () => {
      const { service, profileRepository } = buildService({
        attemptRepository: { count: jest.fn().mockResolvedValue(3) }, // already at/over the ceiling
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: DocumentCheckStatus.APPROVED }),
        },
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ profileId: 'profile-1', documentId: 'doc-1', diditSessionId: 'didit-sess-1', status: BiometricSessionStatus.CREATED, lastEventTimestamp: null }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
      });
      const { body, signature } = signedBody({ status: 'Declined' });
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL,
          failedFinalAt: expect.any(Date),
        }),
      );
    });

    it('maps an unrecognized status to IN_REVIEW, never silently Approved or Declined', async () => {
      const { service, biometricSessionRepository } = buildService({
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ profileId: 'profile-1', documentId: 'doc-1', diditSessionId: 'didit-sess-1', status: BiometricSessionStatus.CREATED, lastEventTimestamp: null }),
          save: jest.fn((d: any) => Promise.resolve(d)),
        },
      });
      const { body, signature } = signedBody({ status: 'Kyc Expired' });
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(biometricSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BiometricSessionStatus.IN_REVIEW }),
      );
    });

    it('ignores a webhook whose environment does not match the expected one', async () => {
      const { service, biometricSessionRepository } = buildService();
      const { body, signature } = signedBody({ environment: 'live' });
      await service.handleBiometricSessionWebhook(body, { signature, timestamp: String(nowSeconds - 10) }, nowSeconds);
      expect(biometricSessionRepository.findOne).not.toHaveBeenCalled();
    });
  });

  // --- Status read ---
  describe('getTwoStageStatus', () => {
    it('reports the actual stored statuses, never inferring verified from anything else', async () => {
      const { service } = buildService({
        documentRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'doc-1', profileId: 'profile-1', documentCheckStatus: DocumentCheckStatus.APPROVED }),
        },
        profileRepository: {
          findOne: jest.fn().mockResolvedValue({ id: 'profile-1', identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }),
        },
        biometricSessionRepository: {
          findOne: jest.fn().mockResolvedValue({ status: BiometricSessionStatus.CREATED, hostedUrl: 'https://verify.didit.me/session/abc', createdAt: new Date() }),
        },
      });
      const status = await service.getTwoStageStatus('user-1', 'doc-1');
      expect(status).toEqual({
        documentCheckStatus: DocumentCheckStatus.APPROVED,
        biometricSessionStatus: BiometricSessionStatus.CREATED,
        biometricSessionUrl: 'https://verify.didit.me/session/abc',
        overallStatus: IdentityVerificationStatus.IN_PROGRESS,
      });
    });
  });
});
