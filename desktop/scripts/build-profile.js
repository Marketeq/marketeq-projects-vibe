#!/usr/bin/env node
// Builds the app for a named environment profile (build-profiles/<name>.json).
//
//   node scripts/build-profile.js staging
//
// 1. Runs the normal build with VITE_WEB_BASE_URL set, so the renderer's
//    "open on the web" links point at that environment's website.
// 2. Writes dist/main/build-config.json, which the main process reads at boot
//    (src/main/config/endpoints.ts) to find the backend gateway.
//
// Without a profile, a packaged build refuses to start rather than calling
// localhost. Plain `npm run build` (dev) is unchanged.

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const name = process.argv[2];
const root = path.resolve(__dirname, '..');
const profileFile = path.join(root, 'build-profiles', `${name}.json`);

if (!name || !fs.existsSync(profileFile)) {
  const available = fs.readdirSync(path.join(root, 'build-profiles')).map((f) => f.replace(/\.json$/, ''));
  console.error(`Usage: node scripts/build-profile.js <${available.join('|')}>`);
  process.exit(1);
}

const profile = JSON.parse(fs.readFileSync(profileFile, 'utf8'));
for (const key of ['apiBaseUrl', 'webBaseUrl']) {
  if (typeof profile[key] !== 'string' || !/^https?:\/\//.test(profile[key])) {
    console.error(`${profileFile}: "${key}" must be an http(s) URL`);
    process.exit(1);
  }
}

execSync('npm run build', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_WEB_BASE_URL: profile.webBaseUrl.replace(/\/+$/, '') },
});

const out = path.join(root, 'dist', 'main', 'build-config.json');
fs.writeFileSync(out, `${JSON.stringify({ profile: name, ...profile }, null, 2)}\n`);
console.log(`build-profile: wrote ${path.relative(root, out)} (${name})`);
