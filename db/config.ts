import { defineDb, defineTable, column } from 'astro:db';

// Users table - linked to Clerk user ID
const Users = defineTable({
  columns: {
    id: column.text({ primaryKey: true }), // Clerk user ID
    email: column.text(),
    balance: column.number({ default: 0 }), // Current balance in cents
    totalEarned: column.number({ default: 0 }), // Lifetime earnings in cents
    approvedClaimsCount: column.number({ default: 0 }), // For tier calculation
    tier: column.text({ default: 'bronze' }), // bronze, silver, gold
    paypalEmail: column.text({ optional: true }),
    cryptoAddress: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
  },
});

// Purchase claims submitted by users
const PurchaseClaims = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    amazonOrderId: column.text(),
    productSlug: column.text(), // Reference to content collection product
    productTitle: column.text(), // Denormalized for display
    purchaseDate: column.date(),
    claimedAmount: column.number(), // Amount in cents user expects
    approvedAmount: column.number({ optional: true }), // Actual approved amount
    status: column.text({ default: 'pending' }), // pending, approved, rejected
    adminNotes: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
    reviewedAt: column.date({ optional: true }),
    reviewedBy: column.text({ optional: true }), // Admin Clerk ID
  },
});

// Cashback transaction history (immutable audit trail)
const CashbackTransactions = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    type: column.text(), // credit, debit
    amount: column.number(), // Amount in cents (positive for credit, negative for debit)
    description: column.text(),
    referenceType: column.text({ optional: true }), // claim, payout
    referenceId: column.number({ optional: true }), // ID of related claim or payout
    balanceAfter: column.number(), // Balance after this transaction
    createdAt: column.date({ default: new Date() }),
  },
});

// Payout requests
const PayoutRequests = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    amount: column.number(), // Amount in cents
    method: column.text(), // paypal, crypto
    paypalEmail: column.text({ optional: true }),
    cryptoAddress: column.text({ optional: true }),
    status: column.text({ default: 'pending' }), // pending, processing, completed, failed
    adminNotes: column.text({ optional: true }),
    transactionRef: column.text({ optional: true }), // External payment reference
    createdAt: column.date({ default: new Date() }),
    processedAt: column.date({ optional: true }),
    processedBy: column.text({ optional: true }), // Admin Clerk ID
  },
});

// Affiliate click tracking for logged-in users
const AffiliateClicks = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ optional: true, references: () => Users.columns.id }),
    productSlug: column.text(),
    sessionId: column.text({ optional: true }),
    ipHash: column.text({ optional: true }), // Hashed IP for anonymous correlation
    userAgent: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
  },
});

// Products table - main product catalog
const Products = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    productId: column.text({ unique: true }), // URL slug
    asin: column.text(),
    lang: column.text({ default: 'en' }), // 'es' | 'en'

    // Content
    title: column.text(),
    brand: column.text(),
    model: column.text({ optional: true }),
    description: column.text(),
    shortDescription: column.text({ optional: true }),

    // Categorization
    category: column.text({ optional: true }),
    subcategory: column.text({ optional: true }),
    tags: column.json({ default: [] }), // string[]

    // Pricing
    price: column.number(), // in currency units (not cents)
    originalPrice: column.number({ optional: true }),
    currency: column.text({ default: 'USD' }),

    // Affiliate
    affiliateUrl: column.text(),

    // Ratings
    rating: column.number({ optional: true }), // 0-5 from Amazon
    totalReviews: column.number({ optional: true }),
    ourRating: column.number({ optional: true }), // 0-10 custom rating

    // Pros/Cons
    pros: column.json({ default: [] }), // string[]
    cons: column.json({ default: [] }), // string[]

    // Specifications
    specifications: column.json({ optional: true }), // Record<string, string>

    // Images
    featuredImageUrl: column.text(),
    featuredImageAlt: column.text({ optional: true }),
    gallery: column.json({ optional: true }), // {url: string, alt: string}[]

    // Markdown content (optional body)
    content: column.text({ optional: true }),

    // Status & Visibility
    status: column.text({ default: 'draft' }), // draft | published | archived
    isFeatured: column.boolean({ default: false }),
    isOnSale: column.boolean({ default: false }),

    // Related products
    relatedProducts: column.json({ optional: true }), // string[] of productIds

    // Timestamps
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
    publishedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ['asin'], unique: false },
    { on: ['lang', 'status'] },
    { on: ['category'] },
  ],
});

export default defineDb({
  tables: {
    Users,
    PurchaseClaims,
    CashbackTransactions,
    PayoutRequests,
    AffiliateClicks,
    Products,
  },
});
