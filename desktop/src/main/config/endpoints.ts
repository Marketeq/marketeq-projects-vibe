// src/main/config/endpoints.ts
//
// Single source of truth for the backend (API gateway) URL the main process
// talks to. Resolution order:
//
//   1. DTT_API_BASE_URL / TTS_API_URL env var — runtime override (local dev,
//      E2E, pointing an installed build at another environment).
//   2. `build-config.json` written by `scripts/build-profile.js` from a
//      committed profile in `build-profiles/` (e.g. staging) at build time.
//   3. Dev only (unpackaged): the local gateway on http://localhost:4000, per
//      DEVOPS_SOP §4 — local development runs the backend locally.
//
// A packaged build with neither 1 nor 2 throws instead of silently calling
// localhost, which would fail on every machine that doesn't run the backend.

import fs from 'node:fs';
import path from 'node:path';

export const BUILD_CONFIG_FILE = 'build-config.json';
const DEV_API_BASE_URL = 'http://localhost:4000';

export interface BuildConfig {
  profile: string;
  apiBaseUrl: string;
  webBaseUrl: string;
}

export interface ResolveApiBaseUrlInput {
  env: NodeJS.ProcessEnv;
  isPackaged: boolean;
  buildConfig: BuildConfig | null;
}

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function resolveApiBaseUrl(input: ResolveApiBaseUrlInput): string {
  const fromEnv = input.env.DTT_API_BASE_URL ?? input.env.TTS_API_URL;
  if (fromEnv && fromEnv.trim()) return normalize(fromEnv);
  if (input.buildConfig?.apiBaseUrl) return normalize(input.buildConfig.apiBaseUrl);
  if (!input.isPackaged) return DEV_API_BASE_URL;
  throw new Error(
    'No API base URL configured for this build. Build with a profile ' +
      '(e.g. `npm run dist:win:staging`) or set DTT_API_BASE_URL.',
  );
}

/** Reads `dist/main/build-config.json` under the app root; null when absent. */
export function readBuildConfig(appPath: string): BuildConfig | null {
  const file = path.join(appPath, 'dist', 'main', BUILD_CONFIG_FILE);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<BuildConfig>;
  if (typeof parsed.apiBaseUrl !== 'string' || !parsed.apiBaseUrl.trim()) {
    throw new Error(`${BUILD_CONFIG_FILE} is missing apiBaseUrl`);
  }
  return {
    profile: String(parsed.profile ?? 'unknown'),
    apiBaseUrl: parsed.apiBaseUrl,
    webBaseUrl: String(parsed.webBaseUrl ?? ''),
  };
}
