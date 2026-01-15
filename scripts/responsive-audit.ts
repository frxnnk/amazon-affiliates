import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess: ChildProcess | null = null;
let BASE_URL = 'http://localhost:4321';

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 1000));
    process.stdout.write('.');
  }
  return false;
}

async function startServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting dev server...');

    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        reject(new Error('Server start timeout'));
      }
    }, 120000);

    serverProcess.stdout?.on('data', async (data: Buffer) => {
      const output = data.toString();
      // Look for the localhost URL in output
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        const url = `http://127.0.0.1:${match[1]}`;
        console.log(`\n📡 Server binding to ${url}`);
        console.log('⏳ Waiting for server to be ready');

        // Poll until server is actually responding
        const ready = await waitForServer(`${url}/es`);
        if (ready) {
          console.log('\n✅ Server is ready!');
          resolve(url);
        } else {
          reject(new Error('Server never became ready'));
        }
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      // Ignore stderr for now (vite warnings etc)
    });

    serverProcess.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('🛑 Stopping server...');
    serverProcess.kill('SIGTERM');
    // Force kill on Windows
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t'], { shell: true });
    }
  }
}

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

async function analyzeResponsive(page: any, viewport: any) {
  return await page.evaluate((vp: any) => {
    const results: any = { viewport: vp, issues: [], observations: [] };

    // Horizontal overflow
    const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    if (hasHorizontalScroll) {
      results.issues.push({
        type: 'horizontal-overflow',
        severity: 'HIGH',
        message: `Horizontal scroll detected (${document.documentElement.scrollWidth}px > ${document.documentElement.clientWidth}px)`,
      });
    }

    // Small text
    const textElements = document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, label');
    let smallTextCount = 0;
    textElements.forEach((el) => {
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

    // Touch targets (mobile only)
    if (vp.width < 768) {
      const interactive = document.querySelectorAll('a, button, input, [role="button"]');
      let smallTargets = 0;
      interactive.forEach((el) => {
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

    // Structure check
    results.observations.push({
      header: !!document.querySelector('header, [role="banner"]'),
      nav: !!document.querySelector('nav, [role="navigation"]'),
      main: !!document.querySelector('main, [role="main"]'),
      footer: !!document.querySelector('footer, [role="contentinfo"]'),
    });

    return results;
  }, viewport);
}

async function main() {
  console.log('\n🔍 RESPONSIVE ANALYSIS - Amazon Affiliates\n');
  console.log('='.repeat(50));

  // Start server
  try {
    BASE_URL = await startServer();
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,
    // Use Chromium instead of Edge to avoid localhost issues
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const allResults: any[] = [];

  for (const viewport of viewports) {
    console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
    console.log('-'.repeat(40));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const pageConfig of pages) {
      process.stdout.write(`  → ${pageConfig.name}... `);

      try {
        await page.goto(`${BASE_URL}${pageConfig.path}`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });
        await page.waitForTimeout(500);

        // Screenshot
        const filename = `${pageConfig.name}_${viewport.name}.png`;
        await page.screenshot({
          path: path.join(screenshotDir, filename),
          fullPage: true,
        });

        // Analysis
        const analysis = await analyzeResponsive(page, viewport);
        allResults.push({
          page: pageConfig.name,
          viewport: viewport.name,
          ...analysis
        });

        const issueCount = analysis.issues.length;
        if (issueCount > 0) {
          console.log(`⚠️  ${issueCount} issues`);
          analysis.issues.forEach((i: any) => console.log(`     - [${i.severity}] ${i.message}`));
        } else {
          console.log('✅');
        }
      } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));

  const highIssues = allResults.flatMap(r => r.issues).filter((i: any) => i.severity === 'HIGH');
  const mediumIssues = allResults.flatMap(r => r.issues).filter((i: any) => i.severity === 'MEDIUM');

  console.log(`\n🔴 High severity issues: ${highIssues.length}`);
  console.log(`🟡 Medium severity issues: ${mediumIssues.length}`);
  console.log(`📸 Screenshots saved to: ${screenshotDir}`);

  // Save JSON report
  const reportPath = path.join(screenshotDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`📄 Full report: ${reportPath}`);

  console.log('\n⏳ Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  stopServer();
  console.log('\n✅ Analysis complete!\n');
}

main().catch((e) => {
  console.error(e);
  stopServer();
  process.exit(1);
});
