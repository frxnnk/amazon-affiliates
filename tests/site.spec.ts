import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('redirects root to /es', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/es/);
  });

  test('Spanish homepage loads correctly', async ({ page }) => {
    await page.goto('/es');
    await expect(page).toHaveTitle(/BestDeals Hub/);
    await expect(page.locator('main h1').first()).toContainText('BestDeals Hub');
  });

  test('English homepage loads correctly', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/BestDeals Hub/);
    await expect(page.locator('main h1').first()).toContainText('BestDeals Hub');
  });
});

test.describe('Navigation', () => {
  test('header navigation works (ES)', async ({ page }) => {
    await page.goto('/es');

    // Click on Products link
    await page.click('a[href="/es/products"]');
    await expect(page).toHaveURL('/es/products');
    await expect(page.locator('main h1').first()).toContainText('Productos');
  });

  test('header navigation works (EN)', async ({ page }) => {
    await page.goto('/en');

    // Click on Products link
    await page.click('a[href="/en/products"]');
    await expect(page).toHaveURL('/en/products');
    await expect(page.locator('main h1').first()).toContainText('Products');
  });

  test('language switcher works', async ({ page }) => {
    await page.goto('/es');

    // Click language switcher button
    await page.click('#lang-toggle');

    // Click English option
    await page.click('a[hreflang="en"]');
    await expect(page).toHaveURL('/en');
  });
});

test.describe('Products Page', () => {
  test('products page shows products (ES)', async ({ page }) => {
    await page.goto('/es/products');

    // Should have product cards
    const productCards = page.locator('.product-card');
    await expect(productCards).toHaveCount(3); // We have 3 products
  });

  test('products page shows products (EN)', async ({ page }) => {
    await page.goto('/en/products');

    const productCards = page.locator('.product-card');
    await expect(productCards).toHaveCount(3);
  });
});

test.describe('Product Detail Page', () => {
  test('product page loads correctly (ES)', async ({ page }) => {
    await page.goto('/es/products/sony-wh1000xm5');

    // Check title in main content
    await expect(page.locator('main h1').first()).toContainText('Sony WH-1000XM5');

    // Check price display
    await expect(page.locator('.price-display')).toBeVisible();

    // Check buy button (affiliate link)
    const buyButton = page.locator('a[rel="nofollow noopener sponsored"]').first();
    await expect(buyButton).toBeVisible();
    await expect(buyButton).toHaveAttribute('href', /amazon/);
  });

  test('product page loads correctly (EN)', async ({ page }) => {
    await page.goto('/en/products/sony-wh1000xm5');

    await expect(page.locator('main h1').first()).toContainText('Sony WH-1000XM5');
    await expect(page.locator('.price-display')).toBeVisible();
  });

  test('product has pros and cons', async ({ page }) => {
    await page.goto('/es/products/sony-wh1000xm5');

    // Check pros section (green background)
    await expect(page.locator('.bg-green-50 h3')).toBeVisible();

    // Check cons section (red background)
    await expect(page.locator('.bg-red-50 h3')).toBeVisible();
  });
});

test.describe('Legal Pages', () => {
  test('about page loads (ES)', async ({ page }) => {
    await page.goto('/es/about');
    await expect(page.locator('main h1').first()).toContainText('Sobre Nosotros');
  });

  test('about page loads (EN)', async ({ page }) => {
    await page.goto('/en/about');
    await expect(page.locator('main h1').first()).toContainText('About Us');
  });

  test('privacy policy page loads (ES)', async ({ page }) => {
    await page.goto('/es/privacy-policy');
    await expect(page.locator('main h1').first()).toContainText('Politica de Privacidad');
  });

  test('terms of service page loads (ES)', async ({ page }) => {
    await page.goto('/es/terms-of-service');
    await expect(page.locator('main h1').first()).toContainText('Terminos de Servicio');
  });
});

test.describe('Affiliate Disclosure', () => {
  test('footer has affiliate disclosure (ES)', async ({ page }) => {
    await page.goto('/es');

    // Check footer has disclosure
    await expect(page.locator('footer')).toContainText('Programa de Afiliados de Amazon');
  });

  test('footer has affiliate disclosure (EN)', async ({ page }) => {
    await page.goto('/en');

    await expect(page.locator('footer')).toContainText('Amazon Associates');
  });

  test('product page has affiliate disclosure', async ({ page }) => {
    await page.goto('/es/products/sony-wh1000xm5');

    // Product pages should have full disclosure
    await expect(page.locator('main:has-text("Disclosure")')).toBeVisible();
  });
});

test.describe('SEO', () => {
  test('pages have proper meta tags (ES)', async ({ page }) => {
    await page.goto('/es');

    // Check meta description exists
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);

    // Check Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /.+/);
  });

  test('product page has canonical URL', async ({ page }) => {
    await page.goto('/es/products/sony-wh1000xm5');

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /sony-wh1000xm5/);
  });

  test('pages have alternate language links', async ({ page }) => {
    await page.goto('/es/products');

    // Check that hreflang links exist in head (they're not visible but have attributes)
    const esLink = page.locator('head link[hreflang="es"]');
    const enLink = page.locator('head link[hreflang="en"]');

    await expect(esLink).toHaveAttribute('href', /.+/);
    await expect(enLink).toHaveAttribute('href', /.+/);
  });
});

test.describe('Mobile Responsiveness', () => {
  test('mobile menu button is visible on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/es');

    // Mobile menu button should be visible
    const mobileMenuButton = page.locator('#mobile-menu-button');
    await expect(mobileMenuButton).toBeVisible();
  });
});
