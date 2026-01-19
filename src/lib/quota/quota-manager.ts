/**
 * Quota Manager
 *
 * Centralized API quota tracking and management.
 * Tracks daily usage for RapidAPI, OpenAI, Twitter, YouTube.
 */

import { db, DealAgentConfig } from 'astro:db';
import { eq } from 'astro:db';

export type ApiName = 'rapidapi' | 'openai' | 'twitter' | 'discord' | 'youtube' | 'creators';

export interface QuotaLimits {
  rapidapi: { daily: number; monthly: number };
  openai: { dailyTokens: number; dailyCostCents: number };
  twitter: { daily: number; monthly: number };
  discord: { daily: number }; // Webhooks have no real limit
  youtube: { daily: number };
  creators: { daily: number }; // Amazon Creators API (no official limits documented)
}

export interface QuotaStatus {
  apiName: ApiName;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetAt: Date;
}

export interface QuotaUsage {
  apiName: ApiName;
  date: string;
  usageCount: number;
  usageCost: number;
  details: Record<string, unknown>;
}

// Default limits based on free tiers
const DEFAULT_LIMITS: QuotaLimits = {
  rapidapi: {
    daily: 16, // ~500/month ÷ 30 days
    monthly: 500,
  },
  openai: {
    dailyTokens: 100000, // Budget-based
    dailyCostCents: 1000, // $10/day max
  },
  twitter: {
    daily: 50, // ~1500/month ÷ 30 days
    monthly: 1500,
  },
  discord: {
    daily: 1000, // Webhooks have no real limit, but we set a reasonable one
  },
  youtube: {
    daily: 95, // 10000 units/day, 100 per search = ~100 searches, keep 5 buffer
  },
  creators: {
    daily: 1000, // Amazon Creators API - no official limits documented, monitor for 429s
  },
};

// In-memory cache for performance
const quotaCache: Map<string, { usage: number; resetAt: Date }> = new Map();

/**
 * Get the cache key for today's quota
 */
function getTodayKey(apiName: ApiName): string {
  const today = new Date().toISOString().split('T')[0];
  return `quota:${apiName}:${today}`;
}

/**
 * Get quota status for an API
 */
export async function getQuotaStatus(apiName: ApiName): Promise<QuotaStatus> {
  const cacheKey = getTodayKey(apiName);
  const cached = quotaCache.get(cacheKey);

  // Check if cache is valid (same day)
  const now = new Date();
  if (cached && cached.resetAt.toDateString() === now.toDateString()) {
    const limit = getLimit(apiName);
    return {
      apiName,
      used: cached.usage,
      limit,
      remaining: Math.max(0, limit - cached.usage),
      percentUsed: Math.min(100, (cached.usage / limit) * 100),
      resetAt: getNextResetTime(),
    };
  }

  // Load from database
  const usage = await loadUsageFromDb(apiName);
  const limit = getLimit(apiName);

  // Update cache
  quotaCache.set(cacheKey, {
    usage,
    resetAt: now,
  });

  return {
    apiName,
    used: usage,
    limit,
    remaining: Math.max(0, limit - usage),
    percentUsed: Math.min(100, (usage / limit) * 100),
    resetAt: getNextResetTime(),
  };
}

/**
 * Check if an API call can be made
 */
export async function canMakeCall(apiName: ApiName, cost: number = 1): Promise<boolean> {
  const status = await getQuotaStatus(apiName);
  return status.remaining >= cost;
}

/**
 * Record API usage
 */
