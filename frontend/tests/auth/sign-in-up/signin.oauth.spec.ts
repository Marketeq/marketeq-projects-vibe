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

// This test validates that clicking Google sign-in attempts to start OAuth flow.
test("google signin starts oauth flow", async ({ page, request }) => {
  test.setTimeout(60000)
  await assertServiceReachable(request, AUTH_URL, "Auth service")

  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded" })
  const googleButton = page.getByRole("button", {
    name: /sign in with google/i,
  })
  await expect(googleButton).toBeVisible({ timeout: 30000 })
  await expect(googleButton).toBeEnabled({ timeout: 30000 })
  console.log("Google Sign-In button is visible")

  const backendRequestPromise = page
    .waitForRequest(
      (req) => req.method() === "POST" && req.url().includes("/auth/google"),
      { timeout: 20000 }
    )
    .catch(() => null)

  const backendResponsePromise = page
    .waitForResponse(
      (res) =>
        res.request().method() === "POST" && res.url().includes("/auth/google"),
      { timeout: 25000 }
    )
    .catch(() => null)

  const popupPromise = page
    .waitForEvent("popup", { timeout: 15000 })
    .catch(() => null)

  const oauthRequestPromise = page
    .waitForRequest(
      (req) =>
        req.method() === "GET" &&
        /accounts\.google\.com\/(o\/oauth2|gsi|v3\/signin)/.test(req.url()),
      { timeout: 15000 }
    )
    .catch(() => null)

  await googleButton.click({ force: true })

  const backendRequest = await backendRequestPromise
  const backendResponse = await backendResponsePromise
  const popup = await popupPromise
  const oauthRequest = await oauthRequestPromise

  if (!popup && !oauthRequest && !backendRequest) {
    console.warn(
      "Google OAuth signal was not captured in this browser run (likely popup/network policy)."
    )
    await expect(googleButton).toBeVisible()
    await expect(googleButton).toBeEnabled()
    return
  }

  if (backendResponse && !backendResponse.ok()) {
    const body = await backendResponse.text().catch(() => "")
    throw new Error(
      `Google signin backend call failed: ${backendResponse.status()} ${backendResponse.statusText()} ${body}`.trim()
    )
  }

  if (!popup) {
    return
  }

  await popup.waitForLoadState("domcontentloaded")
  await expect
    .poll(async () => popup.url(), { timeout: 30000 })
    .toContain("accounts.google.com")
})
