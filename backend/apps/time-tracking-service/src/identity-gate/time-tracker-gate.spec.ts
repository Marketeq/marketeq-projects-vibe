import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { of, throwError } from 'rxjs';
import * as request from 'supertest';
import { SessionsController } from '../sessions/sessions.controller';
import { SessionsService } from '../sessions/sessions.service';
import { Session } from '../sessions/session.entity';
import { TimeEntriesController } from '../time-entries/time-entries.controller';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import { BreaksController } from '../breaks/breaks.controller';
import { BreaksService } from '../breaks/breaks.service';
import { IdlesController } from '../idles/idles.controller';
import { IdlesService } from '../idles/idles.service';
import { ActivityController } from '../activity/activity.controller';
import { ActivityService } from '../activity/activity.service';
import { DisputesController } from '../disputes/disputes.controller';
import { DisputesService } from '../disputes/disputes.service';
import { DevicesController } from '../devices/devices.controller';
import { DevicesService } from '../devices/devices.service';
import { ManualTimeController } from '../controllers/manual-time.controller';
import { ManualTimeService } from '../services/manual-time.service';
import { ManualTime } from '../entities/manual-time.entity';
import { ScreenshotsController } from '../screenshots/screenshots.controller';
import { ScreenshotsService } from '../screenshots/screenshots.service';
import { ActivityWatchController } from '../activitywatch.controller';
import { ActivityWatchService } from '../activitywatch.service';
import { TasksController } from '../tasks/tasks.controller';
import { TasksService } from '../tasks/tasks.service';
import { SettingsController } from '../controllers/settings.controller';
import { SettingsService } from '../services/settings.service';
import { TimeEntry } from '../entities/time-entry.entity';
import { BreakEvent } from '../entities/break-event.entity';
import { IdleEvent } from '../entities/idle-event.entity';
import { ActivityMinute } from '../entities/activity-minute.entity';
import { Dispute } from '../entities/dispute.entity';
import { DeviceRegistration } from '../entities/device-registration.entity';
import { ContractAccessService } from '../contracts/contract-access.service';
import { EventsService } from '../services/events.service';
import { EarningsSyncService } from '../services/earnings-sync.service';
import { TalentNotificationsService } from '../notifications/talent-notifications.service';
import { R2Service } from '../storage/r2.service';
import {
  IDENTITY_VERIFICATION_CLIENT,
  AccountGateDecision,
  IdentityVerificationGateClient,
} from './identity-verification-gate.client';
import { IdentityVerificationUnavailableException } from './identity-gate.exceptions';
import { TimeTrackerGateGuard } from './time-tracker-gate.guard';

// G8: an unverified talent cannot start a session, add/edit time in a running
// session, close a session or submit manual time. Real controllers, real
// guards (Bearer / JWT / G8), real ValidationPipe and real services over
// in-memory repositories; only the gate client's transport, R2, the earnings
// and notification publishers and the ActivityWatch service are stubbed.

const TALENT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const MACHINE = 'machine-secret';
const JWT_SECRET = 'jwt-secret';

const OPEN: AccountGateDecision = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = (m: 'identity' | 'location' | 'both'): AccountGateDecision => ({ gateOpen: false, missingRequirements: m });

type Row = Record<string, any>;

function fakeRepo(name: string, table: Map<string, Row>, writes: string[]) {
  return {
    findOneBy: jest.fn(async (w: Row) => [...table.values()].find((r) => Object.entries(w).every(([k, v]) => r[k] === v)) ?? null),
    findOne: jest.fn(async () => null),
    find: jest.fn(async () => []),
    create: jest.fn((d: Row) => ({ ...d })),
    save: jest.fn(async (r: Row) => {
      writes.push(`${name}.save`);
      table.set(r.id ?? `${name}-${table.size}`, r);
      return r;
    }),
    update: jest.fn(async () => {
      writes.push(`${name}.update`);
    }),
    softRemove: jest.fn(async () => {
      writes.push(`${name}.softRemove`);
    }),
    insert: jest.fn(async () => {
      writes.push(`${name}.insert`);
    }),
  };
}

