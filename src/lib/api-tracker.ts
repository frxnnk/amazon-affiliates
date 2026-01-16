/**
 * API Tracker
 *
 * Comprehensive API usage and cost tracking service.
 * Tracks requests, tokens, costs, and provides real-time statistics.
 */

import { db, ApiUsage, ApiCostSummary } from 'astro:db';
import { eq, and, gte, lte, desc, sql } from 'astro:db';

export type ApiName = 'rapidapi' | 'openai' | 'youtube' | 'telegram' | 'discord' | 'twitter' | 'piped' | 'keepa';

// Pricing configuration (in cents per unit)
export const API_PRICING = {
  rapidapi: {
    name: 'RapidAPI Amazon',
    costPerRequest: 0.3, // $0.003 per request on Basic plan (~500 free, then $15/2000)
    freeQuota: 500,
    monthlyLimit: 2000,
    dailyLimit: 66, // ~2000/30
  },
  openai: {
    name: 'OpenAI GPT',
    costPer1kInputTokens: 0.015, // $0.00015 per 1k input tokens (gpt-4o-mini)
    costPer1kOutputTokens: 0.06, // $0.0006 per 1k output tokens
    dailyBudgetCents: 1000, // $10/day max
  },
  youtube: {
    name: 'YouTube API',
    costPerRequest: 0, // Free tier
    dailyQuotaUnits: 10000,
    unitsPerSearch: 100,
  },
  telegram: {
    name: 'Telegram Bot',
    costPerRequest: 0, // Free
  },
  discord: {
    name: 'Discord Webhook',
    costPerRequest: 0, // Free
  },
  twitter: {
    name: 'Twitter/X API',
    costPerRequest: 0, // Free tier
    monthlyLimit: 1500,
  },
  piped: {
    name: 'Piped (YouTube Alt)',
    costPerRequest: 0, // Free
  },
  keepa: {
    name: 'Keepa Price History',
    costPerToken: 15, // €15/100 tokens = €0.15/token = ~$0.16/token = 16 cents
    monthlyTokens: 100,
    dailyLimit: 3, // ~100/30 days
  },
} as const;

export interface TrackApiCallParams {
  apiName: ApiName;
  endpoint?: string;
  tokensInput?: number;
  tokensOutput?: number;
  agentType?: string;
  runId?: number;
  context?: Record<string, unknown>;
  statusCode?: number;
  success?: boolean;
  errorMessage?: string;
  responseTimeMs?: number;
}

export interface ApiStats {
  apiName: ApiName;
  displayName: string;
  today: {
    requests: number;
    tokens: number;
    costCents: number;
    errors: number;
  };
  month: {
    requests: number;
    tokens: number;
    costCents: number;
    errors: number;
  };
  quota: {
    used: number;
    limit: number;
    percentUsed: number;
  };
  status: 'ok' | 'warning' | 'critical';
}

/**
 * Calculate cost for an API call
 */
function calculateCost(apiName: ApiName, tokensInput?: number, tokensOutput?: number): number {
  switch (apiName) {
    case 'rapidapi':
      return API_PRICING.rapidapi.costPerRequest;

    case 'openai': {
      const inputCost = ((tokensInput || 0) / 1000) * API_PRICING.openai.costPer1kInputTokens;
      const outputCost = ((tokensOutput || 0) / 1000) * API_PRICING.openai.costPer1kOutputTokens;
      return Math.round((inputCost + outputCost) * 100) / 100; // Round to 2 decimals
    }

    case 'keepa':
      return API_PRICING.keepa.costPerToken; // 1 token per request

    case 'youtube':
    case 'telegram':
    case 'discord':
    case 'twitter':
    case 'piped':
      return 0;

    default:
      return 0;
  }
}

/**
 * Track an API call with full details
 */
export async function trackApiCall(params: TrackApiCallParams): Promise<void> {
  const { apiName, endpoint, tokensInput, tokensOutput, agentType, runId, context, statusCode, success = true, errorMessage, responseTimeMs } = params;

  const costCents = calculateCost(apiName, tokensInput, tokensOutput);
  const today = new Date().toISOString().split('T')[0];

  try {
    // Insert detailed usage record
    await db.insert(ApiUsage).values({
      apiName,
      endpoint,
      requestCount: 1,
      tokensInput,
      tokensOutput,
      costCents,
      agentType,
      runId,
      context,
      statusCode,
      success,
      errorMessage,
      responseTimeMs,
      createdAt: new Date(),
    });

    // Update or create daily summary
    await updateDailySummary(apiName, today, {
      requests: 1,
      tokensInput: tokensInput || 0,
      tokensOutput: tokensOutput || 0,
      costCents,
      success,
    });
  } catch (error) {
    console.error(`[ApiTracker] Failed to track ${apiName} call:`, error);
  }
}

