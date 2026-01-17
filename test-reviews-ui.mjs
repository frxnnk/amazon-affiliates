import { chromium, devices } from 'playwright';

const iPhone = devices['iPhone 13'];

const browser = await chromium.launch({ headless: false, channel: 'msedge' });
const context = await browser.newContext({ ...iPhone, locale: 'es-ES' });
const page = await context.newPage();

console.log('Abriendo feed...');
await page.goto('http://localhost:4322/es/', { waitUntil: 'networkidle' });

// Wait for feed to load
await page.waitForTimeout(3000);

// Check for reviews
const reviewSections = await page.locator('[data-reviews-section]').count();
const reviewCards = await page.locator('.review-card').count();
const expandBtns = await page.locator('[data-expand-btn]').count();

console.log('=== Resultados ===');
console.log('Secciones de reviews:', reviewSections);
console.log('Tarjetas de review:', reviewCards);
console.log('Botones Leer mas:', expandBtns);

// Screenshot
await page.screenshot({ path: 'reviews-test-result.png', fullPage: false });

// If we have expand buttons, click one to test
if (expandBtns > 0) {
  console.log('Probando click en Leer mas...');
  await page.locator('[data-expand-btn]').first().click();
  await page.waitForTimeout(500);
  console.log('Click realizado!');
}

console.log('Navegador abierto por 45s - scrollea para ver reviews');
await page.waitForTimeout(45000);

await browser.close();
console.log('Test completado.');
