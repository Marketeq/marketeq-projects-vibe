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
// All backend services — ports must match proxy.service.ts defaults in the gateway.
// Only services the API gateway actually proxies to.
// Keep this list in sync with proxy.service.ts route map.
// Active services to run at startup. All 27 are compiled in the Docker image,
// but only these are started. Upgraded to Render Standard (2 GB RAM, 2026-06-09).
// 4 services + gateway = 5 processes. maxOldSpaceMb is set per-service based on
// module count: user-service (27 modules) gets more headroom than the others.
// 5 services and 9 services both OOM-killed at 512 MB on the old Starter plan (2026-05-14).
// messaging-service re-enabled 2026-06-10 after the CMS-backfill RabbitMQ leak
// fix freed up headroom on user-service; it already degrades gracefully when
// RabbitMQ is unreachable (see main.ts isRabbitMqReachable check).
// Total budget: 384+512+384+256+384(gateway) = 1920MB of 2048MB — monitor
// Render metrics and reduce if any process creeps toward its cap.
const SERVICES = [
  { name: 'auth-service',      port: '3001', dir: 'apps/auth-service',      maxOldSpaceMb: 384 },
  { name: 'user-service',      port: '3002', dir: 'apps/user-service',      maxOldSpaceMb: 512 },
  { name: 'listings-service',  port: '3003', dir: 'apps/listings-service',  maxOldSpaceMb: 384 },
  // messaging-service disabled 2026-06-16: its tables were created in the
  // messaging_local schema instead of messaging, so every query fails and the
  // service crash-loops, pushing the container toward OOM.  Re-enable once
  // the schema migration is run (ALTER TABLE messaging_local.* SET SCHEMA messaging).
  // { name: 'messaging-service', port: '3005', dir: 'apps/messaging-service', maxOldSpaceMb: 256 },
  // Re-enable after further headroom is confirmed:
  // notification-service (3006), category-service (3023),
  // contracts-service (3010), invitations-service (3013),
  // content-moderation-service (3014), time-tracking-service (3017),
  // Dormant until Render plan upgrade (compiled but not started):
  // search-service (3007), algolia-service (3008),
  // checkout-service (3009), favorites-service (3012), portfolio-service (3015),
  // autocomplete-service (3016), transaction-service (3018),
  // suggestions-service (3020), admin-service (3024),
  // affiliate-referral-service (3025), billing-service (3026),
  // earnings-service (3027), payout-service (3028), pricing-service (3029),
  // wallet-service (3030), wire-review-service (3031), legal-service (3032)
];

const GATEWAY = { name: 'api-gateway', port: GATEWAY_PORT, dir: 'apps/api-gateway', maxOldSpaceMb: 384 };

// Gateway env — every internal service URL must be listed here so the
// proxy can reach them. Ports must match the SERVICES array above.
const gatewayEnv = {
  ...process.env,
  PORT: GATEWAY_PORT,
  HOST: '0.0.0.0',
  AUTH_SERVICE_URL:             'http://localhost:3001',
  USER_SERVICE_URL:             'http://localhost:3002',
  LISTINGS_SERVICE_URL:         'http://localhost:3003',
  MESSAGING_SERVICE_URL:        'http://localhost:3005',
  NOTIFICATION_SERVICE_URL:     'http://localhost:3006',
  SEARCH_SERVICE_URL:           'http://localhost:3007',
  ALGOLIA_SERVICE_URL:          'http://localhost:3008',
  CHECKOUT_SERVICE_URL:         'http://localhost:3009',
  CONTRACTS_SERVICE_URL:        'http://localhost:3010',
  FAVORITES_SERVICE_URL:        'http://localhost:3012',
  INVITATIONS_SERVICE_URL:      'http://localhost:3013',
  MODERATION_SERVICE_URL:       'http://localhost:3014',
  PORTFOLIO_SERVICE_URL:        'http://localhost:3015',
  AUTOCOMPLETE_SERVICE_URL:     'http://localhost:3016',
  LEGAL_SERVICE_URL:            'http://localhost:3032',
  TIME_TRACKING_SERVICE_URL:    'http://localhost:3017',
  TRANSACTION_SERVICE_URL:      'http://localhost:3018',
  SUGGESTIONS_SERVICE_URL:      'http://localhost:3020',
  CATEGORY_SERVICE_URL:         'http://localhost:3023',
  ADMIN_SERVICE_URL:            'http://localhost:3024',
  AFFILIATE_REFERRAL_SERVICE_URL: 'http://localhost:3025',
  BILLING_SERVICE_URL:          'http://localhost:3026',
  EARNINGS_SERVICE_URL:         'http://localhost:3027',
  PAYOUT_SERVICE_URL:           'http://localhost:3028',
  PRICING_SERVICE_URL:          'http://localhost:3029',
  WALLET_SERVICE_URL:           'http://localhost:3030',
  WIRE_REVIEW_SERVICE_URL:      'http://localhost:3031',
};

function buildInternalServiceEnv(port) {
  return {
    ...process.env,
    PORT: port,
    HOST: '127.0.0.1',
    // The shared Render container serves HTTP APIs for staging/dev.
    // It does not run a colocated RabbitMQ broker, so queue consumers
    // must degrade gracefully instead of crash-looping the service.
    RABBITMQ_REQUIRED: 'false',
  };
}

const restartCounts = new Map();

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

  const child = spawn('node', [`--max-old-space-size=${svc.maxOldSpaceMb || 384}`, distMain], {
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
    const count = (restartCounts.get(svc.name) || 0) + 1;
    restartCounts.set(svc.name, count);
    const delay = Math.min(5000 * Math.pow(2, count - 1), 60000);
    console.error(`[boot] Restarting ${svc.name} in ${delay}ms (attempt ${count})...`);
    setTimeout(() => launchService(svc, env, false), delay);
  });

  return child;
}


async function bootstrapAll() {
  console.log('[boot] Launching all services in single container...');
  console.log(`[boot] Gateway will listen on port ${GATEWAY_PORT}`);

  launchService(GATEWAY, gatewayEnv, true);

  // Stagger service starts so each has a clean memory slate.
  // auth: +4s, user: +10s, listings: +16s (6s gap per service).
  SERVICES.forEach((svc, i) => {
    setTimeout(
      () => {
        console.log(`[boot] Launching ${svc.name} (staggered +${4 + i * 6}s)...`);
        launchService(svc, buildInternalServiceEnv(svc.port), false);
      },
      4000 + i * 6000,
    );
  });
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
