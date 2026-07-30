import type { APIRequestContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

// Regression coverage for the homepage "Sign Up" popup (AuthModal ->
// SignUpForm in components/auth/auth-modal.tsx), as opposed to the
// dedicated /sign-up page which already has coverage in signup.work.spec.ts
// and signup.hire.spec.ts.
//
// Bug: a brand-new user who signs up through the popup never gets routed to
// /onboarding. The dedicated /sign-up page explicitly does
// `router.push("/onboarding")` after a successful signup; the popup's
// SignUpForm only closes the modal and shows the password-setup stepper,
// then relies on `pendingRedirect` (which is null for a homepage signup) --
// so the user is left sitting on `/` fully authenticated but never sent
// through role selection / onboarding.

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"
const USER_URL = process.env.NEXT_PUBLIC_USER_URL ?? "http://localhost:4000"

async function assertServiceReachable(
  request: APIRequestContext,
  url: string,
  name: string
) {
  try {
    await request.get(url, { failOnStatusCode: false, timeout: 10000 })
  } catch {
    throw new Error(
      `${name} is unreachable at ${url}. Start the service before running signup tests.`
    )
  }
}

test("new user signing up via the homepage popup modal is routed to onboarding", async ({
  page,
  request,
}) => {
  test.setTimeout(120000)
  await assertServiceReachable(request, AUTH_URL, "Auth service")
  await assertServiceReachable(request, USER_URL, "User service")

  const email = `popup_signup_${Date.now()}@test.com`

  await page.context().clearCookies()
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" })

  // Open the popup via the header "Sign Up" button (not the /sign-up page).
  await page.getByRole("button", { name: /^sign up$/i }).click()

  const emailInput = page.getByPlaceholder("you@email.com")
  await expect(emailInput).toBeVisible({ timeout: 15000 })
  await emailInput.fill(email)

  const terms = page.getByRole("checkbox")
  if (await terms.isVisible().catch(() => false)) {
    await terms.click()
  }

  const signupRequestPromise = page.waitForRequest(
    (req) => req.method() === "POST" && req.url().includes("/auth/register"),
    { timeout: 15000 }
  )

  await page.getByRole("button", { name: /create my account/i }).click()

  const signupRequest = await signupRequestPromise
  const signupResponse = await signupRequest.response()
  if (!signupResponse || !signupResponse.ok()) {
    const body = await signupResponse?.text().catch(() => "")
    throw new Error(
      `Signup API failed: ${signupResponse?.status()} ${body}`.trim()
    )
  }

  // Expected: the popup should route the new user to /onboarding, exactly
  // like the dedicated /sign-up page does. Today it does not -- the user
  // is left on `/` (or wherever the modal was opened from).
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20000 })
})
