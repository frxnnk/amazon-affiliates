# Domain Overview

## Core Entities

### User
- Authenticated via Clerk
- Has a cashback balance (stored in Astro DB)
- Belongs to a loyalty tier (Bronze → Silver → Gold)
- Can submit purchase claims and request payouts

### Product
- Stored as markdown in `src/content/products/[lang]/`
- Has Amazon affiliate link (US region)
- Contains: title, description, price, images, pros/cons, category

### List
- Curated collection of products
- Stored as markdown in `src/content/lists/[lang]/`
- Has theme/title and ordered product references

### Purchase Claim
- User-submitted proof of Amazon purchase
- Contains: Amazon order ID, product reference, purchase date
- Status: pending → approved/rejected
- Approved claims credit user balance

### Cashback Transaction
- Record of balance changes
- Types: credit (from approved claim), debit (from payout)
- Immutable audit trail

### Payout Request
- User request to withdraw balance
- Minimum: $15
- Methods: PayPal, Crypto
- Status: pending → processing → completed/failed

## Loyalty Tiers

| Tier | Requirement | Bonus |
|------|-------------|-------|
| Bronze | Default | Base rate |
| Silver | 10+ approved claims | +5% |
| Gold | 50+ approved claims | +10% |

## Cashback Calculation

```
base_commission = amazon_commission_percentage × product_price
our_cut = base_commission × platform_percentage
user_cashback = our_cut × (1 + tier_bonus)
```

Example:
- Product: $100
- Amazon commission: 4% → $4
- Platform keeps: 50% → $2
- User gets (Bronze): $2.00
- User gets (Gold): $2.20 (+10%)

## User Journeys

### New User Journey
1. Discovers site via search/social
2. Browses products, clicks affiliate link
3. Prompted to register for cashback
4. Registers via Clerk
5. Makes purchase on Amazon
6. Returns to submit claim
7. Waits for admin approval
8. Sees balance credited
9. Accumulates $15+, requests payout

### Returning User Journey
1. Logs in
2. Checks dashboard for balance/pending claims
3. Browses new products
4. Clicks affiliate link (tracked)
5. Purchases and submits claim
6. Tier progresses based on activity

### Admin Journey
1. Logs in to admin panel
2. Reviews pending purchase claims
3. Verifies order ID authenticity
4. Approves/rejects with notes
5. Processes payout requests
6. Manages products/lists content
