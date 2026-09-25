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
import { execFileSync } from 'node:child_process';

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
export function resolveFriendlyAppName(
  rawName: string,
  platform: NodeJS.Platform = process.platform,
  exec: typeof execFileSync = execFileSync,
): string {
  const stripped = rawName.replace(/\.exe$/i, '');
  if (platform !== 'win32') return rawName;
  try {
    const escaped = rawName.replace(/"/g, '`"');
    const escapedStripped = stripped.replace(/"/g, '`"');
    const psScript = `
$p = Get-Process | Where-Object {
  try {
    $_.ProcessName -eq "${escapedStripped}" -or $_.MainModule.ModuleName -eq "${escaped}"
  } catch { $false }
} | Select-Object -First 1
if ($p) {
  try { $p.MainModule.FileVersionInfo.FileDescription } catch {}
}
`;
    const result = exec(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      { timeout: 2000 },
    )
      .toString()
      .trim();
    return result || stripped;
  } catch {
    return stripped;
  }
}

/**
 * Best-effort: extracts the given app's own icon and writes it to a PNG
 * under outDir. Returns the file path, or null on any failure.
 */
export function extractAppIconToFile(
  appName: string,
  outDir: string,
  platform: NodeJS.Platform = process.platform,
  exec: typeof execFileSync = execFileSync,
): string | null {
  try {
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `icon-${slugify(appName)}.png`);

    if (platform === 'darwin') {
      const escaped = appName.replace(/"/g, '\\"');
      const bundlePath = exec(
        'osascript',
        ['-e', `POSIX path of (path to application "${escaped}")`],
        { timeout: 3000 },
      )
        .toString()
        .trim();
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

      exec('sips', ['-s', 'format', 'png', icnsPath, '--out', outPath], { timeout: 3000 });
      return fs.existsSync(outPath) ? outPath : null;
    }

    if (platform === 'win32') {
      const escapedName = appName.replace(/"/g, '`"');
      // Names can arrive two ways: a friendly display name from
      // detectActiveAppName (FileDescription, e.g. "Google Chrome"), or a
      // raw executable name from the ActivityWatch tracker (e.g.
      // "chrome.exe"). Match against either so extraction works
      // regardless of which tracker produced the name.
      const escapedNameNoExt = appName.replace(/\.exe$/i, '').replace(/"/g, '`"');
      const escapedOut = outPath.replace(/"/g, '`"');
      const psScript = `
Add-Type -AssemblyName System.Drawing
$p = Get-Process | Where-Object {
  try {
    $_.MainModule.FileVersionInfo.FileDescription -eq "${escapedName}" -or
    $_.ProcessName -eq "${escapedNameNoExt}" -or
    $_.MainModule.ModuleName -eq "${escapedName}"
  } catch { $false }
} | Select-Object -First 1
if ($p) {
  $exePath = $p.MainModule.FileName
  $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
  if ($icon) {
    $bmp = $icon.ToBitmap()
    $bmp.Save("${escapedOut}", [System.Drawing.Imaging.ImageFormat]::Png)
  }
}
`;
      exec(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
        { timeout: 3000 },
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
  exec: typeof execFileSync = execFileSync,
) {
  const cache = new Map<string, string | null>();
  return {
    getIconPath(appName: string): string | null {
      if (cache.has(appName)) {
        const cached = cache.get(appName)!;
        if (cached && fs.existsSync(cached)) return cached;
      }
      const extracted = extractAppIconToFile(appName, outDir, platform, exec);
      cache.set(appName, extracted);
      return extracted;
    },
  };
}
export type AppIconExtractionCache = ReturnType<typeof createAppIconExtractionCache>;
