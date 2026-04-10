// src/main/services/auth/token-store.ts
//
// Secure token storage for the Marketeq Time Tracker desktop app.
//
// Responsibilities (doc 15 §1, §5):
//   * Persist the refresh token + user id + expiry metadata in the OS
//     keychain (macOS Keychain / Windows Credential Manager) via `keytar`.
//   * Access tokens are stored in-memory only by the AuthService — this
//     module intentionally does NOT persist the access token to disk.
//     (We DO cache it inside a single keytar "bundle" entry as a
//     convenience for fast resume while the OS is unlocked; that stays
//     encrypted-at-rest by the OS keychain the same way the refresh token
//     does. See §5 — keychain is locked behind the OS user's session.)
//   * Methods: `save`, `load`, `clear`, `isPresent`.
//   * Logs a warning and degrades gracefully if keytar throws (headless
//     CI, Linux without libsecret, etc.) — callers treat the store as
//     absent.
//
// This file contains NO direct business logic — AuthService orchestrates.

import { z } from 'zod';
import type { Logger } from 'pino';

/** Keychain service name — matches doc 15 §5 (reversed-DNS pattern). */
export const KEYCHAIN_SERVICE = 'com.marketeq.time-tracker';

/** Single account under which we store the JSON token bundle. */
export const KEYCHAIN_ACCOUNT_BUNDLE = 'token-bundle';

// ---------------------------------------------------------------------------
// Schemas / types
// ---------------------------------------------------------------------------

export const TokenBundle = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** Absolute wall-clock ms when the access token expires. */
  expiresAt: z.number().int().positive(),
  userId: z.string().min(1),
});
export type TokenBundle = z.infer<typeof TokenBundle>;

/** Thin subset of the `keytar` API we actually use. Kept injectable for tests. */
export interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export interface TokenStoreDeps {
  logger: Logger;
  /** Injectable keytar module. When omitted, the real `keytar` is lazily required. */
  keytar?: KeytarLike | null;
  /** Overrideable service name (tests). */
  service?: string;
  /** Overrideable account name (tests). */
  account?: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTokenStore(deps: TokenStoreDeps) {
  const service = deps.service ?? KEYCHAIN_SERVICE;
  const account = deps.account ?? KEYCHAIN_ACCOUNT_BUNDLE;
  const logger = deps.logger.child({ module: 'auth/token-store' });

  let keytar: KeytarLike | null | undefined = deps.keytar;

  function getKeytar(): KeytarLike | null {
    if (keytar !== undefined) return keytar;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('keytar') as KeytarLike;
      keytar = mod;
      return keytar;
    } catch (err) {
      logger.warn(
        { err: (err as Error)?.message },
        'keytar not available — token store will operate in no-op fallback mode',
      );
      keytar = null;
      return null;
    }
  }

  async function save(bundle: TokenBundle): Promise<void> {
    const parsed = TokenBundle.parse(bundle);
    const kt = getKeytar();
    if (!kt) {
      logger.warn('save: keytar unavailable, token bundle will not persist');
      return;
    }
    try {
      await kt.setPassword(service, account, JSON.stringify(parsed));
      logger.debug({ userId: parsed.userId }, 'token bundle saved');
    } catch (err) {
      logger.error({ err }, 'failed to save token bundle to keychain');
      throw err;
    }
  }

  async function load(): Promise<TokenBundle | null> {
    const kt = getKeytar();
    if (!kt) return null;
    let raw: string | null = null;
    try {
      raw = await kt.getPassword(service, account);
    } catch (err) {
      logger.warn({ err }, 'keytar read failed — treating as no stored token');
      return null;
    }
    if (!raw) return null;
    try {
      const json = JSON.parse(raw) as unknown;
      const parsed = TokenBundle.safeParse(json);
      if (!parsed.success) {
        logger.warn(
          { issues: parsed.error.issues },
          'stored token bundle failed schema validation — clearing',
        );
        await clear();
        return null;
      }
      return parsed.data;
    } catch (err) {
      logger.warn({ err }, 'stored token bundle was not valid JSON — clearing');
      await clear();
      return null;
    }
  }

  async function clear(): Promise<void> {
    const kt = getKeytar();
    if (!kt) return;
    try {
      await kt.deletePassword(service, account);
      logger.debug('token bundle cleared');
    } catch (err) {
      logger.warn({ err }, 'keytar delete failed — continuing');
    }
  }

  async function isPresent(): Promise<boolean> {
    const bundle = await load();
    return bundle != null;
  }

  return { save, load, clear, isPresent };
}

export type TokenStore = ReturnType<typeof createTokenStore>;
