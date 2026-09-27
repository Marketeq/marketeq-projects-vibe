// src/main/services/capture/__tests__/app-icon-service.test.ts
//
// Unit tests for extractAppIconToFile (pure, injectable async exec/platform,
// same convention as detectActiveAppName's tests), readIconAsBase64, and
// the per-process extraction cache — no real Electron, no real network.

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  extractAppIconToFile,
  readIconAsBase64,
  createAppIconExtractionCache,
  resolveFriendlyAppName,
} from '../app-icon-service';

describe('resolveFriendlyAppName', () => {
  it('passes non-Windows names through unchanged', async () => {
    expect(await resolveFriendlyAppName('Google Chrome', 'darwin', vi.fn() as any)).toBe('Google Chrome');
  });

  it('returns the resolved FileDescription when a matching process is found', async () => {
    const exec = vi.fn().mockResolvedValue('Google Chrome\r\n');
    expect(await resolveFriendlyAppName('chrome.exe', 'win32', exec as any)).toBe('Google Chrome');
  });

  it('falls back to the name with .exe stripped when no process matches', async () => {
    const exec = vi.fn().mockResolvedValue('  \n');
    expect(await resolveFriendlyAppName('SomeApp.exe', 'win32', exec as any)).toBe('SomeApp');
  });

  it('falls back to the stripped name non-fatally when exec throws', async () => {
    const exec = vi.fn().mockRejectedValue(new Error('boom'));
    expect(await resolveFriendlyAppName('chrome.exe', 'win32', exec as any)).toBe('chrome');
  });

  it('passes the raw name via env, never interpolated into the script text — a malicious name cannot execute', async () => {
    const malicious = 'x$(Start-Process calc); "`$(rm -rf /)`"';
    const exec = vi.fn().mockImplementation(async (_cmd: string, args: string[], opts: any) => {
      const script = args[args.length - 1];
      expect(script).not.toContain(malicious);
      expect(opts.env.DTT_APP_NAME).toBe(malicious);
      return '';
    });
    await resolveFriendlyAppName(malicious, 'win32', exec as any);
    expect(exec).toHaveBeenCalled();
  });
});