const NOW = Date.now();
const iso = (offsetMin: number) => new Date(NOW + offsetMin * 60_000).toISOString();

interface RouteCase {
  name: string;
  method: 'post' | 'patch';
  path: string;
  auth: 'bearer' | 'jwt';
  body: Row;
  /** Body that fails DTO validation: still must be refused by the gate first. */
  invalidBody: Row;
}

const ROUTES: RouteCase[] = [
  { name: 'start session', method: 'post', path: '/sessions', auth: 'bearer', body: { id: 's-new', contractId: 'c1', taskId: 't1', deviceId: 'd1', startedAt: NOW }, invalidBody: { id: 's-new' } },
  { name: 'close session', method: 'post', path: '/sessions/s1/close', auth: 'bearer', body: { endedAt: NOW, reason: 'user' }, invalidBody: { endedAt: 'x' } },
  { name: 'add time entry', method: 'post', path: '/sessions/s1/entries', auth: 'bearer', body: { id: 'e-new', startedAt: iso(-10), endedAt: iso(-5), durationSeconds: 300 }, invalidBody: { id: 'e-new', startedAt: 'nope' } },
  { name: 'edit time entry', method: 'patch', path: '/entries/e1', auth: 'bearer', body: { endedAt: iso(-1), durationSeconds: 900 }, invalidBody: { endedAt: 'nope' } },
  { name: 'add break', method: 'post', path: '/sessions/s1/breaks', auth: 'bearer', body: { id: 'b-new', kind: 'paid', startedAt: iso(-3) }, invalidBody: { id: 'b-new' } },
  { name: 'edit break', method: 'patch', path: '/breaks/b1', auth: 'bearer', body: { endedAt: iso(-1) }, invalidBody: { endedAt: 'nope' } },
  { name: 'add idle time', method: 'post', path: '/sessions/s1/idles', auth: 'bearer', body: { id: 'i-new', startedAt: iso(-9), endedAt: iso(-8), seconds: 60 }, invalidBody: { id: 'i-new' } },
  { name: 'submit manual time', method: 'post', path: '/manual-time', auth: 'jwt', body: { startTime: iso(-120), endTime: iso(-60), notes: 'work' }, invalidBody: { startTime: 'nope' } },
];

