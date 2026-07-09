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
 * Memory budget: Render Pro plan (4 GB). Tiered allocation:
 *   Tier 1 (core):    96–128 MB heap  (auth, user, listings, messaging)
 *   Tier 2 (active):   48 MB heap      (notification, search, contracts, etc.)
 *   Tier 3 (dormant):  48 MB heap      (admin, billing, wallet, etc.)
 *   Gateway:           96 MB heap
 *   Total heap: ~1.6 GB, actual RSS ~3.2 GB with Node overhead (29 processes)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// External port (Render injects PORT)
const GATEWAY_PORT = process.env.PORT || '10000';

// ── All 28 backend services ──────────────────────────────────────────────
// Ports must match the gatewayEnv map below and proxy.service.ts defaults.
// portKey: override the env var used to pass the port (default: PORT).
const SERVICES = [
  // Tier 1 — Core (highest traffic)
  { name: 'auth-service',               port: '3001', dir: 'apps/auth-service',               maxOldSpaceMb: 96 },
  { name: 'user-service',               port: '3002', dir: 'apps/user-service',               maxOldSpaceMb: 128 },
  { name: 'listings-service',           port: '3003', dir: 'apps/listings-service',           maxOldSpaceMb: 96 },
  { name: 'messaging-service',         port: '3005', dir: 'apps/messaging-service',         maxOldSpaceMb: 96 },
  // Tier 2 — Active
  { name: 'notification-service',       port: '3006', dir: 'apps/notification-service',       maxOldSpaceMb: 48 },
  { name: 'search-service',             port: '3007', dir: 'apps/search-service',             maxOldSpaceMb: 48 },
  { name: 'algolia-service',            port: '3008', dir: 'apps/algolia-service',            maxOldSpaceMb: 48 },
  { name: 'checkout-service',           port: '3009', dir: 'apps/checkout-service',           maxOldSpaceMb: 48 },
  { name: 'contracts-service',          port: '3010', dir: 'apps/contracts-service',          maxOldSpaceMb: 48 },
  { name: 'offer-service',              port: '3011', dir: 'apps/offer-service',              maxOldSpaceMb: 48 },
  { name: 'favorites-service',          port: '3012', dir: 'apps/favorites-service',          maxOldSpaceMb: 48 },
  { name: 'invitations-service',        port: '3013', dir: 'apps/invitations-service',        maxOldSpaceMb: 48 },
  { name: 'content-moderation-service', port: '3014', dir: 'apps/content-moderation-service', maxOldSpaceMb: 48 },
  { name: 'portfolio-service',          port: '3015', dir: 'apps/portfolio-service',          maxOldSpaceMb: 48 },
  { name: 'autocomplete-service',       port: '3016', dir: 'apps/autocomplete-service',       maxOldSpaceMb: 48 },
  { name: 'time-tracking-service',      port: '3017', dir: 'apps/time-tracking-service',      maxOldSpaceMb: 48 },
  { name: 'transaction-service',        port: '3018', dir: 'apps/transaction-service',        maxOldSpaceMb: 48 },
  // cms-service is a standalone Next.js app, not a NestJS service — runs separately, not in boot-all
  { name: 'suggestions-service',        port: '3020', dir: 'apps/suggestions-service',        maxOldSpaceMb: 48 },
  { name: 'category-service',           port: '3023', dir: 'apps/category-service',           maxOldSpaceMb: 48 },
  // Tier 3 — Low-traffic / dormant
  { name: 'admin-service',              port: '3024', dir: 'apps/admin-service',              maxOldSpaceMb: 48 },
  { name: 'affiliate-referral-service', port: '3025', dir: 'apps/affiliate-referral-service', maxOldSpaceMb: 48 },
  { name: 'billing-service',            port: '3026', dir: 'apps/billing-service',            maxOldSpaceMb: 48 },
  { name: 'earnings-service',           port: '3027', dir: 'apps/earnings-service',           maxOldSpaceMb: 48 },
  { name: 'payout-service',             port: '3028', dir: 'apps/payout-service',             maxOldSpaceMb: 64 },
  { name: 'pricing-service',            port: '3029', dir: 'apps/pricing-service',            maxOldSpaceMb: 48 },
  { name: 'wallet-service',             port: '3030', dir: 'apps/wallet-service',             maxOldSpaceMb: 48 },
  { name: 'wire-review-service',        port: '3031', dir: 'apps/wire-review-service',        maxOldSpaceMb: 48 },
  { name: 'legal-service',              port: '3032', dir: 'apps/legal-service',              maxOldSpaceMb: 96 },
];

const GATEWAY = { name: 'api-gateway', port: GATEWAY_PORT, dir: 'apps/api-gateway', maxOldSpaceMb: 96 };

