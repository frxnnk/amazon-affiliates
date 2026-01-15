/**
 * Recommendation Engine - Enhanced Implementation
 *
 * Improves feed personalization with:
 * 1. Recency weighting for likes/preferences
 * 2. Affinity scoring (category, brand, budget match)
 * 3. Engagement signals (time spent, interactions)
 * 4. Exploration bonus (20% wildcards to avoid filter bubble)
 * 5. Content-based similarity (products similar to liked items)
 */

import { db, ProductLikes, ProductViews, UserPreferences, Products, eq, desc, and, gte } from 'astro:db';
import {
  extractFeatures,
  calculateContentBasedScore,
  getUserSimilarityProfile,
  type ProductFeatures,
} from './content-similarity';
import {
  getCollaborativeBoosts,
  calculateCollaborativeScore,
} from './collaborative-filtering';

// Types
export interface UserProfile {
  userId: string;
  categories: string[];
  brands: string[];
  budgetRange: 'low' | 'mid' | 'high' | 'premium' | null;
  dealSensitivity: 'low' | 'medium' | 'high';
  // Weighted preferences from recent activity
  categoryWeights: Record<string, number>;
  brandWeights: Record<string, number>;
  priceRangePreference: { min: number; max: number } | null;
}

export interface ProductCandidate {
  asin: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  totalReviews?: number;
  discountPercent?: number;
  isCurated?: boolean;
  hasVideo?: boolean;
}

export interface ScoredProduct extends ProductCandidate {
  affinityScore: number;
  dealScore: number;
  freshnessScore: number;
  explorationBonus: number;
  similarityScore: number; // Content-based similarity to liked products
  collaborativeScore: number; // Collaborative filtering score
  collaborativeReason?: string; // Why this was recommended
  totalScore: number;
  scoreBreakdown: {
    affinity: number;
    deal: number;
    freshness: number;
    exploration: number;
    similarity: number;
    collaborative: number;
  };
}

// Constants
const RECENCY_DECAY_DAYS = 14; // Half-life for recency weighting
const EXPLORATION_RATIO = 0.20; // 20% of feed should be exploration
const MAX_LIKES_FOR_PROFILE = 50; // Max likes to consider for profile building
const MAX_VIEWS_FOR_PROFILE = 100; // Max views to consider

// Budget ranges in local currency
const BUDGET_RANGES = {
  low: { min: 0, max: 50 },
  mid: { min: 50, max: 150 },
  high: { min: 150, max: 400 },
  premium: { min: 400, max: Infinity },
};

/**
 * Calculate recency weight using exponential decay
 * More recent = higher weight (1.0 for today, ~0.5 for 14 days ago)
 */
export function calculateRecencyWeight(date: Date): number {
  const now = new Date();
  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysDiff / RECENCY_DECAY_DAYS);
}

/**
 * Build user profile from preferences, likes, and views
 * Uses recency weighting to prioritize recent activity
 */
