# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: regression/local.smoke.spec.ts >> local browser smoke covers authenticated core routes
- Location: tests/regression/local.smoke.spec.ts:7:5

# Error details

```
Error: expect(page).not.toHaveURL(expected) failed

Expected pattern: not /\/sign-in$/
Received string: "http://127.0.0.1:3100/sign-in"
Timeout: 20000ms

Call log:
  - Expect "not toHaveURL" with timeout 20000ms
    23 × unexpected value "http://127.0.0.1:3100/sign-in"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - link [ref=e5] [cursor=pointer]:
        - /url: /
        - img [ref=e6]
      - generic [ref=e10]:
        - generic [ref=e12]:
          - generic [ref=e13]:
            - img [ref=e14]
            - combobox "Search by skills or keyword" [ref=e16]
          - button "View All" [ref=e19] [cursor=pointer]:
            - generic [ref=e20]: View All
            - img [ref=e21]
        - button "$ 1,540 USD" [ref=e23] [cursor=pointer]:
          - generic [ref=e24]:
            - generic [ref=e25]: $ 1,540
            - text: USD
          - img [ref=e26]
      - generic [ref=e28]:
        - generic [ref=e29]:
          - button [ref=e30] [cursor=pointer]:
            - img [ref=e31]
          - button [ref=e33] [cursor=pointer]:
            - img [ref=e34]
        - button [ref=e36] [cursor=pointer]:
          - img [ref=e41]
    - img [ref=e45]
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test"
  2  | 
  3  | const gatewayBase = process.env.GATEWAY_BASE_URL ?? "http://127.0.0.1:4000"
  4  | const devLoginEmail =
  5  |   process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "dev@marketeq.local"
  6  | 
  7  | test("local browser smoke covers authenticated core routes", async ({
  8  |   browser,
  9  |   request,
  10 | }) => {
  11 |   const loginResponse = await request.post(`${gatewayBase}/auth/dev-login`, {
  12 |     data: { email: devLoginEmail },
  13 |   })
  14 |   expect(loginResponse.ok()).toBeTruthy()
  15 | 
  16 |   const loginBody = await loginResponse.json()
  17 |   expect(loginBody.access_token).toBeTruthy()
  18 |   expect(loginBody.refresh_token).toBeTruthy()
  19 |   expect(loginBody.sessionId).toBeTruthy()
  20 | 
  21 |   const context = await browser.newContext()
  22 |   await context.addCookies([
  23 |     {
  24 |       name: "access_token",
  25 |       value: loginBody.access_token,
  26 |       domain: "127.0.0.1",
  27 |       path: "/",
  28 |       httpOnly: false,
  29 |       sameSite: "Lax",
  30 |     },
  31 |     {
  32 |       name: "refresh_token",
  33 |       value: loginBody.refresh_token,
  34 |       domain: "127.0.0.1",
  35 |       path: "/",
  36 |       httpOnly: false,
  37 |       sameSite: "Lax",
  38 |     },
  39 |     {
  40 |       name: "session_id",
  41 |       value: loginBody.sessionId,
  42 |       domain: "127.0.0.1",
  43 |       path: "/",
  44 |       httpOnly: false,
  45 |       sameSite: "Lax",
  46 |     },
  47 |   ])
  48 | 
  49 |   const page = await context.newPage()
  50 | 
  51 |   await page.goto("/client-dashboard", { waitUntil: "domcontentloaded" })
  52 |   await expect(page).toHaveURL(/\/client-dashboard|\/onboarding/)
  53 |   await expect(page).not.toHaveURL(/\/sign-in/)
  54 | 
  55 |   await page.goto("/inbox", { waitUntil: "domcontentloaded" })
  56 |   await expect(page).toHaveURL(/\/inbox/)
  57 |   await expect(page).not.toHaveURL(/\/sign-in/)
  58 | 
  59 |   await page.goto("/notifications", { waitUntil: "domcontentloaded" })
  60 |   await expect(page).toHaveURL(/\/notifications|\/settings/)
  61 |   await expect(page).not.toHaveURL(/\/sign-in/)
  62 | 
  63 |   const signInPage = await context.newPage()
  64 |   await signInPage.goto("/sign-in", { waitUntil: "domcontentloaded" })
> 65 |   await expect(signInPage).not.toHaveURL(/\/sign-in$/, { timeout: 20_000 })
     |                                ^ Error: expect(page).not.toHaveURL(expected) failed
  66 | 
  67 |   await context.close()
  68 | })
  69 | 
```