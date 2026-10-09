import { QueryFailedError, Repository } from 'typeorm';
import { ActivityService } from './activity.service';
import { ActivityMinute } from '../entities/activity-minute.entity';

// In-memory stand-in for the activity_minutes table, enforcing the same two unique
// constraints as Postgres: the primary key and (session_id, minute_start_at).
function makeRepo() {
  const rows: ActivityMinute[] = [];
  const uniqueViolation = () =>
    new QueryFailedError('INSERT INTO activity_minutes', [], Object.assign(new Error('duplicate key'), { code: '23505' }));

  const repo = {
    rows,
    findOneBy: jest.fn(async (where: Partial<ActivityMinute>) =>
      rows.find((r) =>
        (where.id === undefined || r.id === where.id) &&
        (where.sessionId === undefined || r.sessionId === where.sessionId) &&
        (where.minuteStartAt === undefined || r.minuteStartAt.getTime() === where.minuteStartAt.getTime()),
      ) ?? null,
    ),
    create: jest.fn((data: Partial<ActivityMinute>) => ({ ...data }) as ActivityMinute),
    save: jest.fn(async (row: ActivityMinute) => {
      if (rows.some((r) => r.id === row.id)) throw uniqueViolation();
      if (rows.some((r) => r.sessionId === row.sessionId && r.minuteStartAt.getTime() === row.minuteStartAt.getTime())) {
        throw uniqueViolation();
      }
      rows.push({ ...row, createdAt: new Date() });
      return row;
    }),
    update: jest.fn(async (criteria: { id: string }, patch: Partial<ActivityMinute>) => {
      const row = rows.find((r) => r.id === criteria.id);
      if (row) Object.assign(row, patch);
    }),
  };
  return repo;
}

const MINUTE = '2026-10-08T14:31:00.000Z';
const minute = (id: string, active: boolean, minuteStartAt = MINUTE) => ({ id, minuteStartAt, active });

describe('ActivityService.upsert', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: ActivityService;

  beforeEach(() => {
    repo = makeRepo();
    service = new ActivityService(repo as unknown as Repository<ActivityMinute>);
  });

  it('inserts a new minute', async () => {
    await expect(service.upsert('ses_1', { minutes: [minute('act_1', true)] })).resolves.toEqual({ inserted: 1 });
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ id: 'act_1', sessionId: 'ses_1', active: true });
    expect(repo.rows[0].minuteStartAt.toISOString()).toBe(MINUTE);
  });

  it('skips a resend of the same id (unchanged behaviour)', async () => {
    await service.upsert('ses_1', { minutes: [minute('act_1', true)] });
    await expect(service.upsert('ses_1', { minutes: [minute('act_1', true)] })).resolves.toEqual({ inserted: 0 });
    expect(repo.rows).toHaveLength(1);
  });

  it('merges a second upload of the same minute under a new id instead of failing', async () => {
    await service.upsert('ses_1', { minutes: [minute('act_1', false)] });
    await expect(service.upsert('ses_1', { minutes: [minute('act_2', true)] })).resolves.toEqual({ inserted: 0 });
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ id: 'act_1', active: true });
  });

  it('never downgrades an active minute to idle', async () => {
    await service.upsert('ses_1', { minutes: [minute('act_1', true)] });
    await service.upsert('ses_1', { minutes: [minute('act_2', false)] });
    expect(repo.rows[0].active).toBe(true);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('keeps minutes from different sessions separate', async () => {
    await service.upsert('ses_1', { minutes: [minute('act_1', false)] });
    await expect(service.upsert('ses_2', { minutes: [minute('act_2', true)] })).resolves.toEqual({ inserted: 1 });
    expect(repo.rows).toHaveLength(2);
    expect(repo.rows.find((r) => r.sessionId === 'ses_1')?.active).toBe(false);
  });

  it('inserts every new minute in a batch', async () => {
    const batch = [minute('act_1', true), minute('act_2', false, '2026-10-08T14:32:00.000Z')];
    await expect(service.upsert('ses_1', { minutes: batch })).resolves.toEqual({ inserted: 2 });
    expect(repo.rows).toHaveLength(2);
  });

  it('merges when a concurrent upload of the same minute wins the insert race', async () => {
    await service.upsert('ses_1', { minutes: [minute('act_1', false)] });
    // Simulate the race: the pre-insert check misses the row the other request just wrote.
    repo.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(service.upsert('ses_1', { minutes: [minute('act_2', true)] })).resolves.toEqual({ inserted: 0 });
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].active).toBe(true);
  });

  it('rethrows errors that are not a same-minute conflict', async () => {
    repo.save.mockRejectedValueOnce(new Error('connection reset'));
    await expect(service.upsert('ses_1', { minutes: [minute('act_1', true)] })).rejects.toThrow('connection reset');
  });
});
