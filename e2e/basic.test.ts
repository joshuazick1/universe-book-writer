import { expect, test } from '@playwright/test';

test('basic app navigation test', async ({ page }) => {
  await page.goto('/');

  // Home page should load
  await expect(page).toHaveTitle(/Universe Book Writer/);
});