export async function buildUserProfile(userId: string): Promise<UserProfile | null> {
  // Get stored preferences
  const prefs = await db.select()
    .from(UserPreferences)
    .where(eq(UserPreferences.userId, userId))
    .get();

  // Get recent likes with timestamps
  const likes = await db.select({
    asin: ProductLikes.asin,
    productId: ProductLikes.productId,
    createdAt: ProductLikes.createdAt,
  })
    .from(ProductLikes)
    .where(eq(ProductLikes.userId, userId))
    .orderBy(desc(ProductLikes.createdAt))
    .limit(MAX_LIKES_FOR_PROFILE)
    .all();

  // Get recent views with engagement data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const views = await db.select({
    asin: ProductViews.asin,
    category: ProductViews.category,
    timeSpentMs: ProductViews.timeSpentMs,
    interactionType: ProductViews.interactionType,
    viewedAt: ProductViews.viewedAt,
  })
    .from(ProductViews)
    .where(and(
      eq(ProductViews.userId, userId),
      gte(ProductViews.viewedAt, thirtyDaysAgo)
    ))
    .orderBy(desc(ProductViews.viewedAt))
    .limit(MAX_VIEWS_FOR_PROFILE)
    .all();

  // No activity = no profile
  if (!prefs && likes.length === 0 && views.length === 0) {
    return null;
  }

  // Build weighted category preferences
  const categoryWeights: Record<string, number> = {};
  const brandWeights: Record<string, number> = {};

  // Process likes with recency weighting
  for (const like of likes) {
    const weight = calculateRecencyWeight(like.createdAt);

    // Get product details if available
    if (like.productId) {
      const product = await db.select({
        category: Products.category,
        brand: Products.brand,
      })
        .from(Products)
        .where(eq(Products.productId, like.productId))
        .get();

      if (product) {
        if (product.category) {
          const cat = product.category.toLowerCase();
          categoryWeights[cat] = (categoryWeights[cat] || 0) + weight * 2; // Likes worth 2x
        }
        if (product.brand) {
          const brand = product.brand.toLowerCase();
          brandWeights[brand] = (brandWeights[brand] || 0) + weight * 2;
        }
      }
    }
  }

  // Process views with engagement weighting
  for (const view of views) {
    let weight = calculateRecencyWeight(view.viewedAt);

    // Boost weight based on engagement
    if (view.timeSpentMs && view.timeSpentMs > 5000) {
      weight *= 1.5; // 5+ seconds = high interest
    }
    if (view.interactionType === 'click') {
      weight *= 2.0; // Clicks are strong signals
    }

    if (view.category) {
      const cat = view.category.toLowerCase();
      categoryWeights[cat] = (categoryWeights[cat] || 0) + weight;
    }
  }

  // Add stored preferences (with moderate weight)
  const storedCategories = (prefs?.categories as string[]) || [];
  const storedBrands = (prefs?.brands as string[]) || [];

  for (const cat of storedCategories) {
    categoryWeights[cat.toLowerCase()] = (categoryWeights[cat.toLowerCase()] || 0) + 1.0;
  }
  for (const brand of storedBrands) {
    brandWeights[brand.toLowerCase()] = (brandWeights[brand.toLowerCase()] || 0) + 1.0;
  }

  // Calculate price range preference from views/likes
  let priceRangePreference: { min: number; max: number } | null = null;
  const budgetRange = prefs?.budgetRange as keyof typeof BUDGET_RANGES | null;
  if (budgetRange && BUDGET_RANGES[budgetRange]) {
    priceRangePreference = BUDGET_RANGES[budgetRange];
  }

  return {
    userId,
    categories: Object.keys(categoryWeights).sort((a, b) => categoryWeights[b] - categoryWeights[a]).slice(0, 5),
    brands: Object.keys(brandWeights).sort((a, b) => brandWeights[b] - brandWeights[a]).slice(0, 10),
    budgetRange: budgetRange || null,
    dealSensitivity: (prefs?.dealSensitivity as 'low' | 'medium' | 'high') || 'medium',
    categoryWeights,
    brandWeights,
    priceRangePreference,
  };
}

/**
 * Calculate affinity score between a product and user profile
 * Returns 0-100 score
 */
