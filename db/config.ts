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

export default defineDb({
  tables: {
    Users,
    PurchaseClaims,
    CashbackTransactions,
    PayoutRequests,
    AffiliateClicks,
  },
});
