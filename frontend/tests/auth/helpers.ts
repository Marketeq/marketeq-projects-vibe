import type { APIRequestContext, BrowserContext, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
export const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"

export async function assertServiceReachable(
  request: APIRequestContext,
  url: string,
  name: string
) {
  try {
    await request.get(url, { failOnStatusCode: false, timeout: 10000 })
  } catch {
    throw new Error(
      `${name} is unreachable at ${url}. Start the service before running auth tests.`
    )
  }
}

export async function createEmailPasswordUser(request: APIRequestContext) {
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

  return { email, username, password }
}

export async function loginWithEmailPasswordUi(
  page: Page,
  email: string,
  password: string
) {
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

  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 20000 })

  return { loginBody, accessToken }
}

export async function ensureAccessCookie(
  context: BrowserContext,
  accessToken?: string
) {
  const cookies = await context.cookies()
  const hasAccessCookie = cookies.some((cookie) => cookie.name === "access_token")

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
}

export async function clearBrowserAuthState(page: Page, context: BrowserContext) {
  await page.evaluate(() => {
    window.localStorage.removeItem("access_token")
    window.localStorage.removeItem("token")
    window.localStorage.removeItem("marketeq-onboarding-dismissed")
    document.cookie = "access_token=; Path=/; Max-Age=0"
    document.cookie = "accessToken=; Path=/; Max-Age=0"
    document.cookie = "refresh_token=; Path=/; Max-Age=0"
    document.cookie = "session_id=; Path=/; Max-Age=0"
  })
  await context.clearCookies()
}

export async function expectNoAuthCookies(context: BrowserContext) {
  const cookies = await context.cookies()
  expect(
    cookies.some((cookie) =>
      ["access_token", "accessToken", "refresh_token", "session_id"].includes(
        cookie.name
      )
    )
  ).toBeFalsy()
}