/**
 * Update daily cost summary
 */
async function updateDailySummary(
  apiName: ApiName,
  date: string,
  data: {
    requests: number;
    tokensInput: number;
    tokensOutput: number;
    costCents: number;
    success: boolean;
  }
): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(ApiCostSummary)
      .where(and(eq(ApiCostSummary.apiName, apiName), eq(ApiCostSummary.date, date)));

    if (existing.length > 0) {
      const current = existing[0];
      await db
        .update(ApiCostSummary)
        .set({
          totalRequests: current.totalRequests + data.requests,
          totalTokensInput: current.totalTokensInput + data.tokensInput,
          totalTokensOutput: current.totalTokensOutput + data.tokensOutput,
          totalCostCents: current.totalCostCents + data.costCents,
          successCount: current.successCount + (data.success ? 1 : 0),
          errorCount: current.errorCount + (data.success ? 0 : 1),
          quotaUsed: current.quotaUsed + 1,
          updatedAt: new Date(),
        })
        .where(eq(ApiCostSummary.id, current.id));
    } else {
      // Get quota limit for this API
      const quotaLimit = getQuotaLimit(apiName);

      await db.insert(ApiCostSummary).values({
        apiName,
        date,
        totalRequests: data.requests,
        totalTokensInput: data.tokensInput,
        totalTokensOutput: data.tokensOutput,
        totalCostCents: data.costCents,
        successCount: data.success ? 1 : 0,
        errorCount: data.success ? 0 : 1,
        quotaLimit,
        quotaUsed: 1,
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error(`[ApiTracker] Failed to update daily summary:`, error);
  }
}

/**
 * Get quota limit for an API
 */
function getQuotaLimit(apiName: ApiName): number {
  switch (apiName) {
    case 'rapidapi':
      return API_PRICING.rapidapi.dailyLimit;
    case 'openai':
      return API_PRICING.openai.dailyBudgetCents;
    case 'youtube':
      return API_PRICING.youtube.dailyQuotaUnits / API_PRICING.youtube.unitsPerSearch;
    case 'twitter':
      return Math.floor(API_PRICING.twitter.monthlyLimit / 30);
    case 'keepa':
      return API_PRICING.keepa.dailyLimit;
    default:
      return 1000; // High limit for free APIs
  }
}

/**
 * Get statistics for all APIs
 */
export async function getAllApiStats(): Promise<ApiStats[]> {
  const apis: ApiName[] = ['rapidapi', 'openai', 'keepa', 'youtube', 'telegram', 'discord', 'twitter', 'piped'];
  return Promise.all(apis.map((api) => getApiStats(api)));
}

/**
 * Get statistics for a specific API
 */
export async function getApiStats(apiName: ApiName): Promise<ApiStats> {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  try {
    // Get today's summary
    const todaySummary = await db
      .select()
      .from(ApiCostSummary)
      .where(and(eq(ApiCostSummary.apiName, apiName), eq(ApiCostSummary.date, today)));

    // Get month's summaries
    const monthSummaries = await db
      .select()
      .from(ApiCostSummary)
      .where(and(eq(ApiCostSummary.apiName, apiName), gte(ApiCostSummary.date, monthStart)));

    // Aggregate month data
    const monthData = monthSummaries.reduce(
      (acc, s) => ({
        requests: acc.requests + s.totalRequests,
        tokens: acc.tokens + s.totalTokensInput + s.totalTokensOutput,
        costCents: acc.costCents + s.totalCostCents,
        errors: acc.errors + s.errorCount,
      }),
      { requests: 0, tokens: 0, costCents: 0, errors: 0 }
    );

    const todayData = todaySummary[0];
    const quotaLimit = getQuotaLimit(apiName);
    const quotaUsed = todayData?.quotaUsed || 0;
    const percentUsed = quotaLimit > 0 ? Math.round((quotaUsed / quotaLimit) * 100) : 0;

    // Determine status
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (percentUsed >= 90) status = 'critical';
    else if (percentUsed >= 70) status = 'warning';

    return {
      apiName,
      displayName: API_PRICING[apiName].name,
      today: {
        requests: todayData?.totalRequests || 0,
        tokens: (todayData?.totalTokensInput || 0) + (todayData?.totalTokensOutput || 0),
        costCents: todayData?.totalCostCents || 0,
        errors: todayData?.errorCount || 0,
      },
      month: monthData,
      quota: {
        used: quotaUsed,
        limit: quotaLimit,
        percentUsed,
      },
      status,
    };
  } catch (error) {
    console.error(`[ApiTracker] Failed to get stats for ${apiName}:`, error);
    return {
      apiName,
      displayName: API_PRICING[apiName].name,
      today: { requests: 0, tokens: 0, costCents: 0, errors: 0 },
      month: { requests: 0, tokens: 0, costCents: 0, errors: 0 },
      quota: { used: 0, limit: getQuotaLimit(apiName), percentUsed: 0 },
      status: 'ok',
    };
  }
}

/**
 * Get total costs for a date range
 */
export async function getTotalCosts(startDate: string, endDate: string): Promise<{
  totalCostCents: number;
  totalRequests: number;
  byApi: Record<ApiName, { costCents: number; requests: number }>;
}> {
  try {
    const summaries = await db
      .select()
      .from(ApiCostSummary)
      .where(and(gte(ApiCostSummary.date, startDate), lte(ApiCostSummary.date, endDate)));

    const byApi: Record<string, { costCents: number; requests: number }> = {};
    let totalCostCents = 0;
    let totalRequests = 0;

    for (const s of summaries) {
      if (!byApi[s.apiName]) {
        byApi[s.apiName] = { costCents: 0, requests: 0 };
      }
      byApi[s.apiName].costCents += s.totalCostCents;
      byApi[s.apiName].requests += s.totalRequests;
      totalCostCents += s.totalCostCents;
      totalRequests += s.totalRequests;
    }

    return { totalCostCents, totalRequests, byApi: byApi as Record<ApiName, { costCents: number; requests: number }> };
  } catch (error) {
    console.error('[ApiTracker] Failed to get total costs:', error);
    return { totalCostCents: 0, totalRequests: 0, byApi: {} as Record<ApiName, { costCents: number; requests: number }> };
  }
}

/**
 * Get recent API calls (for activity feed)
 */
export async function getRecentApiCalls(limit: number = 50): Promise<
  Array<{
    id: number;
    apiName: string;
    endpoint?: string;
    costCents: number;
    success: boolean;
    responseTimeMs?: number;
    agentType?: string;
    createdAt: Date;
  }>
> {
  try {
    const calls = await db.select().from(ApiUsage).orderBy(desc(ApiUsage.createdAt)).limit(limit);

    return calls.map((c) => ({
      id: c.id,
      apiName: c.apiName,
      endpoint: c.endpoint ?? undefined,
      costCents: c.costCents,
      success: c.success,
      responseTimeMs: c.responseTimeMs ?? undefined,
      agentType: c.agentType ?? undefined,
      createdAt: c.createdAt,
    }));
  } catch (error) {
    console.error('[ApiTracker] Failed to get recent calls:', error);
    return [];
  }
}

/**
 * Check if we can make an API call (quota check)
 */
export async function canMakeApiCall(apiName: ApiName): Promise<boolean> {
  const stats = await getApiStats(apiName);
  return stats.quota.percentUsed < 100;
}

/**
 * Get daily cost history for charts
 */
export async function getDailyCostHistory(
  days: number = 30
): Promise<Array<{ date: string; costCents: number; requests: number }>> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const summaries = await db
      .select()
      .from(ApiCostSummary)
      .where(and(gte(ApiCostSummary.date, startDate), lte(ApiCostSummary.date, endDate)))
      .orderBy(ApiCostSummary.date);

    // Aggregate by date
    const byDate: Record<string, { costCents: number; requests: number }> = {};

    for (const s of summaries) {
      if (!byDate[s.date]) {
        byDate[s.date] = { costCents: 0, requests: 0 };
      }
      byDate[s.date].costCents += s.totalCostCents;
      byDate[s.date].requests += s.totalRequests;
    }

    return Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('[ApiTracker] Failed to get cost history:', error);
    return [];
  }
}

/**
 * Format cents to currency string
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Estimate monthly cost based on current usage
 */
export function estimateMonthlyFromDaily(dailyCostCents: number): number {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // Project based on average daily spending
  return Math.round((dailyCostCents / dayOfMonth) * daysInMonth);
}
