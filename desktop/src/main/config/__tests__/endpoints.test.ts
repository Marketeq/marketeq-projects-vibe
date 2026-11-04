import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readBuildConfig, resolveApiBaseUrl, type BuildConfig } from '../endpoints';

const staging: BuildConfig = {
  profile: 'staging',
  apiBaseUrl: 'https://api.example.test/',
  webBaseUrl: 'https://web.example.test',
};

describe('resolveApiBaseUrl', () => {
  it('prefers DTT_API_BASE_URL over the build profile', () => {
    expect(
      resolveApiBaseUrl({ env: { DTT_API_BASE_URL: 'http://x:1/' }, isPackaged: true, buildConfig: staging }),
    ).toBe('http://x:1');
  });

  it('falls back to TTS_API_URL', () => {
    expect(resolveApiBaseUrl({ env: { TTS_API_URL: 'http://y:2' }, isPackaged: true, buildConfig: null })).toBe(
      'http://y:2',
    );
  });

  it('uses the build profile when no env override is set', () => {
    expect(resolveApiBaseUrl({ env: {}, isPackaged: true, buildConfig: staging })).toBe('https://api.example.test');
  });

  it('defaults to the local gateway in dev', () => {
    expect(resolveApiBaseUrl({ env: {}, isPackaged: false, buildConfig: null })).toBe('http://localhost:4000');
  });

  it('throws for a packaged build with no URL instead of calling localhost', () => {
    expect(() => resolveApiBaseUrl({ env: {}, isPackaged: true, buildConfig: null })).toThrow(/No API base URL/);
  });
});

describe('readBuildConfig', () => {
  const dirs: string[] = [];
  const appDir = (json?: unknown): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dtt-cfg-'));
    dirs.push(dir);
    if (json !== undefined) {
      fs.mkdirSync(path.join(dir, 'dist', 'main'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'dist', 'main', 'build-config.json'), JSON.stringify(json));
    }
    return dir;
  };
  afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

  it('returns null when the app was built without a profile', () => {
    expect(readBuildConfig(appDir())).toBeNull();
  });

  it('reads the written profile', () => {
    expect(readBuildConfig(appDir(staging))).toEqual(staging);
  });

  it('rejects a config without apiBaseUrl', () => {
    expect(() => readBuildConfig(appDir({ profile: 'staging' }))).toThrow(/apiBaseUrl/);
  });
});
