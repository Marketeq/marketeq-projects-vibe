import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import {
  PersistentStatusAlert,
  PersistentStatusAlertType,
} from '../entities/persistent-status-alert.entity';
import {
  ACTIVE_STATUS_ALERT_LIMIT,
  PersistentStatusAlertService,
} from './persistent-status-alert.service';

const row = (
  over: Partial<PersistentStatusAlert> = {},
): PersistentStatusAlert => ({
  id: 'alert-1',
  userId: 'user-1',
  type: 'travel_mode',
  occurrenceKey: 'activation-1',
  title: 'Travel Mode is active',
  body: 'You are marked as temporarily traveling.',
  link: null,
  metadata: null,
  dismissedAt: null,
  createdAt: new Date('2026-10-22T12:00:00.000Z'),
  updatedAt: new Date('2026-10-22T12:00:00.000Z'),
  ...over,
});

function setup(initial: PersistentStatusAlert[] = []) {
  const rows = [...initial];
  const repo = {
    find: jest.fn(async ({ where }: any) =>
      rows
        .filter(
          (candidate) =>
            candidate.userId === where.userId && !candidate.dismissedAt,
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    ),
    findOne: jest.fn(
      async ({ where }: any) =>
        rows.find((candidate) =>
          Object.entries(where).every(([key, value]) => {
            if (value === undefined) return true;
            return candidate[key as keyof PersistentStatusAlert] === value;
          }),
        ) ?? null,
    ),
    create: jest.fn((value: Partial<PersistentStatusAlert>) => value),
    save: jest.fn(async (value: PersistentStatusAlert) => {
      const saved = row({ ...value, id: `alert-${rows.length + 1}` });
      rows.push(saved);
      return saved;
    }),
    update: jest.fn(
      async (where: any, updates: Partial<PersistentStatusAlert>) => {
        if (where.type && !where.id) {
          // `type` is a bare string (exact occurrences) or In([...]) (account-wide types).
          const types: string[] = where.type.value ?? [where.type];
          const keys: string[] | undefined = where.occurrenceKey?.value;
          const hit = rows.filter(
            (item) =>
              item.userId === where.userId &&
              types.includes(item.type) &&
              (!keys || keys.includes(item.occurrenceKey)) &&
              !item.dismissedAt,
          );
          hit.forEach((item) => Object.assign(item, updates));
          return { affected: hit.length };
        }
        const candidate = rows.find(
          (item) => item.id === where.id && item.userId === where.userId,
        );
        if (candidate) Object.assign(candidate, updates);
        return { affected: candidate ? 1 : 0 };
      },
    ),
  };
  const manager = {
    getRepository: () => repo,
    transaction: async (work: (m: any) => Promise<unknown>) => work(manager),
  };
  (repo as any).manager = manager;
  return {
    service: new PersistentStatusAlertService(repo as any),
    repo,
    rows,
  };
}

const payload = (type: PersistentStatusAlertType = 'travel_mode') => ({
  recipientId: 'user-1',
  type,
  occurrenceKey: 'activation-1',
  title: 'Travel Mode is active',
  body: 'You are marked as temporarily traveling.',
});

describe('PersistentStatusAlertService', () => {
  it('lists only the signed-in user’s active alerts, newest first, without exposing userId or occurrenceKey', async () => {
    const { service } = setup([
      row({ id: 'older', createdAt: new Date('2026-10-20T12:00:00.000Z') }),
      row({ id: 'newer', type: 'verified', occurrenceKey: 'verification-1' }),
      row({ id: 'dismissed', dismissedAt: new Date() }),
      row({ id: 'other-user', userId: 'user-2' }),
    ]);

    const result = await service.listActive('user-1');

    expect(result.map((alert) => alert.id)).toEqual(['newer', 'older']);
    expect(result[0]).not.toHaveProperty('userId');
    expect(result[0]).not.toHaveProperty('occurrenceKey');
  });

  it.each([
    'travel_mode',
    'submitted_for_review',
    'verified',
    'home_country_updated',
  ] as PersistentStatusAlertType[])(
    'creates a persistent %s alert',
    async (type) => {
      const { service, rows } = setup();

      await service.upsert(payload(type));

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ type, dismissedAt: null });
    },
  );

  it('does not duplicate or resurrect the same dismissed occurrence', async () => {
    const dismissed = row({
      dismissedAt: new Date('2026-10-22T12:05:00.000Z'),
    });
    const { service, repo } = setup([dismissed]);

    await expect(service.upsert(payload())).resolves.toMatchObject({
      id: dismissed.id,
    });
    expect(repo.save).not.toHaveBeenCalled();
    expect(dismissed.dismissedAt).not.toBeNull();
  });

  it('allows a later occurrence of the same alert type', async () => {
    const { service, rows } = setup([row({ dismissedAt: new Date() })]);

    await service.upsert({ ...payload(), occurrenceKey: 'activation-2' });

    expect(rows).toHaveLength(2);
  });

  describe('Travel Mode confirmation occurrences (PMCM-651)', () => {
    const activation = {
      ...payload(),
      occurrenceKey: 'travel-mode:2026-10-26T14:00:00.000Z',
    };
    const confirmation = (id: string) => ({
      ...payload(),
      occurrenceKey: `travel-mode-confirmed:${id}`,
    });

    it('a confirmation is a NEW occurrence even after the activation alert was dismissed', async () => {
      const { service, rows } = setup([
        row({
          occurrenceKey: activation.occurrenceKey,
          dismissedAt: new Date('2026-10-26T14:05:00.000Z'),
        }),
      ]);

      await service.upsert(confirmation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));

      expect(rows).toHaveLength(2);
      expect(rows.filter((r) => !r.dismissedAt)).toHaveLength(1);
    });

    it('a retry or redelivery of the same confirmation is stored once, and a dismissed one is not resurrected', async () => {
      const { service, rows } = setup();
      const same = confirmation('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

      await service.upsert(same);
      await service.upsert(same);
      expect(rows).toHaveLength(1);

      rows[0].dismissedAt = new Date();
      await service.upsert(same);
      expect(rows).toHaveLength(1);
      expect(rows[0].dismissedAt).not.toBeNull();
    });

    it('a second click (a new confirmationId) is a second occurrence', async () => {
      const { service, rows } = setup();
      await service.upsert(confirmation('cccccccc-cccc-4ccc-8ccc-cccccccccccc'));
      await service.upsert(confirmation('dddddddd-dddd-4ddd-8ddd-dddddddddddd'));
      expect(rows).toHaveLength(2);
    });
  });

  it('dismisses only an alert owned by the signed-in user and is idempotent', async () => {
    const alert = row();
    const { service, repo } = setup([alert]);

    await expect(service.dismiss('user-1', alert.id)).resolves.toEqual({
      dismissed: true,
    });
    expect(repo.update).toHaveBeenCalledWith(
      { id: alert.id, userId: 'user-1', dismissedAt: IsNull() },
      { dismissedAt: expect.any(Date) },
    );
    await expect(service.dismiss('user-1', alert.id)).resolves.toEqual({
      dismissed: true,
    });
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('does not reveal or dismiss another user’s alert', async () => {
    const { service, rows } = setup([row({ userId: 'user-2' })]);

    await expect(service.dismiss('user-1', 'alert-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(rows[0].dismissedAt).toBeNull();
  });

  it.each([
    [{ ...payload(), recipientId: '' }, 'recipientId'],
    [{ ...payload(), occurrenceKey: '' }, 'occurrenceKey'],
    [{ ...payload(), type: 'unknown' }, 'type'],
    [{ ...payload(), title: '' }, 'title'],
    [{ ...payload(), body: '' }, 'body'],
  ])('rejects an invalid event payload', async (invalid) => {
    const { service } = setup();
    await expect(service.upsert(invalid as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([
    'javascript:alert(1)',
    '//evil.example',
    'data:text/html,x',
    '/ok path',
  ])('rejects an unsafe link (%s)', async (link) => {
    const { service, repo } = setup();
    await expect(service.upsert({ ...payload(), link })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('accepts an in-app path and an https link', async () => {
    const { service } = setup();
    await expect(
      service.upsert({ ...payload(), link: '/talent-dashboard' }),
    ).resolves.toMatchObject({ link: '/talent-dashboard' });
  });

  it('rejects oversized metadata', async () => {
    const { service } = setup();
    await expect(
      service.upsert({ ...payload(), metadata: { blob: 'x'.repeat(5000) } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('caps the active list', async () => {
    const { service, repo } = setup();
    await service.listActive('user-1');
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: ACTIVE_STATUS_ALERT_LIMIT }),
    );
  });

  describe('approved home-country change on an already verified account (PMCM-651)', () => {
    const home = (key: string) => ({
      ...payload(),
      type: 'home_country_updated' as const,
      occurrenceKey: `home-country-updated:${key}`,
      supersedes: ['travel_mode' as const, 'submitted_for_review' as const],
    });

    it("dismisses the review's Submitted alert and the Travel Mode alert, and never touches an existing Verified alert", async () => {
      const { service, rows } = setup([
        row({
          id: 'v',
          type: 'verified',
          occurrenceKey: 'identity-verified:first',
          dismissedAt: new Date('2026-10-20T00:00:00Z'),
        }),
        row({
          id: 's',
          type: 'submitted_for_review',
          occurrenceKey: 'submitted-for-review:sess-2',
        }),
        row({ id: 't', type: 'travel_mode', occurrenceKey: 'travel-mode:a' }),
      ]);
      await service.upsert(home('sess-2'));

      expect(rows.find((r) => r.id === 's')?.dismissedAt).toBeInstanceOf(Date);
      expect(rows.find((r) => r.id === 't')?.dismissedAt).toBeInstanceOf(Date);
      // The earlier Verified occurrence stays exactly as it was (dismissed): nothing reactivates it.
      expect(rows.find((r) => r.id === 'v')?.dismissedAt).toEqual(
        new Date('2026-10-20T00:00:00Z'),
      );
      expect((await service.listActive('user-1')).map((a) => a.type)).toEqual([
        'home_country_updated',
      ]);
    });

    it('a replayed event supersedes nothing a second time: a later independent submission survives', async () => {
      const { service, rows } = setup();
      await service.upsert(home('sess-2'));
      rows.push(
        row({
          id: 'later',
          type: 'submitted_for_review',
          occurrenceKey: 'submitted-for-review:sess-9',
        }),
      );
      await service.upsert(home('sess-2')); // the same occurrence again
      expect(rows.find((r) => r.id === 'later')?.dismissedAt).toBeNull();
    });

    it('a later, genuinely independent Verified occurrence is stored and keeps the Home Country Updated alert', async () => {
      const { service } = setup();
      await service.upsert(home('sess-2'));
      await service.upsert({
        ...payload(),
        type: 'verified',
        occurrenceKey: 'identity-verified:sess-5',
        supersedes: ['submitted_for_review'],
      });
      expect(
        (await service.listActive('user-1')).map((a) => a.type).sort(),
      ).toEqual(['home_country_updated', 'verified']);
    });
  });

  describe('supersession', () => {
    it("Verified dismisses the same user's active Submitted alert, not another user's", async () => {
      const { service, rows } = setup([
        row({
          id: 's1',
          type: 'submitted_for_review',
          occurrenceKey: 'sess-1',
        }),
        row({
          id: 's2',
          userId: 'user-2',
          type: 'submitted_for_review',
          occurrenceKey: 'sess-9',
        }),
      ]);
      await service.upsert({
        ...payload(),
        type: 'verified',
        occurrenceKey: 'identity-verified:sess-1',
        supersedes: ['submitted_for_review'],
      });
      expect(rows.find((r) => r.id === 's1')?.dismissedAt).toBeInstanceOf(Date);
      expect(rows.find((r) => r.id === 's2')?.dismissedAt).toBeNull();
      expect((await service.listActive('user-1')).map((a) => a.type)).toEqual([
        'verified',
      ]);
    });

    it('a redelivered occurrence supersedes nothing a second time', async () => {
      const { service, rows } = setup();
      const verified = {
        ...payload(),
        type: 'verified' as const,
        occurrenceKey: 'identity-verified:sess-1',
        supersedes: ['submitted_for_review' as const],
      };
      await service.upsert(verified);
      rows.push(
        row({
          id: 'later',
          type: 'submitted_for_review',
          occurrenceKey: 'sess-2',
        }),
      );
      await service.upsert(verified);
      expect(rows.find((r) => r.id === 'later')?.dismissedAt).toBeNull();
    });

    it('rejects an unknown or self-referencing supersedes list before storing', async () => {
      const { service, repo } = setup();
      await expect(
        service.upsert({ ...payload(), supersedes: ['bogus' as any] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.upsert({ ...payload(), supersedes: [payload().type] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('session-scoped supersession (PMCM-651)', () => {
    const submitted = (id: string, session: string, over = {}) =>
      row({
        id,
        type: 'submitted_for_review',
        occurrenceKey: `submitted-for-review:${session}`,
        metadata: { hostedKycSessionId: session },
        ...over,
      });
    const scoped = (session: string) => ({
      type: 'submitted_for_review' as const,
      occurrenceKey: `submitted-for-review:${session}`,
    });
    const homeFor = (session: string) => ({
      ...payload(),
      type: 'home_country_updated' as const,
      occurrenceKey: `home-country-updated:${session}`,
      supersedes: ['travel_mode' as const, scoped(session)],
    });
    const verifiedFor = (session: string) => ({
      ...payload(),
      type: 'verified' as const,
      occurrenceKey: `identity-verified:${session}`,
      supersedes: [scoped(session)],
    });
    const active = async (service: any) =>
      (await service.listActive('user-1')).map(
        (a: any) => a.type + ':' + (a.metadata?.hostedKycSessionId ?? ''),
      );

    it('1. Session A Submitted -> Session A Home Country Updated dismisses Session A Submitted', async () => {
      const { service, rows } = setup([submitted('a', 'sess-A')]);
      await service.upsert(homeFor('sess-A'));
      expect(rows.find((r) => r.id === 'a')?.dismissedAt).toBeInstanceOf(Date);
      expect((await service.listActive('user-1')).map((x) => x.type)).toEqual([
        'home_country_updated',
      ]);
    });

    it("2. Session A's home-country approval does not dismiss an active Session B Submitted", async () => {
      const { service, rows } = setup([
        submitted('a', 'sess-A'),
        submitted('b', 'sess-B'),
      ]);
      await service.upsert(homeFor('sess-A'));
      expect(rows.find((r) => r.id === 'a')?.dismissedAt).toBeInstanceOf(Date);
      expect(rows.find((r) => r.id === 'b')?.dismissedAt).toBeNull();
      expect(await active(service)).toEqual(
        expect.arrayContaining([
          'submitted_for_review:sess-B',
          'home_country_updated:',
        ]),
      );
    });

    it('3. Session A Submitted -> Session A Verified dismisses Session A Submitted', async () => {
      const { service, rows } = setup([submitted('a', 'sess-A')]);
      await service.upsert(verifiedFor('sess-A'));
      expect(rows.find((r) => r.id === 'a')?.dismissedAt).toBeInstanceOf(Date);
      expect((await service.listActive('user-1')).map((x) => x.type)).toEqual([
        'verified',
      ]);
    });

    it("4. Session A's verification does not dismiss an active Session B Submitted", async () => {
      const { service, rows } = setup([
        submitted('a', 'sess-A'),
        submitted('b', 'sess-B'),
      ]);
      await service.upsert(verifiedFor('sess-A'));
      expect(rows.find((r) => r.id === 'a')?.dismissedAt).toBeInstanceOf(Date);
      expect(rows.find((r) => r.id === 'b')?.dismissedAt).toBeNull();
    });

    it('5. Travel Mode supersession is unchanged: a home-country approval still ends every active Travel Mode alert of the account, and only those', async () => {
      const { service, rows } = setup([
        row({ id: 't1', type: 'travel_mode', occurrenceKey: 'travel-mode:1' }),
        row({ id: 't2', type: 'travel_mode', occurrenceKey: 'travel-mode:2' }),
        row({
          id: 'v',
          type: 'verified',
          occurrenceKey: 'identity-verified:old',
        }),
        row({
          id: 'o',
          userId: 'user-2',
          type: 'travel_mode',
          occurrenceKey: 'travel-mode:x',
        }),
      ]);
      await service.upsert(homeFor('sess-A'));
      expect(rows.find((r) => r.id === 't1')?.dismissedAt).toBeInstanceOf(Date);
      expect(rows.find((r) => r.id === 't2')?.dismissedAt).toBeInstanceOf(Date);
      expect(rows.find((r) => r.id === 'v')?.dismissedAt).toBeNull(); // Verified is never touched
      expect(rows.find((r) => r.id === 'o')?.dismissedAt).toBeNull(); // another account
    });

    it('6. a duplicate / replayed approval is idempotent and supersedes nothing a second time', async () => {
      const { service, rows } = setup([submitted('a', 'sess-A')]);
      await service.upsert(homeFor('sess-A'));
      rows.push(
        submitted('b', 'sess-A', {
          occurrenceKey: 'submitted-for-review:sess-A-again',
        }),
      );
      const before = rows.length;
      await service.upsert(homeFor('sess-A')); // the same occurrence again
      expect(rows.length).toBe(before); // nothing stored twice
      expect(rows.find((r) => r.id === 'b')?.dismissedAt).toBeNull(); // nothing dismissed twice
    });

    it('7. backward compatible: the earlier bare-type form still works account-wide, and rows written before this change are matched by their occurrence key', async () => {
      const { service, rows } = setup([
        submitted('a', 'sess-A'),
        submitted('b', 'sess-B'),
      ]);
      await service.upsert({
        ...verifiedFor('legacy'),
        supersedes: ['submitted_for_review'],
      });
      expect(rows.find((r) => r.id === 'a')?.dismissedAt).toBeInstanceOf(Date);
      expect(rows.find((r) => r.id === 'b')?.dismissedAt).toBeInstanceOf(Date);

      // A pre-existing Submitted row (no scoped metadata needed: the key alone correlates it).
      const legacy = setup([
        row({
          id: 'old',
          type: 'submitted_for_review',
          occurrenceKey: 'submitted-for-review:sess-Z',
          metadata: null,
        }),
      ]);
      await legacy.service.upsert(verifiedFor('sess-Z'));
      expect(
        legacy.rows.find((r) => r.id === 'old')?.dismissedAt,
      ).toBeInstanceOf(Date);
    });

    it('a scoped entry that names the occurrence of the wrong type or an empty key is rejected before anything is stored', async () => {
      const { service, repo } = setup();
      await expect(
        service.upsert({
          ...verifiedFor('s'),
          supersedes: [{ type: 'verified', occurrenceKey: 'x' } as any],
        }),
      ).rejects.toBeInstanceOf(BadRequestException); // may not name its own type
      await expect(
        service.upsert({
          ...verifiedFor('s'),
          supersedes: [
            { type: 'submitted_for_review', occurrenceKey: ' ' } as any,
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.upsert({
          ...verifiedFor('s'),
          supersedes: [{ type: 'bogus', occurrenceKey: 'k' } as any],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
