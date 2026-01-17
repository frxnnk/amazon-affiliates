import { chromium, devices } from 'playwright';

const iPhone = devices['iPhone 13'];

const browser = await chromium.launch({ headless: false, channel: 'msedge' });
const context = await browser.newContext({ ...iPhone, locale: 'es-ES' });
const page = await context.newPage();

console.log('Abriendo feed en mobile (puerto 4322)...');
await page.goto('http://localhost:4322/es/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const reviewSections = await page.locator('[data-reviews-section]').count();
const reviewCards = await page.locator('.review-card').count();
const expandBtns = await page.locator('[data-expand-btn]').count();

console.log('Reviews sections encontradas:', reviewSections);
console.log('Review cards encontradas:', reviewCards);
console.log('Botones Leer mas:', expandBtns);

await page.screenshot({ path: 'feed-with-reviews.png' });
console.log('Screenshot guardado en feed-with-reviews.png');

console.log('El navegador se cerrara en 30 segundos...');
console.log('Scrollea para ver el producto con reviews (AirPods 4)');
await page.waitForTimeout(30000);
await browser.close();
console.log('Test completado.');
