import { expect, test } from "@playwright/test"

// Regression coverage for a backend bug in
// backend/apps/user-service/src/user/user.service.ts `syncFromAuth`:
// every login (email, Google, LinkedIn) calls POST /internal/users to sync
// the auth-service session with the user-service profile row. Auth-service
// never includes `role` in that payload (see SyncUserProfilePayload in
// backend/apps/auth-service/src/auth/auth.service.ts), so `syncFromAuth`
// defaults the incoming role to CLIENT and then unconditionally assigns
// that default onto EXISTING users too -- silently resetting a TALENT
// user's role back to CLIENT on every single login.
//
// Symptom: an existing talent user who already completed onboarding gets
// redirected to /onboarding/client (wrong role, wrong onboarding state)
// instead of /talent-dashboard, because resolveDashboardRoute on the
// frontend reads the now-corrupted `role` field from /user/me.
//
// This test reproduces the defect directly against the sync endpoint
// (bypassing real Google OAuth, which isn't automatable here), by:
//   1. Registering + logging in a user (creates the user-service row)
//   2. Setting role=TALENT and completing talent onboarding via the
//      authenticated self-service endpoints
//   3. Replaying the exact sync payload shape auth-service sends on every
//      login (no `role` field) directly against the internal sync endpoint
//   4. Asserting the user's role and onboarding state survived the sync

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"
const USER_URL = process.env.NEXT_PUBLIC_USER_URL ?? "http://localhost:3002"
const INTERNAL_SERVICE_TOKEN =
  process.env.INTERNAL_SERVICE_TOKEN ?? "change-me"

test("existing TALENT user's role survives the login-time profile sync", async ({
  request,
}) => {
  test.setTimeout(60000)

  const ts = Date.now()
  const email = `role_sync_${ts}@test.com`
  const username = `role_sync_${ts}`
  const password = "Test@12345"

  // 1. Register (creates the auth-service row + syncs a fresh user-service row)
  const registerResponse = await request.post(`${AUTH_URL}/auth/register`, {
    data: { email, username, password },
    timeout: 20000,
  })
  if (!registerResponse.ok()) {
    const body = await registerResponse.text().catch(() => "")
    throw new Error(
      `Register failed: ${registerResponse.status()} ${body}`.trim()
    )
  }

  const loginResponse = await request.post(`${AUTH_URL}/auth/login`, {
    data: { email, password },
    timeout: 20000,
  })
  if (!loginResponse.ok()) {
    const body = await loginResponse.text().catch(() => "")
    throw new Error(`Login failed: ${loginResponse.status()} ${body}`.trim())
  }
  const loginBody = await loginResponse.json()
  const userId: string = loginBody?.user?.id
  const accessToken: string = loginBody?.access_token ?? loginBody?.accessToken
  expect(userId, "login response must include user.id").toBeTruthy()
  expect(accessToken, "login response must include an access token").toBeTruthy()

  // 2. Set role=TALENT via the internal sync endpoint (mirrors how a real
  // role assignment would persist -- `role` is a SyncUserDto/syncFromAuth
  // concept; the self-service onboarding-dismissed endpoint only derives
  // `userType`/onboarding timestamps from its `role` param, it does not
  // persist the `role` column itself), then complete talent onboarding via
  // the authenticated self-service endpoint.
  const setRoleResponse = await request.post(`${USER_URL}/internal/users`, {
    data: {
      id: userId,
      email,
      username,
      role: "TALENT",
      provider: "EMAIL",
      hasPassword: true,
    },
    headers: { "x-internal-token": INTERNAL_SERVICE_TOKEN },
    timeout: 20000,
  })
  if (!setRoleResponse.ok()) {
    const body = await setRoleResponse.text().catch(() => "")
    throw new Error(
      `Precondition role sync failed: ${setRoleResponse.status()} ${body}`.trim()
    )
  }

  const dismissResponse = await request.patch(
    `${USER_URL}/user/onboarding-dismissed`,
    {
      data: { role: "TALENT" },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 20000,
    }
  )
  if (!dismissResponse.ok()) {
    const body = await dismissResponse.text().catch(() => "")
    throw new Error(
      `Onboarding completion failed: ${dismissResponse.status()} ${body}`.trim()
    )
  }

  const meBeforeSync = await request.get(`${USER_URL}/user/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 20000,
  })
  expect(meBeforeSync.ok()).toBeTruthy()
  const beforeBody = await meBeforeSync.json()
  const userBefore = beforeBody?.user ?? beforeBody?.data?.user ?? beforeBody
  expect(
    userBefore?.role,
    "precondition: role must be TALENT before replaying the login sync"
  ).toBe("TALENT")
  expect(
    userBefore?.talentOnboardedAt,
    "precondition: talent onboarding must be completed before replaying the login sync"
  ).toBeTruthy()

  // 3. Replay the exact payload shape auth-service sends on every login --
  // no `role` field at all (see SyncUserProfilePayload).
  const syncResponse = await request.post(`${USER_URL}/internal/users`, {
    data: {
      id: userId,
      email,
      username,
      provider: "EMAIL",
      hasPassword: true,
    },
    headers: { "x-internal-token": INTERNAL_SERVICE_TOKEN },
    timeout: 20000,
  })
  if (!syncResponse.ok()) {
    const body = await syncResponse.text().catch(() => "")
    throw new Error(
      `Internal sync call failed: ${syncResponse.status()} ${body}`.trim()
    )
  }

  // 4. The role (and onboarding state) must have survived the sync.
  const meAfterSync = await request.get(`${USER_URL}/user/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 20000,
  })
  expect(meAfterSync.ok()).toBeTruthy()
  const afterBody = await meAfterSync.json()
  const userAfter = afterBody?.user ?? afterBody?.data?.user ?? afterBody

  expect(
    userAfter?.role,
    "role must still be TALENT after a login-time sync that omits `role` -- it must not silently reset to CLIENT"
  ).toBe("TALENT")
  expect(
    userAfter?.talentOnboardedAt,
    "talent onboarding completion must not be lost by the sync"
  ).toBeTruthy()
})
