import { test, expect } from './fixtures';

test('every step of every journey renders without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/app.html#g-key');
  await page.getByRole('button', { name: /Skip/ }).click();
  for (const [name, count] of [['Visit a website', 23], ['Message → 7 layers', 16]] as const) {
    await page.getByRole('radio', { name }).click();
    await expect(page.getByText(`1/${count}`)).toBeVisible();
    for (let i = 1; i < count; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByText(`${count}/${count}`)).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('incident simulator: cutting the Red Sea cables reroutes', async ({ page }) => {
  await page.goto('/app.html#g-core');
  await page.getByRole('button', { name: /Skip/ }).click();
  await page.getByRole('button', { name: 'Red Sea, Feb 2024' }).click();
  await expect(page.getByText(/BGP withdraws the routes|This route uses no submarine cables/)).toBeVisible();
});

test('packet lab decodes the sample capture', async ({ page }) => {
  await page.goto('/lab.html');
  await page.getByRole('button', { name: 'Load sample capture' }).click();
  await expect(page.getByText('GET / HTTP/1.1').first()).toBeVisible();
  await expect(page.getByText('40.9 ms')).toBeVisible();
});

test('learn page filters status codes', async ({ page }) => {
  await page.goto('/learn.html#http');
  await page.getByPlaceholder(/Search codes/).fill('gateway');
  const http = page.locator('#http');
  await expect(http.getByRole('cell', { name: '502', exact: true })).toBeVisible();
  await expect(http.getByRole('cell', { name: '504', exact: true })).toBeVisible();
});

test('Ctrl+K search finds a status code and navigates', async ({ page }) => {
  await page.goto('/learn.html');
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Search' }).getByRole('textbox').fill('502');
  await expect(page.getByRole('option').first()).toContainText('502 Bad Gateway');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/learn\.html#http/);
});

test('atlas directory lists cloud providers and filters', async ({ page }) => {
  await page.goto('/atlas.html#directory');
  const dir = page.locator('#directory');
  await expect(dir.getByText('Amazon Web Services')).toBeVisible();
  await page.getByPlaceholder(/Search: AS13335/).fill('AS9498');
  await expect(dir.getByText('Bharti Airtel')).toBeVisible();
});

test('learn has the video library and markdown export', async ({ page }) => {
  await page.goto('/learn.html#resources');
  await expect(page.locator('#resources a[href^="https://www.youtube.com/watch?v="]')).toHaveCount(38);
  await expect(page.getByRole('button', { name: 'Download as Markdown' })).toBeVisible();
});
