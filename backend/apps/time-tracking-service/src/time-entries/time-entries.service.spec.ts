import 'reflect-metadata';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntry } from '../entities/time-entry.entity';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';

// In-memory stand-in for the time_entries table.
function makeRepo() {
  const rows: TimeEntry[] = [];
  return {
    rows,
    findOneBy: jest.fn(async (where: Partial<TimeEntry>) => rows.find((r) => r.id === where.id) ?? null),
    create: jest.fn((data: Partial<TimeEntry>) => ({ ...data }) as TimeEntry),
    save: jest.fn(async (row: TimeEntry) => {
      rows.push(row);
      return row;
    }),
  };
}

const base = {
  id: 'ent_1',
  startedAt: '2026-10-15T10:00:00.000Z',
  endedAt: '2026-10-15T10:05:00.000Z',
  durationSeconds: 300,
};

const errorsFor = async (body: object) =>
  (await validate(plainToInstance(CreateTimeEntryDto, body))).map((e) => e.property);

describe('CreateTimeEntryDto — source (crash recovery, DTT-US-132)', () => {
  it.each(['live', 'manual', 'recovered'])("accepts source '%s'", async (source) => {
    expect(await errorsFor({ ...base, source })).toEqual([]);
  });

  it('accepts a body with no source (older desktop versions)', async () => {
    expect(await errorsFor(base)).toEqual([]);
  });

  it('rejects any other source', async () => {
    expect(await errorsFor({ ...base, source: 'imported' })).toEqual(['source']);
  });
});

describe('TimeEntriesService.create — source', () => {
  it("stores 'recovered' when the desktop sends it", async () => {
    const repo = makeRepo();
    const svc = new TimeEntriesService(repo as unknown as Repository<TimeEntry>);
    const saved = await svc.create('ses_1', { ...base, source: 'recovered' });
    expect(saved.source).toBe('recovered');
  });

  it("defaults to 'live' when no source is sent", async () => {
    const repo = makeRepo();
    const svc = new TimeEntriesService(repo as unknown as Repository<TimeEntry>);
    const saved = await svc.create('ses_1', base);
    expect(saved.source).toBe('live');
  });
});
