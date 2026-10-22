import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import {
  PersistentStatusAlert,
  PersistentStatusAlertType,
} from '../entities/persistent-status-alert.entity';
import { PersistentStatusAlertService } from './persistent-status-alert.service';

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
        const candidate = rows.find(
          (item) => item.id === where.id && item.userId === where.userId,
        );
        if (candidate) Object.assign(candidate, updates);
        return { affected: candidate ? 1 : 0 };
      },
    ),
  };
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
});
