#!/usr/bin/env node
// scripts/dev-electron.js
// Launches Electron against the live Vite dev server. Without
// VITE_DEV_SERVER_URL the main process falls back to dist/renderer, a
// bundle from whenever `npm run build` last ran, so renderer changes never
// show up and old bugs come back on every relaunch. Setting it here instead
// of in package.json keeps the script working in cmd.exe, PowerShell and sh.
// Extra CLI args are passed through to Electron.

const { spawn } = require('node:child_process');
const path = require('node:path');

const electron = require('electron');

const child = spawn(electron, [path.join(__dirname, '..'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173',
  },
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