describe('G8 - time tracker verification gate', () => {
  let app: INestApplication;
  let writes: string[];
  let sideEffects: string[];
  let gate: jest.Mock<Promise<AccountGateDecision>, [string]>;
  let sessionsTable: Map<string, Row>;

  const bearerHeaders = (userId?: string) => ({ Authorization: `Bearer ${MACHINE}`, ...(userId ? { 'x-user-id': userId } : {}) });
  const jwtHeaders = (userId: string) => ({ Authorization: `Bearer ${jwt.sign({ sub: userId }, JWT_SECRET)}` });
  const headersFor = (r: RouteCase, userId: string) => (r.auth === 'jwt' ? jwtHeaders(userId) : bearerHeaders(userId));

  const send = (r: RouteCase, headers: Record<string, string>, body: Row = r.body) =>
    (request(app.getHttpServer()) as any)[r.method](r.path).set(headers).send(body);

  const seed = () => {
    writes = [];
    sideEffects = [];
    sessionsTable = new Map([
      ['s1', { id: 's1', userId: TALENT, contractId: 'c1', taskId: 't1', deviceId: 'd1', startedAt: new Date(NOW - 3_600_000), endedAt: null }],
    ]);
    return {
      sessions: sessionsTable,
      entries: new Map([['e1', { id: 'e1', sessionId: 's1', startedAt: new Date(NOW - 3_000_000), endedAt: null, durationSeconds: 0 }]]),
      breaks: new Map([['b1', { id: 'b1', sessionId: 's1', kind: 'paid', startedAt: new Date(NOW - 600_000), endedAt: null }]]),
    };
  };

  async function build(client: Partial<IdentityVerificationGateClient> | 'real', proxy?: Partial<ClientProxy>) {
    process.env.API_BEARER_TOKEN = MACHINE;
    process.env.JWT_SECRET = JWT_SECRET;
    delete process.env.AUTH_JWT_PUBLIC_KEY;
    const t = seed();
    const repos = {
      sessions: fakeRepo('sessions', t.sessions, writes),
      entries: fakeRepo('entries', t.entries, writes),
      breaks: fakeRepo('breaks', t.breaks, writes),
      idles: fakeRepo('idles', new Map(), writes),
      activity: fakeRepo('activity', new Map(), writes),
      manual: fakeRepo('manual', new Map(), writes),
      disputes: fakeRepo('disputes', new Map(), writes),
      devices: fakeRepo('devices', new Map(), writes),
    };
    const stub = (label: string) =>
      new Proxy({}, { get: (_t, prop) => prop === 'then' ? undefined : (...a: unknown[]) => { sideEffects.push(`${label}.${String(prop)}`); return Promise.resolve({ ok: true, inserted: 0 }); } });

    const providers: any[] = [
      SessionsService, TimeEntriesService, BreaksService, IdlesService, ActivityService, DisputesService, DevicesService, ManualTimeService,
      { provide: getRepositoryToken(Session), useValue: repos.sessions },
      { provide: getRepositoryToken(TimeEntry), useValue: repos.entries },
      { provide: getRepositoryToken(BreakEvent), useValue: repos.breaks },
      { provide: getRepositoryToken(IdleEvent), useValue: repos.idles },
      { provide: getRepositoryToken(ActivityMinute), useValue: repos.activity },
      { provide: getRepositoryToken(ManualTime), useValue: repos.manual },
      { provide: getRepositoryToken(Dispute), useValue: repos.disputes },
      { provide: getRepositoryToken(DeviceRegistration), useValue: repos.devices },
      { provide: ContractAccessService, useValue: { isTalentOf: async () => true } },
      { provide: EventsService, useValue: stub('events') },
      { provide: EarningsSyncService, useValue: stub('earnings') },
      { provide: TalentNotificationsService, useValue: stub('notifications') },
      { provide: R2Service, useValue: { presignPut: async () => { sideEffects.push('r2.presignPut'); return { url: 'u', expiresIn: 1, publicUrl: 'p' }; } } },
      { provide: ScreenshotsService, useValue: stub('screenshots') },
      { provide: ActivityWatchService, useValue: { findMany: async () => ({ items: [] }), ingest: async () => { sideEffects.push('aw.ingest'); return { inserted: 1, ids: [] }; } } },
      { provide: TasksService, useValue: stub('tasks') },
      { provide: SettingsService, useValue: stub('settings') },
      { provide: ConfigService, useValue: { get: (k: string) => (k === 'RABBITMQ_URL' ? 'amqp://test' : undefined) } },
    ];
    if (client === 'real') {
      providers.push(IdentityVerificationGateClient, { provide: IDENTITY_VERIFICATION_CLIENT, useValue: proxy });
    } else {
      providers.push({ provide: IdentityVerificationGateClient, useValue: client });
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [
        SessionsController, TimeEntriesController, BreaksController, IdlesController, ActivityController, DisputesController, DevicesController,
        ManualTimeController, ScreenshotsController, ActivityWatchController, TasksController, SettingsController,
      ],
      providers,
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    // Nest lifecycle hooks poke the proxy stubs at boot; only request effects count.
    writes.length = 0;
    sideEffects.length = 0;
    return repos;
  }

  afterEach(async () => {
    await app?.close();
  });

  describe('with a stubbed gate decision', () => {
    beforeEach(async () => {
      gate = jest.fn(async () => OPEN);
      await build({ checkGate: gate });
    });

    describe.each(ROUTES)('$name ($method $path)', (route) => {
      it('verified talent (gate open) performs the action normally', async () => {
        const res = await send(route, headersFor(route, TALENT));
        expect(res.status).toBeLessThan(300);
        expect(gate).toHaveBeenCalledWith(TALENT);
        expect(writes.length + sideEffects.length).toBeGreaterThan(0);
      });

      it('talent inside the grace period (gate open, same decision) performs the action normally', async () => {
        // Grace is resolved inside identity-verification-service: the contract
        // only ever answers gateOpen=true / missingRequirements=none for it.
        gate.mockResolvedValue({ gateOpen: true, missingRequirements: 'none' });
        const res = await send(route, headersFor(route, TALENT));
        expect(res.status).toBeLessThan(300);
      });

      it.each(['identity', 'location', 'both'] as const)('unverified talent (%s outstanding) gets 403 VERIFICATION_REQUIRED and nothing is written', async (m) => {
        gate.mockResolvedValue(CLOSED(m));
        const res = await send(route, headersFor(route, TALENT));
        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          success: false,
          error: 'VERIFICATION_REQUIRED',
          message: 'Verify your account to continue.',
          missingRequirements: m,
        });
        expect(writes).toEqual([]);
        expect(sideEffects).toEqual([]);
      });

      it('runs the gate before validation: an invalid body is still 403, not 400', async () => {
        gate.mockResolvedValue(CLOSED('identity'));
        const res = await send(route, headersFor(route, TALENT), route.invalidBody);
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('VERIFICATION_REQUIRED');
        expect(writes).toEqual([]);
        expect(sideEffects).toEqual([]);
      });

      it('identity verification unavailable -> 503 IDENTITY_VERIFICATION_UNAVAILABLE, nothing written', async () => {
        gate.mockRejectedValue(new IdentityVerificationUnavailableException());
        const res = await send(route, headersFor(route, TALENT));
        expect(res.status).toBe(503);
        expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE');
        expect(writes).toEqual([]);
        expect(sideEffects).toEqual([]);
      });

      it('unauthenticated callers are refused before any gate call', async () => {
        const res = await send(route, {});
        expect(res.status).toBe(401);
        expect(gate).not.toHaveBeenCalled();
        expect(writes).toEqual([]);
      });
    });

    describe('subject / ownership', () => {
      it('session-scoped routes gate the session owner for a machine caller with no user header', async () => {
        gate.mockResolvedValue(CLOSED('both'));
        const res = await send(ROUTES[2], bearerHeaders());
        expect(gate).toHaveBeenCalledWith(TALENT);
        expect(res.status).toBe(403);
        expect(res.body.missingRequirements).toBe('both');
        expect(writes).toEqual([]);
      });

      it('entry and break edits resolve the owner through the entry/break session', async () => {
        gate.mockResolvedValue(CLOSED('identity'));
        expect((await send(ROUTES[3], bearerHeaders())).status).toBe(403);
        expect((await send(ROUTES[5], bearerHeaders())).status).toBe(403);
        expect(gate).toHaveBeenCalledWith(TALENT);
        expect(writes).toEqual([]);
      });

      it('a verified caller cannot write into an unverified talent\'s session, and learns nothing about their state', async () => {
        gate.mockImplementation(async (id) => (id === OTHER ? OPEN : CLOSED('identity')));
        const res = await send(ROUTES[2], bearerHeaders(OTHER));
        expect(res.status).toBe(403);
        expect(res.body).not.toHaveProperty('missingRequirements');
        expect(res.body.error).not.toBe('VERIFICATION_REQUIRED');
        expect(writes).toEqual([]);
      });

      it('an unverified caller cannot use a verified talent\'s session either', async () => {
        gate.mockImplementation(async (id) => (id === TALENT ? OPEN : CLOSED('identity')));
        const res = await send(ROUTES[2], bearerHeaders(OTHER));
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('VERIFICATION_REQUIRED');
        expect(writes).toEqual([]);
      });

      it('an unknown session with no caller identity is refused without gating or writing', async () => {
        const res = await send({ ...ROUTES[2], path: '/sessions/missing/entries' }, bearerHeaders());
        expect(res.status).toBe(404);
        expect(gate).not.toHaveBeenCalled();
        expect(writes).toEqual([]);
      });

      it('machine caller starting a session with no user identity is refused (401) without a write', async () => {
        const res = await send(ROUTES[0], bearerHeaders());
        expect(res.status).toBe(401);
        expect(writes).toEqual([]);
      });
    });

    describe('routes that stay ungated', () => {
      beforeEach(() => gate.mockResolvedValue(CLOSED('identity')));

      it.each([
        ['list sessions', 'get', '/sessions?contractId=c1', 'bearer'],
        ['read a session', 'get', '/sessions/s1', 'bearer'],
        ['list entries', 'get', '/sessions/s1/entries', 'bearer'],
        ['list breaks', 'get', '/sessions/s1/breaks', 'bearer'],
        ['list activity', 'get', '/sessions/s1/activity', 'bearer'],
        ['list own manual time', 'get', '/manual-time', 'jwt'],
        ['view the timeline-facing event list', 'get', '/activitywatch/events', 'jwt'],
      ])('%s is read-only and not gated', async (_n, method, path, auth) => {
        const headers = auth === 'jwt' ? jwtHeaders(TALENT) : bearerHeaders(TALENT);
        const res = await (request(app.getHttpServer()) as any)[method](path).set(headers);
        expect(res.status).not.toBe(403);
        expect(gate).not.toHaveBeenCalled();
      });
    });
  });

  describe('with the real gate client over a stubbed RabbitMQ proxy', () => {
    const proxyReturning = (reply: unknown) => ({ send: jest.fn(() => of(reply)) });

    it.each([
      ['empty object', {}],
      ['null', null],
      ['gateOpen as a string', { gateOpen: 'true', missingRequirements: 'none' }],
      ['missing missingRequirements', { gateOpen: true }],
      ['unknown requirement', { gateOpen: false, missingRequirements: 'banana' }],
      ['open but contradicting', { gateOpen: true, missingRequirements: 'identity' }],
      ['closed but naming nothing', { gateOpen: false, missingRequirements: 'none' }],
    ])('malformed reply (%s) fails closed with 503 on every gated route and writes nothing', async (_label, reply) => {
      await build('real', proxyReturning(reply));
      for (const route of ROUTES) {
        const res = await send(route, headersFor(route, TALENT));
        expect(res.status).toBe(503);
        expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE');
      }
      expect(writes).toEqual([]);
      expect(sideEffects).toEqual([]);
    });

    it('a transport error fails closed with 503 and writes nothing', async () => {
      await build('real', { send: jest.fn(() => throwError(() => new Error('no consumers'))) });
      const res = await send(ROUTES[0], headersFor(ROUTES[0], TALENT));
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE');
      expect(writes).toEqual([]);
    });

    it('a well-formed open reply lets the action through, a closed reply blocks it', async () => {
      await build('real', proxyReturning({ gateOpen: true, missingRequirements: 'none' }));
      expect((await send(ROUTES[0], headersFor(ROUTES[0], TALENT))).status).toBeLessThan(300);
      await app.close();
      await build('real', proxyReturning({ gateOpen: false, missingRequirements: 'identity' }));
      const blocked = await send(ROUTES[0], headersFor(ROUTES[0], TALENT));
      expect(blocked.status).toBe(403);
      expect(blocked.body.missingRequirements).toBe('identity');
      expect(writes).toEqual([]);
    });
  });

  describe('route inventory', () => {
    // Every state-changing route in the service must either carry the G8 gate
    // or be explicitly listed here with the reason it is not one of the five
    // confirmed actions. A new write route fails this test until decided.
    const EXEMPT = new Set([
      // client / reviewer side
      'ManualTimeController.review PUT :id/review',
      'ScreenshotsController.reviewDeleteRequest PUT :id/delete-request',
      'ScreenshotsController.flagScreenshot POST :id/flag',
      'ScreenshotsController.reviewScreenshot PUT :id/review',
      'ScreenshotsController.requestAccess POST :id/request-access',
      'ScreenshotsController.blur PATCH :id/blur',
      'ScreenshotsController.unblur PATCH :id/unblur',
      'DisputesController.update PATCH disputes/:id',
      // removing or annotating existing records, not the five actions
      'ManualTimeController.remove DELETE :id',
      'ScreenshotsController.deleteScreenshot DELETE :id',
      'ScreenshotsController.batchUpdateMeta PATCH batch/meta',
      'ScreenshotsController.updateMeta PATCH :id/meta',
      'DisputesController.create POST sessions/:sessionId/disputes',
      // not one of the five confirmed G8 actions (telemetry / evidence, not time);
      // gating these was considered and deliberately dropped
      'ActivityController.upsert POST sessions/:sessionId/activity',
      'ActivityWatchController.ingest POST events',
      'ScreenshotsController.presign POST presign',
      'ScreenshotsController.confirm POST confirm',
      // not time: read-style presign, device registry, tasks, settings
      'ScreenshotsController.presignRead POST presign-read',
      'DevicesController.register POST register',
      'DevicesController.heartbeat POST heartbeat',
      'SessionsController.takeOver POST :id/take-over',
    ]);

    const controllers: any[] = [
      SessionsController, TimeEntriesController, BreaksController, IdlesController, ActivityController, DisputesController, DevicesController,
      ManualTimeController, ScreenshotsController, ActivityWatchController, TasksController, SettingsController,
    ];
    const WRITE_METHODS = [1, 2, 3, 4]; // RequestMethod POST, PUT, DELETE, PATCH

    it('every write route is gated or deliberately exempt', () => {
      const ungated: string[] = [];
      for (const ctrl of controllers) {
        for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
          if (name === 'constructor') continue;
          const handler = ctrl.prototype[name];
          const method = Reflect.getMetadata(METHOD_METADATA, handler);
          if (method === undefined) continue;
          if (!WRITE_METHODS.includes(method)) continue;
          const verb = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'][method];
          const id = `${ctrl.name}.${name} ${verb} ${Reflect.getMetadata(PATH_METADATA, handler)}`;
          const gated = Reflect.getMetadata('time-tracker-gate:options', handler) !== undefined;
          if (!gated && !EXEMPT.has(id) && !/^(TasksController|SettingsController)\./.test(id)) ungated.push(id);
        }
      }
      expect(ungated).toEqual([]);
    });

    it('the gate is always the last route-level guard, so authentication runs before it', () => {
      for (const ctrl of controllers) {
        for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
          const handler = ctrl.prototype[name];
          if (Reflect.getMetadata('time-tracker-gate:options', handler) === undefined) continue;
          const guards: unknown[] = Reflect.getMetadata('__guards__', handler) ?? [];
          expect(guards[guards.length - 1]).toBe(TimeTrackerGateGuard);
          // and some auth guard is configured above it (class level or route level)
          const classGuards: unknown[] = Reflect.getMetadata('__guards__', ctrl) ?? [];
          expect(guards.length - 1 + classGuards.length).toBeGreaterThan(0);
        }
      }
    });

    it('the five gated action families are all actually decorated', () => {
      const gatedIds: string[] = [];
      for (const ctrl of controllers) {
        for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
          if (Reflect.getMetadata('time-tracker-gate:options', ctrl.prototype[name]) !== undefined) gatedIds.push(`${ctrl.name}.${name}`);
        }
      }
      expect(gatedIds.sort()).toEqual(
        [
          'BreaksController.create',
          'BreaksController.update',
          'IdlesController.create',
          'ManualTimeController.create',
          'SessionsController.close',
          'SessionsController.create',
          'TimeEntriesController.create',
          'TimeEntriesController.update',
        ].sort(),
      );
    });
  });
});
