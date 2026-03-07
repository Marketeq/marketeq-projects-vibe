import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { request as pwRequest } from '@playwright/test';
import SignInPage from '../pages/05-signInPage.ts';

setDefaultTimeout(60_000);

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001";
const USER_URL = process.env.NEXT_PUBLIC_USER_URL ?? "http://localhost:3003";

/**
 * BACKGROUND STEPS
 */

Given('the Auth and User Services are reachable', async function (this: any) {
  let apiContext = await pwRequest.newContext();
  try {
    await apiContext.get(AUTH_URL, { failOnStatusCode: false, timeout: 10_000 });
    await apiContext.get(USER_URL, { failOnStatusCode: false, timeout: 10_000 });
  } catch (error: any) {
    const details = error?.message ?? String(error);
    throw new Error(
      [
        'Service reachability check failed in Background step.',
        `Auth URL: ${AUTH_URL}`,
        `User URL: ${USER_URL}`,
        `Original error: ${details}`,
        'Action: ensure auth/user services are running, or set NEXT_PUBLIC_AUTH_URL and NEXT_PUBLIC_USER_URL.',
        'Tip: if localhost resolves to IPv6 (::1), try 127.0.0.1 URLs instead.'
      ].join('\n')
    );
  } finally {
    await apiContext.dispose();
  }
});

Given('I am on the sign-in page', async function (this: any) {
  const signInPage = new SignInPage(this.page);
  await signInPage.navigateToSignIn();
});

/**
 * SIGN-IN INPUT STEPS
 */

When('I enter email as {string}', async function (this: any, email: string) {
  const signInPage = new SignInPage(this.page);
  await signInPage.enterEmail(email);
});

When('I enter password as {string}', async function (this: any, password: string) {
  const signInPage = new SignInPage(this.page);
  await signInPage.enterPassword(password);
});

When('I click the sign-in button', async function (this: any) {
  const signInPage = new SignInPage(this.page);
  await signInPage.clickSignInButton();
});

/**
 * VERIFICATION STEPS (Data-Driven)
 */

Then('I should see either success or error message for {string}', async function (this: any, scenario: string) {
  const signInPage = new SignInPage(this.page);
  await signInPage.verifySignInResult(scenario);
});

Then('I should log the response status for {string}', async function (this: any, scenario: string) {
  const signInPage = new SignInPage(this.page);
  await signInPage.logResponseStatus(scenario);
});
