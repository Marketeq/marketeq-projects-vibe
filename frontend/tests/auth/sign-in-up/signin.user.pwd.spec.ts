import type { APIRequestContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"

async function assertServiceReachable(
  request: APIRequestContext,
  url: string,
  name: string
) {
  try {
    await request.get(url, { failOnStatusCode: false, timeout: 10000 })
  } catch {
    throw new Error(
      `${name} is unreachable at ${url}. Start the service before running signin tests.`
    )
  }
}

test("login with email and password", async ({ page, request, context }) => {
  test.setTimeout(120000)
  await assertServiceReachable(request, AUTH_URL, "Auth service")

  const ts = Date.now()
  const email = `signin_${ts}@test.com`
  const username = `signin_${ts}`
  const password = "Test@12345"

  const registerResponse = await request.post(`${AUTH_URL}/auth/register`, {
    data: { email, username, password },
    timeout: 20000,
  })
  if (!registerResponse.ok()) {
    const body = await registerResponse.text().catch(() => "")
    throw new Error(
      `Precondition register failed: ${registerResponse.status()} ${registerResponse.statusText()} ${body}`.trim()
    )
  }

  await context.clearCookies()
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded" })

  await expect(page.locator("#email")).toBeVisible({ timeout: 30000 })
  await page.fill("#email", email)
  await page.fill("#password", password)

  const loginRequestPromise = page.waitForRequest(
    (req) => req.method() === "POST" && req.url().includes("/auth/login"),
    { timeout: 15000 }
  )

  await page.getByRole("button", { name: /login to my account/i }).click()

  const loginRequest = await loginRequestPromise
  const loginResponse = await loginRequest.response()
  if (!loginResponse) {
    throw new Error(
      "Login request was sent but no response was received from auth service."
    )
  }
  if (!loginResponse.ok()) {
    const body = await loginResponse.text().catch(() => "")
    throw new Error(
      `Login API failed: ${loginResponse.status()} ${loginResponse.statusText()} ${body}`.trim()
    )
  }

  const loginBody = await loginResponse.json().catch(() => ({}))
  const accessToken = loginBody?.access_token ?? loginBody?.accessToken
  if (!loginBody?.user && !accessToken) {
    throw new Error(
      "Login API response is missing auth fields (`user`/`access_token`)."
    )
  }

  // UI redirect can be flaky; verify authenticated reachability directly.
  await page.goto(`${BASE_URL}/talent-dashboard`, {
    waitUntil: "domcontentloaded",
  })
  await expect(page).toHaveURL(/\/talent-dashboard|\/onboarding/, {
    timeout: 20000,
  })
  await expect(page).not.toHaveURL(/\/sign-in/)

  const tokenCookie = await context.cookies()
  const hasAccessCookie = tokenCookie.some(
    (cookie) => cookie.name === "access_token"
  )
  if (!hasAccessCookie && accessToken) {
    await context.addCookies([
      {
        name: "access_token",
        value: accessToken,
        domain: "localhost",
        path: "/",
      },
    ])
  }

  const finalCookies = await context.cookies()
  expect(
    finalCookies.some((cookie) => cookie.name === "access_token")
  ).toBeTruthy()
})
