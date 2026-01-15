/**
 * Collaborative Filtering Engine
 *
 * Implements user-based and item-based collaborative filtering:
 * 1. User similarity - find users with similar tastes
 * 2. Item co-occurrence - products frequently liked together
 * 3. Recommendations - "users like you also liked..."
 *
 * Uses Jaccard similarity for user comparison and
 * co-occurrence counts for item relationships.
 */

import { db, ProductLikes, Products, eq, desc, and, inArray, sql } from 'astro:db';

// Types
export interface UserSimilarity {
  userId: string;
  similarUserId: string;
  similarity: number; // 0-1 Jaccard index
  sharedLikes: number;
  computedAt: Date;
}

export interface ProductCoOccurrence {
  asin1: string;
  asin2: string;
  coOccurrenceCount: number; // How many users liked both
  confidence: number; // P(asin2 | asin1) = co-occurrence / likes(asin1)
}

export interface CollaborativeRecommendation {
  asin: string;
  score: number; // 0-100
  reason: 'similar_users' | 'frequently_together' | 'trending_in_segment';
  sourceUsers?: number; // How many similar users liked this
  coOccurrenceWith?: string[]; // Which liked products this co-occurs with
}

// Constants
const MIN_SHARED_LIKES = 3; // Minimum shared likes to consider users similar
const MIN_SIMILARITY = 0.1; // Minimum Jaccard similarity threshold
const MAX_SIMILAR_USERS = 50; // Max similar users to consider
const MIN_CO_OCCURRENCE = 5; // Minimum co-occurrence count to consider

/**
 * Calculate Jaccard similarity between two sets
 * J(A,B) = |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Get all ASINs liked by a user
 */
async function getUserLikedAsins(userId: string): Promise<Set<string>> {
  const likes = await db.select({ asin: ProductLikes.asin })
    .from(ProductLikes)
    .where(eq(ProductLikes.userId, userId))
    .all();

  return new Set(likes.map(l => l.asin));
}

/**
 * Get all users who have liked products (for collaborative filtering)
 */
