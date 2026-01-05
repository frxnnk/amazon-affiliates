import { db, Users, PurchaseClaims, CashbackTransactions, PayoutRequests, AffiliateClicks, eq, desc, and } from 'astro:db';

// Tier thresholds
const TIER_THRESHOLDS = {
  silver: 10,  // 10+ approved claims
  gold: 50,    // 50+ approved claims
};

// Tier bonuses (as decimal multipliers)
export const TIER_BONUSES = {
  bronze: 0,
  silver: 0.05,  // +5%
  gold: 0.10,    // +10%
};

export type UserTier = 'bronze' | 'silver' | 'gold';

export function calculateTier(approvedClaimsCount: number): UserTier {
  if (approvedClaimsCount >= TIER_THRESHOLDS.gold) return 'gold';
  if (approvedClaimsCount >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

// Get or create user by Clerk ID
export async function getOrCreateUser(clerkUserId: string, email: string) {
  const existing = await db.select().from(Users).where(eq(Users.id, clerkUserId)).get();

  if (existing) {
    return existing;
  }

  // Create new user
  await db.insert(Users).values({
    id: clerkUserId,
    email,
    balance: 0,
    totalEarned: 0,
    approvedClaimsCount: 0,
    tier: 'bronze',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return db.select().from(Users).where(eq(Users.id, clerkUserId)).get();
}

// Get user by Clerk ID
export async function getUser(clerkUserId: string) {
  return db.select().from(Users).where(eq(Users.id, clerkUserId)).get();
}

// Update user payout info
export async function updateUserPayoutInfo(
  clerkUserId: string,
  paypalEmail?: string,
  cryptoAddress?: string
) {
  await db.update(Users)
    .set({
      paypalEmail,
      cryptoAddress,
      updatedAt: new Date()
    })
    .where(eq(Users.id, clerkUserId));
}

// Get user's pending claims
export async function getUserPendingClaims(clerkUserId: string) {
  return db.select()
    .from(PurchaseClaims)
    .where(eq(PurchaseClaims.userId, clerkUserId))
    .orderBy(desc(PurchaseClaims.createdAt))
    .all();
}

// Get user's recent transactions
export async function getUserTransactions(clerkUserId: string, limit = 10) {
  return db.select()
    .from(CashbackTransactions)
    .where(eq(CashbackTransactions.userId, clerkUserId))
    .orderBy(desc(CashbackTransactions.createdAt))
    .limit(limit)
    .all();
}

// Get user's payout requests
export async function getUserPayoutRequests(clerkUserId: string) {
  return db.select()
    .from(PayoutRequests)
    .where(eq(PayoutRequests.userId, clerkUserId))
    .orderBy(desc(PayoutRequests.createdAt))
    .all();
}

// Format cents to currency string
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

// Get pending cashback amount (sum of pending claims)
export async function getPendingCashback(clerkUserId: string): Promise<number> {
  const pendingClaims = await db.select()
    .from(PurchaseClaims)
    .where(eq(PurchaseClaims.userId, clerkUserId))
    .all();

  return pendingClaims
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.claimedAmount, 0);
}

// Cashback calculation config
export const CASHBACK_CONFIG = {
  baseRate: 0.02, // 2% base cashback rate
  platformCut: 0.5, // Platform keeps 50% of commission
};

// Calculate cashback amount for a product price
export function calculateCashback(priceInCents: number, tier: UserTier): number {
  const baseAmount = priceInCents * CASHBACK_CONFIG.baseRate * (1 - CASHBACK_CONFIG.platformCut);
  const tierBonus = TIER_BONUSES[tier];
  return Math.round(baseAmount * (1 + tierBonus));
}

// Create a new purchase claim
export async function createPurchaseClaim(
  userId: string,
  amazonOrderId: string,
  productSlug: string,
  productTitle: string,
  purchaseDate: Date,
  claimedAmount: number
) {
  // Check if claim with this order ID already exists
  const existing = await db.select()
    .from(PurchaseClaims)
    .where(eq(PurchaseClaims.amazonOrderId, amazonOrderId))
    .get();

  if (existing) {
    throw new Error('A claim for this order already exists');
  }

  await db.insert(PurchaseClaims).values({
    userId,
    amazonOrderId,
    productSlug,
    productTitle,
    purchaseDate,
    claimedAmount,
    status: 'pending',
    createdAt: new Date(),
  });

  return db.select()
    .from(PurchaseClaims)
    .where(eq(PurchaseClaims.amazonOrderId, amazonOrderId))
    .get();
}

// ==================== ADMIN FUNCTIONS ====================

// Get all pending claims for admin review
export async function getAllPendingClaims() {
  return db.select()
    .from(PurchaseClaims)
    .where(eq(PurchaseClaims.status, 'pending'))
    .orderBy(desc(PurchaseClaims.createdAt))
    .all();
}

// Get all claims with optional status filter
export async function getAllClaims(status?: string) {
  if (status) {
    return db.select()
      .from(PurchaseClaims)
      .where(eq(PurchaseClaims.status, status))
      .orderBy(desc(PurchaseClaims.createdAt))
      .all();
  }
  return db.select()
    .from(PurchaseClaims)
    .orderBy(desc(PurchaseClaims.createdAt))
    .all();
}

// Get a single claim by ID
export async function getClaimById(claimId: number) {
  return db.select()
    .from(PurchaseClaims)
    .where(eq(PurchaseClaims.id, claimId))
    .get();
}

// Approve a claim - credits user balance and creates transaction
export async function approveClaim(
  claimId: number,
  approvedAmount: number,
  adminUserId: string,
  adminNotes?: string
) {
  const claim = await getClaimById(claimId);
  if (!claim) throw new Error('Claim not found');
  if (claim.status !== 'pending') throw new Error('Claim is not pending');

  const user = await getUser(claim.userId);
  if (!user) throw new Error('User not found');

  const now = new Date();
  const newBalance = user.balance + approvedAmount;
  const newTotalEarned = user.totalEarned + approvedAmount;
  const newApprovedCount = user.approvedClaimsCount + 1;
  const newTier = calculateTier(newApprovedCount);

  // Update claim status
  await db.update(PurchaseClaims)
    .set({
      status: 'approved',
      approvedAmount,
      adminNotes,
      reviewedAt: now,
      reviewedBy: adminUserId,
    })
    .where(eq(PurchaseClaims.id, claimId));

  // Update user balance and stats
  await db.update(Users)
    .set({
      balance: newBalance,
      totalEarned: newTotalEarned,
      approvedClaimsCount: newApprovedCount,
      tier: newTier,
      updatedAt: now,
    })
    .where(eq(Users.id, claim.userId));

  // Create transaction record
  await db.insert(CashbackTransactions).values({
    userId: claim.userId,
    type: 'credit',
    amount: approvedAmount,
    description: `Cashback for ${claim.productTitle}`,
    referenceType: 'claim',
    referenceId: claimId,
    balanceAfter: newBalance,
    createdAt: now,
  });

  return getClaimById(claimId);
}

// Reject a claim
export async function rejectClaim(
  claimId: number,
  adminUserId: string,
  adminNotes: string
) {
  const claim = await getClaimById(claimId);
  if (!claim) throw new Error('Claim not found');
  if (claim.status !== 'pending') throw new Error('Claim is not pending');

  await db.update(PurchaseClaims)
    .set({
      status: 'rejected',
      adminNotes,
      reviewedAt: new Date(),
      reviewedBy: adminUserId,
    })
    .where(eq(PurchaseClaims.id, claimId));

  return getClaimById(claimId);
}

// ==================== PAYOUT FUNCTIONS ====================

export const PAYOUT_CONFIG = {
  minimumAmount: 1500, // $15.00 minimum payout in cents
};

// Create a payout request
export async function createPayoutRequest(
  userId: string,
  amount: number,
  method: 'paypal' | 'crypto',
  paypalEmail?: string,
  cryptoAddress?: string
) {
  const user = await getUser(userId);
  if (!user) throw new Error('User not found');
  if (user.balance < amount) throw new Error('Insufficient balance');
  if (amount < PAYOUT_CONFIG.minimumAmount) {
    throw new Error(`Minimum payout is ${formatCurrency(PAYOUT_CONFIG.minimumAmount)}`);
  }

  // Check for existing pending payout
  const pendingPayout = await db.select()
    .from(PayoutRequests)
    .where(and(
      eq(PayoutRequests.userId, userId),
      eq(PayoutRequests.status, 'pending')
    ))
    .get();

  if (pendingPayout) {
    throw new Error('You already have a pending payout request');
  }

  // Create the payout request
  await db.insert(PayoutRequests).values({
    userId,
    amount,
    method,
    paypalEmail: method === 'paypal' ? paypalEmail : null,
    cryptoAddress: method === 'crypto' ? cryptoAddress : null,
    status: 'pending',
    createdAt: new Date(),
  });

  // Deduct from user balance
  const newBalance = user.balance - amount;
  await db.update(Users)
    .set({
      balance: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(Users.id, userId));

  // Create transaction record
  await db.insert(CashbackTransactions).values({
    userId,
    type: 'debit',
    amount: -amount,
    description: `Payout request via ${method}`,
    referenceType: 'payout',
    balanceAfter: newBalance,
    createdAt: new Date(),
  });

  return db.select()
    .from(PayoutRequests)
    .where(eq(PayoutRequests.userId, userId))
    .orderBy(desc(PayoutRequests.createdAt))
    .get();
}

// Get all payout requests (admin)
export async function getAllPayoutRequests(status?: string) {
  if (status) {
    return db.select()
      .from(PayoutRequests)
      .where(eq(PayoutRequests.status, status))
      .orderBy(desc(PayoutRequests.createdAt))
      .all();
  }
  return db.select()
    .from(PayoutRequests)
    .orderBy(desc(PayoutRequests.createdAt))
    .all();
}

// Get payout by ID
export async function getPayoutById(payoutId: number) {
  return db.select()
    .from(PayoutRequests)
    .where(eq(PayoutRequests.id, payoutId))
    .get();
}

// Process payout (mark as processing)
export async function processPayoutRequest(
  payoutId: number,
  adminUserId: string
) {
  const payout = await getPayoutById(payoutId);
  if (!payout) throw new Error('Payout not found');
  if (payout.status !== 'pending') throw new Error('Payout is not pending');

  await db.update(PayoutRequests)
    .set({
      status: 'processing',
      processedBy: adminUserId,
    })
    .where(eq(PayoutRequests.id, payoutId));

  return getPayoutById(payoutId);
}

// Complete payout
export async function completePayoutRequest(
  payoutId: number,
  adminUserId: string,
  transactionRef: string,
  adminNotes?: string
) {
  const payout = await getPayoutById(payoutId);
  if (!payout) throw new Error('Payout not found');
  if (payout.status !== 'processing') throw new Error('Payout is not in processing state');

  await db.update(PayoutRequests)
    .set({
      status: 'completed',
      transactionRef,
      adminNotes,
      processedAt: new Date(),
      processedBy: adminUserId,
    })
    .where(eq(PayoutRequests.id, payoutId));

  return getPayoutById(payoutId);
}

// Fail payout - refunds user balance
export async function failPayoutRequest(
  payoutId: number,
  adminUserId: string,
  adminNotes: string
) {
  const payout = await getPayoutById(payoutId);
  if (!payout) throw new Error('Payout not found');
  if (payout.status === 'completed') throw new Error('Cannot fail a completed payout');

  const user = await getUser(payout.userId);
  if (!user) throw new Error('User not found');

  const now = new Date();

  // Refund the balance
  const newBalance = user.balance + payout.amount;
  await db.update(Users)
    .set({
      balance: newBalance,
      updatedAt: now,
    })
    .where(eq(Users.id, payout.userId));

  // Create refund transaction
  await db.insert(CashbackTransactions).values({
    userId: payout.userId,
    type: 'credit',
    amount: payout.amount,
    description: `Payout refund - ${adminNotes}`,
    referenceType: 'payout',
    referenceId: payoutId,
    balanceAfter: newBalance,
    createdAt: now,
  });

  // Update payout status
  await db.update(PayoutRequests)
    .set({
      status: 'failed',
      adminNotes,
      processedAt: now,
      processedBy: adminUserId,
    })
    .where(eq(PayoutRequests.id, payoutId));

  return getPayoutById(payoutId);
}

// ==================== CLICK TRACKING FUNCTIONS ====================

// Record an affiliate link click
export async function recordAffiliateClick(
  productSlug: string,
  userId?: string,
  sessionId?: string,
  ipHash?: string,
  userAgent?: string
) {
  await db.insert(AffiliateClicks).values({
    userId: userId || null,
    productSlug,
    sessionId: sessionId || null,
    ipHash: ipHash || null,
    userAgent: userAgent || null,
    createdAt: new Date(),
  });
}

// Get user's click history
export async function getUserClicks(userId: string, limit = 20) {
  return db.select()
    .from(AffiliateClicks)
    .where(eq(AffiliateClicks.userId, userId))
    .orderBy(desc(AffiliateClicks.createdAt))
    .limit(limit)
    .all();
}

// Get clicks for a specific product
export async function getProductClicks(productSlug: string) {
  return db.select()
    .from(AffiliateClicks)
    .where(eq(AffiliateClicks.productSlug, productSlug))
    .orderBy(desc(AffiliateClicks.createdAt))
    .all();
}

// Get click count by product (for analytics)
export async function getClickStats() {
  const clicks = await db.select().from(AffiliateClicks).all();

  const stats: Record<string, number> = {};
  clicks.forEach(click => {
    stats[click.productSlug] = (stats[click.productSlug] || 0) + 1;
  });

  return Object.entries(stats)
    .map(([productSlug, count]) => ({ productSlug, count }))
    .sort((a, b) => b.count - a.count);
}