// Gateway env — every internal service URL must be listed here so the
// proxy can reach them. Ports must match the SERVICES array above.
const gatewayEnv = {
  ...process.env,
  PORT: GATEWAY_PORT,
  HOST: '0.0.0.0',
  AUTH_SERVICE_URL:               'http://localhost:3001',
  USER_SERVICE_URL:               'http://localhost:3002',
  LISTINGS_SERVICE_URL:           'http://localhost:3003',
  MESSAGING_SERVICE_URL:          'http://localhost:3005',
  NOTIFICATION_SERVICE_URL:       'http://localhost:3006',
  SEARCH_SERVICE_URL:             'http://localhost:3007',
  ALGOLIA_SERVICE_URL:            'http://localhost:3008',
  CHECKOUT_SERVICE_URL:           'http://localhost:3009',
  CONTRACTS_SERVICE_URL:          'http://localhost:3010',
  OFFER_SERVICE_URL:              'http://localhost:3011',
  FAVORITES_SERVICE_URL:          'http://localhost:3012',
  INVITATIONS_SERVICE_URL:        'http://localhost:3013',
  MODERATION_SERVICE_URL:         'http://localhost:3014',
  PORTFOLIO_SERVICE_URL:          'http://localhost:3015',
  AUTOCOMPLETE_SERVICE_URL:       'http://localhost:3016',
  TIME_TRACKING_SERVICE_URL:      'http://localhost:3017',
  TRANSACTION_SERVICE_URL:        'http://localhost:3018',
  CMS_SERVICE_URL:                'http://localhost:3019',
  SUGGESTIONS_SERVICE_URL:        'http://localhost:3020',
  CATEGORY_SERVICE_URL:           'http://localhost:3023',
  ADMIN_SERVICE_URL:              'http://localhost:3024',
  AFFILIATE_REFERRAL_SERVICE_URL: 'http://localhost:3025',
  BILLING_SERVICE_URL:            'http://localhost:3026',
  EARNINGS_SERVICE_URL:           'http://localhost:3027',
  PAYOUT_SERVICE_URL:             'http://localhost:3028',
  PRICING_SERVICE_URL:            'http://localhost:3029',
  WALLET_SERVICE_URL:             'http://localhost:3030',
  WIRE_REVIEW_SERVICE_URL:        'http://localhost:3031',
  LEGAL_SERVICE_URL:              'http://localhost:3032',
};

// svc.portKey allows services that read a non-standard env var for their port
// (e.g. cms-service reads CMS_PORT instead of PORT).
function buildInternalServiceEnv(svc) {
  const env = {
    ...process.env,
    PORT: svc.port,
    HOST: '127.0.0.1',
    RABBITMQ_REQUIRED: 'false',
  };
  if (svc.portKey && svc.portKey !== 'PORT') {
    env[svc.portKey] = svc.port;
  }
  return env;
}

const restartCounts = new Map();
const serviceProcesses = new Map();
const lastExitInfo = new Map(); // name -> { code, time, stderr }

