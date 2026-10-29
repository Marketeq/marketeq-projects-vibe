// src/main/services/contracts/__tests__/register-ipc.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => {
      handlers.set(channel, fn);
    },
    removeHandler: (channel: string) => {
      handlers.delete(channel);
    },
  },
}));

import { IPC } from '../../../../shared/ipc-contracts';
import type { BackendContract } from '../../../../shared/ipc-contracts';
import { registerContractsIpc } from '../register-ipc';

const API = 'http://api.test';

function contract(id: string, clientId: string): Partial<BackendContract> {
  return { id, clientId, title: `Contract ${id}`, status: 'active', rate: 50 };
}

function json(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

// Serves the talent's contracts, and a profile per client id from `users`.
// A client id missing from `users` answers 404.
function mockFetch(contracts: Partial<BackendContract>[], users: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    if (url === `${API}/contracts/talent/talent-1`) return json(contracts);
    const m = url.match(/\/users\/([^/]+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      return id in users ? json(users[id]) : json({ message: 'User not found' }, 404);
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

async function getMine(): Promise<BackendContract[]> {
  const fn = handlers.get(IPC.contractsGetMine);
  if (!fn) throw new Error('contracts:get-mine not registered');
  return (await fn()) as BackendContract[];
}

describe('contracts:get-mine — client avatar', () => {
  beforeEach(() => {
    handlers.clear();
    registerContractsIpc({
      getAccessToken: () => 'token',
      getUserId: () => 'talent-1',
      apiBaseUrl: API,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches each contract's client avatarUrl", async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([contract('c1', 'client-a'), contract('c2', 'client-b')], {
        'client-a': { id: 'client-a', avatarUrl: 'https://cdn.test/a.png' },
        'client-b': { id: 'client-b', avatarUrl: 'https://cdn.test/b.png' },
      }),
    );

    const out = await getMine();

    expect(out.map((c) => [c.id, c.clientAvatarUrl])).toEqual([
      ['c1', 'https://cdn.test/a.png'],
      ['c2', 'https://cdn.test/b.png'],
    ]);
  });

  it('looks each client up once, even across several contracts', async () => {
    const fetchMock = mockFetch(
      [contract('c1', 'client-a'), contract('c2', 'client-a'), contract('c3', 'client-b')],
      {
        'client-a': { avatarUrl: 'https://cdn.test/a.png' },
        'client-b': { avatarUrl: 'https://cdn.test/b.png' },
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await getMine();

    const userCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/users/'));
    expect(userCalls.map(([url]) => url)).toEqual([`${API}/users/client-a`, `${API}/users/client-b`]);
    expect(out.map((c) => c.clientAvatarUrl)).toEqual([
      'https://cdn.test/a.png',
      'https://cdn.test/a.png',
      'https://cdn.test/b.png',
    ]);
  });

  it('a failed or empty lookup leaves the contract intact with a null avatar', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(
        [contract('c1', 'missing'), contract('c2', 'no-avatar'), contract('c3', 'client-a')],
        {
          'no-avatar': { id: 'no-avatar', avatarUrl: null },
          'client-a': { avatarUrl: 'https://cdn.test/a.png' },
        },
      ),
    );

    const out = await getMine();

    expect(out).toHaveLength(3);
    expect(out.map((c) => [c.id, c.title, c.clientAvatarUrl])).toEqual([
      ['c1', 'Contract c1', null],
      ['c2', 'Contract c2', null],
      ['c3', 'Contract c3', 'https://cdn.test/a.png'],
    ]);
  });

  it('a network error on the lookup does not fail the contract list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/contracts/talent/talent-1')) return json([contract('c1', 'client-a')]);
        throw new Error('ECONNREFUSED');
      }),
    );

    const out = await getMine();

    expect(out.map((c) => [c.id, c.clientAvatarUrl])).toEqual([['c1', null]]);
  });
});

describe('contracts:get-mine — time caps (PMCM-829)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mirrors each contract's weekly cap into local SQLite, in seconds", async () => {
    handlers.clear();
    const upsert = vi.fn();
    registerContractsIpc({
      getAccessToken: () => 'token',
      getUserId: () => 'talent-1',
      apiBaseUrl: API,
      contractRepo: { upsert } as never,
      taskRepo: { upsert: vi.fn() } as never,
    });
    vi.stubGlobal(
      'fetch',
      mockFetch(
        [
          { ...contract('c1', 'client-a'), weeklyCapHours: 20, currencyCode: 'EUR' },
          { ...contract('c2', 'client-a'), weeklyCapHours: null },
        ],
        { 'client-a': { id: 'client-a' } },
      ),
    );

    await getMine();

    const caps = upsert.mock.calls.map(([row]) => [row.id, row.weekly_cap_seconds]);
    expect(caps).toEqual([
      ['c1', 20 * 3600],
      ['c2', null],
    ]);
    // PMCM-837: the contract's own currency, USD when the backend sends none.
    expect(upsert.mock.calls.map(([row]) => row.currency)).toEqual(['EUR', 'USD']);
  });
});
