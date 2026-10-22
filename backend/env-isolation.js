'use strict';
/**
 * env-isolation.js — give each spawned service only the environment it reads.
 *
 * boot-all.js spawns 39 services with `...process.env`, so every one of them
 * inherits every secret on the platform. wallet-service reads six variables
 * and receives the keys that protect bank accounts and taxpayer identification
 * numbers. Nobody decided that; it is what `spawn` does by default.
 *
 * What this is and is not. All 39 children run as the same user, so an
 * attacker with code execution inside one could still read a sibling's
 * environment from /proc. This is not a wall, and the wall is a separate
 * Render service for the money and identity services (see
 * docs/md/CyberSecurity/Encryption Key Management — Audit and KMS Plan.md).
 * What it does remove is accidental exposure: a log line, an error handler
 * that dumps config, a crash report, a dependency that phones home. That is
 * how secrets usually actually escape.
 *
 * ENV_ISOLATION_MODE:
 *   off      pass everything, say nothing. The old behaviour exactly.
 *   monitor  pass everything, report what would be withheld. The default,
 *            because this ships to a running platform and a missing variable
 *            is a service that will not boot.
 *   enforce  withhold it.
 *
 * Flip to enforce only after monitor has run through a full deploy and the
 * reports look right. Same monitor-then-enforce path the rate limiter, the
 * CSRF defences and the user-access guard took.
 */

const VALID_MODES = ['off', 'monitor', 'enforce'];

function parseMode(raw) {
  const mode = String(raw ?? '').trim().toLowerCase();
  if (VALID_MODES.includes(mode)) return { mode, valid: true };
  if (!mode) return { mode: 'monitor', valid: true };
  return { mode: 'monitor', valid: false };
}

/**
 * The names a service is allowed to see: the baseline every process needs,
 * whatever the shared libraries read, and the service's own entries.
 * An entry ending in * matches a prefix, for names built at runtime.
 */
function allowListFor(serviceName, manifest) {
  const exact = new Set();
  const prefixes = [];

  const add = (name) => {
    if (typeof name !== 'string' || !name) return;
    if (name.endsWith('*')) prefixes.push(name.slice(0, -1));
    else exact.add(name);
  };

  (manifest.baseline ?? []).forEach(add);
  (manifest.shared ?? []).forEach(add);

  const entry = manifest.services?.[serviceName];
  if (entry) {
    (entry.scanned ?? []).forEach(add);
    (entry.extra ?? []).forEach(add);
  }

  return {
    known: Boolean(entry),
    allows: (name) => exact.has(name) || prefixes.some((p) => name.startsWith(p)),
  };
}

/**
 * Returns the environment to hand the child, plus what was held back.
 *
 * A service with no manifest entry gets everything, and is reported. A new
 * service should not fail to boot because nobody regenerated a JSON file.
 */
function filterEnv(serviceName, fullEnv, manifest, rawMode) {
  const { mode, valid } = parseMode(rawMode);
  const { known, allows } = allowListFor(serviceName, manifest);

  if (mode === 'off') {
    return { env: fullEnv, withheld: [], mode, modeValid: valid, known };
  }

  if (!known) {
    return { env: fullEnv, withheld: [], mode, modeValid: valid, known: false };
  }

  const withheld = [];
  const env = {};
  for (const [name, value] of Object.entries(fullEnv)) {
    if (allows(name)) env[name] = value;
    else withheld.push(name);
  }
  withheld.sort();

  // Monitor reports but does not act.
  return {
    env: mode === 'enforce' ? env : fullEnv,
    withheld,
    mode,
    modeValid: valid,
    known: true,
  };
}

/**
 * One line per service. Names only, never values, and secret-looking names
 * are counted rather than listed so the log itself does not become an
 * inventory of what is worth stealing.
 */
function describe(serviceName, result) {
  const { withheld, mode, known } = result;

  if (mode === 'off') return null;
  if (!known) {
    return `[env-isolation] ${serviceName}: no manifest entry, passing the full environment. ` +
      'Run scripts/generate-env-manifest.js.';
  }
  if (withheld.length === 0) {
    return `[env-isolation] ${serviceName}: nothing withheld.`;
  }

  const sensitive = withheld.filter(isSensitiveName);
  const ordinary = withheld.filter((n) => !isSensitiveName(n));
  const verb = mode === 'enforce' ? 'withheld' : 'would withhold';
  const sample = ordinary.slice(0, 8).join(', ');

  return (
    `[env-isolation] ${serviceName}: ${verb} ${withheld.length} variables ` +
    `(${sensitive.length} secret-looking). ` +
    (sample ? `e.g. ${sample}${ordinary.length > 8 ? ', …' : ''}` : '')
  ).trim();
}

const SENSITIVE = /(SECRET|PRIVATE|PASSWORD|TOKEN|CREDENTIAL|_KEY$|_KEY_|APIKEY|SEED|PASSPHRASE|SIGNING)/;
function isSensitiveName(name) {
  return SENSITIVE.test(name);
}

module.exports = { parseMode, allowListFor, filterEnv, describe, isSensitiveName, VALID_MODES };
