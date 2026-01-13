import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('redirects root to /es', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/es/);
  });

  test('Spanish homepage loads correctly', async ({ page }) => {
    await page.goto('/es');
    await expect(page).toHaveTitle(/BestDeals Hub/);
  });

  test('English homepage loads correctly', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/BestDeals Hub/);
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
});

test.describe('Products Page', () => {
  test('products page shows products (ES)', async ({ page }) => {
    await page.goto('/es/products');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should have at least 1 product (Sony WH-1000XM5)
    const productTitle = page.getByText('Sony WH-1000XM5');
    await expect(productTitle).toBeVisible();
  });

  test('products page shows products (EN)', async ({ page }) => {
    await page.goto('/en/products');

    await page.waitForLoadState('networkidle');

    // Should show AirPods Pro 2
    const productTitle = page.getByText('Apple AirPods Pro 2');
    await expect(productTitle).toBeVisible();
  });
});

test.describe('Product Detail Page', () => {
  test('product page loads correctly (ES) - Sony', async ({ page }) => {
    await page.goto('/es/products/sony-wh1000xm5');

    // Check title in main content
    await expect(page.locator('main h1').first()).toContainText('Sony WH-1000XM5');

    // Check price is displayed
    const price = page.getByText('329');
    await expect(price).toBeVisible();

    // Check buy button (affiliate link to Amazon)
    const buyButton = page.locator('a[href*="amazon"]').first();
    await expect(buyButton).toBeVisible();
  });

  test('product page loads correctly (EN) - AirPods', async ({ page }) => {
    await page.goto('/en/products/apple-airpods-pro-2');

    await expect(page.locator('main h1').first()).toContainText('AirPods Pro 2');

    // Check price
    const price = page.getByText('249');
    await expect(price).toBeVisible();
  });

  test('product page loads correctly (EN) - Samsung', async ({ page }) => {
    await page.goto('/en/products/samsung-galaxy-s24-ultra');

    await expect(page.locator('main h1').first()).toContainText('Samsung Galaxy S24 Ultra');

    // Check price
    const price = page.getByText('1,199');
    await expect(price).toBeVisible();
  });

  test('product has pros and cons', async ({ page }) => {
    await page.goto('/es/products/sony-wh1000xm5');

    // Check pros text is visible
    await expect(page.getByText('Cancelación de ruido líder')).toBeVisible();

    // Check cons text is visible
    await expect(page.getByText('Precio elevado')).toBeVisible();
  });
});

test.describe('Affiliate Links', () => {
  test('affiliate links go to Amazon', async ({ page }) => {
    await page.goto('/en/products/apple-airpods-pro-2');

    // Get the buy button/affiliate link
    const affiliateLink = page.locator('a[href*="amazon.com"]').first();
    await expect(affiliateLink).toBeVisible();

    // Check it has the correct ASIN
    await expect(affiliateLink).toHaveAttribute('href', /B0D1XD1ZV3/);
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
});

test.describe('Affiliate Disclosure', () => {
  test('footer has affiliate disclosure (ES)', async ({ page }) => {
    await page.goto('/es');

    // Check footer has disclosure
    await expect(page.locator('footer')).toContainText('Amazon');
  });

  test('footer has affiliate disclosure (EN)', async ({ page }) => {
    await page.goto('/en');

    await expect(page.locator('footer')).toContainText('Amazon');
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

  test('products display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en/products');

    await page.waitForLoadState('networkidle');

    // Product should still be visible
    await expect(page.getByText('AirPods Pro 2')).toBeVisible();
  });
});
