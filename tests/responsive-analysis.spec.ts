import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:4328';

// Viewport definitions
const viewports = {
  mobile: { width: 375, height: 812, name: 'Mobile (iPhone X)' },
  mobileLandscape: { width: 812, height: 375, name: 'Mobile Landscape' },
  tablet: { width: 768, height: 1024, name: 'Tablet (iPad)' },
  tabletLandscape: { width: 1024, height: 768, name: 'Tablet Landscape' },
  desktop: { width: 1280, height: 800, name: 'Desktop' },
  desktopLarge: { width: 1920, height: 1080, name: 'Desktop Large (FHD)' },
};

// Pages to analyze
const pages = [
  { path: '/es', name: 'Home ES' },
  { path: '/en', name: 'Home EN' },
  { path: '/es/login', name: 'Login ES' },
  { path: '/es/onboarding', name: 'Onboarding ES' },
];

const screenshotDir = path.join(__dirname, '../responsive-screenshots');

// Ensure screenshot directory exists
test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

// Generate tests for each viewport
for (const [viewportKey, viewport] of Object.entries(viewports)) {
  test.describe(`Responsive Analysis - ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
    });

    for (const pageConfig of pages) {
      test(`${pageConfig.name} at ${viewport.name}`, async ({ page }) => {
        // Navigate to page
        await page.goto(`${BASE_URL}${pageConfig.path}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        // Wait for content to render
        await page.waitForTimeout(1000);

        // Take full page screenshot
        const screenshotName = `${pageConfig.name.replace(/\s+/g, '-')}_${viewportKey}.png`;
        await page.screenshot({
          path: path.join(screenshotDir, screenshotName),
          fullPage: true,
        });

        // Analyze key responsive elements
        const analysis = await analyzeResponsive(page, viewport);

        // Log analysis results
        console.log(`\n=== ${pageConfig.name} @ ${viewport.name} ===`);
        console.log(JSON.stringify(analysis, null, 2));

        // Basic responsive checks
        if (viewport.width < 768) {
          // Mobile checks
          const mobileNav = await page.locator('[data-mobile-nav], .mobile-nav, .hamburger, [aria-label*="menu"]').count();
          console.log(`Mobile navigation elements: ${mobileNav}`);
        }
      });
    }
  });
}

async function analyzeResponsive(page: Page, viewport: typeof viewports.mobile) {
  return await page.evaluate((vp) => {
    const results: Record<string, any> = {
      viewport: vp,
      issues: [],
      observations: [],
    };

    // Check for horizontal overflow
    const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    if (hasHorizontalScroll) {
      results.issues.push({
        type: 'horizontal-overflow',
        severity: 'high',
        message: `Page has horizontal scroll (content width: ${document.documentElement.scrollWidth}px, viewport: ${document.documentElement.clientWidth}px)`,
      });
    }

    // Check text readability (font sizes)
    const textElements = document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, label');
    const smallTexts: string[] = [];
    textElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < 12 && el.textContent?.trim()) {
        smallTexts.push(`${el.tagName}: ${fontSize}px - "${el.textContent?.slice(0, 30)}..."`);
      }
    });
    if (smallTexts.length > 0) {
      results.issues.push({
        type: 'small-text',
        severity: 'medium',
        message: `Found ${smallTexts.length} elements with font-size < 12px`,
        details: smallTexts.slice(0, 5),
      });
    }

    // Check touch targets (min 44x44px for mobile)
    if (vp.width < 768) {
      const interactiveElements = document.querySelectorAll('a, button, input, [role="button"], [onclick]');
      const smallTargets: string[] = [];
      interactiveElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if ((rect.width < 44 || rect.height < 44) && rect.width > 0 && rect.height > 0) {
          smallTargets.push(`${el.tagName}${el.className ? '.' + el.className.split(' ')[0] : ''}: ${Math.round(rect.width)}x${Math.round(rect.height)}px`);
        }
      });
      if (smallTargets.length > 0) {
        results.issues.push({
          type: 'small-touch-target',
          severity: 'medium',
          message: `Found ${smallTargets.length} touch targets smaller than 44x44px`,
          details: smallTargets.slice(0, 10),
        });
      }
    }

    // Check images
    const images = document.querySelectorAll('img');
    const imageIssues: string[] = [];
    images.forEach((img) => {
      if (!img.alt) {
        imageIssues.push(`Missing alt: ${img.src.slice(-50)}`);
      }
      const rect = img.getBoundingClientRect();
      if (rect.width > vp.width) {
        imageIssues.push(`Image overflow: ${Math.round(rect.width)}px wide`);
      }
    });
    if (imageIssues.length > 0) {
      results.observations.push({
        type: 'images',
        count: images.length,
        issues: imageIssues.slice(0, 5),
      });
    }

    // Check flexbox/grid usage
    const flexElements = document.querySelectorAll('[class*="flex"], [class*="grid"]');
    results.observations.push({
      type: 'layout',
      flexboxCount: flexElements.length,
    });

    // Check visibility of key elements
    const header = document.querySelector('header, [role="banner"]');
    const nav = document.querySelector('nav, [role="navigation"]');
    const main = document.querySelector('main, [role="main"]');
    const footer = document.querySelector('footer, [role="contentinfo"]');

    results.observations.push({
      type: 'structure',
      header: header ? 'present' : 'missing',
      nav: nav ? 'present' : 'missing',
      main: main ? 'present' : 'missing',
      footer: footer ? 'present' : 'missing',
    });

    // Check media queries in stylesheets (limited check)
    const breakpoints: string[] = [];
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSMediaRule) {
              breakpoints.push(rule.conditionText);
            }
          }
        } catch (e) {
          // Cross-origin stylesheets
        }
      }
    } catch (e) {
      // Ignore
    }
    results.observations.push({
      type: 'breakpoints',
      detected: [...new Set(breakpoints)].slice(0, 10),
    });

    return results;
  }, viewport);
}
