import 'reflect-metadata'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Observable, of, throwError } from 'rxjs'
import * as request from 'supertest'
import { TalentProfileController } from './talent-profile.controller'
import { TalentProfileRecommendationService } from './talent-profile-recommendation.service'
import { TalentProfileSyncService } from './talent-profile-sync.service'
import { TalentProfile } from './entities/talent-profile.entity'
import { TalentDiscoveryGateService } from '../identity-gate/talent-discovery-gate.service'
import {
  IDENTITY_VERIFICATION_CLIENT,
  IdentityVerificationGateClient,
} from '../identity-gate/identity-verification-gate.client'

// G1 - the user-service side of the Algolia gate: profile syncs stamp the gate
// decision and the owning account onto the index event; the backfill/reconcile
// re-sends every profile's decision; direct profile reads stay open to all.

const OPEN = { gateOpen: true, missingRequirements: 'none' }
const CLOSED = { gateOpen: false, missingRequirements: 'both' }

const profile = (n: number, sourceId: string | null) =>
  ({
    id: `id-${n}`, externalId: `cms-${n}`, sourceId, username: `user${n}`, name: `Name${n}`, status: 'active',
    jobTitles: [], skills: [], languages: [], certifications: [], workExperience: [], portfolio: [],
    industryExpertise: [], overview: null, location: null, timezone: null, rate: null, availability: null,
    createdAt: new Date('2026-01-01T00:00:00Z'), rating: null, country: null,
  }) as unknown as TalentProfile

const IDENTITY: Record<string, { gateOpen: boolean; missingRequirements: string }> = {
  'acct-1': OPEN, 'acct-2': CLOSED, 'acct-3': OPEN,
}

