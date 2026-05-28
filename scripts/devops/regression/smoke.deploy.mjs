#!/usr/bin/env node

const frontendBase = (process.env.FRONTEND_BASE_URL ?? "https://staging-marketeq-projects.vercel.app").replace(/\/$/, "")
const backendBase = (process.env.BACKEND_BASE_URL ?? "https://marketeq-backend.onrender.com").replace(/\/$/, "")
const smokeEmail = process.env.SMOKE_USER_EMAIL ?? "deploy-smoke@marketeq.local"
const smokePassword = process.env.SMOKE_USER_PASSWORD ?? "MarketeqSmoke1!"
const smokeLabel = process.env.SMOKE_LABEL ?? "deploy-smoke"

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
        await sleep(1_000)
      }
    }
  }

  throw lastError
}

function formatBody(body) {
  if (typeof body === "string") {
    return body.slice(0, 240)
  }

  return JSON.stringify(body).slice(0, 240)
}

async function expectStatus(label, url, expectedStatus, init = {}) {
  const { response, body } = await request(url, init)
  if (response.status !== expectedStatus) {
    throw new Error(
      `${label} expected ${expectedStatus} but got ${response.status}: ${formatBody(body)}`,
    )
  }
  console.log(`PASS ${label}`)
  return body
}

async function expectOk(label, url, init = {}) {
  const { response, body } = await request(url, init)
  if (!response.ok) {
    throw new Error(
      `${label} expected 2xx but got ${response.status}: ${formatBody(body)}`,
    )
  }
  console.log(`PASS ${label}`)
  return body
}

async function expectTextNotContains(label, url, forbiddenText, init = {}) {
  const body = await expectOk(label, url, init)
  const text = typeof body === "string" ? body : JSON.stringify(body)

  if (text.includes(forbiddenText)) {
    throw new Error(`${label} unexpectedly contained ${JSON.stringify(forbiddenText)}`)
  }

  console.log(`PASS ${label} text check`)
  return text
}

function buildCookieHeader(session) {
  return [
    `access_token=${session.access_token}`,
    `refresh_token=${session.refresh_token}`,
    session.sessionId ? `session_id=${session.sessionId}` : "",
    session.session_id ? `session_id=${session.session_id}` : "",
  ]
    .filter(Boolean)
    .join("; ")
}

async function ensureSmokeAccount() {
  const username = smokeEmail.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase()
  const { response, body } = await request(`${backendBase}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: smokeEmail,
      username,
      password: smokePassword,
    }),
  })

  if (![201, 409].includes(response.status)) {
    throw new Error(
      `smoke register expected 201/409 but got ${response.status}: ${formatBody(body)}`,
    )
  }

  console.log(`PASS smoke register (${response.status === 201 ? "created" : "exists"})`)
}

async function loginSmokeAccount() {
  const session = await expectOk("smoke login", `${backendBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: smokeEmail,
      password: smokePassword,
    }),
  })

  if (!session?.access_token) {
    throw new Error(`smoke login missing access token: ${formatBody(session)}`)
  }

  return session
}

function resolveExpectedRoute(user) {
  const role = String(user?.role ?? user?.accountType ?? user?.userType ?? "").toLowerCase()
  const onboardingComplete =
    user?.hasCompletedOnboarding === true ||
    user?.onboardingDismissed === true ||
    user?.onboardedAt != null

  if (!role || !onboardingComplete) {
    return "/onboarding"
  }

  if (role === "talent") {
    return "/talent-dashboard"
  }

  return "/client-dashboard"
}

async function main() {
  console.log(`Starting ${smokeLabel} for ${frontendBase}`)

  await expectTextNotContains(
    "frontend homepage shell",
    `${frontendBase}/`,
    "Homepage unavailable",
  )
  await expectTextNotContains(
    "frontend sign-in page",
    `${frontendBase}/sign-in`,
    "Homepage unavailable",
  )

  await expectOk("backend health", `${backendBase}/health`)
  await expectOk("homepage health", `${backendBase}/homepage/health`)
  const homepage = await expectOk("homepage API", `${backendBase}/homepage`)

  if (!homepage || typeof homepage !== "object" || !homepage.slug) {
    throw new Error(`homepage API payload missing slug: ${formatBody(homepage)}`)
  }

  await ensureSmokeAccount()
  const session = await loginSmokeAccount()

  const authHeaders = {
    Authorization: `Bearer ${session.access_token}`,
  }

  const me = await expectOk("authenticated user/me", `${backendBase}/api/user/me`, {
    headers: authHeaders,
  })

  const expectedRoute = resolveExpectedRoute(me)
  console.log(`INFO expected authenticated route ${expectedRoute}`)

  await expectOk(
    "notifications list",
    `${backendBase}/api/v1/notifications?limit=3`,
    { headers: authHeaders },
  )

  await expectOk(
    "notifications unread count",
    `${backendBase}/api/v1/notifications/unread-count`,
    { headers: authHeaders },
  )

  const protectedShell = await expectOk(
    "authenticated route shell",
    `${frontendBase}${expectedRoute}`,
    {
      headers: {
        Cookie: buildCookieHeader(session),
      },
    },
  )

  const protectedText =
    typeof protectedShell === "string" ? protectedShell : JSON.stringify(protectedShell)
  if (protectedText.includes("/sign-in")) {
    throw new Error(`authenticated route shell still references sign-in flow for ${expectedRoute}`)
  }

  console.log(`PASS ${smokeLabel}`)
}

main().catch((error) => {
  console.error(`FAIL ${smokeLabel}: ${error.message}`)
  process.exit(1)
})
