/**
 * API Endpoint: Agent Compliance Metrics
 *
 * GET - Get compliance metrics (on-time rate, success rate, streaks)
 * Returns overall and per-agent compliance data
 */

import type { APIRoute } from 'astro';
import { db, TaskCompletion, AgentAlerts } from 'astro:db';
import { eq, gte, desc, and } from 'astro:db';
import { getScheduler } from '@lib/agents/scheduler';

export const GET: APIRoute = async ({ url }) => {
  try {
    const days = parseInt(url.searchParams.get('days') || '7');
    const agentType = url.searchParams.get('agentType');
    const includeAlerts = url.searchParams.get('includeAlerts') !== 'false';

    const scheduler = getScheduler();

    // Get compliance metrics
    const compliance = await scheduler.getOverallCompliance(days);

    // Get trend data (last N days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const dailyRecords = await db
      .select()
      .from(TaskCompletion)
      .where(gte(TaskCompletion.date, startDateStr))
      .orderBy(TaskCompletion.date);

    // Aggregate by date for trend
    const trendMap = new Map<string, { onTime: number; total: number; success: number }>();
    for (const record of dailyRecords) {
      const existing = trendMap.get(record.date) || { onTime: 0, total: 0, success: 0 };
      existing.onTime += record.onTimeCount;
      existing.total += record.tasksCompleted + record.tasksFailed;
      existing.success += record.tasksCompleted;
      trendMap.set(record.date, existing);
    }

    const trend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      onTimeRate: data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 100,
      successRate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 100,
      tasksTotal: data.total,
    }));

    // Get alerts if requested
    let alerts: Array<{
      id: number;
      agentType: string;
      alertType: string;
      severity: string;
      message: string;
      isRead: boolean;
      createdAt: string;
    }> = [];

    if (includeAlerts) {
      let alertQuery = db.select().from(AgentAlerts);

      if (agentType) {
        alertQuery = alertQuery.where(eq(AgentAlerts.agentType, agentType)) as typeof alertQuery;
      }

      const alertRecords = await alertQuery.orderBy(desc(AgentAlerts.createdAt)).limit(20);

      alerts = alertRecords.map((a) => ({
        id: a.id,
        agentType: a.agentType,
        alertType: a.alertType,
        severity: a.severity,
        message: a.message,
        isRead: a.isRead,
        createdAt: a.createdAt?.toISOString() || '',
      }));
    }

    // Build response
    const response: Record<string, unknown> = {
      overall: compliance.overall,
      byAgent: compliance.byAgent,
      trend,
      period: {
        days,
        from: startDateStr,
        to: new Date().toISOString().split('T')[0],
      },
      timestamp: new Date().toISOString(),
    };

    if (includeAlerts) {
      response.alerts = alerts;
      response.unreadAlertCount = alerts.filter((a) => !a.isRead).length;
    }

    // Filter by agent if specified
    if (agentType && compliance.byAgent[agentType]) {
      response.agentMetrics = compliance.byAgent[agentType];
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=60', // 1 minute cache
      },
    });
  } catch (error) {
    console.error('Error fetching compliance metrics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * POST - Mark alerts as read
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (body.action === 'markRead' && Array.isArray(body.alertIds)) {
      const scheduler = getScheduler();
      await scheduler.markAlertsRead(body.alertIds);

      return new Response(
        JSON.stringify({ success: true, message: 'Alerts marked as read' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating alerts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
