import { test, expect } from '@playwright/test';

const viewports = [
  { width: 375, height: 812, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1280, height: 800, name: 'desktop' },
  { width: 1920, height: 1080, name: 'desktop-lg' },
];

test.describe('Responsive Analysis', () => {
  for (const vp of viewports) {
    test(`Home ES @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/es');
      await page.waitForLoadState('domcontentloaded');
      await page.screenshot({
        path: `responsive-screenshots/home-es_${vp.name}.png`,
        fullPage: true
      });

      // Check no horizontal overflow
      const hasOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasOverflow).toBe(false);
    });
  }
});
