import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationInternalController } from './identity-verification-internal.controller';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { TwoStageVerificationService } from '../services/two-stage-verification.service';
import { FreeKycService } from '../services/free-kyc.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { ProfileStatusResponseDto } from '../dto/response/profile-status.response.dto';
import { buildVerificationSummary } from '../common/status/verification-summary';
import { IdentityVerificationStatus as I, LocationVerificationStatus as L } from '../entities/enums/identity-verification.enums';

// The pre-existing GET /me contract: these keys must keep existing, unchanged.
const EXISTING_ME_KEYS = [
  'verifiedHomeCountry', 'detectedCountry', 'detectedRegionState', 'detectedCity', 'timeZone',
  'travelClassification', 'declaredDuration', 'travelModeActive', 'identityVerificationStatus',
  'identityRejectionReason', 'locationVerificationStatus', 'reconfirmationRequired',
];
const NEW_SUMMARY_KEYS = [
  'fullyVerified', 'nextAction', 'attemptsUsed', 'attemptsRemaining', 'maxAttempts', 'canRetry', 'retryAvailableAt', 'hasActiveSession',
];

// A confirmed, fresh, not-travelling profile: new-session requirements are met.
const summaryInput = (over: Record<string, unknown> = {}) => ({
  identityStatus: I.UNSTARTED,
  locationStatus: L.VERIFIED,
  failedFinalAt: null,
  hostedCycleAttempts: 0,
  hasActiveHostedSession: false,
  verifiedHomeCountry: 'US',
  verifiedHomeCountryConfirmedAt: new Date(Date.now() - 60_000),
  travelModeActive: false,
  travelClassification: null,
  nowMs: Date.now(),
  ...over,
}) as any;

const profile = (over: Record<string, unknown> = {}) =>
  ({
    id: 'profile-1',
    userId: 'user-1',
    verifiedHomeCountry: 'US',
    detectedCountry: 'US',
    detectedRegionState: null,
    detectedCity: null,
    timeZone: null,
    travelClassification: null,
    declaredDuration: null,
    travelModeActive: false,
    identityVerificationStatus: I.VERIFIED,
    identityRejectionReason: null,
    locationVerificationStatus: L.VERIFIED,
    ...over,
  }) as any;

describe('ProfileStatusResponseDto (backward-compatible summary)', () => {
  it('without a summary: every existing field is unchanged and only fullyVerified is added', () => {
    const dto = ProfileStatusResponseDto.fromEntity(profile());
    for (const key of EXISTING_ME_KEYS) expect(dto).toHaveProperty(key);
    expect(dto.fullyVerified).toBe(true);
    for (const key of ['nextAction', 'attemptsUsed', 'attemptsRemaining', 'maxAttempts', 'retryAvailableAt']) {
      expect(JSON.parse(JSON.stringify(dto))).not.toHaveProperty(key); // omitted, not null
    }
  });

  it('fullyVerified is false unless identity AND location are both verified', () => {
    expect(ProfileStatusResponseDto.fromEntity(profile({ locationVerificationStatus: L.NOT_VERIFIED })).fullyVerified).toBe(false);
    expect(ProfileStatusResponseDto.fromEntity(profile({ identityVerificationStatus: I.PENDING })).fullyVerified).toBe(false);
    expect(ProfileStatusResponseDto.fromEntity(profile({ identityVerificationStatus: I.EXPIRED })).fullyVerified).toBe(false);
  });

  it('with a summary: the six additions appear and the rest is untouched', () => {
    const p = profile({ identityVerificationStatus: I.PENDING });
    const summary = buildVerificationSummary(summaryInput({ identityStatus: I.PENDING, hostedCycleAttempts: 1 }));
    const dto = ProfileStatusResponseDto.fromEntity(p, summary);
    for (const key of [...EXISTING_ME_KEYS, ...NEW_SUMMARY_KEYS]) expect(dto).toHaveProperty(key);
    expect(dto).toMatchObject({ fullyVerified: false, nextAction: 'await_review', attemptsUsed: 1, attemptsRemaining: 2, maxAttempts: 3, canRetry: false, retryAvailableAt: null, hasActiveSession: false });
    expect(ProfileStatusResponseDto.fromEntity(p).identityVerificationStatus).toBe(dto.identityVerificationStatus);
  });
});