export function calculateAffinityScore(product: ProductCandidate, profile: UserProfile | null): number {
  if (!profile) return 50; // Neutral score for anonymous users

  let score = 0;
  let maxScore = 0;

  // Category match (0-40 points)
  maxScore += 40;
  const productCategory = product.category?.toLowerCase() || '';
  const categoryWeight = profile.categoryWeights[productCategory] || 0;
  const maxCategoryWeight = Math.max(...Object.values(profile.categoryWeights), 1);
  score += (categoryWeight / maxCategoryWeight) * 40;

  // Brand match (0-30 points)
  maxScore += 30;
  const productBrand = product.brand?.toLowerCase() || '';
  const brandWeight = profile.brandWeights[productBrand] || 0;
  const maxBrandWeight = Math.max(...Object.values(profile.brandWeights), 1);
  score += (brandWeight / maxBrandWeight) * 30;

  // Price range match (0-20 points)
  maxScore += 20;
  if (profile.priceRangePreference) {
    const { min, max } = profile.priceRangePreference;
    if (product.price >= min && product.price <= max) {
      score += 20;
    } else if (product.price < min * 2 || product.price > max * 0.5) {
      score += 10; // Partial match
    }
  } else {
    score += 10; // No preference = neutral
  }

  // Deal sensitivity match (0-10 points)
  maxScore += 10;
  const discount = product.discountPercent || 0;
  if (profile.dealSensitivity === 'high' && discount >= 20) {
    score += 10;
  } else if (profile.dealSensitivity === 'medium' && discount >= 10) {
    score += 10;
  } else if (profile.dealSensitivity === 'low') {
    // Low sensitivity = cares more about quality than deals
    if (product.rating && product.rating >= 4.5) {
      score += 10;
    }
  }

  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate deal quality score
 * Returns 0-100 score
 */
export function calculateDealScore(product: ProductCandidate): number {
  let score = 0;

  // Discount weight (0-35 points)
  const discount = product.discountPercent || 0;
  if (discount >= 40) score += 35;
  else if (discount >= 30) score += 28;
  else if (discount >= 20) score += 20;
  else if (discount >= 10) score += 10;

  // Rating weight (0-30 points)
  if (product.rating) {
    score += (product.rating / 5) * 30;
  }

  // Reviews weight (0-20 points) - social proof
  if (product.totalReviews) {
    if (product.totalReviews >= 1000) score += 20;
    else if (product.totalReviews >= 500) score += 15;
    else if (product.totalReviews >= 100) score += 10;
    else if (product.totalReviews >= 50) score += 5;
  }

  // Curated bonus (0-15 points)
  if (product.isCurated) {
    score += 15;
  }

  return Math.min(score, 100);
}

/**
 * Calculate freshness score based on how new/trending the product is
 * For now, gives bonus to curated and video products
 */
export function calculateFreshnessScore(product: ProductCandidate): number {
  let score = 50; // Base score

  if (product.isCurated) {
    score += 30; // Recently curated = fresh
  }

  if (product.hasVideo) {
    score += 20; // Has video = more engaging
  }

  return Math.min(score, 100);
}

/**
 * Determine if a product should get exploration bonus
 * Returns bonus points (0 or 15-25)
 */
export function calculateExplorationBonus(
  product: ProductCandidate,
  profile: UserProfile | null,
  position: number,
  totalProducts: number
): number {
  if (!profile) return 0;

  // Every 5th product has a chance to be an exploration item
  const isExplorationSlot = position % 5 === 4;
  if (!isExplorationSlot) return 0;

  const productCategory = product.category?.toLowerCase() || '';
  const productBrand = product.brand?.toLowerCase() || '';

  // Check if this is outside user's typical preferences
  const isNewCategory = !profile.categories.includes(productCategory);
  const isNewBrand = !profile.brands.includes(productBrand);

  if (isNewCategory && isNewBrand) {
    return 25; // Completely new territory
  } else if (isNewCategory || isNewBrand) {
    return 15; // Partially new
  }

  return 0;
}

/**
 * Score and rank products for a user
 */
export function scoreProducts(
  products: ProductCandidate[],
  profile: UserProfile | null,
  similarityProfile?: Awaited<ReturnType<typeof getUserSimilarityProfile>>,
  collaborativeBoosts?: Map<string, { boost: number; reason: string }>
): ScoredProduct[] {
  const scored = products.map((product, index) => {
    const affinityScore = calculateAffinityScore(product, profile);
    const dealScore = calculateDealScore(product);
    const freshnessScore = calculateFreshnessScore(product);
    const explorationBonus = calculateExplorationBonus(product, profile, index, products.length);

    // Content-based similarity score
    let similarityScore = 0;
    if (similarityProfile) {
      const features = extractFeatures({
        asin: product.asin,
        title: product.title,
        brand: product.brand,
        category: product.category,
        price: product.price,
        rating: product.rating,
        totalReviews: product.totalReviews,
      });
      similarityScore = calculateContentBasedScore(features, similarityProfile);
    }

    // Collaborative filtering score
    const collaborativeResult = collaborativeBoosts
      ? calculateCollaborativeScore(product.asin, collaborativeBoosts)
      : { score: 0 };
    const collaborativeScore = collaborativeResult.score;
    const collaborativeReason = collaborativeResult.reason;

    // Weighted total score (with all signals)
    // Affinity: 25%, Deal: 20%, Similarity: 15%, Collaborative: 20%, Freshness: 10%, Exploration: 10%
    const totalScore =
      affinityScore * 0.25 +
      dealScore * 0.20 +
      similarityScore * 0.15 +
      collaborativeScore * 0.20 +
      freshnessScore * 0.10 +
      explorationBonus * 0.10;

    return {
      ...product,
      affinityScore,
      dealScore,
      freshnessScore,
      explorationBonus,
      similarityScore,
      collaborativeScore,
      collaborativeReason,
      totalScore,
      scoreBreakdown: {
        affinity: affinityScore * 0.25,
        deal: dealScore * 0.20,
        similarity: similarityScore * 0.15,
        collaborative: collaborativeScore * 0.20,
        freshness: freshnessScore * 0.10,
        exploration: explorationBonus * 0.10,
      },
    };
  });

  // Sort by total score descending
  return scored.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Get keywords for API search based on user profile
 * Mixes preferred keywords with exploration keywords
 */
export function getPersonalizedKeywords(
  profile: UserProfile | null,
  page: number,
  lang: 'es' | 'en'
): { keyword: string; isExploration: boolean } {
  // Trending keywords for exploration
  const explorationKeywords = lang === 'es'
    ? ['ofertas flash', 'gadgets nuevos', 'tecnología 2024', 'accesorios trending', 'novedades amazon']
    : ['flash deals', 'new gadgets', 'tech 2024', 'trending accessories', 'amazon new arrivals'];

  // If no profile, use trending
  if (!profile || profile.categories.length === 0) {
    const keyword = explorationKeywords[page % explorationKeywords.length];
    return { keyword, isExploration: true };
  }

  // Every 5th page is exploration
  const isExplorationPage = page % 5 === 0;

  if (isExplorationPage) {
    const keyword = explorationKeywords[Math.floor(page / 5) % explorationKeywords.length];
    return { keyword, isExploration: true };
  }

  // Build personalized keyword from top preferences
  const topCategory = profile.categories[0];
  const topBrand = profile.brands[0];

  // Alternate between category and brand searches
  if (page % 2 === 0 && topCategory) {
    return { keyword: topCategory, isExploration: false };
  } else if (topBrand) {
    return { keyword: topBrand, isExploration: false };
  } else if (topCategory) {
    return { keyword: topCategory, isExploration: false };
  }

  // Fallback to exploration
  const keyword = explorationKeywords[page % explorationKeywords.length];
  return { keyword, isExploration: true };
}

/**
 * Track engagement signal for a product
 */
export interface EngagementSignal {
  type: 'view' | 'click' | 'save' | 'share' | 'expand' | 'affiliate_click';
  asin: string;
  category?: string;
  timeSpentMs?: number;
  scrollDepth?: number; // 0-100 percentage of expanded panel scrolled
}

/**
 * Convert engagement signal to interaction type for DB
 */
export function engagementToInteractionType(signal: EngagementSignal): string {
  switch (signal.type) {
    case 'click':
    case 'affiliate_click':
      return 'click';
    case 'save':
      return 'save';
    case 'share':
      return 'share';
    default:
      return 'view';
  }
}

/**
 * Calculate engagement weight for profile building
 */
export function getEngagementWeight(signal: EngagementSignal): number {
  const baseWeights = {
    view: 1.0,
    expand: 1.5,
    click: 2.0,
    save: 3.0,
    share: 2.5,
    affiliate_click: 5.0, // Strongest signal - intent to purchase
  };

  let weight = baseWeights[signal.type] || 1.0;

  // Time spent bonus
  if (signal.timeSpentMs) {
    if (signal.timeSpentMs > 10000) weight *= 1.5; // 10+ seconds
    else if (signal.timeSpentMs > 5000) weight *= 1.25; // 5+ seconds
  }

  return weight;
}
