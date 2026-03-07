import { Before, After, BeforeStep, AfterStep } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { configureFileLogging, createLogger } from '../common/logger.ts';

const logger = createLogger('CucumberHooks');
const stepTimers = new Map<string, number>();
let loggerInitialized = false;
let lastFeatureUri = '';

// Hooks to manage browser lifecycle and capture screenshots for Cucumber tests with Playwright
Before(async function ({ pickle }: any) {
  if (!loggerInitialized) {
    const logPath = path.resolve(process.cwd(), 'reports/execution.log');
    configureFileLogging(logPath, true);
    logger.info(`Execution log initialized: ${logPath}`);
    loggerInitialized = true;
  }

  const featureUri = String(pickle?.uri ?? 'unknown-feature');
  this.currentFeatureUri = featureUri;
  if (featureUri !== lastFeatureUri) {
    logger.info(`================ FEATURE: ${featureUri} ================`);
    lastFeatureUri = featureUri;
  }

  // Always run in headed mode
  const headless = false;

  // Launch options to bypass Google security detection
  const launchOptions = {
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  };

  this.browser = await chromium.launch(launchOptions);

  // Create context and page with user agent
  this.context = await this.browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  this.page = await this.context.newPage();

  // Add stealth script to hide automation
  await this.page.addInitScript(() => {
    if (navigator.webdriver === false) {
      return;
    }
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  // Create API context for REST calls
  this.apiContext = await this.context.request;

  const totalSteps = pickle?.steps?.length ?? 0;
  logger.info(`[${featureUri}] Scenario "${pickle?.name ?? 'unknown'}" has ${totalSteps} executable steps`);
});

BeforeStep(async function (this: any, stepInfo: any) {
  const id = String(stepInfo?.testStepId ?? 'unknown-step');
  const stepText = stepInfo?.pickleStep?.text ?? stepInfo?.gherkinDocument?.feature?.name ?? 'unknown step';
  stepTimers.set(id, Date.now());
  logger.info(`[${this.currentFeatureUri ?? 'unknown-feature'}] STEP START: ${stepText}`);
});

AfterStep(async function (this: any, stepInfo: any) {
  const id = String(stepInfo?.testStepId ?? 'unknown-step');
  const stepText = stepInfo?.pickleStep?.text ?? 'unknown step';
  const status = String(stepInfo?.result?.status ?? 'UNKNOWN').toUpperCase();
  const startedAt = stepTimers.get(id) ?? Date.now();
  const elapsedMs = Date.now() - startedAt;
  stepTimers.delete(id);
  logger.info(`[${this.currentFeatureUri ?? 'unknown-feature'}] STEP END: ${stepText} | status=${status} | duration=${elapsedMs}ms`);
});

After(async function (this: any, scenario: any) {
  logger.info(`After hook called for scenario: ${scenario.pickle.name}`);
  logger.info(`Page exists: ${!!this.page}, Closed: ${this.page?.isClosed()}`);

  try {
    // Capture final full-page screenshot BEFORE closing browser
    if (this.page && !this.page.isClosed()) {
      // Wait a moment for page to settle before screenshot
      await this.page.waitForTimeout(1000);
      logger.info('Capturing final screenshot...');
      const finalScreenshot = await this.page.screenshot({ fullPage: true });
      logger.info(`Screenshot captured, size: ${finalScreenshot.length} bytes`);

      // Attach screenshot to cucumber report from After hook
      await this.attach(finalScreenshot, 'image/png');

      // Also attach final URL as text
      await this.attach(`Final URL: ${this.page.url()}`, 'text/plain');

      // Also save to disk for archival
      const screenshotsDir = path.resolve(process.cwd(), 'reports/screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const scenarioName = scenario.pickle.name.replace(/\s+/g, '-').toLowerCase();
      const status = scenario.result?.status ?? 'unknown';
      const timestamp = Date.now();
      const filepath = path.join(screenshotsDir, `${scenarioName}-${status}-${timestamp}.png`);
      fs.writeFileSync(filepath, finalScreenshot);

      logger.info(`Screenshot saved to disk: ${filepath}`);
    } else {
      logger.warn('Page not available for screenshot');
    }
  } catch (e) {
    logger.error('Screenshot capture failed', e);
  } finally {
    // Now close the browser after screenshots are taken
    logger.info('Closing browser...');
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }
});
