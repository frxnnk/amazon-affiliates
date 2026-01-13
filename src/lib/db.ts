import { db, Users, PurchaseClaims, CashbackTransactions, PayoutRequests, AffiliateClicks, Products, eq, desc, and, like, or } from 'astro:db';

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

// ==================== PRODUCT FUNCTIONS ====================

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface ProductInput {
  productId: string;
  asin: string;
  lang?: string;
  title: string;
  brand: string;
  model?: string;
  description: string;
  shortDescription?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  price: number;
  originalPrice?: number;
  currency?: string;
  affiliateUrl: string;
  rating?: number;
  totalReviews?: number;
  ourRating?: number;
  pros?: string[];
  cons?: string[];
  specifications?: Record<string, string>;
  featuredImageUrl: string;
  featuredImageAlt?: string;
  gallery?: { url: string; alt: string }[];
  content?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  isOnSale?: boolean;
  relatedProducts?: string[];
}

// Get all products with optional filters
export async function getAllProducts(options?: {
  lang?: string;
  status?: ProductStatus;
  category?: string;
  featured?: boolean;
  limit?: number;
}) {
  let query = db.select().from(Products);

  // Build conditions array
  const conditions = [];

  if (options?.lang) {
    conditions.push(eq(Products.lang, options.lang));
  }
  if (options?.status) {
    conditions.push(eq(Products.status, options.status));
  }
  if (options?.category) {
    conditions.push(eq(Products.category, options.category));
  }
  if (options?.featured !== undefined) {
    conditions.push(eq(Products.isFeatured, options.featured));
  }

  // Apply conditions
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  // Order by featured first, then by creation date
  query = query.orderBy(desc(Products.isFeatured), desc(Products.createdAt)) as typeof query;

  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  return query.all();
}

// Get published products for frontend
export async function getPublishedProducts(lang: string, limit?: number) {
  return getAllProducts({
    lang,
    status: 'published',
    limit,
  });
}

// Get featured products
export async function getFeaturedProducts(lang: string, limit = 6) {
  return getAllProducts({
    lang,
    status: 'published',
    featured: true,
    limit,
  });
}

// Get product by slug (productId)
export async function getProductBySlug(productId: string, lang?: string) {
  if (lang) {
    return db.select()
      .from(Products)
      .where(and(
        eq(Products.productId, productId),
        eq(Products.lang, lang)
      ))
      .get();
  }
  return db.select()
    .from(Products)
    .where(eq(Products.productId, productId))
    .get();
}

// Get product by ID (database ID)
export async function getProductById(id: number) {
  return db.select()
    .from(Products)
    .where(eq(Products.id, id))
    .get();
}

// Get products by ASIN
export async function getProductsByAsin(asin: string) {
  return db.select()
    .from(Products)
    .where(eq(Products.asin, asin))
    .all();
}

// Get products by category
export async function getProductsByCategory(category: string, lang: string) {
  return db.select()
    .from(Products)
    .where(and(
      eq(Products.category, category),
      eq(Products.lang, lang),
      eq(Products.status, 'published')
    ))
    .orderBy(desc(Products.isFeatured), desc(Products.createdAt))
    .all();
}

// Search products by title or brand
export async function searchProducts(query: string, lang: string, limit = 20) {
  const searchTerm = `%${query}%`;
  return db.select()
    .from(Products)
    .where(and(
      eq(Products.lang, lang),
      eq(Products.status, 'published'),
      or(
        like(Products.title, searchTerm),
        like(Products.brand, searchTerm)
      )
    ))
    .limit(limit)
    .all();
}

// Create a new product
export async function createProduct(data: ProductInput) {
  // Check if productId already exists for this language
  const existing = await getProductBySlug(data.productId, data.lang);
  if (existing) {
    throw new Error(`Product with ID "${data.productId}" already exists for language "${data.lang}"`);
  }

  const now = new Date();

  await db.insert(Products).values({
    productId: data.productId,
    asin: data.asin,
    lang: data.lang || 'en',
    title: data.title,
    brand: data.brand,
    model: data.model,
    description: data.description,
    shortDescription: data.shortDescription,
    category: data.category,
    subcategory: data.subcategory,
    tags: data.tags || [],
    price: data.price,
    originalPrice: data.originalPrice,
    currency: data.currency || 'USD',
    affiliateUrl: data.affiliateUrl,
    rating: data.rating,
    totalReviews: data.totalReviews,
    ourRating: data.ourRating,
    pros: data.pros || [],
    cons: data.cons || [],
    specifications: data.specifications,
    featuredImageUrl: data.featuredImageUrl,
    featuredImageAlt: data.featuredImageAlt || data.title,
    gallery: data.gallery,
    content: data.content,
    status: data.status || 'draft',
    isFeatured: data.isFeatured || false,
    isOnSale: data.isOnSale || false,
    relatedProducts: data.relatedProducts,
    createdAt: now,
    updatedAt: now,
    publishedAt: data.status === 'published' ? now : undefined,
  });

  return getProductBySlug(data.productId, data.lang);
}

// Update a product
export async function updateProduct(id: number, data: Partial<ProductInput>) {
  const product = await getProductById(id);
  if (!product) {
    throw new Error('Product not found');
  }

  const now = new Date();
  const updateData: Record<string, any> = {
    ...data,
    updatedAt: now,
  };

  // If status changed to published, set publishedAt
  if (data.status === 'published' && product.status !== 'published') {
    updateData.publishedAt = now;
  }

  await db.update(Products)
    .set(updateData)
    .where(eq(Products.id, id));

  return getProductById(id);
}

// Delete a product
export async function deleteProduct(id: number) {
  const product = await getProductById(id);
  if (!product) {
    throw new Error('Product not found');
  }

  await db.delete(Products).where(eq(Products.id, id));
  return product;
}

// Get related products
export async function getRelatedProducts(productIds: string[], lang: string, limit = 4) {
  if (!productIds || productIds.length === 0) return [];

  const products = [];
  for (const productId of productIds.slice(0, limit)) {
    const product = await getProductBySlug(productId, lang);
    if (product && product.status === 'published') {
      products.push(product);
    }
  }
  return products;
}

// Get product count by status (for admin dashboard)
export async function getProductStats() {
  const all = await db.select().from(Products).all();

  const stats = {
    total: all.length,
    published: 0,
    draft: 0,
    archived: 0,
    byLang: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
  };

  for (const product of all) {
    // Count by status
    if (product.status === 'published') stats.published++;
    else if (product.status === 'draft') stats.draft++;
    else if (product.status === 'archived') stats.archived++;

    // Count by language
    stats.byLang[product.lang] = (stats.byLang[product.lang] || 0) + 1;

    // Count by category
    if (product.category) {
      stats.byCategory[product.category] = (stats.byCategory[product.category] || 0) + 1;
    }
  }

  return stats;
}
