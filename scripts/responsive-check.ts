import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viewports = [
  { width: 375, height: 812, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1280, height: 800, name: 'desktop' },
  { width: 1920, height: 1080, name: 'desktop-large' },
];

const pages = [
  { path: '/es', name: 'home-es' },
  { path: '/en', name: 'home-en' },
  { path: '/es/login', name: 'login' },
  { path: '/es/onboarding', name: 'onboarding' },
];

const screenshotDir = path.join(__dirname, '../responsive-screenshots');

// Find running server port
async function findServer(): Promise<string> {
  const ports = [4321, 4322, 4323, 4324, 4325, 4326, 4327, 4328];
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/es`);
      if (res.ok) {
        return `http://localhost:${port}`;
      }
    } catch {}
  }
  throw new Error('No server found. Run: npm run dev');
}

async function analyzeResponsive(page: any, viewport: any) {
  return await page.evaluate((vp: any) => {
    const results: any = { viewport: vp, issues: [], observations: [] };

    // Horizontal overflow
    const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    if (hasHorizontalScroll) {
      results.issues.push({
        type: 'horizontal-overflow',
        severity: 'HIGH',
        message: `Horizontal scroll: ${document.documentElement.scrollWidth}px > ${document.documentElement.clientWidth}px`,
      });
    }

    // Small text (< 12px)
    let smallTextCount = 0;
    document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, label').forEach((el) => {
      const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
      if (fontSize < 12 && el.textContent?.trim()) smallTextCount++;
    });
    if (smallTextCount > 0) {
      results.issues.push({
        type: 'small-text',
        severity: 'MEDIUM',
        message: `${smallTextCount} elements with font < 12px`,
      });
    }

    // Touch targets (mobile only < 44px)
    if (vp.width < 768) {
      let smallTargets = 0;
      document.querySelectorAll('a, button, input, [role="button"]').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if ((rect.width < 44 || rect.height < 44) && rect.width > 0) smallTargets++;
      });
      if (smallTargets > 0) {
        results.issues.push({
          type: 'small-touch-targets',
          severity: 'MEDIUM',
          message: `${smallTargets} touch targets < 44x44px`,
        });
      }
    }

    // Z-index stacking issues (elements with very high z-index)
    let highZIndex = 0;
    document.querySelectorAll('*').forEach((el) => {
      const zIndex = parseInt(window.getComputedStyle(el).zIndex);
      if (zIndex > 9999) highZIndex++;
    });
    if (highZIndex > 0) {
      results.observations.push({
        type: 'z-index',
        message: `${highZIndex} elements with z-index > 9999`,
      });
    }

    // Structure
    results.structure = {
      header: !!document.querySelector('header, [role="banner"]'),
      nav: !!document.querySelector('nav, [role="navigation"]'),
      main: !!document.querySelector('main, [role="main"]'),
      footer: !!document.querySelector('footer, [role="contentinfo"]'),
    };

    return results;
  }, viewport);
}

async function main() {
  console.log('\n🔍 RESPONSIVE ANALYSIS - Amazon Affiliates\n');
  console.log('='.repeat(50));

  const BASE_URL = await findServer();
  console.log(`✅ Found server at ${BASE_URL}\n`);

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allResults: any[] = [];

  for (const viewport of viewports) {
    console.log(`\n📱 ${viewport.name} (${viewport.width}x${viewport.height})`);
    console.log('-'.repeat(40));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const pg of pages) {
      process.stdout.write(`  ${pg.name}... `);
      try {
        await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(800);

        // Screenshot
        await page.screenshot({
          path: path.join(screenshotDir, `${pg.name}_${viewport.name}.png`),
          fullPage: true,
        });

        // Analysis
        const analysis = await analyzeResponsive(page, viewport);
        allResults.push({ page: pg.name, viewport: viewport.name, ...analysis });

        if (analysis.issues.length > 0) {
          console.log(`⚠️  ${analysis.issues.length} issues`);
          analysis.issues.forEach((i: any) => console.log(`     [${i.severity}] ${i.message}`));
        } else {
          console.log('✅');
        }
      } catch (e: any) {
        console.log(`❌ ${e.message.split('\n')[0]}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY\n');

  const high = allResults.flatMap(r => r.issues).filter((i: any) => i.severity === 'HIGH');
  const medium = allResults.flatMap(r => r.issues).filter((i: any) => i.severity === 'MEDIUM');

  console.log(`🔴 High: ${high.length}  🟡 Medium: ${medium.length}`);
  console.log(`📸 Screenshots: ${screenshotDir}`);

  fs.writeFileSync(path.join(screenshotDir, 'report.json'), JSON.stringify(allResults, null, 2));
  console.log('📄 Report saved\n');

  console.log('⏳ Browser open for 20s inspection...');
  await page.waitForTimeout(20000);
  await browser.close();
  console.log('✅ Done!\n');
}

main().catch(console.error);
