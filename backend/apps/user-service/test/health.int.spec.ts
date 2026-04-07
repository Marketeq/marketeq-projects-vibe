import { test, expect } from '@playwright/test';
import { logResponse } from './utils/test-helpers';

test('Health check', async ({ request }) => {
  const res = await request.get('/health');
  await logResponse(res);
  expect(res.ok()).toBeTruthy();
});