describe('GET /v1/identity-verification/me (HTTP)', () => {
  let app: INestApplication;
  const ivs = { getOrCreateProfile: jest.fn(), getVerificationSummary: jest.fn(), getLocationMismatch: jest.fn(), getLoginReminderAt: jest.fn() };

  beforeEach(async () => {
    ivs.getOrCreateProfile.mockReset().mockResolvedValue(profile({ identityVerificationStatus: I.FAILED, locationVerificationStatus: L.VERIFIED }));
    ivs.getVerificationSummary.mockReset().mockResolvedValue(
      buildVerificationSummary(summaryInput({ identityStatus: I.FAILED, hostedCycleAttempts: 2 })),
    );
    ivs.getLocationMismatch.mockReset().mockResolvedValue(false);
    ivs.getLoginReminderAt.mockReset().mockResolvedValue(null);
    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController],
      providers: [
        { provide: IdentityVerificationService, useValue: ivs },
        { provide: TwoStageVerificationService, useValue: {} },
        { provide: FreeKycService, useValue: {} },
      ],
    })
      .overrideGuard(BearerAuthGuard)
      .useValue({ canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().userId = 'user-1'), true) })
      .overrideGuard(VpnProxyCheckGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });
  afterEach(async () => app.close());

  it('returns every existing field plus the summary additions, with a documented nextAction', async () => {
    const res = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);
    for (const key of [...EXISTING_ME_KEYS, ...NEW_SUMMARY_KEYS]) expect(res.body).toHaveProperty(key);
    expect(res.body).toMatchObject({
      identityVerificationStatus: 'failed',
      locationVerificationStatus: 'verified',
      fullyVerified: false,
      nextAction: 'retry_identity',
      attemptsUsed: 2,
      attemptsRemaining: 1,
      maxAttempts: 3,
      canRetry: true,
      retryAvailableAt: null,
      hasActiveSession: false,
    });
    expect(ivs.getVerificationSummary).toHaveBeenCalledTimes(1);
  });

  it('exposes no identifier, session id, document data or failure internals in the additions', async () => {
    const res = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);
    const text = JSON.stringify(res.body);
    for (const leak of ['profile-1', 'user-1', 'didit', 'vendor', 'documentRef']) expect(text).not.toContain(leak);
  });

  it('returns locationMismatch false by default and true when the service reports a new country', async () => {
    const quiet = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);
    expect(quiet.body.locationMismatch).toBe(false);

    ivs.getLocationMismatch.mockResolvedValue(true);
    const mismatch = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);
    expect(mismatch.body.locationMismatch).toBe(true);
    // The same loaded profile is compared; nothing else on the response changes.
    expect(ivs.getLocationMismatch).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: expect.anything() }),
      expect.anything(),
    );
    expect(mismatch.body.fullyVerified).toBe(quiet.body.fullyVerified);
    expect(mismatch.body.nextAction).toBe(quiet.body.nextAction);
  });
});

describe('internal status read (contract)', () => {
  const status = {
    identityVerificationStatus: I.VERIFIED,
    locationVerificationStatus: L.VERIFIED,
    isVerified: true,
    gateOpen: true,
    inGrace: false,
    attemptCount: 0,
    fullyVerified: true,
    nextAction: 'complete',
    attemptsRemaining: 3,
    maxAttempts: 3,
    canRetry: false,
    retryAvailableAt: null,
    hasActiveSession: false,
    failureReason: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  it('maps the new fields and keeps every existing one (attemptCount stays the same key)', async () => {
    const controller = new IdentityVerificationInternalController({ getStatusForInternalCaller: jest.fn().mockResolvedValue(status) } as any);
    const out = await controller.getStatus('user-1', { ip: '127.0.0.1' } as any);
    for (const key of ['identityVerificationStatus', 'locationVerificationStatus', 'isVerified', 'gateOpen', 'inGrace', 'attemptCount', 'failureReason', 'createdAt', 'updatedAt']) {
      expect(out).toHaveProperty(key);
    }
    expect(out).toMatchObject({ fullyVerified: true, nextAction: 'complete', attemptsRemaining: 3, maxAttempts: 3, canRetry: false, retryAvailableAt: null, hasActiveSession: false });
    expect(out.fullyVerified).toBe(out.isVerified);
  });
});
