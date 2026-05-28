import { expect, test } from "@playwright/test"
import {
  AUTH_URL,
  BASE_URL,
  assertServiceReachable,
  clearBrowserAuthState,
  createEmailPasswordUser,
  ensureAccessCookie,
  expectNoAuthCookies,
  loginWithEmailPasswordUi,
} from "../helpers"

test.describe("auth browser back-button behavior", () => {
  test("logged in user cannot stay on the sign-in page", async ({
    page,
    request,
    context,
  }) => {
    test.setTimeout(120000)
    await assertServiceReachable(request, AUTH_URL, "Auth service")

    const { email, password } = await createEmailPasswordUser(request)
    await context.clearCookies()

    const { accessToken } = await loginWithEmailPasswordUi(page, email, password)
    await ensureAccessCookie(context, accessToken)

    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded" })

    await expect(page).toHaveURL(/\/talent-dashboard|\/client-dashboard|\/onboarding/, {
      timeout: 20000,
    })
  })

  test("cleared session redirects from a protected route to sign-in", async ({
    page,
    request,
    context,
  }) => {
    test.setTimeout(120000)
    await assertServiceReachable(request, AUTH_URL, "Auth service")

    const { email, password } = await createEmailPasswordUser(request)
    await context.clearCookies()

    const { accessToken } = await loginWithEmailPasswordUi(page, email, password)
    await ensureAccessCookie(context, accessToken)

    await clearBrowserAuthState(page, context)
    await expectNoAuthCookies(context)
    await page.close()

    const freshPage = await context.newPage()
    await freshPage.goto(`${BASE_URL}/talent-dashboard`, {
      waitUntil: "domcontentloaded",
    })

    await expect(freshPage).toHaveURL(/\/sign-in/, { timeout: 20000 })
  })
})
