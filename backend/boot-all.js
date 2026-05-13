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
const SERVICES = [
  { name: 'auth-service',               port: '3001', dir: 'apps/auth-service' },
  { name: 'user-service',               port: '3002', dir: 'apps/user-service' },
  { name: 'listings-service',           port: '3003', dir: 'apps/listings-service' },
  { name: 'messaging-service',          port: '3005', dir: 'apps/messaging-service' },
  { name: 'notification-service',       port: '3006', dir: 'apps/notification-service' },
  { name: 'search-service',             port: '3007', dir: 'apps/search-service' },
  { name: 'algolia-service',            port: '3008', dir: 'apps/algolia-service' },
  { name: 'checkout-service',           port: '3009', dir: 'apps/checkout-service' },
  { name: 'contracts-service',          port: '3010', dir: 'apps/contracts-service' },
  { name: 'favorites-service',          port: '3012', dir: 'apps/favorites-service' },
  { name: 'invitations-service',        port: '3013', dir: 'apps/invitations-service' },
  { name: 'content-moderation-service', port: '3014', dir: 'apps/content-moderation-service' },
  { name: 'portfolio-service',          port: '3015', dir: 'apps/portfolio-service' },
  { name: 'autocomplete-service',       port: '3016', dir: 'apps/autocomplete-service' },
  { name: 'time-tracking-service',      port: '3017', dir: 'apps/time-tracking-service' },
  { name: 'transaction-service',        port: '3018', dir: 'apps/transaction-service' },
  { name: 'suggestions-service',        port: '3020', dir: 'apps/suggestions-service' },
  { name: 'category-service',           port: '3023', dir: 'apps/category-service' },
  { name: 'admin-service',              port: '3024', dir: 'apps/admin-service' },
  { name: 'affiliate-referral-service', port: '3025', dir: 'apps/affiliate-referral-service' },
  { name: 'billing-service',            port: '3026', dir: 'apps/billing-service' },
  { name: 'earnings-service',           port: '3027', dir: 'apps/earnings-service' },
  { name: 'payout-service',             port: '3028', dir: 'apps/payout-service' },
  { name: 'pricing-service',            port: '3029', dir: 'apps/pricing-service' },
  { name: 'wallet-service',             port: '3030', dir: 'apps/wallet-service' },
  { name: 'wire-review-service',        port: '3031', dir: 'apps/wire-review-service' },
];

const GATEWAY = { name: 'api-gateway', port: GATEWAY_PORT, dir: 'apps/api-gateway' };

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

  const child = spawn('node', ['--max-old-space-size=16', distMain], {
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
  // before the internal services begin listening.
  setTimeout(() => {
    console.log('[boot] Launching internal services after gateway head start...');
    for (const svc of SERVICES) {
      launchService(svc, buildInternalServiceEnv(svc.port), false);
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