function launchService(svc, env, isGateway = false) {
  const svcName = path.basename(svc.dir);
  const mainCandidates = [
    path.join(__dirname, 'dist', svc.dir, 'main.js'),
    path.join(__dirname, 'dist', svc.dir, 'src', 'main.js'),
    path.join(__dirname, 'dist', svc.dir, svc.dir, 'src', 'main.js'),
    // Some NestJS builds nest as dist/apps/<name>/<name>/src/main.js
    path.join(__dirname, 'dist', svc.dir, svcName, 'src', 'main.js'),
    // Or dist/apps/<name>/src/<name>/main.js
    path.join(__dirname, 'dist', svc.dir, 'src', svcName, 'main.js'),
  ];
  const distMain = mainCandidates.find((candidate) => fs.existsSync(candidate));
  const svcEnv = env || { ...process.env, PORT: svc.port };

  console.log(`[boot] Starting ${svc.name} on port ${svcEnv.PORT}...`);

  if (!distMain) {
    // Log what we can see in the dist dir for debugging
    const distDir = path.join(__dirname, 'dist', svc.dir);
    let dirContents = 'DIR_NOT_FOUND';
    try { dirContents = fs.readdirSync(distDir).join(', '); } catch { /* ok */ }
    console.error(
      `[boot] Could not find compiled entrypoint for ${svc.name}.\n` +
      `  dist dir (${distDir}): [${dirContents}]\n` +
      mainCandidates.map((c) => `  - ${c} (${fs.existsSync(c) ? 'YES' : 'no'})`).join('\n'),
    );
    if (isGateway) {
      process.exit(1);
    }
    setTimeout(() => launchService(svc, env, false), 2000);
    return null;
  }

  const child = spawn('node', [`--max-old-space-size=${svc.maxOldSpaceMb || 48}`, '--max-semi-space-size=2', distMain], {
    env: svcEnv,
    stdio: ['inherit', 'inherit', 'pipe'],
  });

  // Capture last 20 lines of stderr for diagnostics
  const stderrLines = [];
  if (child.stderr) {
    child.stderr.on('data', (data) => {
      process.stderr.write(data); // still output to parent stderr
      const lines = data.toString().split('\n').filter(Boolean);
      stderrLines.push(...lines);
      while (stderrLines.length > 20) stderrLines.shift();
    });
  }

  serviceProcesses.set(svc.name, { process: child, port: svc.port, startedAt: Date.now() });

  child.on('exit', (code) => {
    console.error(`[boot] ${svc.name} exited with code ${code}`);
    lastExitInfo.set(svc.name, { code, time: new Date().toISOString(), stderr: stderrLines.slice(-5).join('\n') });
    serviceProcesses.delete(svc.name);
    if (isGateway) {
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

// ── Health aggregation endpoint ──────────────────────────────────────────
// Exposed on an internal port for Jenkins monitoring. Checks each service
// by attempting an HTTP request to its port.
function startHealthServer() {
  const HEALTH_PORT = 9999;
  const server = http.createServer(async (req, res) => {
    if (req.url === '/services/debug') {
      const debug = SERVICES.map((svc) => {
        const proc = serviceProcesses.get(svc.name);
        const exitInfo = lastExitInfo.get(svc.name);
        return {
          name: svc.name,
          port: svc.port,
          pid: proc ? proc.process.pid : null,
          running: proc ? !proc.process.killed : false,
          startedAt: proc ? new Date(proc.startedAt).toISOString() : null,
          restarts: restartCounts.get(svc.name) || 0,
          lastExit: exitInfo || null,
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ services: debug, memoryMB: Math.round(process.memoryUsage.rss ? process.memoryUsage.rss() / 1048576 : process.memoryUsage().rss / 1048576) }, null, 2));
      return;
    }

    if (req.url !== '/services/health') {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const results = {};
    const checks = SERVICES.map(
      (svc) =>
        new Promise((resolve) => {
          const request = http.get(`http://127.0.0.1:${svc.port}/health`, { timeout: 3000 }, (response) => {
            results[svc.name] = { status: 'healthy', code: response.statusCode, port: parseInt(svc.port) };
            response.resume();
            resolve();
          });
          request.on('error', () => {
            // Any response (even 404) means the process is alive; only connection errors mean it's down
            const exitInfo = lastExitInfo.get(svc.name);
            results[svc.name] = { status: 'down', code: 0, port: parseInt(svc.port), restarts: restartCounts.get(svc.name) || 0, lastExit: exitInfo || null };
            resolve();
          });
          request.on('timeout', () => {
            request.destroy();
            const exitInfo = lastExitInfo.get(svc.name);
            results[svc.name] = { status: 'down', code: 0, port: parseInt(svc.port), restarts: restartCounts.get(svc.name) || 0, lastExit: exitInfo || null };
            resolve();
          });
        }),
    );

    await Promise.all(checks);

    // Also check gateway
    results['api-gateway'] = { status: 'healthy', code: 200, port: parseInt(GATEWAY_PORT) };

    const healthy = Object.values(results).filter((r) => r.status === 'healthy').length;
    const total = Object.keys(results).length;
    const payload = {
      overall: healthy === total ? 'healthy' : 'degraded',
      healthy,
      total,
      uptimePercent: ((healthy / total) * 100).toFixed(1),
      timestamp: new Date().toISOString(),
      services: results,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload, null, 2));
  });

  server.listen(HEALTH_PORT, '127.0.0.1', () => {
    console.log(`[boot] Health aggregation server on localhost:${HEALTH_PORT}/services/health`);
  });
}

async function bootstrapAll() {
  console.log('[boot] Launching all services in single container...');
  console.log(`[boot] Gateway will listen on port ${GATEWAY_PORT}`);
  console.log(`[boot] Starting ${SERVICES.length} microservices + gateway`);

  launchService(GATEWAY, gatewayEnv, true);

  // Stagger service starts — 3s gap per service to avoid memory spikes.
  // Total startup time: ~4s + 27*3s = ~85s
  SERVICES.forEach((svc, i) => {
    setTimeout(
      () => {
        console.log(`[boot] Launching ${svc.name} (staggered +${4 + i * 3}s)...`);
        launchService(svc, buildInternalServiceEnv(svc), false);
      },
      4000 + i * 3000,
    );
  });

  // Start health aggregation server after all services are scheduled
  setTimeout(() => startHealthServer(), 5000);
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
