import { test, expect } from './fixtures';

test('landing explains the product and links to every page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('really works');
  for (const name of ['Learn', 'Start the journey']) await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();
});

test('app opens a deep link after the location choice', async ({ page }) => {
  await page.goto('/app.html#g-dns-root');
  await page.getByRole('button', { name: /Skip/ }).click();
  await expect(page.getByRole('heading', { name: /root server/ })).toBeVisible();
});
