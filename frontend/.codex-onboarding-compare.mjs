import { chromium, request as playwrightRequest } from 'playwright';

const AUTH_URL = 'https://marketeq-vibe-backend-staging.onrender.com/api';
const SITES = [
  ['dev', 'https://dev-marketeq-projects.vercel.app'],
  ['staging', 'https://staging-marketeq-projects.vercel.app'],
];

const ts = Date.now();
const email = `qa_onboard_${ts}@example.com`;
const username = `qaonboard${ts}`;
const password = 'Test@12345';

const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

async function mustJson(res, label) {
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok()) throw new Error(`${label} failed: ${res.status()} ${JSON.stringify(data)}`);
  return data;
}

const registerRes = await api.post(`${AUTH_URL}/auth/register`, {
  data: { email, username, password },
  timeout: 30000,
});
const registerData = await mustJson(registerRes, 'register');

const loginApiRes = await api.post(`${AUTH_URL}/auth/login`, {
  data: { email, password },
  timeout: 30000,
});
const loginApiData = await mustJson(loginApiRes, 'api login');
const accessToken = loginApiData?.access_token;
const loginUser = loginApiData?.user;
if (!accessToken) throw new Error('No access token from API login');

const dismissRes = await api.patch(`${AUTH_URL}/user/onboarding-dismissed`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  data: { role: loginUser?.role || 'client' },
  timeout: 30000,
});
const dismissData = await mustJson(dismissRes, 'dismiss onboarding');

const meRes = await api.get(`${AUTH_URL}/user/me`, {
  headers: { Authorization: `Bearer ${accessToken}` },
  timeout: 30000,
});
const meData = await mustJson(meRes, 'user me');

const summary = {
  testUser: { email, username },
  api: {
    loginUser: {
      id: loginUser?.id ?? null,
      role: loginUser?.role ?? null,
      accountType: loginUser?.accountType ?? null,
      userType: loginUser?.userType ?? null,
      onboardingDismissed: loginUser?.onboardingDismissed ?? null,
      hasCompletedOnboarding: loginUser?.hasCompletedOnboarding ?? null,
      onboardedAt: loginUser?.onboardedAt ?? null,
    },
    dismissData: {
      role: dismissData?.role ?? null,
      accountType: dismissData?.accountType ?? null,
      userType: dismissData?.userType ?? null,
      onboardingDismissed: dismissData?.onboardingDismissed ?? null,
      hasCompletedOnboarding: dismissData?.hasCompletedOnboarding ?? null,
      onboardedAt: dismissData?.onboardedAt ?? null,
    },
    meData: {
      role: meData?.role ?? null,
      accountType: meData?.accountType ?? null,
      userType: meData?.userType ?? null,
      onboardingDismissed: meData?.onboardingDismissed ?? null,
      hasCompletedOnboarding: meData?.hasCompletedOnboarding ?? null,
      onboardedAt: meData?.onboardedAt ?? null,
    },
  },
  sites: {},
};

for (const [name, baseUrl] of SITES) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const observed = { loginResponse: null, meResponse: null, finalUrl: null, cookies: [] };

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/auth/login') && !observed.loginResponse) {
      try { observed.loginResponse = await response.json(); } catch {}
    }
    if (url.includes('/user/me') && !observed.meResponse) {
      try { observed.meResponse = await response.json(); } catch {}
    }
  });

  await page.goto(`${baseUrl}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /login to my account/i }).click();
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);

  observed.finalUrl = page.url();
  observed.cookies = (await context.cookies()).map(c => ({ name: c.name, domain: c.domain, path: c.path }));
  summary.sites[name] = observed;

  await browser.close();
}

console.log(JSON.stringify(summary, null, 2));
