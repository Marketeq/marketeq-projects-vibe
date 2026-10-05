import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { IsNull } from 'typeorm';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { TwoStageVerificationService } from '../services/two-stage-verification.service';
import { FreeKycService } from '../services/free-kyc.service';
import { VerificationSummaryService } from '../services/verification-summary.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';

// The real service and the real controller over a small fake repository that
// applies updates, so the persisted state is what every later read sees.
describe('persisted lazy expiry: GET /me, internal status and the shared state', () => {
  const DAY = 24 * 60 * 60 * 1000;
  type Row = Record<string, any>;
  let row: Row;
  let app: INestApplication;
  let service: IdentityVerificationService;
  let update: jest.Mock;

  const expiredRow = (): Row => ({
    id: 'profile-1',
    userId: 'user-1',
    verifiedHomeCountry: 'US',
    verifiedHomeCountryConfirmedAt: new Date(Date.now() - 60_000),
    detectedCountry: 'US',
    detectedRegionState: null,
    detectedCity: null,
    timeZone: null,
    identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
    identityRejectionReason: null,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    failedFinalAt: null,
    expiredAt: null,
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: new Date(Date.now() - 7 * DAY),
    declaredDuration: DeclaredDuration.A_FEW_DAYS, // 6 days: ended a day ago
    lastTravelReminderSentAt: new Date(Date.now() - 4 * DAY),
    nextTravelReminderAt: new Date(Date.now() - 1 * DAY),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  });
  const activeRow = (): Row => ({
    ...expiredRow(),
    travelModeActivatedAt: new Date(Date.now() - DAY),
    declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS, // 13 days: 12 left
    nextTravelReminderAt: new Date(Date.now() + 2 * DAY),
  });

  const matches = (criteria: Row) =>
    criteria.id === row.id &&
    criteria.travelModeActive === row.travelModeActive &&
    (criteria.travelModeActivatedAt instanceof Date
      ? criteria.travelModeActivatedAt.getTime() === row.travelModeActivatedAt?.getTime()
      : row.travelModeActivatedAt === null) &&
    criteria.declaredDuration === row.declaredDuration;

  const build = async (initial: Row) => {
    row = initial;
    update = jest.fn(async (criteria: Row, data: Row) => {
      if (!matches(criteria)) return { affected: 0 };
      Object.assign(row, data);
      return { affected: 1 };
    });
    const profileRepository = {
      findOne: jest.fn(async () => ({ ...row })), // a new object per read, like the real repository
      create: jest.fn((d: Row) => ({ ...d })),
      save: jest.fn(async (p: Row) => p),
      update,
    };
    const summary = new VerificationSummaryService(
      { find: jest.fn(async () => []), findOne: jest.fn(async () => null) } as any,
      { find: jest.fn(async () => []) } as any,
    );
    service = new IdentityVerificationService(
      profileRepository as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      { resolve: jest.fn() } as any, {} as any, { publish: jest.fn() } as any, summary,
    );
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController],
      providers: [
        { provide: IdentityVerificationService, useValue: service },
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
  };
  afterEach(async () => app?.close());

  it('GET /me returns an expired profile as inactive and persists it, changing only the flag and the cursor', async () => {
    const original = expiredRow();
    await build({ ...original });

    const res = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);

    expect(res.body).toMatchObject({
      travelModeActive: false,
      travelClassification: 'temporarily_traveling', // preserved
      declaredDuration: 'a_few_days', // preserved
      nextAction: 'start_identity', // no longer held back by Travel Mode
      fullyVerified: false,
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      { id: 'profile-1', travelModeActive: true, travelModeActivatedAt: original.travelModeActivatedAt, declaredDuration: DeclaredDuration.A_FEW_DAYS },
      { travelModeActive: false, nextTravelReminderAt: null },
    );
    expect(row.travelModeActive).toBe(false);
    expect(row.nextTravelReminderAt).toBeNull();
    expect(row.travelClassification).toBe(original.travelClassification);
    expect(row.declaredDuration).toBe(original.declaredDuration);
    expect(row.travelModeActivatedAt).toEqual(original.travelModeActivatedAt);
    expect(row.lastTravelReminderSentAt).toEqual(original.lastTravelReminderSentAt);
  });

  it('a second GET /me is a no-op and still inactive (idempotent)', async () => {
    await build(expiredRow());

    await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);
    const second = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);

    expect(second.body.travelModeActive).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('adds no response field: the API contract is unchanged', async () => {
    await build(expiredRow());

    const res = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);

    for (const added of ['travelModeEndsAt', 'travelModeExpired', 'travelModeState']) {
      expect(res.body).not.toHaveProperty(added);
    }
    for (const key of ['travelModeActive', 'travelClassification', 'declaredDuration', 'reconfirmationRequired', 'nextAction']) {
      expect(res.body).toHaveProperty(key);
    }
  });

  it('active Travel Mode is unchanged: still active, still asks for confirm_location, nothing written', async () => {
    await build(activeRow());

    const res = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);

    expect(res.body).toMatchObject({ travelModeActive: true, nextAction: 'confirm_location', declaredDuration: 'one_to_two_weeks' });
    expect(update).not.toHaveBeenCalled();
    expect(row.travelModeActive).toBe(true);
    expect(row.nextTravelReminderAt).not.toBeNull();
  });

  it('the internal status read expires an expired profile too and reports the startable state', async () => {
    await build(expiredRow());

    const status = await service.getStatusForInternalCaller('user-1');

    expect(status.nextAction).toBe('start_identity');
    expect(update).toHaveBeenCalledTimes(1);
    expect(row.travelModeActive).toBe(false);
    expect(row.nextTravelReminderAt).toBeNull();
    expect(row.travelClassification).toBe(TravelClassification.TEMPORARILY_TRAVELING);
  });

  it('GET /me and the internal status share one persisted state: whichever runs first, the other sees inactive', async () => {
    await build(expiredRow());

    await service.getStatusForInternalCaller('user-1');
    const res = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);

    expect(res.body.travelModeActive).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('the internal status read leaves an active Travel Mode alone', async () => {
    await build(activeRow());

    const status = await service.getStatusForInternalCaller('user-1');

    expect(status.nextAction).toBe('confirm_location');
    expect(update).not.toHaveBeenCalled();
  });

  it('a lost compare-and-set returns the winner’s row to GET /me and never overwrites it', async () => {
    await build(expiredRow());
    // Another request activates a new Travel Mode after this one read the row.
    const winner = { ...activeRow(), declaredDuration: DeclaredDuration.MORE_THAN_TWO_WEEKS };
    update.mockImplementationOnce(async () => {
      Object.assign(row, winner);
      return { affected: 0 };
    });

    const res = await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);

    expect(res.body).toMatchObject({ travelModeActive: true, declaredDuration: 'more_than_two_weeks' });
    expect(update).toHaveBeenCalledTimes(1);
    expect(row.travelModeActive).toBe(true);
    expect(row.declaredDuration).toBe(DeclaredDuration.MORE_THAN_TWO_WEEKS);
  });

  it('matches observed nulls with IS NULL when the stored activation data is missing', async () => {
    await build({ ...expiredRow(), travelModeActivatedAt: null, declaredDuration: null });

    await request(app.getHttpServer()).get('/v1/identity-verification/me').expect(200);

    const criteria = update.mock.calls[0][0];
    expect(criteria.travelModeActivatedAt).toEqual(IsNull());
    expect(criteria.declaredDuration).toEqual(IsNull());
  });
});
