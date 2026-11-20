import { test as base } from '@playwright/test';

/** Every test runs offline: external APIs blocked, guide dismissed, location prompt skipped. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/^https:\/\/(?!localhost)/, (r) => r.abort());
    await page.addInitScript(() => localStorage.setItem('pj-guide-seen', '1'));
    await use(page);
  },
});
export { expect } from '@playwright/test';
