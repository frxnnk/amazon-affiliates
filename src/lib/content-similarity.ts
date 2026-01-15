/**
 * Content-Based Similarity Engine
 *
 * Calculates product similarity based on features:
 * - Category match
 * - Brand match
 * - Price proximity
 * - Rating similarity
 * - Feature overlap (tags, specs)
 *
 * Used to recommend products similar to user's liked items
 */

import { db, Products, ProductLikes, eq, desc, and, gte, lte, or, like } from 'astro:db';

// Types
export interface ProductFeatures {
  asin: string;
  productId?: string;
  title: string;
  brand: string;
  category: string;
  subcategory?: string;
  price: number;
  rating?: number;
  totalReviews?: number;
  tags?: string[];
  // Normalized features for comparison
  priceRange: 'budget' | 'mid' | 'premium' | 'luxury';
  ratingTier: 'low' | 'medium' | 'high' | 'excellent';
  popularityTier: 'niche' | 'moderate' | 'popular' | 'viral';
}

export interface SimilarityScore {
  asin: string;
  score: number; // 0-100
  breakdown: {
    category: number;
    brand: number;
    price: number;
    rating: number;
    popularity: number;
  };
}

// Price ranges in USD/EUR
const PRICE_RANGES = {
  budget: { min: 0, max: 30 },
  mid: { min: 30, max: 100 },
  premium: { min: 100, max: 300 },
  luxury: { min: 300, max: Infinity },
};

/**
 * Normalize price to a range category
 */
export function getPriceRange(price: number): ProductFeatures['priceRange'] {
  if (price < PRICE_RANGES.budget.max) return 'budget';
  if (price < PRICE_RANGES.mid.max) return 'mid';
  if (price < PRICE_RANGES.premium.max) return 'premium';
  return 'luxury';
}

/**
 * Normalize rating to a tier
 */
export function getRatingTier(rating?: number): ProductFeatures['ratingTier'] {
  if (!rating || rating < 3.5) return 'low';
  if (rating < 4.0) return 'medium';
  if (rating < 4.5) return 'high';
  return 'excellent';
}

/**
 * Normalize review count to popularity tier
 */
export function getPopularityTier(reviews?: number): ProductFeatures['popularityTier'] {
  if (!reviews || reviews < 50) return 'niche';
  if (reviews < 500) return 'moderate';
  if (reviews < 5000) return 'popular';
  return 'viral';
}

/**
 * Extract features from a product for similarity comparison
 */
export function extractFeatures(product: {
  asin: string;
  productId?: string;
  title: string;
  brand: string;
  category?: string;
  subcategory?: string;
  price: number;
  rating?: number;
  totalReviews?: number;
  tags?: string[];
}): ProductFeatures {
  return {
    asin: product.asin,
    productId: product.productId,
    title: product.title,
    brand: product.brand?.toLowerCase() || 'unknown',
    category: product.category?.toLowerCase() || 'electronics',
    subcategory: product.subcategory?.toLowerCase(),
    price: product.price,
    rating: product.rating,
    totalReviews: product.totalReviews,
    tags: product.tags?.map(t => t.toLowerCase()) || [],
    priceRange: getPriceRange(product.price),
    ratingTier: getRatingTier(product.rating),
    popularityTier: getPopularityTier(product.totalReviews),
  };
}

/**
 * Calculate similarity score between two products
 * Returns 0-100 score
 */