describe('extractAppIconToFile', () => {
  it('returns null on unsupported platforms', async () => {
    expect(await extractAppIconToFile('Whatever', os.tmpdir(), 'linux', vi.fn() as any)).toBeNull();
  });

  it('returns null when exec throws (non-fatal)', async () => {
    const exec = vi.fn().mockRejectedValue(new Error('no such app'));
    expect(await extractAppIconToFile('Google Chrome', os.tmpdir(), 'darwin', exec as any)).toBeNull();
    expect(await extractAppIconToFile('Google Chrome', os.tmpdir(), 'win32', exec as any)).toBeNull();
  });

  it('darwin: returns null when Info.plist has no CFBundleIconFile match', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const bundlePath = path.join(tmp, 'Fake.app');
    fs.mkdirSync(path.join(bundlePath, 'Contents', 'Resources'), { recursive: true });
    fs.writeFileSync(path.join(bundlePath, 'Contents', 'Info.plist'), '<plist></plist>');

    const exec = vi.fn().mockResolvedValue(bundlePath + '\n');
    const result = await extractAppIconToFile('Fake', tmp, 'darwin', exec as any);
    expect(result).toBeNull();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('darwin: extracts via sips when Info.plist and .icns are present', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const bundlePath = path.join(tmp, 'Fake.app');
    fs.mkdirSync(path.join(bundlePath, 'Contents', 'Resources'), { recursive: true });
    fs.writeFileSync(
      path.join(bundlePath, 'Contents', 'Info.plist'),
      '<plist><dict><key>CFBundleIconFile</key><string>AppIcon</string></dict></plist>',
    );
    fs.writeFileSync(path.join(bundlePath, 'Contents', 'Resources', 'AppIcon.icns'), 'fake-icns');

    const exec = vi.fn().mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === 'osascript') return bundlePath + '\n';
      if (cmd === 'sips') {
        const outIdx = args.indexOf('--out');
        fs.writeFileSync(args[outIdx + 1], 'fake-png-bytes');
        return '';
      }
      throw new Error('unexpected command: ' + cmd);
    });

    const result = await extractAppIconToFile('Fake', tmp, 'darwin', exec as any);
    expect(result).not.toBeNull();
    expect(fs.existsSync(result!)).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('win32: returns null when the PowerShell script writes no file', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const exec = vi.fn().mockResolvedValue('');
    const result = await extractAppIconToFile('Notepad', tmp, 'win32', exec as any);
    expect(result).toBeNull();
    expect(exec).toHaveBeenCalledWith(
      'powershell.exe',
      expect.any(Array),
      expect.objectContaining({ timeout: 3000 }),
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('win32: extracts when the PowerShell script writes a file', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const exec = vi.fn().mockImplementation(async (_cmd: string, _args: string[], opts: any) => {
      fs.writeFileSync(opts.env.DTT_OUT_PATH, 'fake-png-bytes');
      return '';
    });
    const result = await extractAppIconToFile('Notepad', tmp, 'win32', exec as any);
    expect(result).not.toBeNull();
    expect(fs.existsSync(result!)).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('win32: passes the app name and output path via env, never interpolated into the script text — a malicious name cannot execute', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const malicious = 'x$(Start-Process calc); "`$(rm -rf /)`"';
    const exec = vi.fn().mockImplementation(async (_cmd: string, args: string[], opts: any) => {
      const script = args[args.length - 1];
      expect(script).not.toContain(malicious);
      expect(opts.env.DTT_APP_NAME).toBe(malicious);
      return '';
    });
    await extractAppIconToFile(malicious, tmp, 'win32', exec as any);
    expect(exec).toHaveBeenCalled();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('darwin: passes the app name as a real osascript argv item, never interpolated into the script text', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const malicious = 'x"; do shell script "touch /tmp/pwned'; // would break out of a quoted literal
    const exec = vi.fn().mockImplementation(async (_cmd: string, args: string[]) => {
      const script = args[1];
      expect(script).not.toContain(malicious);
      expect(args[args.length - 1]).toBe(malicious); // passed as a real argv item instead
      return '';
    });
    await extractAppIconToFile(malicious, tmp, 'darwin', exec as any);
    expect(exec).toHaveBeenCalled();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('readIconAsBase64', () => {
  it('returns base64 content for an existing file', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const f = path.join(tmp, 'icon.png');
    fs.writeFileSync(f, 'hello');
    expect(readIconAsBase64(f)).toBe(Buffer.from('hello').toString('base64'));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns null for a missing file', () => {
    expect(readIconAsBase64(path.join(os.tmpdir(), 'does-not-exist-icon.png'))).toBeNull();
  });
});

describe('createAppIconExtractionCache', () => {
  it('only runs extraction once per app name across repeated calls', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const exec = vi.fn().mockImplementation(async (_cmd: string, _args: string[], opts: any) => {
      fs.writeFileSync(opts.env.DTT_OUT_PATH, 'fake-png-bytes');
      return '';
    });
    const cache = createAppIconExtractionCache(tmp, 'win32', exec as any);

    const first = await cache.getIconPath('Slack');
    const second = await cache.getIconPath('Slack');

    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(exec).toHaveBeenCalledTimes(1);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('re-extracts a different app name independently', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const exec = vi.fn().mockImplementation(async (_cmd: string, _args: string[], opts: any) => {
      fs.writeFileSync(opts.env.DTT_OUT_PATH, 'fake-png-bytes');
      return '';
    });
    const cache = createAppIconExtractionCache(tmp, 'win32', exec as any);

    await cache.getIconPath('Slack');
    await cache.getIconPath('Chrome');

    expect(exec).toHaveBeenCalledTimes(2);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
