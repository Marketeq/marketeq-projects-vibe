import { IdentityVerificationService } from './identity-verification.service';
import {
  AttemptOutcome,
  DocumentType,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
  VpnProxyDetectionResult,
} from '../entities/enums/identity-verification.enums';
import {
  RetryLimitExceededException,
  DocumentCoverageUnavailableException,
  UnsupportedDocumentForCountryException,
  DocumentNotFoundException,
  LegacyVerificationPathRetiredException,
} from '../common/errors/domain-exceptions';
import { CatalogDocumentCoverageProvider } from '../providers/document-coverage/catalog-document-coverage.provider';
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
    reservationRepository?: Record<string, jest.Mock>;
    vpnProxyResult?: VpnProxyDetectionResult;
    documentCoverageProvider?: { getAcceptedDocumentTypes: jest.Mock };
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
      count: jest.fn().mockResolvedValue(0),
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
    const reservationRepository = {
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue(undefined),
      ...overrides.reservationRepository,
    };
    const documentVerificationProvider = {
      startVerificationSession: jest
        .fn()
        .mockResolvedValue({ vendorSessionId: 'vendor-session-1', vendorSessionUrl: 'https://vendor/session-1' }),
    };
    const vpnProxyDetectionProvider = {
      detect: jest.fn().mockResolvedValue(overrides.vpnProxyResult ?? VpnProxyDetectionResult.NONE),
    };
    const objectStorageProvider = { createUploadUrl: jest.fn(), getObject: jest.fn() };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const locationProvider = { resolve: jest.fn().mockResolvedValue(null) };
    // Default: permissive (accepts every canonical type for any country) so
    // existing tests unrelated to coverage validation aren't affected by
    // this check. Tests that care about coverage behavior override this.
    const documentCoverageProvider = overrides.documentCoverageProvider ?? {
      getAcceptedDocumentTypes: jest.fn().mockResolvedValue(Object.values(DocumentType)),
    };

    const service = new IdentityVerificationService(
      profileRepository as any,
      documentRepository as any,
      attemptRepository as any,
      pendingSessionRepository as any,
      reservationRepository as any,
      dataSource as any,
      documentVerificationProvider as any,
      documentCoverageProvider as any,
      vpnProxyDetectionProvider as any,
      locationProvider as any,
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
      reservationRepository,
      documentVerificationProvider,
      documentCoverageProvider,
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

  describe('startVerificationSession — retired for new attempts', () => {
    const profile = { id: 'profile-1', userId: 'user-1' } as IdentityVerificationProfile;
    const document = {
      id: 'doc-1',
      profileId: 'profile-1',
      documentType: DocumentType.PASSPORT,
      captureMethod: 'scan',
    } as unknown as IdentityDocument;

    it('always throws LegacyVerificationPathRetiredException once the document is found, regardless of attempt count', async () => {
      const { service, documentVerificationProvider, pendingSessionRepository } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
        documentRepository: { findOne: jest.fn().mockResolvedValue(document) },
      });

      await expect(service.startVerificationSession('user-1', 'doc-1')).rejects.toBeInstanceOf(
        LegacyVerificationPathRetiredException,
      );
      // Confirms this is a hard stop, not merely an early check: neither
      // the vendor nor any new PendingVerificationSession row is ever
      // reached.
      expect(documentVerificationProvider.startVerificationSession).not.toHaveBeenCalled();
      expect(pendingSessionRepository.save).not.toHaveBeenCalled();
    });

    it('still throws DocumentNotFoundException for a document that does not belong to the caller (checked before retirement)', async () => {
      const { service } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
        documentRepository: { findOne: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.startVerificationSession('user-1', 'doc-999')).rejects.toBeInstanceOf(
        DocumentNotFoundException,
      );
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

  describe('getDocumentCoverageMetadata', () => {
    it('returns the coverage provider\'s catalog metadata unchanged', async () => {
      const metadata = { catalogVersion: '2026-09-29.1', retrievedAt: '2026-09-29' };
      const { service } = buildService({
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest.fn(),
          getCatalogMetadata: jest.fn().mockResolvedValue(metadata),
        } as any,
      });

      await expect(service.getDocumentCoverageMetadata()).resolves.toEqual(metadata);
    });
  });

  describe('getAcceptedDocumentTypes', () => {
    it('returns exactly what the coverage provider resolves, including a genuine empty list', async () => {
      const { service, documentCoverageProvider } = buildService({
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest.fn().mockResolvedValue([]),
        },
      });

      const result = await service.getAcceptedDocumentTypes('KP');

      expect(result).toEqual([]);
      expect(documentCoverageProvider.getAcceptedDocumentTypes).toHaveBeenCalledWith('KP');
    });

    it('returns the subset of canonical types the provider reports for the country', async () => {
      const { service } = buildService({
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest
            .fn()
            .mockResolvedValue([DocumentType.PASSPORT, DocumentType.ID_CARD]),
        },
      });

      const result = await service.getAcceptedDocumentTypes('US');

      expect(result).toEqual([DocumentType.PASSPORT, DocumentType.ID_CARD]);
    });

    it('propagates DocumentCoverageUnavailableException as-is on a lookup failure, never coercing it to an empty list', async () => {
      const { service } = buildService({
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest
            .fn()
            .mockRejectedValue(new DocumentCoverageUnavailableException()),
        },
      });

      await expect(service.getAcceptedDocumentTypes('US')).rejects.toBeInstanceOf(
        DocumentCoverageUnavailableException,
      );
    });

    it('propagates a malformed-response failure from the provider rather than swallowing it', async () => {
      const { service } = buildService({
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest
            .fn()
            .mockRejectedValue(new DocumentCoverageUnavailableException({ reason: 'malformed_vendor_response' })),
        },
      });

      await expect(service.getAcceptedDocumentTypes('US')).rejects.toMatchObject({
        code: 'DOCUMENT_COVERAGE_UNAVAILABLE',
      });
    });
  });

  describe('submitDocument — country/document coverage validation', () => {
    const profile = { id: 'profile-1', userId: 'user-1' } as IdentityVerificationProfile;
    const buildDto = (overrides: Record<string, unknown> = {}) =>
      ({
        documentType: DocumentType.PASSPORT,
        issuingCountry: 'US',
        documentNumber: 'x1234567',
        expirationDate: '2030-01-01',
        captureMethod: 'scan',
        documentImageReference: 'ref-1',
        ...overrides,
      }) as any;

    it('rejects with UnsupportedDocumentForCountryException when documentType is not in the coverage list', async () => {
      const { service, queryRunner } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest.fn().mockResolvedValue([DocumentType.ID_CARD]),
        },
      });

      await expect(
        service.submitDocument('user-1', buildDto({ documentType: DocumentType.PASSPORT })),
      ).rejects.toMatchObject({ code: 'UNSUPPORTED_DOCUMENT_FOR_COUNTRY' });

      // Rejected before any document row is created or the advisory lock
      // is taken — this is a pure validation failure, not a DB-level block.
      expect(queryRunner.connect).not.toHaveBeenCalled();
    });

    it('rejects every submission for a country with a genuinely empty accepted list', async () => {
      const { service } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest.fn().mockResolvedValue([]),
        },
      });

      await expect(service.submitDocument('user-1', buildDto())).rejects.toMatchObject({
        code: 'UNSUPPORTED_DOCUMENT_FOR_COUNTRY',
      });
    });

    it('proceeds to normal document creation when documentType is in the coverage list', async () => {
      const { service, queryRunner } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest.fn().mockResolvedValue([DocumentType.PASSPORT]),
        },
      });

      const result = await service.submitDocument('user-1', buildDto());

      expect(result).toMatchObject({ documentType: DocumentType.PASSPORT });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('fails closed with DocumentCoverageUnavailableException when coverage can\'t be determined — never falls back to accepting the submission', async () => {
      const { service, queryRunner } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest
            .fn()
            .mockRejectedValue(new DocumentCoverageUnavailableException()),
        },
      });

      await expect(service.submitDocument('user-1', buildDto())).rejects.toBeInstanceOf(
        DocumentCoverageUnavailableException,
      );
      expect(queryRunner.connect).not.toHaveBeenCalled();
    });

    it('fails closed on a malformed coverage response the same way as a transport failure', async () => {
      const { service } = buildService({
        profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
        documentCoverageProvider: {
          getAcceptedDocumentTypes: jest
            .fn()
            .mockRejectedValue(new DocumentCoverageUnavailableException({ reason: 'malformed_vendor_response' })),
        },
      });

      await expect(service.submitDocument('user-1', buildDto())).rejects.toMatchObject({
        code: 'DOCUMENT_COVERAGE_UNAVAILABLE',
      });
    });

    describe('against the real catalog-backed provider (same catalog as GET accepted-documents)', () => {
      const realProvider = () => new CatalogDocumentCoverageProvider() as any;

      it('accepts a passport for the United States', async () => {
        const { service, queryRunner } = buildService({
          profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
          documentCoverageProvider: realProvider(),
        });

        await expect(service.submitDocument('user-1', buildDto())).resolves.toMatchObject({
          documentType: DocumentType.PASSPORT,
        });
        expect(queryRunner.commitTransaction).toHaveBeenCalled();
      });

      it('rejects a residence permit for Afghanistan, which Didit does not list for it', async () => {
        const { service, queryRunner } = buildService({
          profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
          documentCoverageProvider: realProvider(),
        });

        await expect(
          service.submitDocument(
            'user-1',
            buildDto({ issuingCountry: 'AF', documentType: DocumentType.RESIDENCE_PERMIT }),
          ),
        ).rejects.toMatchObject({ code: 'UNSUPPORTED_DOCUMENT_FOR_COUNTRY' });
        expect(queryRunner.connect).not.toHaveBeenCalled();
      });

      it('rejects a passport for Aruba, which Didit does not list for it', async () => {
        const { service } = buildService({
          profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
          documentCoverageProvider: realProvider(),
        });

        await expect(
          service.submitDocument('user-1', buildDto({ issuingCountry: 'AW' })),
        ).rejects.toMatchObject({ code: 'UNSUPPORTED_DOCUMENT_FOR_COUNTRY' });
      });

      it('accepts and rejects the same combinations the accepted-documents lookup reports', async () => {
        const provider = realProvider();
        const { service } = buildService({
          profileRepository: { findOne: jest.fn().mockResolvedValue(profile) },
          documentCoverageProvider: provider,
        });

        const accepted = await service.getAcceptedDocumentTypes('AF');
        expect(accepted).toEqual([DocumentType.ID_CARD, DocumentType.PASSPORT, DocumentType.DRIVERS_LICENCE]);
        for (const documentType of Object.values(DocumentType)) {
          const outcome = service.submitDocument('user-1', buildDto({ issuingCountry: 'AF', documentType }));
          if (accepted.includes(documentType)) {
            await expect(outcome).resolves.toBeDefined();
          } else {
            await expect(outcome).rejects.toMatchObject({ code: 'UNSUPPORTED_DOCUMENT_FOR_COUNTRY' });
          }
        }
      });
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

    it('does NOT set VERIFIED or publish IDENTITY_VERIFIED on an APPROVED outcome — this path\'s payload contract (DiditWebhookPayloadDto, x-didit-signature, raw.outcome) is unverified against Didit\'s real webhook shape, so an "Approved" here cannot be trusted as a genuine, complete result', async () => {
      const { body, signature } = signedRawBody();
      const { service, events, queryRunner } = buildService({
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

      expect(queryRunner.manager.update).not.toHaveBeenCalledWith(
        expect.anything(),
        'profile-1',
        expect.objectContaining({ identityVerificationStatus: IdentityVerificationStatus.VERIFIED }),
      );
      expect(events.publish).not.toHaveBeenCalled();
      // The attempt itself is still recorded either way — only the
      // VERIFIED transition and event are withheld.
      expect(queryRunner.manager.save).toHaveBeenCalled();
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
