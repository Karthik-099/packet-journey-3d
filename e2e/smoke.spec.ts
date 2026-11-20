import { test, expect } from './fixtures';

test('landing explains the product and links to every page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('really works');
  for (const name of ['Learn', 'Start the journey']) await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();
});

test('atlas shows sourced numbers and live counters', async ({ page }) => {
  await page.goto('/atlas.html');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('by the numbers');
  await expect(page.getByText('submarine cable systems in service')).toBeVisible();
  await expect(page.getByRole('link', { name: /TeleGeography/ }).first()).toHaveAttribute('href', /^https:/);
});

test('app opens a deep link after the location choice', async ({ page }) => {
  await page.goto('/app.html#g-dns-root');
  await page.getByRole('button', { name: /Skip/ }).click();
  await expect(page.getByRole('heading', { name: /root server/ })).toBeVisible();
});
