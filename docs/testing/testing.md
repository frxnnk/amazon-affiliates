# Testing Guide

## Test Organization

Tests are organized by feature in the `/tests` directory:

```
tests/
├── site.spec.ts           # Basic site functionality
├── user-dashboard.spec.ts # User dashboard features
├── purchase-claim.spec.ts # Purchase claim flow
├── admin-claims.spec.ts   # Admin claim verification
├── payout.spec.ts         # Payout request system
├── blog.spec.ts           # Blog features
├── product-detail.spec.ts # Product page tests
└── homepage.spec.ts       # Homepage tests
```

## Commands

### Quick Smoke Test
```bash
npx playwright test tests/site.spec.ts
```

### Full Test Suite
```bash
npx playwright test
```

### Interactive UI Mode
```bash
npx playwright test --ui
```

### Run Specific Test File
```bash
npx playwright test tests/user-dashboard.spec.ts
```

### Debug Mode
```bash
npx playwright test --debug
```

## Test Environment

Tests run against the dev server. Playwright config (`playwright.config.ts`) handles:
- Starting dev server before tests
- Base URL configuration
- Browser settings

## Writing Tests

### Page Object Pattern
For complex pages, create page objects in `tests/pages/`:

```typescript
// tests/pages/dashboard.ts
export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/en/dashboard');
  }

  async getBalance() {
    return this.page.locator('[data-testid="balance"]').textContent();
  }
}
```

### Test Data
- Use test fixtures for consistent data
- Clean up test data after runs when testing DB operations
- Mock external APIs (Amazon, PayPal) in tests

## Critical Invariants

Tests must verify:
1. **Auth boundaries** - Protected pages redirect to login
2. **Cashback calculations** - Correct amounts with tier bonuses
3. **Payout thresholds** - Cannot request below $15
4. **Admin-only routes** - Non-admins cannot access admin pages