async function getActiveUsers(excludeUserId?: string, minLikes: number = 5): Promise<string[]> {
  // Get users with at least minLikes likes
  const userCounts = await db
    .select({
      userId: ProductLikes.userId,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(ProductLikes)
    .groupBy(ProductLikes.userId)
    .all();

  return userCounts
    .filter(u => u.count >= minLikes && u.userId !== excludeUserId)
    .map(u => u.userId);
}

/**
 * Find users similar to the given user based on shared likes
 */
export async function findSimilarUsers(
  userId: string,
  limit: number = MAX_SIMILAR_USERS
): Promise<UserSimilarity[]> {
  // Get target user's likes
  const userLikes = await getUserLikedAsins(userId);
  if (userLikes.size < 3) return []; // Not enough data

  // Get active users
  const otherUsers = await getActiveUsers(userId);

  const similarities: UserSimilarity[] = [];

  // Calculate similarity with each user
  for (const otherUserId of otherUsers) {
    const otherLikes = await getUserLikedAsins(otherUserId);

    // Count shared likes
    let sharedCount = 0;
    for (const asin of userLikes) {
      if (otherLikes.has(asin)) sharedCount++;
    }

    // Skip if not enough shared likes
    if (sharedCount < MIN_SHARED_LIKES) continue;

    // Calculate Jaccard similarity
    const similarity = jaccardSimilarity(userLikes, otherLikes);

    if (similarity >= MIN_SIMILARITY) {
      similarities.push({
        userId,
        similarUserId: otherUserId,
        similarity,
        sharedLikes: sharedCount,
        computedAt: new Date(),
      });
    }
  }

  // Sort by similarity descending and limit
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Get products liked by similar users that the target user hasn't liked
 * "Users like you also liked..."
 */
export async function getCollaborativeRecommendations(
  userId: string,
  excludeAsins: Set<string>,
  limit: number = 20
): Promise<CollaborativeRecommendation[]> {
  // Find similar users
  const similarUsers = await findSimilarUsers(userId, 30);
  if (similarUsers.length === 0) return [];

  // Collect products liked by similar users, weighted by similarity
  const productScores = new Map<string, { score: number; userCount: number }>();

  for (const { similarUserId, similarity } of similarUsers) {
    const theirLikes = await getUserLikedAsins(similarUserId);

    for (const asin of theirLikes) {
      // Skip products the user has already seen/liked
      if (excludeAsins.has(asin)) continue;

      const existing = productScores.get(asin) || { score: 0, userCount: 0 };
      existing.score += similarity * 100; // Weight by user similarity
      existing.userCount += 1;
      productScores.set(asin, existing);
    }
  }

  // Convert to recommendations
  const recommendations: CollaborativeRecommendation[] = [];

  for (const [asin, { score, userCount }] of productScores) {
    // Normalize score (max would be if all similar users liked it with 1.0 similarity)
    const normalizedScore = Math.min((score / similarUsers.length) * 2, 100);

    recommendations.push({
      asin,
      score: Math.round(normalizedScore),
      reason: 'similar_users',
      sourceUsers: userCount,
    });
  }

  // Sort by score and return top items
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Calculate product co-occurrence matrix
 * Find products that are frequently liked together
 */
export async function calculateProductCoOccurrence(
  targetAsin: string,
  limit: number = 10
): Promise<ProductCoOccurrence[]> {
  // Get all users who liked the target product
  const usersWhoLiked = await db.select({ userId: ProductLikes.userId })
    .from(ProductLikes)
    .where(eq(ProductLikes.asin, targetAsin))
    .all();

  if (usersWhoLiked.length < 3) return []; // Not enough data

  const userIds = usersWhoLiked.map(u => u.userId);
  const targetLikeCount = userIds.length;

  // Get all other products liked by these users
  const otherLikes = await db.select({
    asin: ProductLikes.asin,
    userId: ProductLikes.userId,
  })
    .from(ProductLikes)
    .where(inArray(ProductLikes.userId, userIds))
    .all();

  // Count co-occurrences
  const coOccurrenceCounts = new Map<string, number>();

  for (const like of otherLikes) {
    if (like.asin === targetAsin) continue;

    const count = coOccurrenceCounts.get(like.asin) || 0;
    coOccurrenceCounts.set(like.asin, count + 1);
  }

  // Convert to results with confidence scores
  const results: ProductCoOccurrence[] = [];

  for (const [asin2, count] of coOccurrenceCounts) {
    if (count < MIN_CO_OCCURRENCE) continue;

    results.push({
      asin1: targetAsin,
      asin2,
      coOccurrenceCount: count,
      confidence: count / targetLikeCount, // P(asin2 | asin1)
    });
  }

  // Sort by co-occurrence count
  return results
    .sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount)
    .slice(0, limit);
}

/**
 * Get "frequently bought together" style recommendations
 * Based on co-occurrence with user's liked products
 */
export async function getCoOccurrenceRecommendations(
  likedAsins: string[],
  excludeAsins: Set<string>,
  limit: number = 10
): Promise<CollaborativeRecommendation[]> {
  if (likedAsins.length === 0) return [];

  // Get co-occurrences for each liked product
  const allCoOccurrences = new Map<string, {
    totalScore: number;
    sourceProducts: string[];
  }>();

  // Only process recent likes (max 10)
  const recentLikes = likedAsins.slice(0, 10);

  for (const asin of recentLikes) {
    const coOccurrences = await calculateProductCoOccurrence(asin, 20);

    for (const co of coOccurrences) {
      if (excludeAsins.has(co.asin2)) continue;

      const existing = allCoOccurrences.get(co.asin2) || {
        totalScore: 0,
        sourceProducts: [],
      };

      // Score based on confidence (how likely to like this given they liked source)
      existing.totalScore += co.confidence * 100;
      existing.sourceProducts.push(asin);
      allCoOccurrences.set(co.asin2, existing);
    }
  }

  // Convert to recommendations
  const recommendations: CollaborativeRecommendation[] = [];

  for (const [asin, { totalScore, sourceProducts }] of allCoOccurrences) {
    // Normalize by number of source products
    const normalizedScore = Math.min(totalScore / sourceProducts.length, 100);

    recommendations.push({
      asin,
      score: Math.round(normalizedScore),
      reason: 'frequently_together',
      coOccurrenceWith: sourceProducts,
    });
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get trending products within a user segment
 * Based on what similar taste profiles are liking recently
 */
export async function getTrendingInSegment(
  userCategories: string[],
  userBrands: string[],
  excludeAsins: Set<string>,
  limit: number = 10
): Promise<CollaborativeRecommendation[]> {
  // Get recent likes (last 7 days) for products matching user preferences
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentLikes = await db.select({
    asin: ProductLikes.asin,
    count: sql<number>`count(*)`.as('count'),
  })
    .from(ProductLikes)
    .groupBy(ProductLikes.asin)
    .all();

  // Get product details to filter by category/brand
  const trendingProducts: CollaborativeRecommendation[] = [];

  for (const { asin, count } of recentLikes) {
    if (excludeAsins.has(asin) || count < 3) continue;

    // Get product details
    const product = await db.select({
      category: Products.category,
      brand: Products.brand,
    })
      .from(Products)
      .where(eq(Products.asin, asin))
      .get();

    if (!product) continue;

    // Check if matches user preferences
    const categoryMatch = userCategories.some(c =>
      product.category?.toLowerCase().includes(c.toLowerCase())
    );
    const brandMatch = userBrands.some(b =>
      product.brand?.toLowerCase() === b.toLowerCase()
    );

    if (categoryMatch || brandMatch) {
      // Score based on like count and preference match
      let score = Math.min(count * 5, 50); // Base score from popularity
      if (categoryMatch) score += 25;
      if (brandMatch) score += 25;

      trendingProducts.push({
        asin,
        score: Math.min(score, 100),
        reason: 'trending_in_segment',
      });
    }
  }

  return trendingProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get combined collaborative recommendations
 * Merges user-based, item-based, and trending recommendations
 */
export async function getCollaborativeBoosts(
  userId: string,
  likedAsins: string[],
  userCategories: string[],
  userBrands: string[],
  excludeAsins: Set<string>
): Promise<Map<string, { boost: number; reason: string }>> {
  const boosts = new Map<string, { boost: number; reason: string }>();

  try {
    // Get recommendations in parallel
    const [userBasedRecs, coOccurrenceRecs, trendingRecs] = await Promise.all([
      getCollaborativeRecommendations(userId, excludeAsins, 15),
      getCoOccurrenceRecommendations(likedAsins, excludeAsins, 15),
      getTrendingInSegment(userCategories, userBrands, excludeAsins, 10),
    ]);

    // Merge recommendations with weighted boosts
    // User-based: strongest signal (weight 1.0)
    for (const rec of userBasedRecs) {
      const boost = Math.round(rec.score * 0.5); // Max 50 point boost
      if (boost > 5) {
        boosts.set(rec.asin, {
          boost,
          reason: `${rec.sourceUsers} similar users liked this`,
        });
      }
    }

    // Co-occurrence: medium signal (weight 0.7)
    for (const rec of coOccurrenceRecs) {
      const existing = boosts.get(rec.asin);
      const boost = Math.round(rec.score * 0.35); // Max 35 point boost

      if (boost > 5) {
        if (existing) {
          // Combine boosts
          boosts.set(rec.asin, {
            boost: Math.min(existing.boost + boost, 80),
            reason: existing.reason + '; frequently bought together',
          });
        } else {
          boosts.set(rec.asin, {
            boost,
            reason: 'frequently bought together',
          });
        }
      }
    }

    // Trending: weaker signal (weight 0.5)
    for (const rec of trendingRecs) {
      const existing = boosts.get(rec.asin);
      const boost = Math.round(rec.score * 0.25); // Max 25 point boost

      if (boost > 5) {
        if (existing) {
          boosts.set(rec.asin, {
            boost: Math.min(existing.boost + boost, 80),
            reason: existing.reason + '; trending',
          });
        } else {
          boosts.set(rec.asin, {
            boost,
            reason: 'trending in your interests',
          });
        }
      }
    }

  } catch (error) {
    console.error('[Collaborative] Error calculating boosts:', error);
  }

  return boosts;
}

/**
 * Calculate collaborative score for a single product
 * Used in the main scoring pipeline
 */
export function calculateCollaborativeScore(
  asin: string,
  boosts: Map<string, { boost: number; reason: string }>
): { score: number; reason?: string } {
  const boost = boosts.get(asin);
  return {
    score: boost?.boost || 0,
    reason: boost?.reason,
  };
}