export async function recordUsage(
  apiName: ApiName,
  cost: number = 1,
  details?: Record<string, unknown>
): Promise<void> {
  const cacheKey = getTodayKey(apiName);
  const today = new Date().toISOString().split('T')[0];

  // Update cache immediately
  const cached = quotaCache.get(cacheKey);
  if (cached) {
    cached.usage += cost;
  } else {
    quotaCache.set(cacheKey, {
      usage: cost,
      resetAt: new Date(),
    });
  }

  // Store in database using DealAgentConfig (reusing existing table)
  const dbKey = `quota:${apiName}:${today}`;

  try {
    const existing = await db
      .select()
      .from(DealAgentConfig)
      .where(eq(DealAgentConfig.key, dbKey));

    if (existing.length > 0) {
      const currentValue = existing[0].value as { usage: number; details: unknown[] };
      await db
        .update(DealAgentConfig)
        .set({
          value: {
            usage: (currentValue.usage || 0) + cost,
            details: [...(currentValue.details || []), details].slice(-100), // Keep last 100
          },
          updatedAt: new Date(),
        })
        .where(eq(DealAgentConfig.key, dbKey));
    } else {
      await db.insert(DealAgentConfig).values({
        key: dbKey,
        value: {
          usage: cost,
          details: details ? [details] : [],
        },
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error(`[QuotaManager] Failed to record usage for ${apiName}:`, error);
  }
}

/**
 * Load usage from database
 */
async function loadUsageFromDb(apiName: ApiName): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const dbKey = `quota:${apiName}:${today}`;

  try {
    const results = await db
      .select()
      .from(DealAgentConfig)
      .where(eq(DealAgentConfig.key, dbKey));

    if (results.length > 0) {
      const value = results[0].value as { usage: number };
      return value.usage || 0;
    }
  } catch (error) {
    console.error(`[QuotaManager] Failed to load usage for ${apiName}:`, error);
  }

  return 0;
}

/**
 * Get limit for an API
 */
function getLimit(apiName: ApiName): number {
  switch (apiName) {
    case 'rapidapi':
      return DEFAULT_LIMITS.rapidapi.daily;
    case 'openai':
      return DEFAULT_LIMITS.openai.dailyTokens;
    case 'twitter':
      return DEFAULT_LIMITS.twitter.daily;
    case 'discord':
      return DEFAULT_LIMITS.discord.daily;
    case 'youtube':
      return DEFAULT_LIMITS.youtube.daily;
    case 'creators':
      return DEFAULT_LIMITS.creators.daily;
    default:
      return 100;
  }
}

/**
 * Get next quota reset time (midnight UTC)
 */
function getNextResetTime(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Get all API quota statuses
 */
export async function getAllQuotaStatuses(): Promise<QuotaStatus[]> {
  const apis: ApiName[] = ['rapidapi', 'openai', 'twitter', 'discord', 'youtube', 'creators'];
  return Promise.all(apis.map((api) => getQuotaStatus(api)));
}

/**
 * Reset quota for an API (admin function)
 */
export async function resetQuota(apiName: ApiName): Promise<void> {
  const cacheKey = getTodayKey(apiName);
  quotaCache.delete(cacheKey);

  const today = new Date().toISOString().split('T')[0];
  const dbKey = `quota:${apiName}:${today}`;

  try {
    await db.delete(DealAgentConfig).where(eq(DealAgentConfig.key, dbKey));
  } catch (error) {
    console.error(`[QuotaManager] Failed to reset quota for ${apiName}:`, error);
  }
}

/**
 * Get monthly usage summary
 */
export async function getMonthlyUsage(apiName: ApiName): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `quota:${apiName}:${year}-${month}`;

  let total = 0;

  try {
    // This is a simple implementation - in production you might want a separate monthly tracking table
    const results = await db.select().from(DealAgentConfig);

    for (const result of results) {
      if (result.key.startsWith(prefix)) {
        const value = result.value as { usage: number };
        total += value.usage || 0;
      }
    }
  } catch (error) {
    console.error(`[QuotaManager] Failed to get monthly usage for ${apiName}:`, error);
  }

  return total;
}

/**
 * Check if within monthly limit
 */
export async function isWithinMonthlyLimit(apiName: ApiName): Promise<boolean> {
  const monthlyUsage = await getMonthlyUsage(apiName);

  switch (apiName) {
    case 'rapidapi':
      return monthlyUsage < DEFAULT_LIMITS.rapidapi.monthly;
    case 'twitter':
      return monthlyUsage < DEFAULT_LIMITS.twitter.monthly;
    default:
      return true; // Other APIs don't have monthly limits
  }
}