describe('G1 - gate state on talent index events (user-service)', () => {
  let transport: jest.Mock
  let algoliaEmit: jest.Mock
  let algoliaSend: jest.Mock
  let rabbitEmit: jest.Mock
  let rows: TalentProfile[]
  let service: TalentProfileSyncService

  const reply = (record: any) => ({
    decisions: (record.data.userIds as string[]).filter((u) => IDENTITY[u]).map((u) => ({ userId: u, ...IDENTITY[u] })),
  })

  const build = async (identity?: (p: string, r: any) => Observable<unknown>) => {
    transport = jest.fn(identity ?? ((_p, r) => of(reply(r))))
    algoliaEmit = jest.fn(() => of(undefined))
    algoliaSend = jest.fn(() => of({ updated: 1 }))
    rabbitEmit = jest.fn(async () => undefined)
    const repo = {
      find: jest.fn(async (o: any) => rows.slice(o.skip ?? 0, (o.skip ?? 0) + (o.take ?? rows.length))),
      findOne: jest.fn(async () => null),
      create: jest.fn((d: any) => ({ ...d, id: 'new', externalId: d.externalId, createdAt: new Date() })),
      save: jest.fn(async (e: any) => e),
    }
    const moduleRef = await Test.createTestingModule({
      providers: [
        TalentProfileSyncService,
        IdentityVerificationGateClient,
        { provide: IDENTITY_VERIFICATION_CLIENT, useValue: { send: transport } },
        { provide: getRepositoryToken(TalentProfile), useValue: repo },
        { provide: getRepositoryToken(require('../user/entities/user.entity').User), useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn((d: any) => d), update: jest.fn() } },
        { provide: 'ALGOLIA_CLIENT', useValue: { emit: algoliaEmit, send: algoliaSend } },
        { provide: 'RABBITMQ_CLIENT', useValue: { emit: rabbitEmit } },
        { provide: 'CATEGORY_CLIENT', useValue: { send: jest.fn(() => of({ categories: [], subcategories: [] })) } },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'RABBITMQ_URL' ? 'amqp://test' : undefined) } },
      ],
    }).compile()
    service = moduleRef.get(TalentProfileSyncService)
  }

  beforeEach(() => {
    rows = [profile(1, 'acct-1'), profile(2, 'acct-2'), profile(3, 'acct-3'), profile(4, null)]
  })

  const algoliaPayloads = () => algoliaEmit.mock.calls.map((c) => c[1])

  describe('profile sync', () => {
    const event = (n: number, sourceId: string | null) => ({ id: `cms-${n}`, sourceId, username: `user${n}`, name: `Name${n}` }) as any

    it('stamps the owning account and identity\'s decision (open) on the index event', async () => {
      await build()
      await (service as any).repo.findOne.mockResolvedValue(null)
      await service.upsert(event(1, 'acct-1'))
      const p = algoliaPayloads()[0]
      expect(p).toMatchObject({ id: 'cms-1', accountId: 'acct-1', gateOpen: true })
      expect(Date.parse(p.gateCheckedAt)).not.toBeNaN()
      expect(rabbitEmit.mock.calls[0][1]).toMatchObject({ accountId: 'acct-1', gateOpen: true }) // second emitter agrees
    })

    it('stamps a closed gate for an unverified account', async () => {
      await build()
      await service.upsert(event(2, 'acct-2'))
      expect(algoliaPayloads()[0]).toMatchObject({ accountId: 'acct-2', gateOpen: false })
    })

    it('sends NO gate decision when identity cannot answer, so the index keeps what it has (hidden if nothing)', async () => {
      await build(() => throwError(() => new Error('no consumer')))
      await service.upsert(event(1, 'acct-1'))
      const p = algoliaPayloads()[0]
      expect(p.accountId).toBe('acct-1')
      expect(p).not.toHaveProperty('gateOpen')
      expect(p).not.toHaveProperty('gateCheckedAt')
    })

    it('sends no gate decision when identity does not know the account', async () => {
      await build()
      await service.upsert(event(5, 'acct-unknown'))
      expect(algoliaPayloads()[0]).not.toHaveProperty('gateOpen')
    })

    it('a profile save never fails because identity is down', async () => {
      await build(() => throwError(() => new Error('timeout')))
      await expect(service.upsert(event(1, 'acct-1'))).resolves.toBeDefined()
    })
  })

  describe('reindexGate (backfill / reconcile)', () => {
    it('sends every account-owned profile\'s current decision to algolia-service, in batches', async () => {
      await build()
      const out = await service.reindexGate(2)
      expect(out).toEqual({ processed: 4, sent: 3, unanswered: 1, failedBatches: 0 })
      const sent = algoliaSend.mock.calls.flatMap((c) => c[1].entries)
      expect(sent).toEqual([
        { id: 'cms-1', accountId: 'acct-1', gateOpen: true },
        { id: 'cms-2', accountId: 'acct-2', gateOpen: false },
        { id: 'cms-3', accountId: 'acct-3', gateOpen: true },
      ])
      expect(algoliaSend.mock.calls.every((c) => c[0] === 'talent.gate_backfill')).toBe(true)
      expect(algoliaSend.mock.calls.every((c) => typeof c[1].checkedAt === 'string')).toBe(true)
    })

    it('asks identity in batches, not once per profile', async () => {
      await build()
      await service.reindexGate(100)
      expect(transport).toHaveBeenCalledTimes(1)
    })

    it('an account-less profile is never sent, so its record can never become visible', async () => {
      await build()
      await service.reindexGate(100)
      expect(JSON.stringify(algoliaSend.mock.calls)).not.toContain('cms-4')
    })

    it('an unanswered identity batch sends nothing for that batch and is counted', async () => {
      await build(() => throwError(() => new Error('timeout')))
      const out = await service.reindexGate(100)
      expect(out).toMatchObject({ sent: 0, failedBatches: 1 })
      expect(algoliaSend).not.toHaveBeenCalled()
    })

    it('a batch algolia-service cannot apply is counted and the run continues', async () => {
      await build()
      algoliaSend.mockImplementationOnce(() => throwError(() => new Error('algolia down')))
      const out = await service.reindexGate(2)
      expect(out.failedBatches).toBe(1)
      expect(out.sent).toBe(1) // the second batch (cms-3) still went out
    })

    it('does not run twice at once', async () => {
      await build()
      const a = service.reindexGate(100)
      const b = await service.reindexGate(100)
      expect(b).toEqual({ processed: 0, sent: 0, unanswered: 0, failedBatches: 0 })
      await a
    })

    it('is repeatable: the same pass twice sends the same decisions', async () => {
      await build()
      await service.reindexGate(100)
      const first = JSON.stringify(algoliaSend.mock.calls.map((c) => c[1].entries))
      algoliaSend.mockClear()
      await service.reindexGate(100)
      expect(JSON.stringify(algoliaSend.mock.calls.map((c) => c[1].entries))).toBe(first)
    })
  })
})

describe('G1 - direct talent profile URLs stay accessible (user-service)', () => {
  let app: INestApplication
  let transport: jest.Mock

  beforeEach(async () => {
    transport = jest.fn(() => of({ decisions: [{ userId: 'acct-2', ...CLOSED }] }))
    const hidden = { id: 'id-2', username: 'user2', name: 'Name2', sourceId: 'acct-2', status: 'active' }
    const repo = { findOne: jest.fn(async ({ where }: any) => (where.username === 'user2' ? hidden : null)) }
    const moduleRef = await Test.createTestingModule({
      controllers: [TalentProfileController],
      providers: [
        TalentProfileRecommendationService,
        TalentDiscoveryGateService,
        IdentityVerificationGateClient,
        { provide: IDENTITY_VERIFICATION_CLIENT, useValue: { send: transport } },
        { provide: getRepositoryToken(TalentProfile), useValue: repo },
        { provide: HttpService, useValue: { post: jest.fn() } },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'RABBITMQ_URL' ? 'amqp://test' : undefined) } },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()
  })
  afterEach(() => app.close())

  it('a talent whose gate is closed is still served at its own URL, to anyone', async () => {
    const res = await request(app.getHttpServer()).get('/public/talent/user2')
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('user2')
  })

  it('the direct read never consults identity and says nothing about why a talent might be unavailable', async () => {
    const res = await request(app.getHttpServer()).get('/public/talent/user2')
    expect(transport).not.toHaveBeenCalled()
    expect(JSON.stringify(res.body)).not.toMatch(/verif|gate|missingRequirements|unavailable/i)
  })
})
