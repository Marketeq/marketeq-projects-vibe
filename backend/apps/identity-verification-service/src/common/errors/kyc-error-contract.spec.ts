import 'reflect-metadata';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import {
  HomeCountryConfirmationRequiredException,
  KycNotStartableException,
  KycReconciliationUnavailableException,
  RetryLimitExceededException,
  TravelModeAlreadyActiveException,
  VendorOutcomeUnknownException,
  VendorStageUnavailableException,
} from './domain-exceptions';
import { ERROR_CODE_CATALOG } from './error-code-catalog';
import { HOME_COUNTRY_CONFIRMATION_REASONS } from './kyc-error-reasons';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';

// The fixed, stable error contract the frontend can rely on for the hosted Free KYC
// start / resume / reconcile actions. Codes and statuses never change; details.reason
// is a closed set (or, for vendor failures, a fixed class-name / decision_* code) and
// never carries a value, identifier or vendor body.
describe('Free KYC fixed error contract', () => {
  type Scenario = { name: string; make: () => Error; code: string; status: number; reason?: string };
  const scenarios: Scenario[] = [
    { name: 'location not verified', make: () => new HomeCountryConfirmationRequiredException({ reason: 'location_not_verified' }), code: 'HOME_COUNTRY_CONFIRMATION_REQUIRED', status: 409, reason: 'location_not_verified' },
    { name: 'home-country confirmation missing', make: () => new HomeCountryConfirmationRequiredException({ reason: 'confirmation_missing' }), code: 'HOME_COUNTRY_CONFIRMATION_REQUIRED', status: 409, reason: 'confirmation_missing' },
    { name: 'home-country confirmation stale', make: () => new HomeCountryConfirmationRequiredException({ reason: 'confirmation_stale' }), code: 'HOME_COUNTRY_CONFIRMATION_REQUIRED', status: 409, reason: 'confirmation_stale' },
    { name: 'travel mode active', make: () => new HomeCountryConfirmationRequiredException({ reason: 'travel_mode_active' }), code: 'HOME_COUNTRY_CONFIRMATION_REQUIRED', status: 409, reason: 'travel_mode_active' },
    { name: 'session not startable', make: () => new KycNotStartableException({ status: 'verified' }), code: 'IDENTITY_VERIFICATION_NOT_STARTABLE', status: 409 },
    { name: 'retry limit reached', make: () => new RetryLimitExceededException(), code: 'RETRY_LIMIT_EXCEEDED', status: 429 },
    { name: 'vendor unavailable', make: () => new VendorStageUnavailableException({ reason: 'VendorTransportError' }), code: 'VENDOR_STAGE_UNAVAILABLE', status: 502, reason: 'VendorTransportError' },
    { name: 'vendor outcome unknown', make: () => new VendorOutcomeUnknownException({ reason: 'AmbiguousVendorOutcomeError' }), code: 'VENDOR_OUTCOME_UNKNOWN', status: 503, reason: 'AmbiguousVendorOutcomeError' },
    { name: 'reconciliation unavailable', make: () => new KycReconciliationUnavailableException({ reason: 'decision_session_not_found' }), code: 'KYC_RECONCILIATION_UNAVAILABLE', status: 502, reason: 'decision_session_not_found' },
  ];

  it('each scenario has a distinct, stable code and HTTP status', () => {
    for (const s of scenarios) {
      const error = s.make() as any;
      expect(error.code).toBe(s.code);
      expect(error.getStatus()).toBe(s.status);
    }
    // The three home-country reasons are distinguishable by reason, not by code.
    expect(new Set(scenarios.slice(0, 4).map((s) => s.reason)).size).toBe(4);
    expect(new Set(scenarios.slice(4).map((s) => s.code)).size).toBe(5);
  });

  it('every code is in the error catalog with the same HTTP status', () => {
    for (const s of scenarios) {
      const entry = ERROR_CODE_CATALOG.find((e) => e.code === s.code);
      expect(entry).toBeDefined();
      expect(entry?.httpStatus).toBe(s.status);
    }
  });

  it('TRAVEL_MODE_ALREADY_ACTIVE is a stable, distinct 409 with a fixed message and no details', () => {
    const error = new TravelModeAlreadyActiveException() as any;
    expect(error.code).toBe('TRAVEL_MODE_ALREADY_ACTIVE');
    expect(error.getStatus()).toBe(409);
    expect(error.getResponse()).toEqual({ message: 'Travel Mode is already active.', details: undefined });
    expect(scenarios.some((s) => s.code === error.code)).toBe(false);
    for (const other of ERROR_CODE_CATALOG.filter((e) => e.code !== error.code)) expect(other.code).not.toBe(error.code);
    const entry = ERROR_CODE_CATALOG.filter((e) => e.code === error.code);
    expect(entry).toHaveLength(1);
    expect(entry[0].httpStatus).toBe(409);
    expect(entry[0].callerAudience).toBe('end-user');
    expect(entry[0].safeToDisplayVerbatim).toBe(true);
  });

  it('the home-country reasons are exactly the documented closed set', () => {
    expect([...HOME_COUNTRY_CONFIRMATION_REASONS]).toEqual(['location_not_verified', 'confirmation_missing', 'travel_mode_active', 'confirmation_stale']);
  });

  describe('over HTTP, through the real exception filter', () => {
    let app: INestApplication;
    let current: () => Error;

    @Controller('probe')
    class ProbeController {
      @Get()
      raise() {
        throw current();
      }
    }

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
      app = moduleRef.createNestApplication();
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.init();
    });
    afterAll(async () => app.close());

    it.each(scenarios.map((s) => [s.name, s] as const))('%s → fixed status, code and reason, nothing sensitive', async (_name, s) => {
      current = s.make;
      const res = await request(app.getHttpServer()).get('/probe');
      expect(res.status).toBe(s.status);
      expect(res.body.code).toBe(s.code);
      if (s.reason) expect(res.body.details?.reason).toBe(s.reason);
      const text = JSON.stringify(res.body);
      for (const leak of ['didit-', 'verify.didit.me', 'api_key', 'Bearer', 'profile-', 'user-', 'sessionId']) {
        expect(text).not.toContain(leak);
      }
    });
  });
});
