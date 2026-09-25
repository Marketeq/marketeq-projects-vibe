// src/main/services/capture/__tests__/app-icon-service.test.ts
//
// Unit tests for extractAppIconToFile (pure, injectable exec/platform,
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
  it('passes non-Windows names through unchanged', () => {
    expect(resolveFriendlyAppName('Google Chrome', 'darwin', vi.fn() as any)).toBe('Google Chrome');
  });

  it('returns the resolved FileDescription when a matching process is found', () => {
    const exec = vi.fn().mockReturnValue(Buffer.from('Google Chrome\r\n'));
    expect(resolveFriendlyAppName('chrome.exe', 'win32', exec as any)).toBe('Google Chrome');
  });

  it('falls back to the name with .exe stripped when no process matches', () => {
    const exec = vi.fn().mockReturnValue(Buffer.from('  \n'));
    expect(resolveFriendlyAppName('SomeApp.exe', 'win32', exec as any)).toBe('SomeApp');
  });

  it('falls back to the stripped name non-fatally when exec throws', () => {
    const exec = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    expect(resolveFriendlyAppName('chrome.exe', 'win32', exec as any)).toBe('chrome');
  });
});

describe('extractAppIconToFile', () => {
  it('returns null on unsupported platforms', () => {
    expect(extractAppIconToFile('Whatever', os.tmpdir(), 'linux', vi.fn() as any)).toBeNull();
  });

  it('returns null when exec throws (non-fatal)', () => {
    const exec = vi.fn().mockImplementation(() => {
      throw new Error('no such app');
    });
    expect(extractAppIconToFile('Google Chrome', os.tmpdir(), 'darwin', exec as any)).toBeNull();
    expect(extractAppIconToFile('Google Chrome', os.tmpdir(), 'win32', exec as any)).toBeNull();
  });

  it('darwin: returns null when Info.plist has no CFBundleIconFile match', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const bundlePath = path.join(tmp, 'Fake.app');
    fs.mkdirSync(path.join(bundlePath, 'Contents', 'Resources'), { recursive: true });
    fs.writeFileSync(path.join(bundlePath, 'Contents', 'Info.plist'), '<plist></plist>');

    const exec = vi.fn().mockReturnValue(Buffer.from(bundlePath + '\n'));
    const result = extractAppIconToFile('Fake', tmp, 'darwin', exec as any);
    expect(result).toBeNull();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('darwin: extracts via sips when Info.plist and .icns are present', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const bundlePath = path.join(tmp, 'Fake.app');
    fs.mkdirSync(path.join(bundlePath, 'Contents', 'Resources'), { recursive: true });
    fs.writeFileSync(
      path.join(bundlePath, 'Contents', 'Info.plist'),
      '<plist><dict><key>CFBundleIconFile</key><string>AppIcon</string></dict></plist>',
    );
    fs.writeFileSync(path.join(bundlePath, 'Contents', 'Resources', 'AppIcon.icns'), 'fake-icns');

    const exec = vi.fn().mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'osascript') return Buffer.from(bundlePath + '\n');
      if (cmd === 'sips') {
        const outIdx = args.indexOf('--out');
        fs.writeFileSync(args[outIdx + 1], 'fake-png-bytes');
        return Buffer.from('');
      }
      throw new Error('unexpected command: ' + cmd);
    });

    const result = extractAppIconToFile('Fake', tmp, 'darwin', exec as any);
    expect(result).not.toBeNull();
    expect(fs.existsSync(result!)).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('win32: returns null when the PowerShell script writes no file', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const exec = vi.fn().mockReturnValue(Buffer.from(''));
    const result = extractAppIconToFile('Notepad', tmp, 'win32', exec as any);
    expect(result).toBeNull();
    expect(exec).toHaveBeenCalledWith(
      'powershell.exe',
      expect.any(Array),
      expect.objectContaining({ timeout: 3000 }),
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('win32: extracts when the PowerShell script writes a file', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const exec = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      const script = args[args.length - 1];
      const match = script.match(/\$bmp\.Save\("([^"]+)"/);
      if (match) fs.writeFileSync(match[1], 'fake-png-bytes');
      return Buffer.from('');
    });
    const result = extractAppIconToFile('Notepad', tmp, 'win32', exec as any);
    expect(result).not.toBeNull();
    expect(fs.existsSync(result!)).toBe(true);
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
  it('only runs extraction once per app name across repeated calls', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const exec = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      const script = args[args.length - 1];
      const match = script.match(/\$bmp\.Save\("([^"]+)"/);
      if (match) fs.writeFileSync(match[1], 'fake-png-bytes');
      return Buffer.from('');
    });
    const cache = createAppIconExtractionCache(tmp, 'win32', exec as any);

    const first = cache.getIconPath('Slack');
    const second = cache.getIconPath('Slack');

    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(exec).toHaveBeenCalledTimes(1);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('re-extracts a different app name independently', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-icon-test-'));
    const exec = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      const script = args[args.length - 1];
      const match = script.match(/\$bmp\.Save\("([^"]+)"/);
      if (match) fs.writeFileSync(match[1], 'fake-png-bytes');
      return Buffer.from('');
    });
    const cache = createAppIconExtractionCache(tmp, 'win32', exec as any);

    cache.getIconPath('Slack');
    cache.getIconPath('Chrome');

    expect(exec).toHaveBeenCalledTimes(2);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
