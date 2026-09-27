// src/main/services/capture/app-icon-service.ts
//
// Resolves a real, OS-extracted icon for a given app name, instead of
// guessing one from the name.
//
// extractAppIconToFile() asks the OS for the app's own icon and writes
// it to a temp PNG:
//   macOS:   `path to application "<name>"` (osascript) -> bundle path
//            -> Info.plist's CFBundleIconFile -> .icns -> `sips`
//            converts to PNG. Both osascript and sips ship on every
//            Mac; no new dependency.
//   Windows: finds the running process whose FileDescription matches
//            the app name (same PowerShell pattern used by
//            detectActiveAppName's win32 branch) and extracts its icon
//            via .NET's Icon.ExtractAssociatedIcon — built in, no new
//            dependency.
// Best-effort and non-fatal throughout: any failure (app not found,
// icon lives in an asset catalog instead of a loose .icns, etc.)
// returns null rather than throwing into the capture pipeline.
//
// readIconAsBase64() and the small extraction cache below are used by
// screenshot-service.ts / event-bridge.ts to avoid re-running the OS
// extraction for an app already extracted this process lifetime, and to
// turn the resulting file into the iconBase64 the desktop sends in the
// /screenshots/confirm payload — mirroring exactly how the main
// screenshot image itself is already sent (see
// screenshots.service.ts#confirm, which saves it locally in dev rather
// than requiring real R2 credentials that this environment doesn't
// have configured).

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Async shell-out signature used throughout this file (and injected in
 * tests). Runs off the main thread's synchronous call stack — a slow or
 * hung PowerShell/osascript process no longer freezes Electron's IPC,
 * windows, and timers while it runs (previously execFileSync blocked the
 * whole main process for the full duration of every call).
 */
export type AsyncExecFile = (
  file: string,
  args: string[],
  options: { timeout?: number; env?: NodeJS.ProcessEnv },
) => Promise<string>;

const defaultExec: AsyncExecFile = async (file, args, options) => {
  const { stdout } = await execFileAsync(file, args, options);
  return stdout;
};

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'app'
  );
}

/**
 * Best-effort: turns a raw name into a friendly display name.
 *
 * On Windows, ActivityWatch's aw-watcher-window reports the raw executable
 * name (e.g. "chrome.exe"), unlike detectActiveAppName's polling path,
 * which already reads the friendly FileDescription (e.g. "Google Chrome").
 * This resolves the same way icon extraction already does — find the
 * matching running process and read its FileVersionInfo.FileDescription —
 * so names look consistent regardless of which tracker produced them.
 * Falls back to the name with ".exe" stripped if no match is found or the
 * lookup fails; never throws. macOS/other platforms are passed through
 * unchanged (aw-watcher-window's other capture strategies already report a
 * display name there).
 */
export async function resolveFriendlyAppName(
  rawName: string,
  platform: NodeJS.Platform = process.platform,
  exec: AsyncExecFile = defaultExec,
): Promise<string> {
  const stripped = rawName.replace(/\.exe$/i, '');
  if (platform !== 'win32') return rawName;
  try {
    // rawName comes from the OS (a window's process/module name) — never
    // interpolate it into the script text itself. PowerShell string
    // interpolation inside "..." expands $(...) and $var, so a name like
    // `x$(Start-Process calc)` would execute as code if pasted into the
    // script. Passed via env instead: $env:VAR is always read as a plain
    // string value, never parsed as PowerShell syntax, regardless of what
    // characters it contains.
    const psScript = `
$name = $env:DTT_APP_NAME
$nameNoExt = $name -replace '\\.exe$', ''
$p = Get-Process | Where-Object {
  try {
    $_.ProcessName -eq $nameNoExt -or $_.MainModule.ModuleName -eq $name
  } catch { $false }
} | Select-Object -First 1
if ($p) {
  try { $p.MainModule.FileVersionInfo.FileDescription } catch {}
}
`;
    const result = (
      await exec(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
        { timeout: 2000, env: { ...process.env, DTT_APP_NAME: rawName } },
      )
    ).trim();
    return result || stripped;
  } catch {
    return stripped;
  }
}

/**
 * Best-effort: extracts the given app's own icon and writes it to a PNG
 * under outDir. Returns the file path, or null on any failure.
 */
