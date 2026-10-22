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
 *   Total heap: ~2.0 GB across 32 processes (31 services + gateway).
 *
 * Raise a service above 48 MB only against a known payload size, and record the
 * reason next to it — see portfolio-service, which OOM'd at 48 MB because its
 * schemaJson cap alone is 2 MB. These are ceilings, not reservations.
 */

const { spawn } = require('child_process');
const { filterEnv, describe: describeEnvIsolation, parseMode } = require('./env-isolation');
const fs = require('fs');
const path = require('path');
const http = require('http');

// External port (Render injects PORT)
const GATEWAY_PORT = process.env.PORT || '10000';

// Each service is handed only the environment it reads, rather than every
// secret on the platform. Defaults to monitor: it reports what it would hold
// back and changes nothing, so this can ship to a running deployment and be
// read before it is switched on. See env-isolation.js.
const ENV_ISOLATION_MODE = process.env.ENV_ISOLATION_MODE;
let ENV_MANIFEST = { baseline: [], shared: [], services: {} };
try {
  ENV_MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, 'env-manifest.json'), 'utf8'));
} catch (err) {
  // No manifest means every service is "unknown", which fails open: they all
  // get the full environment, exactly as before this change.
  console.warn(`[env-isolation] env-manifest.json unreadable (${err.message}); passing full environment to every service.`);
}
{
  const { mode, valid } = parseMode(ENV_ISOLATION_MODE);
  if (!valid) {
    console.warn(`[env-isolation] ENV_ISOLATION_MODE="${ENV_ISOLATION_MODE}" is not off|monitor|enforce; using "monitor".`);
  }
  console.log(`[env-isolation] mode=${mode}`);
}

// ── All 28 backend services ──────────────────────────────────────────────
// Ports must match the gatewayEnv map below and proxy.service.ts defaults.
// portKey: override the env var used to pass the port (default: PORT).
const SERVICES = [
  // Tier 1 — Core (highest traffic)
  { name: 'auth-service',               port: '3001', dir: 'apps/auth-service',               maxOldSpaceMb: 96 },
  { name: 'user-service',               port: '3002', dir: 'apps/user-service',               maxOldSpaceMb: 128 },
  // Crash-looped at 96 MB on 2026-09-10: ten "Reached heap limit" kills between
  // 20:51 and 22:34, with GC pinned at the ceiling and reclaiming nothing
  // ("Mark-Compact (reduce) 95.6 (98.4) -> 94.8 (98.7) MB"). This service owns
  // the largest schema in the monorepo (29 migrations) and hydrates whole
  // project/publish documents, so 96 MB is under its real working set.
  // NOTE: this raises the ceiling to stop the restart loop; it does not explain
  // why a service that had been stable all day began exhausting the heap in a
  // single evening. If it OOMs again at 128 MB, treat it as a leak and profile
  // the publish path rather than raising this further.
  { name: 'listings-service',           port: '3003', dir: 'apps/listings-service',           maxOldSpaceMb: 128 },
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
  // 128MB, not the 48MB default: case studies accept a 2MB schemaJson
  // (MAX_SCHEMA_JSON_BYTES) which expands roughly 10x once parsed into V8 objects,
  // and publish additionally holds the compiled htmlPublished string alongside it.
  // At 48MB this OOM'd ("Reached heap limit") under normal editing on 2026-09-09.
  { name: 'portfolio-service',          port: '3015', dir: 'apps/portfolio-service',          maxOldSpaceMb: 128 },
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
  // 3033, not the 3028 used in ecosystem.config.js: this file assigns 3028 to
  // payout-service, so 3028 here would collide (and did — user-service's
  // resume upload was POSTing to payout-service).
  { name: 'resume-parsing-service',     port: '3033', dir: 'apps/resume-parsing-service',     maxOldSpaceMb: 96 },
  { name: 'browsing-history-service',   port: '3034', dir: 'apps/browsing-history-service',   maxOldSpaceMb: 48 },
  // 3035, not the 3019 used in ecosystem.config.js: CMS_SERVICE_URL below is
  // already pointing at 3019, and homepage.service.ts / blog-backfill.service.ts
  // read it. Putting a live service there would turn a clean connection-refused
  // (which falls back to static defaults) into 404s from the wrong service.
  { name: 'identity-verification-service', port: '3035', dir: 'apps/identity-verification-service', maxOldSpaceMb: 48 },
  { name: 'location-service',             port: '3036', dir: 'apps/location-service',             maxOldSpaceMb: 48 },
];

