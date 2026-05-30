#!/usr/bin/env node

/**
 * diagnose-inbox-search.mjs
 * ─────────────────────────
 * Automated diagnostic for the "Failed to load users" error in the
 * New Message dialog on the inbox page.
 *
 * Tests the full request chain:
 *   1. Backend health (is the API gateway alive?)
 *   2. User-service health (is the downstream service alive?)
 *   3. JWT authentication (can we obtain a valid token?)
 *   4. /v1/users endpoint (does the actual API call succeed?)
 *   5. CORS preflight (is the frontend origin allowed?)
 *
 * Usage:
 *   node scripts/devops/regression/diagnose-inbox-search.mjs
 *
 * Environment variables:
 *   BACKEND_BASE_URL     — Backend URL (default: https://marketeq-backend.onrender.com)
 *   FRONTEND_ORIGIN      — Frontend origin for CORS check (default: https://dev-marketeq-projects.vercel.app)
 *   SMOKE_USER_EMAIL     — Test account email
 *   SMOKE_USER_PASSWORD  — Test account password
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more checks failed (see output for details)
 */

const backendBase = (process.env.BACKEND_BASE_URL ?? "https://marketeq-backend.onrender.com").replace(/\/$/, "")
const frontendOrigin = (process.env.FRONTEND_ORIGIN ?? "https://dev-marketeq-projects.vercel.app").replace(/\/$/, "")
const smokeEmail = process.env.SMOKE_USER_EMAIL ?? "deploy-smoke@marketeq.local"
const smokePassword = process.env.SMOKE_USER_PASSWORD ?? "MarketeqSmoke1!"

const PASS = "\x1b[32mPASS\x1b[0m"
const FAIL = "\x1b[31mFAIL\x1b[0m"
const WARN = "\x1b[33mWARN\x1b[0m"
const INFO = "\x1b[36mINFO\x1b[0m"

const results = []

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function request(url, init = {}, retries = 3) {
  let lastError

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init)
      const contentType = response.headers.get("content-type") ?? ""
      const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text()
      return { response, body }
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await sleep(1_000 * attempt)
      }
    }
  }

  throw lastError
}

function record(label, passed, detail = "") {
  const status = passed ? PASS : FAIL
  console.log(`  ${status} ${label}${detail ? ` — ${detail}` : ""}`)
  results.push({ label, passed, detail })
}

// ─────────────────────────────────────────────────────────
// Step 1: Backend Health
// ─────────────────────────────────────────────────────────
async function checkBackendHealth() {
  console.log(`\n📡 Step 1: Backend Health Check`)
  console.log(`  ${INFO} Pinging ${backendBase}/health`)

  try {
    const { response, body } = await request(`${backendBase}/health`)
    if (response.ok) {
      record("API Gateway health", true, `status=${response.status}`)
    } else {
      record("API Gateway health", false, `status=${response.status} — backend may be in cold start. Wait 30-60s and retry.`)
    }
    return response.ok
  } catch (err) {
    record("API Gateway health", false, `Network error: ${err.message} — backend is completely unreachable.`)
    return false
  }
}

// ─────────────────────────────────────────────────────────
// Step 2: User-Service Health
// ─────────────────────────────────────────────────────────
async function checkUserServiceHealth() {
  console.log(`\n🏥 Step 2: User-Service Health Check`)
  console.log(`  ${INFO} Pinging ${backendBase}/api/v1/users/health`)

  try {
    const { response, body } = await request(`${backendBase}/api/v1/users/health`)
    if (response.ok) {
      record("User-service health", true, `status=${response.status}`)
    } else {
      record("User-service health", false, `status=${response.status} — user-service may be down or in cold start.`)
    }
    return response.ok
  } catch (err) {
    record("User-service health", false, `Network error: ${err.message}`)
    return false
  }
}

