// src/main/services/auth/__tests__/token-store.test.ts
//
// Token store unit tests — mocks the keytar module to avoid depending on
// an OS keychain being available in CI/dev machines.

import { describe, it, expect, beforeEach } from 'vitest';
import pino from 'pino';
import {
  createTokenStore,
  KEYCHAIN_ACCOUNT_BUNDLE,
  KEYCHAIN_SERVICE,
  TokenBundle,
} from '../token-store';
import type { KeytarLike } from '../token-store';

const logger = pino({ level: 'silent' });

function makeFakeKeytar(opts?: {
  throwOnGet?: boolean;
  throwOnSet?: boolean;
  throwOnDelete?: boolean;
}): KeytarLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async getPassword(service: string, account: string) {
      if (opts?.throwOnGet) throw new Error('boom-get');
      return store.get(`${service}:${account}`) ?? null;
    },
    async setPassword(service: string, account: string, password: string) {
      if (opts?.throwOnSet) throw new Error('boom-set');
      store.set(`${service}:${account}`, password);
    },
    async deletePassword(service: string, account: string) {
      if (opts?.throwOnDelete) throw new Error('boom-delete');
      return store.delete(`${service}:${account}`);
    },
  };
}

const BUNDLE: TokenBundle = {
  accessToken: 'access-abc',
  refreshToken: 'refresh-xyz',
  expiresAt: Date.now() + 900_000,
  userId: 'usr_test',
};

describe('token-store', () => {
  let keytar: ReturnType<typeof makeFakeKeytar>;

  beforeEach(() => {
    keytar = makeFakeKeytar();
  });

  it('round-trips a valid bundle through save → load', async () => {
    const store = createTokenStore({ logger, keytar });
    await store.save(BUNDLE);
    const loaded = await store.load();
    expect(loaded).toEqual(BUNDLE);
    expect(keytar.store.size).toBe(1);
    expect(
      keytar.store.get(`${KEYCHAIN_SERVICE}:${KEYCHAIN_ACCOUNT_BUNDLE}`),
    ).toBe(JSON.stringify(BUNDLE));
  });

  it('isPresent reflects whether a bundle is stored', async () => {
    const store = createTokenStore({ logger, keytar });
    expect(await store.isPresent()).toBe(false);
    await store.save(BUNDLE);
    expect(await store.isPresent()).toBe(true);
  });

  it('clear removes the bundle', async () => {
    const store = createTokenStore({ logger, keytar });
    await store.save(BUNDLE);
    await store.clear();
    expect(await store.load()).toBeNull();
    expect(keytar.store.size).toBe(0);
  });

  it('load returns null when nothing is stored', async () => {
    const store = createTokenStore({ logger, keytar });
    expect(await store.load()).toBeNull();
  });

  it('load clears and returns null when stored JSON is malformed', async () => {
    const store = createTokenStore({ logger, keytar });
    keytar.store.set(
      `${KEYCHAIN_SERVICE}:${KEYCHAIN_ACCOUNT_BUNDLE}`,
      'not-json',
    );
    expect(await store.load()).toBeNull();
    expect(keytar.store.size).toBe(0);
  });

  it('load clears and returns null when stored JSON fails schema', async () => {
    const store = createTokenStore({ logger, keytar });
    keytar.store.set(
      `${KEYCHAIN_SERVICE}:${KEYCHAIN_ACCOUNT_BUNDLE}`,
      JSON.stringify({ foo: 'bar' }),
    );
    expect(await store.load()).toBeNull();
    expect(keytar.store.size).toBe(0);
  });

  it('save throws on invalid bundle (zod validation)', async () => {
    const store = createTokenStore({ logger, keytar });
    await expect(
      store.save({ accessToken: '', refreshToken: '', expiresAt: -1, userId: '' }),
    ).rejects.toThrow();
  });

  it('load returns null when keytar.getPassword throws', async () => {
    const throwingKeytar = makeFakeKeytar({ throwOnGet: true });
    const store = createTokenStore({ logger, keytar: throwingKeytar });
    expect(await store.load()).toBeNull();
  });

  it('save propagates errors from keytar.setPassword', async () => {
    const throwingKeytar = makeFakeKeytar({ throwOnSet: true });
    const store = createTokenStore({ logger, keytar: throwingKeytar });
    await expect(store.save(BUNDLE)).rejects.toThrow('boom-set');
  });

  it('clear swallows errors from keytar.deletePassword', async () => {
    const throwingKeytar = makeFakeKeytar({ throwOnDelete: true });
    const store = createTokenStore({ logger, keytar: throwingKeytar });
    await expect(store.clear()).resolves.toBeUndefined();
  });

  it('operates in no-op mode when keytar is explicitly null', async () => {
    const store = createTokenStore({ logger, keytar: null });
    await store.save(BUNDLE);
    expect(await store.load()).toBeNull();
    expect(await store.isPresent()).toBe(false);
    await expect(store.clear()).resolves.toBeUndefined();
  });
});