export async function extractAppIconToFile(
  appName: string,
  outDir: string,
  platform: NodeJS.Platform = process.platform,
  exec: AsyncExecFile = defaultExec,
): Promise<string | null> {
  try {
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `icon-${slugify(appName)}.png`);

    if (platform === 'darwin') {
      // appName is untrusted (arbitrary app-reported metadata) — never
      // interpolated into the AppleScript text. `on run argv` receives it
      // as a real argument instead, so it's always treated as a plain
      // string value by AppleScript, never as script syntax to parse.
      const bundlePath = (
        await exec(
          'osascript',
          ['-e', 'on run argv\n  return POSIX path of (path to application (item 1 of argv))\nend run', appName],
          { timeout: 3000 },
        )
      ).trim();
      if (!bundlePath) return null;

      const plistPath = path.join(bundlePath, 'Contents', 'Info.plist');
      if (!fs.existsSync(plistPath)) return null;
      const plistXml = fs.readFileSync(plistPath, 'utf8');
      const match = plistXml.match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/);
      const matchedIconFile = match?.[1];
      if (!matchedIconFile) return null; // e.g. modern app using an asset catalog instead

      let iconFile = matchedIconFile;
      if (!/\.icns$/i.test(iconFile)) iconFile += '.icns';
      const icnsPath = path.join(bundlePath, 'Contents', 'Resources', iconFile);
      if (!fs.existsSync(icnsPath)) return null;

      await exec('sips', ['-s', 'format', 'png', icnsPath, '--out', outPath], { timeout: 3000 });
      return fs.existsSync(outPath) ? outPath : null;
    }

    if (platform === 'win32') {
      // appName is untrusted (arbitrary app-reported metadata, e.g. a
      // FileDescription string any executable can set) and must never be
      // interpolated into the script text — see resolveFriendlyAppName
      // above for why. Both appName and outPath (which we generate
      // ourselves, but keep consistent with the same safe pattern) are
      // passed via env instead.
      //
      // Names can arrive two ways: a friendly display name from
      // detectActiveAppName (FileDescription, e.g. "Google Chrome"), or a
      // raw executable name from the ActivityWatch tracker (e.g.
      // "chrome.exe"). Match against either so extraction works
      // regardless of which tracker produced the name.
      const psScript = `
Add-Type -AssemblyName System.Drawing
$name = $env:DTT_APP_NAME
$nameNoExt = $name -replace '\\.exe$', ''
$outPath = $env:DTT_OUT_PATH
$p = Get-Process | Where-Object {
  try {
    $_.MainModule.FileVersionInfo.FileDescription -eq $name -or
    $_.ProcessName -eq $nameNoExt -or
    $_.MainModule.ModuleName -eq $name
  } catch { $false }
} | Select-Object -First 1
if ($p) {
  $exePath = $p.MainModule.FileName
  $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
  if ($icon) {
    $bmp = $icon.ToBitmap()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
}
`;
      await exec(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
        { timeout: 3000, env: { ...process.env, DTT_APP_NAME: appName, DTT_OUT_PATH: outPath } },
      );
      return fs.existsSync(outPath) ? outPath : null;
    }

    return null;
  } catch {
    return null;
  }
}

/** Reads a previously extracted icon file and returns it as base64, or null. */
export function readIconAsBase64(iconFilePath: string): string | null {
  try {
    return fs.readFileSync(iconFilePath).toString('base64');
  } catch {
    return null;
  }
}

/**
 * Per-process (not persisted) cache of appName -> already-extracted icon
 * file path, so the same app is only ever run through the OS extraction
 * once per app run, not once per capture. Resets on app restart, which
 * is fine — extraction is cheap (sub-second) and this is purely an
 * optimization, not a correctness requirement.
 */
export function createAppIconExtractionCache(
  outDir: string,
  platform: NodeJS.Platform = process.platform,
  exec: AsyncExecFile = defaultExec,
) {
  const cache = new Map<string, string | null>();
  return {
    async getIconPath(appName: string): Promise<string | null> {
      if (cache.has(appName)) {
        const cached = cache.get(appName)!;
        if (cached && fs.existsSync(cached)) return cached;
      }
      const extracted = await extractAppIconToFile(appName, outDir, platform, exec);
      cache.set(appName, extracted);
      return extracted;
    },
  };
}
export type AppIconExtractionCache = ReturnType<typeof createAppIconExtractionCache>;