// ─────────────────────────────────────────────────────────
// Step 3: JWT Authentication
// ─────────────────────────────────────────────────────────
async function checkJWTAuth() {
  console.log(`\n🔑 Step 3: JWT Authentication`)
  console.log(`  ${INFO} Logging in as ${smokeEmail}`)

  try {
    const { response, body } = await request(`${backendBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: smokeEmail,
        password: smokePassword,
      }),
    })

    if (response.ok && body?.access_token) {
      record("JWT login", true, "Obtained valid access_token")

      // Validate token isn't expired
      try {
        const payload = JSON.parse(atob(body.access_token.split(".")[1]))
        const expiresAt = new Date(payload.exp * 1000)
        const now = new Date()
        if (expiresAt > now) {
          record("JWT expiry", true, `Expires at ${expiresAt.toISOString()} (${Math.round((expiresAt - now) / 1000)}s from now)`)
        } else {
          record("JWT expiry", false, `Token already expired at ${expiresAt.toISOString()} — auth service is issuing expired tokens!`)
        }
      } catch (decodeErr) {
        record("JWT decode", false, `Could not decode token: ${decodeErr.message}`)
      }

      return body.access_token
    } else {
      record("JWT login", false, `status=${response.status} — ${typeof body === "string" ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`)
      return null
    }
  } catch (err) {
    record("JWT login", false, `Network error: ${err.message}`)
    return null
  }
}

// ─────────────────────────────────────────────────────────
// Step 4: /v1/users Endpoint (the actual failing call)
// ─────────────────────────────────────────────────────────
async function checkUsersEndpoint(token) {
  console.log(`\n👥 Step 4: /v1/users Endpoint (the failing call)`)
  const url = `${backendBase}/api/v1/users?limit=10&offset=0`
  console.log(`  ${INFO} GET ${url}`)

  // Test WITHOUT token first (should get 401)
  try {
    const { response: noAuthResp } = await request(url)
    if (noAuthResp.status === 401) {
      record("/v1/users without token", true, "Correctly returns 401 (route is protected)")
    } else {
      record("/v1/users without token", false, `Expected 401 but got ${noAuthResp.status} — JWT middleware may be misconfigured`)
    }
  } catch (err) {
    record("/v1/users without token", false, `Network error: ${err.message}`)
  }

  // Test WITH token
  if (!token) {
    record("/v1/users with token", false, "Skipped — no token available from Step 3")
    return
  }

  try {
    const { response, body } = await request(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.ok) {
      const count = Array.isArray(body) ? body.length : (body?.data?.length ?? body?.users?.length ?? "unknown")
      record("/v1/users with token", true, `status=${response.status}, returned ${count} users`)
    } else if (response.status === 401) {
      record("/v1/users with token", false, `401 Unauthorized — JWT may be expired or backend JWT_SECRET mismatch. CHECK: auth-service and api-gateway share the same AUTH_JWT_PUBLIC_KEY`)
    } else if (response.status === 502) {
      record("/v1/users with token", false, `502 Bad Gateway — user-service is DOWN. Run: check Render dashboard for user-service status`)
    } else if (response.status === 503) {
      record("/v1/users with token", false, `503 Service Unavailable — backend is overloaded or in maintenance mode`)
    } else {
      record("/v1/users with token", false, `Unexpected status=${response.status}: ${JSON.stringify(body).slice(0, 200)}`)
    }
  } catch (err) {
    record("/v1/users with token", false, `Network error: ${err.message}`)
  }
}

// ─────────────────────────────────────────────────────────
// Step 5: CORS Preflight Check
// ─────────────────────────────────────────────────────────
async function checkCORS() {
  console.log(`\n🌐 Step 5: CORS Preflight Check`)
  console.log(`  ${INFO} Simulating preflight from origin: ${frontendOrigin}`)

  try {
    const { response } = await request(`${backendBase}/api/v1/users/health`, {
      method: "OPTIONS",
      headers: {
        Origin: frontendOrigin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization",
      },
    }, 1)

    const allowedOrigin = response.headers.get("access-control-allow-origin")
    const allowCredentials = response.headers.get("access-control-allow-credentials")

    if (allowedOrigin === frontendOrigin || allowedOrigin === "*") {
      record("CORS origin allowed", true, `Access-Control-Allow-Origin: ${allowedOrigin}`)
    } else if (allowedOrigin) {
      record("CORS origin allowed", false, `Origin ${frontendOrigin} NOT in allowed list. Got: ${allowedOrigin}. FIX: Add origin to FRONTEND_URL env var on Render.`)
    } else {
      console.log(`  ${WARN} No CORS headers returned — server may not handle OPTIONS, or CORS is configured differently.`)
      record("CORS origin allowed", true, "No CORS headers returned (may be handled by reverse proxy)")
    }

    if (allowCredentials === "true") {
      record("CORS credentials", true, "Access-Control-Allow-Credentials: true")
    } else {
      console.log(`  ${WARN} credentials header missing — cookies may not be sent cross-origin.`)
    }
  } catch (err) {
    record("CORS preflight", false, `Network error: ${err.message}`)
  }
}

// ─────────────────────────────────────────────────────────
// Summary & Diagnosis
// ─────────────────────────────────────────────────────────
function printSummary() {
  const failed = results.filter((r) => !r.passed)
  const passed = results.filter((r) => r.passed)

  console.log("\n" + "═".repeat(60))
  console.log("📊 DIAGNOSIS SUMMARY")
  console.log("═".repeat(60))
  console.log(`  Total checks: ${results.length}`)
  console.log(`  ${PASS}: ${passed.length}`)
  console.log(`  ${FAIL}: ${failed.length}`)

  if (failed.length === 0) {
    console.log(`\n  ✅ All checks passed. The /v1/users endpoint is working.`)
    console.log(`  If the user still sees "Failed to load users", the issue is likely:`)
    console.log(`    • Browser-specific: stale cookies/cache → clear site data`)
    console.log(`    • Token timing: JWT expired between page load and dialog open`)
    console.log(`    • Network: user's network blocking the backend domain`)
  } else {
    console.log(`\n  ❌ Root cause identified:`)
    for (const f of failed) {
      console.log(`    • ${f.label}: ${f.detail}`)
    }

    // Provide targeted fix recommendation
    console.log(`\n  🔧 RECOMMENDED FIX:`)
    const failLabels = failed.map((f) => f.label)

    if (failLabels.some((l) => l.includes("Gateway health"))) {
      console.log(`    1. Backend is unreachable — check Render dashboard for service status`)
      console.log(`    2. Wait for Render cold-start (60-90 seconds) and re-run this script`)
      console.log(`    3. If persistent, check BACKEND_BASE_URL points to correct host`)
    } else if (failLabels.some((l) => l.includes("User-service"))) {
      console.log(`    1. User-service is down — gateway is alive but can't reach user-service`)
      console.log(`    2. Check Render logs for user-service crashes/OOM`)
      console.log(`    3. Run: sync-staging-runtime-envs.mjs --apply to ensure USER_SERVICE_URL is correct`)
    } else if (failLabels.some((l) => l.includes("JWT"))) {
      console.log(`    1. Authentication is broken — check auth-service logs`)
      console.log(`    2. Verify AUTH_JWT_PRIVATE_KEY and AUTH_JWT_PUBLIC_KEY match between auth-service and api-gateway`)
      console.log(`    3. Check AUTH_JWT_TOKEN_EXPIRES_IN is set to a reasonable value (e.g. 3600)`)
    } else if (failLabels.some((l) => l.includes("/v1/users with token"))) {
      console.log(`    1. Token is valid but /v1/users rejects it — check api-gateway JWT_SECRET`)
      console.log(`    2. Run: node scripts/devops/check-runtime-env-drift.mjs to check for env drift`)
      console.log(`    3. Run: node scripts/devops/sync-staging-runtime-envs.mjs --apply to auto-fix`)
    } else if (failLabels.some((l) => l.includes("CORS"))) {
      console.log(`    1. CORS is blocking the frontend origin: ${frontendOrigin}`)
      console.log(`    2. The origin must be in the FRONTEND_URL env var on Render (comma-separated)`)
      console.log(`    3. Current required origins are listed in marketeq-staging-env-baseline.json`)
    }
  }

  console.log("\n" + "═".repeat(60))
  return failed.length === 0
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Marketeq Inbox Search Diagnostic")
  console.log(`   Backend:  ${backendBase}`)
  console.log(`   Frontend: ${frontendOrigin}`)
  console.log(`   Account:  ${smokeEmail}`)
  console.log("─".repeat(60))

  const gatewayOk = await checkBackendHealth()

  if (!gatewayOk) {
    console.log(`\n  ${WARN} Backend unreachable — skipping remaining checks.`)
    console.log(`  ${WARN} This is almost certainly the root cause (Render cold start or outage).`)
    printSummary()
    process.exit(1)
  }

  await checkUserServiceHealth()
  const token = await checkJWTAuth()
  await checkUsersEndpoint(token)
  await checkCORS()

  const allPassed = printSummary()
  process.exit(allPassed ? 0 : 1)
}

main().catch((error) => {
  console.error(`\n${FAIL} Diagnostic crashed: ${error.message}`)
  console.error(error.stack)
  process.exit(1)
})
