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
const fs = require('fs');
const path = require('path');

// External port (Render injects PORT)
const GATEWAY_PORT = process.env.PORT || '10000';

// Internal ports — only reachable inside the container
const SERVICES = [
  { name: 'auth-service',               port: '3001', dir: 'apps/auth-service' },
  { name: 'user-service',               port: '3002', dir: 'apps/user-service' },
  { name: 'listings-service',           port: '3003', dir: 'apps/listings-service' },
  { name: 'invitations-service',        port: '3013', dir: 'apps/invitations-service' },
  { name: 'content-moderation-service', port: '3014', dir: 'apps/content-moderation-service' },
  { name: 'time-tracking-service',      port: '3017', dir: 'apps/time-tracking-service' },
];

const GATEWAY = { name: 'api-gateway', port: GATEWAY_PORT, dir: 'apps/api-gateway' };

// Build internal service URLs for the gateway
const gatewayEnv = {
  ...process.env,
  PORT: GATEWAY_PORT,
  HOST: '0.0.0.0',
  AUTH_SERVICE_URL:             'http://localhost:3001',
  USER_SERVICE_URL:             'http://localhost:3002',
  LISTINGS_SERVICE_URL:         'http://localhost:3003',
  INVITATIONS_SERVICE_URL:      'http://localhost:3013',
  MODERATION_SERVICE_URL:       'http://localhost:3014',
  TIME_TRACKING_SERVICE_URL:    'http://localhost:3017',
};

function launchService(svc, env, isGateway = false) {
  const mainCandidates = [
    path.join(__dirname, 'dist', svc.dir, 'main.js'),
    path.join(__dirname, 'dist', svc.dir, 'src', 'main.js'),
    path.join(__dirname, 'dist', svc.dir, svc.dir, 'src', 'main.js'),
  ];
  const distMain = mainCandidates.find((candidate) => fs.existsSync(candidate));
  const svcEnv = env || { ...process.env, PORT: svc.port };

  console.log(`[boot] Starting ${svc.name} on port ${svcEnv.PORT}...`);

  if (!distMain) {
    console.error(
      `[boot] Could not find compiled entrypoint for ${svc.name}. Tried:\n${mainCandidates
        .map((candidate) => ` - ${candidate}`)
        .join('\n')}`,
    );
    if (isGateway) {
      process.exit(1);
    }
    setTimeout(() => launchService(svc, env, false), 2000);
    return null;
  }

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

async function bootstrapAll() {
  console.log('[boot] Launching all services in single container...');
  console.log(`[boot] Gateway will listen on port ${GATEWAY_PORT}`);

  launchService(GATEWAY, gatewayEnv, true);

  // Start the gateway first so Render discovers the public-facing process
  // before the internal services begin listening. Do not hard-fail if the
  // gateway takes time to become healthy while RabbitMQ reconnects.
  setTimeout(() => {
    console.log('[boot] Launching internal services after gateway head start...');
    for (const svc of SERVICES) {
      launchService(svc, { ...process.env, PORT: svc.port, HOST: '127.0.0.1' }, false);
    }
  }, 4000);
}

bootstrapAll().catch((error) => {
  console.error(`[boot] Fatal startup error: ${error.message}`);
  process.exit(1);
});

// Forward signals for graceful shutdown
['SIGTERM', 'SIGINT'].forEach((sig) => {
  process.on(sig, () => {
    console.log(`[boot] Received ${sig}, shutting down...`);
    process.exit(0);
  });
});
