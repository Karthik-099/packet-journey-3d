import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

for (const path of ['/', '/learn.html', '/lab.html', '/atlas.html']) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}
