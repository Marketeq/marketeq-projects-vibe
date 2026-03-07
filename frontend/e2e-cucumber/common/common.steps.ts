import { Given, When, Then } from '@cucumber/cucumber';
import CommonPage from '../pages/commonPage.ts';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * SHARED NAVIGATION
 * Matches: Given I am on the "Sign Up" page
 */
Given('I am on the {string} page', async function (pageName: string) {
  const commonPage = new CommonPage(this.page, BASE_URL);
  await commonPage.navigateToPage(pageName);
});

/**
 * SHARED BUTTON ACTIONS
 * Matches: When I click "Create My Account"
 * Matches: When I click "Continue"
 * Matches: And I click "Go to Dashboard"
 */
When('I click {string}', async function (btnText: string) {
  const commonPage = new CommonPage(this.page, BASE_URL);
  await commonPage.clickButton(btnText);
});

/**
 * SHARED REDIRECTS
 * Matches: Then I should be redirected to the /talent-dashboard
 */
Then('I should be redirected to the {string}', async function (expectedPath: string) {
  const commonPage = new CommonPage(this.page, BASE_URL);
  await commonPage.verifyRedirect(expectedPath);
});

/**
 * SHARED STATE VERIFICATION
 * Matches: Then I should reach the final "What would you like to do next?" success screen
 */
Then('I should reach the final {string} success screen', async function (message: string) {
  const commonPage = new CommonPage(this.page, BASE_URL);
  await commonPage.verifySuccessScreen(message);
});
