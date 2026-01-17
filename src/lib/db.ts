import { db, Users, PurchaseClaims, CashbackTransactions, PayoutRequests, AffiliateClicks, Products, DealAgentConfig, DealAgentKeywords, UserPreferences, PriceHistory, CuratedDeals, ProductViews, ProductLikes, ProductReviews, ReviewHelpfulVotes, AmazonReviews, eq, desc, and, like, or, gte, lte, asc, sql, inArray } from 'astro:db';

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

/**
 * Ensure user exists in database (lazy creation for tracking purposes)
 * Creates a minimal user record if it doesn't exist
 */
export async function ensureUserExists(clerkUserId: string): Promise<boolean> {
  try {
    const existing = await db.select({ id: Users.id })
      .from(Users)
      .where(eq(Users.id, clerkUserId))
      .get();

    if (existing) {
      return true;
    }

    // Create minimal user record for tracking
    await db.insert(Users).values({
      id: clerkUserId,
      email: `${clerkUserId}@placeholder.local`, // Placeholder until they provide real email
      balance: 0,
      totalEarned: 0,
      approvedClaimsCount: 0,
      tier: 'bronze',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[DB] Created placeholder user: ${clerkUserId}`);
    return true;
  } catch (error) {
    console.error(`[DB] Failed to ensure user exists: ${clerkUserId}`, error);
    return false;
  }
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
  // Text variants for different contexts
  displayTitle?: string;      // Clean UI title (max 60 chars)
  seoTitle?: string;          // Meta title (max 70 chars)
  shortTitle?: string;        // Badges/compact (max 30 chars)
  metaDescription?: string;   // SEO meta (max 160 chars)
  cardDescription?: string;   // ProductCard (max 200 chars)
  fullDescription?: string;   // Full markdown content
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

// Get all available products (published + imported) for feed fallback
export async function getFeedProducts(lang: string, limit?: number) {
  let query = db.select().from(Products)
    .where(and(
      eq(Products.lang, lang),
      or(
        eq(Products.status, 'published'),
        eq(Products.status, 'imported')
      )
    ))
    .orderBy(desc(Products.updatedAt));

  if (limit) {
    query = query.limit(limit) as typeof query;
  }

  return query.all();
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
    // Text variants
    displayTitle: data.displayTitle,
    seoTitle: data.seoTitle,
    shortTitle: data.shortTitle,
    metaDescription: data.metaDescription,
    cardDescription: data.cardDescription,
    fullDescription: data.fullDescription,
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

// ==================== DEAL AGENT FUNCTIONS ====================

export interface DealAgentKeywordInput {
  keyword: string;
  category?: string;
  marketplace?: string;
  isActive?: boolean;
}

// Get all keywords
export async function getDealAgentKeywords(activeOnly = false) {
  if (activeOnly) {
    return db.select()
      .from(DealAgentKeywords)
      .where(eq(DealAgentKeywords.isActive, true))
      .orderBy(desc(DealAgentKeywords.createdAt))
      .all();
  }
  return db.select()
    .from(DealAgentKeywords)
    .orderBy(desc(DealAgentKeywords.createdAt))
    .all();
}

// Add a keyword
export async function addDealAgentKeyword(data: DealAgentKeywordInput) {
  await db.insert(DealAgentKeywords).values({
    keyword: data.keyword,
    category: data.category,
    marketplace: data.marketplace || 'com',
    isActive: data.isActive !== false,
    createdAt: new Date(),
  });

  return db.select()
    .from(DealAgentKeywords)
    .where(eq(DealAgentKeywords.keyword, data.keyword))
    .get();
}

// Toggle keyword active status
export async function toggleDealAgentKeyword(id: number) {
  const keyword = await db.select()
    .from(DealAgentKeywords)
    .where(eq(DealAgentKeywords.id, id))
    .get();
  
  if (keyword) {
    await db.update(DealAgentKeywords)
      .set({ isActive: !keyword.isActive })
      .where(eq(DealAgentKeywords.id, id));
  }
  
  return db.select()
    .from(DealAgentKeywords)
    .where(eq(DealAgentKeywords.id, id))
    .get();
}

// Delete a keyword
export async function deleteDealAgentKeyword(id: number) {
  await db.delete(DealAgentKeywords).where(eq(DealAgentKeywords.id, id));
}

// Update keyword last searched
export async function updateKeywordSearched(id: number, resultsCount: number) {
  await db.update(DealAgentKeywords)
    .set({
      lastSearchedAt: new Date(),
      resultsCount,
    })
    .where(eq(DealAgentKeywords.id, id));
}

// Get agent config value
export async function getDealAgentConfig(key: string) {
  const config = await db.select()
    .from(DealAgentConfig)
    .where(eq(DealAgentConfig.key, key))
    .get();
  return config?.value;
}

// Set agent config value
export async function setDealAgentConfig(key: string, value: unknown, adminId?: string) {
  const existing = await db.select()
    .from(DealAgentConfig)
    .where(eq(DealAgentConfig.key, key))
    .get();

  if (existing) {
    await db.update(DealAgentConfig)
      .set({
        value: value as any,
        updatedAt: new Date(),
        updatedBy: adminId,
      })
      .where(eq(DealAgentConfig.key, key));
  } else {
    await db.insert(DealAgentConfig).values({
      key,
      value: value as any,
      updatedAt: new Date(),
      updatedBy: adminId,
    });
  }
}

// Get all agent config
export async function getAllDealAgentConfig() {
  const configs = await db.select().from(DealAgentConfig).all();
  const result: Record<string, unknown> = {};
  for (const config of configs) {
    result[config.key] = config.value;
  }
  return result;
}

// ==================== USER PREFERENCES FUNCTIONS ====================

export type BudgetRange = 'low' | 'mid' | 'high' | 'premium';
export type DealSensitivity = 'low' | 'medium' | 'high';

export interface UserPreferencesInput {
  budgetRange?: BudgetRange;
  categories?: string[];
  brands?: string[];
  dealSensitivity?: DealSensitivity;
  primeOnly?: boolean;
  likedAsins?: string[];
  dislikedAsins?: string[];
  quizCompleted?: boolean;
}

// Get user preferences
export async function getUserPreferences(userId: string) {
  return db.select()
    .from(UserPreferences)
    .where(eq(UserPreferences.userId, userId))
    .get();
}

// Create or update user preferences
export async function saveUserPreferences(userId: string, data: UserPreferencesInput) {
  const existing = await getUserPreferences(userId);
  const now = new Date();

  if (existing) {
    await db.update(UserPreferences)
      .set({
        ...data,
        lastUpdated: now,
      })
      .where(eq(UserPreferences.userId, userId));
  } else {
    await db.insert(UserPreferences).values({
      userId,
      ...data,
      lastUpdated: now,
      createdAt: now,
    });
  }

  return getUserPreferences(userId);
}

// Add liked ASIN from swipe
export async function addLikedAsin(userId: string, asin: string) {
  const prefs = await getUserPreferences(userId);
  const likedAsins = (prefs?.likedAsins as string[]) || [];
  
  if (!likedAsins.includes(asin)) {
    likedAsins.push(asin);
    await saveUserPreferences(userId, { likedAsins });
  }
}

// Add disliked ASIN from swipe
export async function addDislikedAsin(userId: string, asin: string) {
  const prefs = await getUserPreferences(userId);
  const dislikedAsins = (prefs?.dislikedAsins as string[]) || [];
  
  if (!dislikedAsins.includes(asin)) {
    dislikedAsins.push(asin);
    await saveUserPreferences(userId, { dislikedAsins });
  }
}

// Reset user preferences
export async function resetUserPreferences(userId: string) {
  const existing = await getUserPreferences(userId);
  if (existing) {
    await db.update(UserPreferences)
      .set({
        budgetRange: null,
        categories: [],
        brands: [],
        dealSensitivity: 'medium',
        primeOnly: false,
        likedAsins: [],
        dislikedAsins: [],
        quizCompleted: false,
        lastUpdated: new Date(),
      })
      .where(eq(UserPreferences.userId, userId));
  }
  return getUserPreferences(userId);
}

// Get all ASINs to exclude from feed (liked + disliked + recently viewed)
// Returns up to 200 most recent to avoid overwhelming the exclusion list
export async function getExcludedAsins(userId: string): Promise<Set<string>> {
  const excluded = new Set<string>();

  // Get liked and disliked from preferences
  const prefs = await getUserPreferences(userId);
  if (prefs) {
    const liked = (prefs.likedAsins as string[]) || [];
    const disliked = (prefs.dislikedAsins as string[]) || [];
    liked.forEach(asin => excluded.add(asin));
    disliked.forEach(asin => excluded.add(asin));
  }

  // Get explicit likes from ProductLikes table
  const likes = await db.select({ asin: ProductLikes.asin })
    .from(ProductLikes)
    .where(eq(ProductLikes.userId, userId))
    .all();
  likes.forEach(l => excluded.add(l.asin));

  // Get recently viewed products (last 200)
  const views = await db.select({ asin: ProductViews.asin })
    .from(ProductViews)
    .where(eq(ProductViews.userId, userId))
    .orderBy(desc(ProductViews.viewedAt))
    .limit(200)
    .all();
  views.forEach(v => excluded.add(v.asin));

  return excluded;
}

// ==================== PRODUCT VIEWS FUNCTIONS ====================

const MAX_VIEWS_PER_USER = 200;

export type InteractionType = 'view' | 'click' | 'swipe_left' | 'swipe_right' | 'like' | 'share';

/**
 * Record that a user viewed a product
 * Automatically manages the 200 product limit per user
 */
export async function recordProductView(
  userId: string,
  asin: string,
  options?: {
    category?: string;
    timeSpentMs?: number;
    interactionType?: InteractionType;
  }
): Promise<void> {
  // Ensure user exists in database (lazy creation)
  const userExists = await ensureUserExists(userId);
  if (!userExists) {
    console.warn(`[DB] Skipping view recording - could not ensure user exists: ${userId}`);
    return;
  }

  // Check if this product was already viewed recently (dedup)
  const existing = await db.select({ id: ProductViews.id })
    .from(ProductViews)
    .where(and(
      eq(ProductViews.userId, userId),
      eq(ProductViews.asin, asin)
    ))
    .get();

  if (existing) {
    // Update existing view with new timestamp and metrics
    await db.update(ProductViews)
      .set({
        viewedAt: new Date(),
        timeSpentMs: options?.timeSpentMs,
        interactionType: options?.interactionType,
      })
      .where(eq(ProductViews.id, existing.id));
    return;
  }

  // Insert new view
  await db.insert(ProductViews).values({
    userId,
    asin,
    category: options?.category,
    viewedAt: new Date(),
    timeSpentMs: options?.timeSpentMs,
    interactionType: options?.interactionType,
  });

  // Cleanup: remove oldest views if user exceeds limit
  const viewCount = await db.select({ id: ProductViews.id })
    .from(ProductViews)
    .where(eq(ProductViews.userId, userId))
    .all();

  if (viewCount.length > MAX_VIEWS_PER_USER) {
    // Get oldest views to delete
    const toDelete = await db.select({ id: ProductViews.id })
      .from(ProductViews)
      .where(eq(ProductViews.userId, userId))
      .orderBy(asc(ProductViews.viewedAt))
      .limit(viewCount.length - MAX_VIEWS_PER_USER)
      .all();

    for (const v of toDelete) {
      await db.delete(ProductViews).where(eq(ProductViews.id, v.id));
    }
  }
}

/**
 * Record multiple product views at once (batch)
 */
export async function recordProductViewsBatch(
  userId: string,
  asins: string[],
  category?: string
): Promise<void> {
  for (const asin of asins) {
    await recordProductView(userId, asin, { category, interactionType: 'view' });
  }
}

/**
 * Get user's recently viewed ASINs
 */
export async function getRecentlyViewedAsins(
  userId: string,
  limit: number = 50
): Promise<string[]> {
  const views = await db.select({ asin: ProductViews.asin })
    .from(ProductViews)
    .where(eq(ProductViews.userId, userId))
    .orderBy(desc(ProductViews.viewedAt))
    .limit(limit)
    .all();

  return views.map(v => v.asin);
}

/**
 * Get engagement stats for analytics
 */
export async function getViewEngagementStats(userId: string): Promise<{
  totalViews: number;
  clicks: number;
  avgTimeSpentMs: number;
  topCategories: string[];
}> {
  const views = await db.select()
    .from(ProductViews)
    .where(eq(ProductViews.userId, userId))
    .all();

  const clicks = views.filter(v => v.interactionType === 'click').length;
  const timesSpent = views.filter(v => v.timeSpentMs).map(v => v.timeSpentMs!);
  const avgTime = timesSpent.length > 0
    ? timesSpent.reduce((a, b) => a + b, 0) / timesSpent.length
    : 0;

  // Count categories
  const categoryCount: Record<string, number> = {};
  views.forEach(v => {
    if (v.category) {
      categoryCount[v.category] = (categoryCount[v.category] || 0) + 1;
    }
  });
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  return {
    totalViews: views.length,
    clicks,
    avgTimeSpentMs: Math.round(avgTime),
    topCategories,
  };
}

// ==================== PRICE HISTORY FUNCTIONS ====================

export interface PriceHistoryInput {
  asin: string;
  marketplace?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  source?: string;
}

// Record a price point
export async function recordPrice(data: PriceHistoryInput) {
  await db.insert(PriceHistory).values({
    asin: data.asin,
    marketplace: data.marketplace || 'com',
    price: data.price,
    originalPrice: data.originalPrice,
    currency: data.currency || 'USD',
    source: data.source || 'rainforest',
    recordedAt: new Date(),
  });
}

// Get price history for a product
export async function getPriceHistory(asin: string, marketplace: string = 'com', days: number = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return db.select()
    .from(PriceHistory)
    .where(and(
      eq(PriceHistory.asin, asin),
      eq(PriceHistory.marketplace, marketplace),
      gte(PriceHistory.recordedAt, startDate)
    ))
    .orderBy(asc(PriceHistory.recordedAt))
    .all();
}

// Get price statistics for a product
export async function getPriceStats(asin: string, marketplace: string = 'com') {
  const history30 = await getPriceHistory(asin, marketplace, 30);
  const history90 = await getPriceHistory(asin, marketplace, 90);

  if (history90.length === 0) {
    return null;
  }

  const prices30 = history30.map(h => h.price);
  const prices90 = history90.map(h => h.price);

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;
  const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;

  return {
    avg30Day: Math.round(avg(prices30) * 100) / 100,
    avg90Day: Math.round(avg(prices90) * 100) / 100,
    min30Day: min(prices30),
    min90Day: min(prices90),
    max30Day: max(prices30),
    max90Day: max(prices90),
    lowestEver: min(prices90),
    highestEver: max(prices90),
    dataPoints30: history30.length,
    dataPoints90: history90.length,
    lastRecorded: history90[history90.length - 1]?.recordedAt || null,
  };
}

// Cleanup old price history (keep last 90 days)
export async function cleanupPriceHistory(daysToKeep: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  await db.delete(PriceHistory)
    .where(lte(PriceHistory.recordedAt, cutoffDate));
}

/**
 * Price stats returned by checkLowestPrices
 */
export interface PriceStats {
  isLowest: boolean;
  lowestPrice: number;
  percentBelowAvg: number;
  priceHistory?: number[];  // Last 30 days prices for sparkline
  priceDrop7Days?: number;  // % price drop in last 7 days
}

/**
 * Check if current prices are the lowest in 30 days (batch operation)
 * Returns a map of ASIN to { isLowest, lowestPrice, percentBelowAvg, priceHistory, priceDrop7Days }
 */
export async function checkLowestPrices(
  products: Array<{ asin: string; currentPrice: number }>,
  marketplace: string = 'com'
): Promise<Map<string, PriceStats>> {
  const results = new Map<string, PriceStats>();

  // Get all price history for these ASINs in last 30 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const startDate7Days = new Date();
  startDate7Days.setDate(startDate7Days.getDate() - 7);

  const allHistory = await db.select()
    .from(PriceHistory)
    .where(and(
      eq(PriceHistory.marketplace, marketplace),
      gte(PriceHistory.recordedAt, startDate)
    ))
    .orderBy(asc(PriceHistory.recordedAt))
    .all();

  // Group by ASIN with timestamps
  const historyByAsin = new Map<string, Array<{ price: number; date: Date }>>();
  allHistory.forEach(h => {
    const entries = historyByAsin.get(h.asin) || [];
    entries.push({ price: h.price, date: h.recordedAt });
    historyByAsin.set(h.asin, entries);
  });

  // Check each product
  for (const product of products) {
    const history = historyByAsin.get(product.asin);

    if (!history || history.length === 0) {
      // No history - can't determine if lowest
      results.set(product.asin, {
        isLowest: false,
        lowestPrice: product.currentPrice,
        percentBelowAvg: 0,
        priceHistory: undefined,
        priceDrop7Days: undefined
      });
      continue;
    }

    const prices = history.map(h => h.price);
    const lowestHistorical = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const isLowest = product.currentPrice <= lowestHistorical;
    const percentBelowAvg = avgPrice > 0 ? Math.round(((avgPrice - product.currentPrice) / avgPrice) * 100) : 0;

    // Calculate 7-day price drop
    let priceDrop7Days: number | undefined = undefined;
    const history7DaysAgo = history.filter(h => h.date <= startDate7Days);
    if (history7DaysAgo.length > 0) {
      // Get the oldest price from ~7 days ago
      const oldestPrice7Days = history7DaysAgo[history7DaysAgo.length - 1].price;
      if (oldestPrice7Days > product.currentPrice) {
        priceDrop7Days = Math.round(((oldestPrice7Days - product.currentPrice) / oldestPrice7Days) * 100);
      }
    }

    // Prepare sparkline data (sample up to 15 points for smoother display)
    let priceHistory: number[] | undefined = undefined;
    if (prices.length >= 3) {
      if (prices.length <= 15) {
        priceHistory = prices;
      } else {
        // Sample evenly from the array
        const step = Math.floor(prices.length / 15);
        priceHistory = [];
        for (let i = 0; i < prices.length; i += step) {
          priceHistory.push(prices[i]);
          if (priceHistory.length >= 15) break;
        }
        // Always include the last (current) price
        if (priceHistory[priceHistory.length - 1] !== prices[prices.length - 1]) {
          priceHistory.push(prices[prices.length - 1]);
        }
      }
    }

    results.set(product.asin, {
      isLowest,
      lowestPrice: Math.min(lowestHistorical, product.currentPrice),
      percentBelowAvg: Math.max(0, percentBelowAvg), // Only positive values
      priceHistory,
      priceDrop7Days: priceDrop7Days && priceDrop7Days > 0 ? priceDrop7Days : undefined,
    });
  }

  return results;
}

// ==================== CURATED DEALS FUNCTIONS ====================

export type CurationType = 'admin' | 'ai' | 'trending';

export interface CuratedDealInput {
  asin: string;
  marketplace?: string;
  curationType: CurationType;
  priority?: number;
  reason?: string;
  validUntil?: Date;
  isActive?: boolean;
  createdBy?: string;
  aiScore?: number;
  // Cached product data
  title?: string;
  brand?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  imageUrl?: string;
  affiliateUrl?: string;
  rating?: number;
  totalReviews?: number;
}

// Get all active curated deals
export async function getActiveCuratedDeals(marketplace: string = 'com', limit: number = 20) {
  const now = new Date();
  
  return db.select()
    .from(CuratedDeals)
    .where(and(
      eq(CuratedDeals.marketplace, marketplace),
      eq(CuratedDeals.isActive, true)
    ))
    .orderBy(desc(CuratedDeals.priority), desc(CuratedDeals.createdAt))
    .limit(limit)
    .all();
}

// Get curated deal by ASIN
export async function getCuratedDealByAsin(asin: string, marketplace: string = 'com') {
  return db.select()
    .from(CuratedDeals)
    .where(and(
      eq(CuratedDeals.asin, asin),
      eq(CuratedDeals.marketplace, marketplace)
    ))
    .get();
}

// Create or update curated deal
export async function saveCuratedDeal(data: CuratedDealInput) {
  const existing = await getCuratedDealByAsin(data.asin, data.marketplace || 'com');
  const now = new Date();

  if (existing) {
    await db.update(CuratedDeals)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(CuratedDeals.id, existing.id));
    return getCuratedDealByAsin(data.asin, data.marketplace || 'com');
  } else {
    await db.insert(CuratedDeals).values({
      ...data,
      marketplace: data.marketplace || 'com',
      isActive: data.isActive !== false,
      createdAt: now,
      updatedAt: now,
    });
    return getCuratedDealByAsin(data.asin, data.marketplace || 'com');
  }
}

// Toggle curated deal active status
export async function toggleCuratedDeal(id: number) {
  const deal = await db.select()
    .from(CuratedDeals)
    .where(eq(CuratedDeals.id, id))
    .get();

  if (deal) {
    await db.update(CuratedDeals)
      .set({ 
        isActive: !deal.isActive,
        updatedAt: new Date(),
      })
      .where(eq(CuratedDeals.id, id));
  }

  return db.select()
    .from(CuratedDeals)
    .where(eq(CuratedDeals.id, id))
    .get();
}

// Delete curated deal
export async function deleteCuratedDeal(id: number) {
  await db.delete(CuratedDeals).where(eq(CuratedDeals.id, id));
}

// Get all curated deals (for admin)
export async function getAllCuratedDeals(options?: {
  marketplace?: string;
  curationType?: CurationType;
  activeOnly?: boolean;
  limit?: number;
}) {
  let query = db.select().from(CuratedDeals);

  const conditions = [];

  if (options?.marketplace) {
    conditions.push(eq(CuratedDeals.marketplace, options.marketplace));
  }
  if (options?.curationType) {
    conditions.push(eq(CuratedDeals.curationType, options.curationType));
  }
  if (options?.activeOnly) {
    conditions.push(eq(CuratedDeals.isActive, true));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  query = query.orderBy(desc(CuratedDeals.priority), desc(CuratedDeals.createdAt)) as typeof query;

  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  return query.all();
}

// Expire old curated deals
export async function expireCuratedDeals() {
  const now = new Date();

  await db.update(CuratedDeals)
    .set({ isActive: false, updatedAt: now })
    .where(and(
      eq(CuratedDeals.isActive, true),
      lte(CuratedDeals.validUntil, now)
    ));
}

// Check if ASIN is curated
export async function isCuratedDeal(asin: string, marketplace: string = 'com'): Promise<boolean> {
  const deal = await getCuratedDealByAsin(asin, marketplace);
  return deal !== undefined && deal.isActive === true;
}

// ==================== REVIEW FUNCTIONS ====================

export interface ReviewInput {
  userId: string;
  asin: string;
  productId?: string;
  rating: number; // 1-5
  title?: string;
  content: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  verifiedPurchaseCount: number;
}

// Get reviews for a product
export async function getProductReviews(
  asin: string,
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'recent' | 'helpful' | 'highest' | 'lowest';
    filterStars?: number;
    verifiedOnly?: boolean;
    approvedOnly?: boolean;
  }
) {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  // Build conditions
  const conditions = [
    eq(ProductReviews.asin, asin),
    eq(ProductReviews.isVisible, true),
  ];

  if (options?.approvedOnly !== false) {
    conditions.push(eq(ProductReviews.isApproved, true));
  }

  if (options?.filterStars) {
    conditions.push(eq(ProductReviews.rating, options.filterStars));
  }

  if (options?.verifiedOnly) {
    conditions.push(eq(ProductReviews.isVerifiedPurchase, true));
  }

  let query = db.select().from(ProductReviews).where(and(...conditions));

  // Apply sorting
  switch (options?.sortBy) {
    case 'helpful':
      query = query.orderBy(desc(ProductReviews.helpfulCount), desc(ProductReviews.createdAt)) as typeof query;
      break;
    case 'highest':
      query = query.orderBy(desc(ProductReviews.rating), desc(ProductReviews.createdAt)) as typeof query;
      break;
    case 'lowest':
      query = query.orderBy(asc(ProductReviews.rating), desc(ProductReviews.createdAt)) as typeof query;
      break;
    case 'recent':
    default:
      query = query.orderBy(desc(ProductReviews.createdAt)) as typeof query;
      break;
  }

  query = query.limit(limit).offset(offset) as typeof query;

  return query.all();
}

// Get review stats for a product
export async function getReviewStats(asin: string): Promise<ReviewStats> {
  const reviews = await db.select()
    .from(ProductReviews)
    .where(and(
      eq(ProductReviews.asin, asin),
      eq(ProductReviews.isVisible, true),
      eq(ProductReviews.isApproved, true)
    ))
    .all();

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;
  let verifiedCount = 0;

  for (const review of reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(review.rating)));
    distribution[rating as keyof typeof distribution]++;
    totalRating += review.rating;
    if (review.isVerifiedPurchase) verifiedCount++;
  }

  return {
    averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
    totalReviews: reviews.length,
    distribution,
    verifiedPurchaseCount: verifiedCount,
  };
}

// Create a new review
export async function createReview(data: ReviewInput) {
  // Check if user already reviewed this product
  const existing = await getUserReview(data.userId, data.asin);
  if (existing) {
    throw new Error('User has already reviewed this product');
  }

  // Check for verified purchase
  let isVerifiedPurchase = false;
  let purchaseClaimId: number | undefined;

  const verifiedClaim = await db.select()
    .from(PurchaseClaims)
    .where(and(
      eq(PurchaseClaims.userId, data.userId),
      eq(PurchaseClaims.status, 'approved')
    ))
    .all();

  // Try to match by productId or a simple ASIN match in productSlug
  for (const claim of verifiedClaim) {
    if (data.productId && claim.productSlug === data.productId) {
      isVerifiedPurchase = true;
      purchaseClaimId = claim.id;
      break;
    }
  }

  const now = new Date();

  await db.insert(ProductReviews).values({
    userId: data.userId,
    asin: data.asin,
    productId: data.productId,
    rating: Math.min(5, Math.max(1, data.rating)),
    title: data.title?.slice(0, 100),
    content: data.content,
    isVerifiedPurchase,
    purchaseClaimId,
    isVisible: true,
    isApproved: false, // Requires moderation
    helpfulCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  return getUserReview(data.userId, data.asin);
}

// Update a review
export async function updateReview(
  reviewId: number,
  userId: string,
  data: { rating?: number; title?: string; content?: string }
) {
  const review = await db.select()
    .from(ProductReviews)
    .where(and(
      eq(ProductReviews.id, reviewId),
      eq(ProductReviews.userId, userId)
    ))
    .get();

  if (!review) {
    throw new Error('Review not found or not owned by user');
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
    isApproved: false, // Re-require moderation after edit
  };

  if (data.rating !== undefined) {
    updateData.rating = Math.min(5, Math.max(1, data.rating));
  }
  if (data.title !== undefined) {
    updateData.title = data.title.slice(0, 100);
  }
  if (data.content !== undefined) {
    updateData.content = data.content;
  }

  await db.update(ProductReviews)
    .set(updateData)
    .where(eq(ProductReviews.id, reviewId));

  return db.select().from(ProductReviews).where(eq(ProductReviews.id, reviewId)).get();
}

// Delete a review
export async function deleteReview(reviewId: number, userId: string) {
  const review = await db.select()
    .from(ProductReviews)
    .where(and(
      eq(ProductReviews.id, reviewId),
      eq(ProductReviews.userId, userId)
    ))
    .get();

  if (!review) {
    throw new Error('Review not found or not owned by user');
  }

  // Delete helpful votes first
  await db.delete(ReviewHelpfulVotes).where(eq(ReviewHelpfulVotes.reviewId, reviewId));

  // Delete the review
  await db.delete(ProductReviews).where(eq(ProductReviews.id, reviewId));

  return review;
}

// Check if user has reviewed a product
export async function hasUserReviewed(userId: string, asin: string): Promise<boolean> {
  const review = await getUserReview(userId, asin);
  return review !== undefined;
}

// Get user's review for a product
export async function getUserReview(userId: string, asin: string) {
  return db.select()
    .from(ProductReviews)
    .where(and(
      eq(ProductReviews.userId, userId),
      eq(ProductReviews.asin, asin)
    ))
    .get();
}

// Vote on review helpfulness
export async function voteReviewHelpful(reviewId: number, userId: string, isHelpful: boolean) {
  // Check if vote already exists
  const existing = await db.select()
    .from(ReviewHelpfulVotes)
    .where(and(
      eq(ReviewHelpfulVotes.reviewId, reviewId),
      eq(ReviewHelpfulVotes.userId, userId)
    ))
    .get();

  if (existing) {
    // Update existing vote
    await db.update(ReviewHelpfulVotes)
      .set({ isHelpful, createdAt: new Date() })
      .where(eq(ReviewHelpfulVotes.id, existing.id));
  } else {
    // Create new vote
    await db.insert(ReviewHelpfulVotes).values({
      reviewId,
      userId,
      isHelpful,
      createdAt: new Date(),
    });
  }

  // Update cached count
  await updateReviewHelpfulCount(reviewId);

  return getUserReviewVote(reviewId, userId);
}

// Get user's vote for a review
export async function getUserReviewVote(reviewId: number, userId: string) {
  return db.select()
    .from(ReviewHelpfulVotes)
    .where(and(
      eq(ReviewHelpfulVotes.reviewId, reviewId),
      eq(ReviewHelpfulVotes.userId, userId)
    ))
    .get();
}

// Update cached helpful count for a review
async function updateReviewHelpfulCount(reviewId: number) {
  const votes = await db.select()
    .from(ReviewHelpfulVotes)
    .where(and(
      eq(ReviewHelpfulVotes.reviewId, reviewId),
      eq(ReviewHelpfulVotes.isHelpful, true)
    ))
    .all();

  await db.update(ProductReviews)
    .set({ helpfulCount: votes.length })
    .where(eq(ProductReviews.id, reviewId));
}

// Get review by ID
export async function getReviewById(reviewId: number) {
  return db.select()
    .from(ProductReviews)
    .where(eq(ProductReviews.id, reviewId))
    .get();
}

// ==================== ADMIN REVIEW FUNCTIONS ====================

// Get pending reviews for moderation
export async function getPendingReviews(limit = 50) {
  return db.select()
    .from(ProductReviews)
    .where(and(
      eq(ProductReviews.isVisible, true),
      eq(ProductReviews.isApproved, false)
    ))
    .orderBy(asc(ProductReviews.createdAt))
    .limit(limit)
    .all();
}

// Get all reviews for admin (with filters)
export async function getAdminReviews(options?: {
  status?: 'pending' | 'approved' | 'rejected';
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (options?.status === 'pending') {
    conditions.push(eq(ProductReviews.isApproved, false));
    conditions.push(eq(ProductReviews.isVisible, true));
  } else if (options?.status === 'approved') {
    conditions.push(eq(ProductReviews.isApproved, true));
  } else if (options?.status === 'rejected') {
    conditions.push(eq(ProductReviews.isVisible, false));
  }

  let query = db.select().from(ProductReviews);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  query = query.orderBy(desc(ProductReviews.createdAt)) as typeof query;

  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options?.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  return query.all();
}

// Moderate a review (approve/reject)
export async function moderateReview(
  reviewId: number,
  adminUserId: string,
  action: 'approve' | 'reject',
  note?: string
) {
  const review = await getReviewById(reviewId);
  if (!review) {
    throw new Error('Review not found');
  }

  const now = new Date();

  await db.update(ProductReviews)
    .set({
      isApproved: action === 'approve',
      isVisible: action === 'approve', // Hide rejected reviews
      moderatedBy: adminUserId,
      moderatedAt: now,
      moderationNote: note,
      updatedAt: now,
    })
    .where(eq(ProductReviews.id, reviewId));

  return getReviewById(reviewId);
}

// Admin delete review
export async function adminDeleteReview(reviewId: number) {
  const review = await getReviewById(reviewId);
  if (!review) {
    throw new Error('Review not found');
  }

  // Delete helpful votes first
  await db.delete(ReviewHelpfulVotes).where(eq(ReviewHelpfulVotes.reviewId, reviewId));

  // Delete the review
  await db.delete(ProductReviews).where(eq(ProductReviews.id, reviewId));

  return review;
}

// ==========================================
// AMAZON REVIEWS (Imported from RapidAPI)
// ==========================================

export interface AmazonReviewInput {
  asin: string;
  productId?: string;
  externalId: string;
  title?: string;
  content: string;
  rating: number;
  reviewerName?: string;
  reviewerUrl?: string;
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
  reviewDate?: string;
  images?: string[];
  source?: string;
  marketplace?: string;
}

/**
 * Save Amazon reviews to database (upsert - skip existing)
 */
export async function saveAmazonReviews(reviews: AmazonReviewInput[]): Promise<number> {
  let savedCount = 0;

  for (const review of reviews) {
    try {
      // Check if review already exists
      const existing = await db.select()
        .from(AmazonReviews)
        .where(eq(AmazonReviews.externalId, review.externalId))
        .get();

      if (!existing) {
        await db.insert(AmazonReviews).values({
          asin: review.asin,
          productId: review.productId,
          externalId: review.externalId,
          title: review.title,
          content: review.content,
          rating: review.rating,
          reviewerName: review.reviewerName,
          reviewerUrl: review.reviewerUrl,
          isVerifiedPurchase: review.isVerifiedPurchase ?? false,
          helpfulCount: review.helpfulCount ?? 0,
          reviewDate: review.reviewDate,
          images: review.images,
          source: review.source ?? 'rapidapi',
          marketplace: review.marketplace ?? 'com',
          fetchedAt: new Date(),
        });
        savedCount++;
      }
    } catch (error) {
      // Skip duplicate entries silently
      console.error('Error saving Amazon review:', error);
    }
  }

  return savedCount;
}

/**
 * Get Amazon reviews for a product
 */
export async function getAmazonReviews(
  asin: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: 'recent' | 'helpful' | 'highest' | 'lowest';
    minRating?: number;
    verifiedOnly?: boolean;
  } = {}
): Promise<{
  reviews: any[];
  total: number;
  stats: {
    averageRating: number;
    totalReviews: number;
    ratingBreakdown: Record<number, number>;
    verifiedCount: number;
  };
}> {
  const { limit = 10, offset = 0, sortBy = 'helpful', minRating, verifiedOnly } = options;

  // Build conditions
  const conditions = [eq(AmazonReviews.asin, asin)];

  if (minRating) {
    conditions.push(gte(AmazonReviews.rating, minRating));
  }

  if (verifiedOnly) {
    conditions.push(eq(AmazonReviews.isVerifiedPurchase, true));
  }

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(AmazonReviews)
    .where(and(...conditions))
    .get();

  const total = countResult?.count ?? 0;

  // Determine sort order
  let orderBy;
  switch (sortBy) {
    case 'recent':
      orderBy = desc(AmazonReviews.fetchedAt);
      break;
    case 'helpful':
      orderBy = desc(AmazonReviews.helpfulCount);
      break;
    case 'highest':
      orderBy = desc(AmazonReviews.rating);
      break;
    case 'lowest':
      orderBy = asc(AmazonReviews.rating);
      break;
    default:
      orderBy = desc(AmazonReviews.helpfulCount);
  }

  // Get reviews
  const reviews = await db.select()
    .from(AmazonReviews)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)
    .all();

  // Calculate stats
  const allReviews = await db.select()
    .from(AmazonReviews)
    .where(eq(AmazonReviews.asin, asin))
    .all();

  const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;
  let verifiedCount = 0;

  for (const review of allReviews) {
    const rating = Math.round(review.rating);
    if (rating >= 1 && rating <= 5) {
      ratingBreakdown[rating]++;
    }
    totalRating += review.rating;
    if (review.isVerifiedPurchase) {
      verifiedCount++;
    }
  }

  const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

  return {
    reviews,
    total,
    stats: {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: allReviews.length,
      ratingBreakdown,
      verifiedCount,
    },
  };
}

/**
 * Check if we have cached Amazon reviews for a product
 */
export async function hasAmazonReviews(asin: string): Promise<boolean> {
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(AmazonReviews)
    .where(eq(AmazonReviews.asin, asin))
    .get();

  return (result?.count ?? 0) > 0;
}

/**
 * Get top reviews for multiple ASINs (batch operation for feed)
 * Returns a map of ASIN -> top reviews (sorted by helpful count)
 */
export async function getTopReviewsForAsins(
  asins: string[],
  limit: number = 2
): Promise<Map<string, {
  reviews: Array<{
    title: string | null;
    content: string;
    rating: number;
    reviewerName: string | null;
    isVerifiedPurchase: boolean;
    helpfulCount: number;
  }>;
  totalCount: number;
  averageRating: number;
}>> {
  if (asins.length === 0) return new Map();

  // Get all reviews for the given ASINs in one query
  const allReviews = await db.select()
    .from(AmazonReviews)
    .where(inArray(AmazonReviews.asin, asins))
    .orderBy(desc(AmazonReviews.helpfulCount))
    .all();

  // Group reviews by ASIN
  const reviewsByAsin = new Map<string, typeof allReviews>();
  for (const review of allReviews) {
    const existing = reviewsByAsin.get(review.asin) || [];
    existing.push(review);
    reviewsByAsin.set(review.asin, existing);
  }

  // Build result map with top N reviews and stats
  const result = new Map<string, {
    reviews: Array<{
      title: string | null;
      content: string;
      rating: number;
      reviewerName: string | null;
      isVerifiedPurchase: boolean;
      helpfulCount: number;
    }>;
    totalCount: number;
    averageRating: number;
  }>();

  for (const [asin, reviews] of reviewsByAsin) {
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : 0;

    result.set(asin, {
      reviews: reviews.slice(0, limit).map(r => ({
        title: r.title,
        content: r.content,
        rating: r.rating,
        reviewerName: r.reviewerName,
        isVerifiedPurchase: r.isVerifiedPurchase,
        helpfulCount: r.helpfulCount,
      })),
      totalCount: reviews.length,
      averageRating: avgRating,
    });
  }

  return result;
}

/**
 * Get the last fetch time for Amazon reviews
 */
export async function getAmazonReviewsFetchTime(asin: string): Promise<Date | null> {
  const result = await db.select({ fetchedAt: AmazonReviews.fetchedAt })
    .from(AmazonReviews)
    .where(eq(AmazonReviews.asin, asin))
    .orderBy(desc(AmazonReviews.fetchedAt))
    .limit(1)
    .get();

  return result?.fetchedAt ?? null;
}

/**
 * Delete old Amazon reviews (for cache refresh)
 */
export async function deleteAmazonReviews(asin: string): Promise<number> {
  const result = await db.delete(AmazonReviews)
    .where(eq(AmazonReviews.asin, asin));

  return result.rowsAffected ?? 0;
}