export function calculateSimilarity(
  product1: ProductFeatures,
  product2: ProductFeatures
): SimilarityScore {
  // Skip if same product
  if (product1.asin === product2.asin) {
    return {
      asin: product2.asin,
      score: 100,
      breakdown: { category: 100, brand: 100, price: 100, rating: 100, popularity: 100 },
    };
  }

  const breakdown = {
    category: 0,
    brand: 0,
    price: 0,
    rating: 0,
    popularity: 0,
  };

  // Category similarity (0-30 points)
  // Exact match = 30, same parent category = 15
  if (product1.category === product2.category) {
    breakdown.category = 30;
    if (product1.subcategory && product1.subcategory === product2.subcategory) {
      breakdown.category = 35; // Bonus for subcategory match
    }
  } else {
    // Partial category matching (e.g., "audio" and "electronics" are related)
    const categoryRelations: Record<string, string[]> = {
      audio: ['electronics', 'music', 'headphones'],
      gaming: ['electronics', 'computers', 'entertainment'],
      smartphones: ['electronics', 'mobile', 'accessories'],
      wearables: ['electronics', 'fitness', 'smartwatch'],
      computers: ['electronics', 'office', 'gaming'],
      home: ['smart home', 'electronics', 'kitchen'],
    };

    const cat1Relations = categoryRelations[product1.category] || [];
    const cat2Relations = categoryRelations[product2.category] || [];

    if (cat1Relations.includes(product2.category) || cat2Relations.includes(product1.category)) {
      breakdown.category = 15;
    }
  }

  // Brand similarity (0-25 points)
  // Same brand = 25, related brands = 10
  if (product1.brand === product2.brand) {
    breakdown.brand = 25;
  } else {
    // Check for brand relationships (parent companies, similar tier)
    const brandTiers: Record<string, string[]> = {
      premium: ['apple', 'bose', 'sony', 'samsung', 'bang & olufsen'],
      mainstream: ['jbl', 'logitech', 'anker', 'belkin', 'razer'],
      budget: ['onn', 'amazonbasics', 'generic'],
    };

    let brand1Tier = '';
    let brand2Tier = '';

    for (const [tier, brands] of Object.entries(brandTiers)) {
      if (brands.includes(product1.brand)) brand1Tier = tier;
      if (brands.includes(product2.brand)) brand2Tier = tier;
    }

    if (brand1Tier && brand1Tier === brand2Tier) {
      breakdown.brand = 10;
    }
  }

  // Price similarity (0-20 points)
  // Same range = 20, adjacent range = 10
  const priceRangeOrder = ['budget', 'mid', 'premium', 'luxury'];
  const price1Index = priceRangeOrder.indexOf(product1.priceRange);
  const price2Index = priceRangeOrder.indexOf(product2.priceRange);
  const priceDiff = Math.abs(price1Index - price2Index);

  if (priceDiff === 0) {
    breakdown.price = 20;
  } else if (priceDiff === 1) {
    breakdown.price = 12;
  } else if (priceDiff === 2) {
    breakdown.price = 5;
  }

  // Rating similarity (0-15 points)
  const ratingTierOrder = ['low', 'medium', 'high', 'excellent'];
  const rating1Index = ratingTierOrder.indexOf(product1.ratingTier);
  const rating2Index = ratingTierOrder.indexOf(product2.ratingTier);
  const ratingDiff = Math.abs(rating1Index - rating2Index);

  if (ratingDiff === 0) {
    breakdown.rating = 15;
  } else if (ratingDiff === 1) {
    breakdown.rating = 10;
  } else {
    breakdown.rating = 3;
  }

  // Popularity similarity (0-10 points)
  const popularityOrder = ['niche', 'moderate', 'popular', 'viral'];
  const pop1Index = popularityOrder.indexOf(product1.popularityTier);
  const pop2Index = popularityOrder.indexOf(product2.popularityTier);
  const popDiff = Math.abs(pop1Index - pop2Index);

  if (popDiff === 0) {
    breakdown.popularity = 10;
  } else if (popDiff === 1) {
    breakdown.popularity = 6;
  } else {
    breakdown.popularity = 2;
  }

  // Calculate total score (max 100)
  const score = Math.min(
    breakdown.category + breakdown.brand + breakdown.price + breakdown.rating + breakdown.popularity,
    100
  );

  return {
    asin: product2.asin,
    score,
    breakdown,
  };
}

/**
 * Find products similar to a given product
 */
