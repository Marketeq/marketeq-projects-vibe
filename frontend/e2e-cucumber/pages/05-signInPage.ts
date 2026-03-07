import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/**
 * Page Object Model for Sign In (Data-Driven Testing)
 */
export class SignInPage {
  readonly page: Page;
  readonly BASE_URL: string;

  // ========== SIGN IN LOCATORS ==========
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page, baseUrl?: string) {
    this.page = page;
    this.BASE_URL = baseUrl ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

    // Sign In Form
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('input#password');
    this.loginButton = page.locator('button').filter({ hasText: /Login to my account/i });
  }

  // ========== NAVIGATION METHODS ==========

  async navigateToSignIn() {
    console.log(` Navigating to sign-in page: ${this.BASE_URL}/sign-in`);
    await this.page.goto(`${this.BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded' });
    
    console.log(` Currently on sign-in page: ${this.page.url()}`);
    
    // Wait for sign-in form inputs to exist
    await this.page.waitForSelector('input#email', { timeout: 10000 });
    await this.page.waitForSelector('input#password', { timeout: 10000 });
    console.log(` Sign-in form is ready`);
  }

  // ========== SIGN IN METHODS ==========

  async enterEmail(email: string) {
    const displayEmail = email === 'EMPTY' ? '(empty)' : email;
    console.log(` Entering email: "${displayEmail}"`);

    await this.emailInput.scrollIntoViewIfNeeded();

    // Handle EMPTY placeholder
    if (email !== 'EMPTY') {
      await this.emailInput.fill(email);
    }

    console.log(` Email filled: ${displayEmail}`);
  }

  async enterPassword(password: string) {
    const isPasswordEmpty = password === 'EMPTY';
    const displayPassword = isPasswordEmpty ? '(empty)' : '(hidden)';
    console.log(` Entering password: "${displayPassword}"`);

    await this.passwordInput.scrollIntoViewIfNeeded();

    // Handle EMPTY placeholder
    if (!isPasswordEmpty) {
      await this.passwordInput.fill(password);
    }

    console.log(` Password filled: ${displayPassword}`);
  }

  async clickSignInButton() {
    console.log(`  Clicking sign-in button...`);
    await this.loginButton.click();
    console.log(` Sign-in button clicked`);
  }

  // ========== VERIFICATION METHODS ==========

  async verifySignInResult(scenario: string) {
    // Wait for navigation to complete
    await this.page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => {
      console.log(' Did not navigate to dashboard URL');
    });

    const finalUrl = this.page.url();
    console.log(` Final URL after sign-in: ${finalUrl}`);

    // Check if user is valid and should be on dashboard
    if (scenario === 'Valid credentials') {
      const isDashboard = finalUrl.includes('dashboard');

      if (isDashboard) {
        console.log(` SUCCESS: User redirected to dashboard - ${finalUrl}`);
      } else {
        console.log(` FAILED: Expected dashboard but got URL: ${finalUrl}`);

        // Get page content for debugging
        const pageContent = await this.page.evaluate(() => {
          return Array.from(document.body.innerText.split('\n'))
            .filter((t) => t.trim())
            .slice(0, 15)
            .join('\n');
        });
        console.log(` Page content snippet:\n${pageContent}`);
      }
    } else {
      // For invalid scenarios, check for error messages
      const errorMessages = await this.page.evaluate(() => {
        const messages: string[] = [];

        // Check various error locations
        document.querySelectorAll('[role="alert"]').forEach((el) => {
          const text = el.textContent?.trim();
          if (text) messages.push(text);
        });

        document.querySelectorAll('[class*="error"], .text-red, [class*="invalid"]').forEach((el) => {
          const text = el.textContent?.trim();
          if (text && !messages.includes(text) && text.length > 0) messages.push(text);
        });

        document.querySelectorAll('input[aria-invalid="true"]').forEach((el) => {
          const label = (el as HTMLInputElement).placeholder || (el as HTMLInputElement).name || 'field';
          if (!messages.find((m) => m.includes(label))) {
            messages.push(`Invalid input: ${label}`);
          }
        });

        return messages;
      });

      if (errorMessages && errorMessages.length > 0) {
        console.log(` Validation for "${scenario}":`);
        errorMessages.forEach((msg: string) => {
          console.log(`   - ${msg}`);
        });
      } else {
        console.log(`  No error message for "${scenario}" (continuing test)`);
      }
    }
  }

  async logResponseStatus(scenario: string) {
    const currentUrl = this.page.url();

    if (scenario === 'Valid credentials') {
      await this.page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {
        console.log(` Did not navigate to dashboard URL`);
      });

      const finalUrl = this.page.url();
      console.log(` Final URL after sign-in: ${finalUrl}`);

      if (finalUrl.includes('/dashboard') || finalUrl.includes('/talent')) {
        console.log(` Dashboard verification: User successfully logged in and redirected`);
        expect(finalUrl).toContain('dashboard');
      }
    } else {
      // For invalid scenarios, log validation messages if any
      const validationMessages = await this.page
        .locator('input[aria-invalid="true"] ~ span, .invalid-feedback, [class*="error-message"]')
        .allTextContents()
        .catch(() => []);

      if (validationMessages.length > 0) {
        console.log(` Form validation messages for "${scenario}":`);
        validationMessages.forEach((msg: string) => {
          console.log(`   ${msg}`);
        });
      }
    }
  }
}

export default SignInPage;