const GATEWAY = { name: 'api-gateway', port: GATEWAY_PORT, dir: 'apps/api-gateway', maxOldSpaceMb: 96 };

// Gateway env — every internal service URL must be listed here so the
// proxy can reach them. Ports must match the SERVICES array above.
const gatewayFiltered = filterEnv('api-gateway', process.env, ENV_MANIFEST, ENV_ISOLATION_MODE);
{
  const line = describeEnvIsolation('api-gateway', gatewayFiltered);
  if (line) console.log(line);
}

const gatewayEnv = {
  ...gatewayFiltered.env,
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
  // Consumed by user-service resume.service.ts, which otherwise falls back to
  // its hardcoded http://localhost:3028 default — payout-service in this file.
  RESUME_PARSING_SERVICE_URL:     'http://localhost:3033',
  BROWSING_HISTORY_SERVICE_URL:   'http://localhost:3034',
  IDENTITY_VERIFICATION_SERVICE_URL: 'http://localhost:3035',
  LOCATION_SERVICE_URL:           'http://localhost:3036',
};

// svc.portKey allows services that read a non-standard env var for their port
// (e.g. cms-service reads CMS_PORT instead of PORT).
function buildInternalServiceEnv(svc) {
  const result = filterEnv(svc.name, process.env, ENV_MANIFEST, ENV_ISOLATION_MODE);
  const line = describeEnvIsolation(svc.name, result);
  if (line) console.log(line);

  const env = {
    ...result.env,
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

/**
 * Runs run-migrations.js as a child process so its ~21 DataSource connections
 * are reclaimed when it exits instead of sitting in the launcher's heap.
 *
 * Defaults to reporting drift, which is why the report is not awaited: it must
 * never delay a boot. Only an explicit MIGRATE_MODE=apply is awaited, so that
 * schema changes land before any service starts serving against them.
 */
function runMigrationStep() {
  return new Promise((resolve) => {
    const child = spawn(
      'node',
      ['--max-old-space-size=128', path.join(__dirname, 'run-migrations.js')],
      { env: process.env, stdio: 'inherit' },
    );
    child.on('exit', (code) => resolve(code ?? 0));
    child.on('error', (err) => {
      console.error(`[boot] migration step failed to spawn: ${err.message}`);
      resolve(0);
    });
  });
}

async function bootstrapAll() {
  console.log('[boot] Launching all services in single container...');
  console.log(`[boot] Gateway will listen on port ${GATEWAY_PORT}`);
  console.log(`[boot] Starting ${SERVICES.length} microservices + gateway`);

  const migrateMode = (process.env.MIGRATE_MODE || 'report').toLowerCase();
  const migrationStep = runMigrationStep();
  if (migrateMode === 'apply') {
    const code = await migrationStep;
    if (code !== 0) {
      // Deliberately not fatal: §3.0.2 of the DevOps SOP forbids taking the
      // backend down, and a failed migration still leaves services that can
      // serve every unaffected route. The non-zero exit is logged loudly above
      // so the staging-services-monitor surfaces it.
      console.error(
        '[boot] MIGRATIONS FAILED — booting anyway per zero-downtime rule. ' +
          'Schema may be inconsistent; investigate before the next deploy.',
      );
    }
  }

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