export async function findSimilarProducts(
  sourceProduct: ProductFeatures,
  candidateProducts: ProductFeatures[],
  limit: number = 10,
  minScore: number = 40
): Promise<SimilarityScore[]> {
  const scores: SimilarityScore[] = [];

  for (const candidate of candidateProducts) {
    if (candidate.asin === sourceProduct.asin) continue;

    const similarity = calculateSimilarity(sourceProduct, candidate);
    if (similarity.score >= minScore) {
      scores.push(similarity);
    }
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Get aggregated similarity profile from user's liked products
 * Returns weighted features that represent user's preferences
 */
export async function getUserSimilarityProfile(userId: string): Promise<{
  preferredCategories: Record<string, number>;
  preferredBrands: Record<string, number>;
  preferredPriceRange: ProductFeatures['priceRange'];
  preferredRatingTier: ProductFeatures['ratingTier'];
  likedProducts: ProductFeatures[];
} | null> {
  // Get user's liked products
  const likes = await db.select({
    productId: ProductLikes.productId,
    asin: ProductLikes.asin,
    createdAt: ProductLikes.createdAt,
  })
    .from(ProductLikes)
    .where(eq(ProductLikes.userId, userId))
    .orderBy(desc(ProductLikes.createdAt))
    .limit(30)
    .all();

  if (likes.length === 0) return null;

  // Fetch product details for liked items
  const likedProducts: ProductFeatures[] = [];
  const categoryWeights: Record<string, number> = {};
  const brandWeights: Record<string, number> = {};
  const priceRangeCounts: Record<string, number> = { budget: 0, mid: 0, premium: 0, luxury: 0 };
  const ratingTierCounts: Record<string, number> = { low: 0, medium: 0, high: 0, excellent: 0 };

  for (const like of likes) {
    if (!like.productId) continue;

    const product = await db.select()
      .from(Products)
      .where(eq(Products.productId, like.productId))
      .get();

    if (!product) continue;

    const features = extractFeatures({
      asin: product.asin,
      productId: product.productId,
      title: product.title,
      brand: product.brand,
      category: product.category || undefined,
      subcategory: product.subcategory || undefined,
      price: product.price,
      rating: product.rating || undefined,
      totalReviews: product.totalReviews || undefined,
      tags: (product.tags as string[]) || [],
    });

    likedProducts.push(features);

    // Recency weight (more recent = higher weight)
    const daysSinceLike = (Date.now() - new Date(like.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.exp(-daysSinceLike / 14);

    // Accumulate weighted preferences
    categoryWeights[features.category] = (categoryWeights[features.category] || 0) + recencyWeight;
    brandWeights[features.brand] = (brandWeights[features.brand] || 0) + recencyWeight;
    priceRangeCounts[features.priceRange] += recencyWeight;
    ratingTierCounts[features.ratingTier] += recencyWeight;
  }

  // Determine preferred ranges
  const preferredPriceRange = Object.entries(priceRangeCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as ProductFeatures['priceRange'];

  const preferredRatingTier = Object.entries(ratingTierCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as ProductFeatures['ratingTier'];

  return {
    preferredCategories: categoryWeights,
    preferredBrands: brandWeights,
    preferredPriceRange,
    preferredRatingTier,
    likedProducts,
  };
}

/**
 * Score a product based on similarity to user's liked products
 * Returns 0-100 boost score
 */
export function calculateContentBasedScore(
  product: ProductFeatures,
  userProfile: {
    preferredCategories: Record<string, number>;
    preferredBrands: Record<string, number>;
    preferredPriceRange: ProductFeatures['priceRange'];
    preferredRatingTier: ProductFeatures['ratingTier'];
    likedProducts: ProductFeatures[];
  }
): number {
  let score = 0;

  // Category match (0-30)
  const maxCategoryWeight = Math.max(...Object.values(userProfile.preferredCategories), 1);
  const categoryWeight = userProfile.preferredCategories[product.category] || 0;
  score += (categoryWeight / maxCategoryWeight) * 30;

  // Brand match (0-25)
  const maxBrandWeight = Math.max(...Object.values(userProfile.preferredBrands), 1);
  const brandWeight = userProfile.preferredBrands[product.brand] || 0;
  score += (brandWeight / maxBrandWeight) * 25;

  // Price range match (0-20)
  const priceRangeOrder = ['budget', 'mid', 'premium', 'luxury'];
  const prefPriceIndex = priceRangeOrder.indexOf(userProfile.preferredPriceRange);
  const prodPriceIndex = priceRangeOrder.indexOf(product.priceRange);
  const priceDiff = Math.abs(prefPriceIndex - prodPriceIndex);

  if (priceDiff === 0) score += 20;
  else if (priceDiff === 1) score += 12;
  else if (priceDiff === 2) score += 5;

  // Rating tier match (0-15)
  const ratingTierOrder = ['low', 'medium', 'high', 'excellent'];
  const prefRatingIndex = ratingTierOrder.indexOf(userProfile.preferredRatingTier);
  const prodRatingIndex = ratingTierOrder.indexOf(product.ratingTier);
  const ratingDiff = Math.abs(prefRatingIndex - prodRatingIndex);

  if (ratingDiff === 0) score += 15;
  else if (ratingDiff === 1) score += 10;
  else score += 3;

  // Direct similarity to liked products (0-10 bonus)
  // Find max similarity to any liked product
  let maxSimilarity = 0;
  for (const likedProduct of userProfile.likedProducts.slice(0, 10)) {
    const similarity = calculateSimilarity(product, likedProduct);
    if (similarity.score > maxSimilarity) {
      maxSimilarity = similarity.score;
    }
  }
  score += (maxSimilarity / 100) * 10;

  return Math.min(Math.round(score), 100);
}

/**
 * Boost scores for products similar to recently liked items
 * Returns map of ASIN -> boost score (0-50)
 */
export async function getSimilarityBoosts(
  userId: string,
  candidateProducts: ProductFeatures[]
): Promise<Map<string, number>> {
  const boosts = new Map<string, number>();

  const profile = await getUserSimilarityProfile(userId);
  if (!profile) return boosts;

  for (const product of candidateProducts) {
    const contentScore = calculateContentBasedScore(product, profile);
    // Convert to a boost (0-50 range)
    const boost = Math.round(contentScore * 0.5);
    if (boost > 5) {
      boosts.set(product.asin, boost);
    }
  }

  return boosts;
}

/**
 * Get products similar to a specific product
 * For "more like this" feature
 */
export async function getProductRecommendations(
  productAsin: string,
  lang: string = 'en',
  limit: number = 8
): Promise<{ asin: string; score: number; reason: string }[]> {
  // Get the source product
  const sourceProduct = await db.select()
    .from(Products)
    .where(and(
      eq(Products.asin, productAsin),
      eq(Products.status, 'published')
    ))
    .get();

  if (!sourceProduct) return [];

  const sourceFeatures = extractFeatures({
    asin: sourceProduct.asin,
    productId: sourceProduct.productId,
    title: sourceProduct.title,
    brand: sourceProduct.brand,
    category: sourceProduct.category || undefined,
    subcategory: sourceProduct.subcategory || undefined,
    price: sourceProduct.price,
    rating: sourceProduct.rating || undefined,
    totalReviews: sourceProduct.totalReviews || undefined,
    tags: (sourceProduct.tags as string[]) || [],
  });

  // Get candidate products from same/related category
  const candidates = await db.select()
    .from(Products)
    .where(and(
      eq(Products.status, 'published'),
      eq(Products.lang, lang)
    ))
    .limit(100)
    .all();

  const candidateFeatures = candidates
    .filter(p => p.asin !== productAsin)
    .map(p => extractFeatures({
      asin: p.asin,
      productId: p.productId,
      title: p.title,
      brand: p.brand,
      category: p.category || undefined,
      subcategory: p.subcategory || undefined,
      price: p.price,
      rating: p.rating || undefined,
      totalReviews: p.totalReviews || undefined,
      tags: (p.tags as string[]) || [],
    }));

  // Find similar products
  const similar = await findSimilarProducts(sourceFeatures, candidateFeatures, limit, 30);

  // Generate reasons
  return similar.map(s => {
    const reasons: string[] = [];
    if (s.breakdown.category >= 25) reasons.push('same category');
    if (s.breakdown.brand >= 20) reasons.push('same brand');
    if (s.breakdown.price >= 15) reasons.push('similar price');
    if (s.breakdown.rating >= 12) reasons.push('similar rating');

    return {
      asin: s.asin,
      score: s.score,
      reason: reasons.length > 0 ? reasons.join(', ') : 'similar product',
    };
  });
}
