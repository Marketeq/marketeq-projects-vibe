#!/usr/bin/env node
/**
 * boot-all.js — Single-process launcher for all backend services.
 *
 * Spawns each service as a child process so they run on different ports
 * inside one Render/Docker container. The API gateway is the only port
 * exposed externally; all other services listen on localhost only.
 *
 * Usage:
 *   node boot-all.js
 *
 * Environment:
 *   PORT             — external port for the gateway (Render sets this)
 *   DATABASE_URL     — shared Supabase connection string
 *   All other env vars are inherited by child processes.
 *
 * This script:
 *   1. Sets internal service URLs as env vars for the gateway
 *   2. Spawns each service with its own PORT
 *   3. Restarts crashed services automatically
 *   4. Exits if the gateway crashes (Render will restart the container)
 */

const { spawn } = require('child_process');
const path = require('path');

// External port (Render injects PORT)
const GATEWAY_PORT = process.env.PORT || '10000';

// Internal ports — only reachable inside the container
const SERVICES = [
  { name: 'auth-service',     port: '3001', dir: 'apps/auth-service' },
  { name: 'user-service',     port: '3002', dir: 'apps/user-service' },
  { name: 'listings-service', port: '3003', dir: 'apps/listings-service' },
];

const GATEWAY = { name: 'api-gateway', port: GATEWAY_PORT, dir: 'apps/api-gateway' };

// Build internal service URLs for the gateway
const gatewayEnv = {
  ...process.env,
  PORT: GATEWAY_PORT,
  AUTH_SERVICE_URL: 'http://localhost:3001',
  USER_SERVICE_URL: 'http://localhost:3002',
  LISTINGS_SERVICE_URL: 'http://localhost:3003',
};

function launchService(svc, env, isGateway = false) {
  const distMain = path.join(__dirname, 'dist', svc.dir, 'main.js');
  const svcEnv = env || { ...process.env, PORT: svc.port };

  if (svc.name === 'listings-service' && !require('fs').existsSync(distMain)) {
    console.log(`[boot:debug] ${distMain} missing — listing dist/apps/listings-service contents:`);
    try {
      const walk = (dir, depth = 0) => {
        if (depth > 4) return;
        for (const entry of require('fs').readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, entry.name);
          console.log(`[boot:debug] ${' '.repeat(depth * 2)}${entry.isDirectory() ? '[D]' : '[F]'} ${p}`);
          if (entry.isDirectory()) walk(p, depth + 1);
        }
      };
      walk(path.join(__dirname, 'dist', 'apps', 'listings-service'));
    } catch (e) { console.log('[boot:debug] readdir error:', e.message); }
  }

  console.log(`[boot] Starting ${svc.name} on port ${svcEnv.PORT}...`);

  const child = spawn('node', [distMain], {
    env: svcEnv,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    console.error(`[boot] ${svc.name} exited with code ${code}`);
    if (isGateway) {
      // Gateway crash = fatal, let Render restart the container
      console.error('[boot] Gateway crashed — exiting.');
      process.exit(1);
    }
    // Auto-restart other services after 2 seconds
    setTimeout(() => launchService(svc, env, false), 2000);
  });

  return child;
}

// Start internal services first, then the gateway
console.log('[boot] Launching all services in single container...');
console.log(`[boot] Gateway will listen on port ${GATEWAY_PORT}`);

for (const svc of SERVICES) {
  launchService(svc, { ...process.env, PORT: svc.port }, false);
}

// Give services 2 seconds to start, then launch gateway
setTimeout(() => {
  launchService(GATEWAY, gatewayEnv, true);
}, 2000);

// Forward signals for graceful shutdown
['SIGTERM', 'SIGINT'].forEach((sig) => {
  process.on(sig, () => {
    console.log(`[boot] Received ${sig}, shutting down...`);
    process.exit(0);
  });
});
