/**
 * API Endpoint: API Costs & Usage Statistics
 *
 * Returns comprehensive cost and usage data for all APIs.
 *
 * GET /api/admin/agents/costs
 * Query params:
 * - range: 'today' | 'week' | 'month' (default: 'today')
 * - api: filter by specific API
 */

import type { APIRoute } from 'astro';
import {
  getAllApiStats,
  getApiStats,
  getTotalCosts,
  getRecentApiCalls,
  getDailyCostHistory,
  formatCents,
  estimateMonthlyFromDaily,
  API_PRICING,
  type ApiName,
} from '@lib/api-tracker';

export const GET: APIRoute = async ({ url }) => {
  try {
    const params = url.searchParams;
    const range = params.get('range') || 'today';
    const apiFilter = params.get('api') as ApiName | null;

    // Calculate date range
    const today = new Date().toISOString().split('T')[0];
    let startDate = today;
    let endDate = today;

    switch (range) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        startDate = today.slice(0, 7) + '-01';
        break;
      default:
        // today
        break;
    }

    // Get stats
    const allStats = apiFilter ? [await getApiStats(apiFilter)] : await getAllApiStats();

    // Get totals for the range
    const totals = await getTotalCosts(startDate, endDate);

    // Get recent API calls
    const recentCalls = await getRecentApiCalls(20);

    // Get cost history for chart
    const costHistory = await getDailyCostHistory(30);

    // Calculate projections
    const todayStats = await getAllApiStats();
    const todayCostCents = todayStats.reduce((sum, s) => sum + s.today.costCents, 0);
    const monthCostCents = todayStats.reduce((sum, s) => sum + s.month.costCents, 0);
    const projectedMonthlyCents = estimateMonthlyFromDaily(todayCostCents > 0 ? todayCostCents : monthCostCents / new Date().getDate());

    // Build response
    const response = {
      timestamp: new Date().toISOString(),
      range,
      summary: {
        totalCostCents: totals.totalCostCents,
        totalCostFormatted: formatCents(totals.totalCostCents),
        totalRequests: totals.totalRequests,
        todayCostCents,
        todayCostFormatted: formatCents(todayCostCents),
        monthCostCents,
        monthCostFormatted: formatCents(monthCostCents),
        projectedMonthlyCents,
        projectedMonthlyFormatted: formatCents(projectedMonthlyCents),
      },
      apis: allStats.map((stat) => ({
        ...stat,
        pricing: API_PRICING[stat.apiName],
        today: {
          ...stat.today,
          costFormatted: formatCents(stat.today.costCents),
        },
        month: {
          ...stat.month,
          costFormatted: formatCents(stat.month.costCents),
        },
      })),
      recentCalls: recentCalls.map((call) => ({
        ...call,
        costFormatted: formatCents(call.costCents),
        createdAt: call.createdAt.toISOString(),
      })),
      costHistory,
      // Quick status overview
      alerts: allStats
        .filter((s) => s.status !== 'ok')
        .map((s) => ({
          apiName: s.apiName,
          displayName: s.displayName,
          status: s.status,
          message:
            s.status === 'critical'
              ? `${s.displayName} at ${s.quota.percentUsed}% quota - consider upgrading`
              : `${s.displayName} at ${s.quota.percentUsed}% quota`,
        })),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      },
    });
  } catch (error) {
    console.error('Error fetching API costs:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
