#!/usr/bin/env node
/**
 * validate-env.js — Runs automatically before every `next build`.
 *
 * In non-development environments (Vercel, staging, production):
 *   1. Blocks the build if any NEXT_PUBLIC_*_URL env var contains "localhost".
 *   2. Blocks the build if required NEXT_PUBLIC_*_URL vars are missing/empty.
 *
 * In local development (NEXT_PUBLIC_ENV=development or NODE_ENV unset):
 *   - Skips all checks (localhost is expected locally).
 *
 * This script is the single source of truth for which env vars are required.
 * Add new vars to REQUIRED_URL_VARS below.
 */

const REQUIRED_URL_VARS = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_AUTH_URL',
];

// Optional URL vars — warn if they contain localhost but don't block
const OPTIONAL_URL_VARS = [
  'NEXT_PUBLIC_USER_URL',
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_BACKEND_URL',
  'NEXT_PUBLIC_LISTINGS_URL',
  'NEXT_PUBLIC_FAVORITES_API_URL',
  'NEXT_PUBLIC_SEMANTIC_API_URL',
  'NEXT_PUBLIC_CONTRACTS_API_URL',
  'NEXT_PUBLIC_APP_URL',
];

const NON_URL_REQUIRED_VARS = [
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
];

// ---------------------------------------------------------------------------

const env = process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || 'development';
const isLocal = env === 'development';
const isVercel = !!process.env.VERCEL;
const branch = process.env.VERCEL_GIT_COMMIT_REF || 'unknown';

console.log(`\n🔍 validate-env: env=${env} vercel=${isVercel} branch=${branch}\n`);

if (isLocal && !isVercel) {
  console.log('✅ Local development — skipping env validation.\n');
  process.exit(0);
}

// On Vercel or any non-dev environment, enforce the rules
let errors = [];
let warnings = [];

function checkLocalhost(varName, value, required) {
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(value)) {
    const msg = `${varName}="${value}" contains localhost — this WILL break in production.`;
    if (required) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }
}

// Check required URL vars
for (const varName of REQUIRED_URL_VARS) {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    errors.push(`${varName} is MISSING or empty. Set it in Vercel Environment Variables.`);
  } else {
    checkLocalhost(varName, value, true);
  }
}

// Check optional URL vars (warn only)
for (const varName of OPTIONAL_URL_VARS) {
  const value = process.env[varName];
  if (value && value.trim() !== '') {
    checkLocalhost(varName, value, false);
  }
}

// Check required non-URL vars
for (const varName of NON_URL_REQUIRED_VARS) {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    warnings.push(`${varName} is missing — Google OAuth will not work.`);
  }
}

// Also scan ALL env vars for any NEXT_PUBLIC_*URL* that slipped through
for (const [key, value] of Object.entries(process.env)) {
  if (
    key.startsWith('NEXT_PUBLIC_') &&
    key.includes('URL') &&
    !REQUIRED_URL_VARS.includes(key) &&
    !OPTIONAL_URL_VARS.includes(key) &&
    value &&
    /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(value)
  ) {
    warnings.push(`${key}="${value}" contains localhost (caught by wildcard scan).`);
  }
}

// Report
if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach((w) => console.log(`   ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.error('❌ BUILD BLOCKED — Fix these environment variables:\n');
  errors.forEach((e) => console.error(`   ${e}`));
  console.error('\n📋 How to fix:');
  console.error('   1. Go to https://vercel.com → Project Settings → Environment Variables');
  console.error('   2. Set each missing/localhost variable to the production backend URL');
  console.error('   3. Redeploy\n');
  process.exit(1);
}

console.log('✅ All environment variables look good.\n');
