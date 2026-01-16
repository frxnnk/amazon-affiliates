/**
 * API Endpoint: Agent Events
 *
 * Returns recent agent events for the real-time activity feed.
 * Supports pagination and filtering by agent type.
 *
 * Query params:
 * - limit: number of events to return (default: 50, max: 200)
 * - since: ISO timestamp to get events after (for polling)
 * - agent: filter by agent type
 * - level: filter by event level (info, warn, error, success)
 */

import type { APIRoute } from 'astro';
import { db, AgentEvents } from 'astro:db';
import { desc, gt, eq, and } from 'astro:db';

interface EventResponse {
  id: number;
  eventType: string;
  agentType: string;
  runId?: number;
  message?: string;
  data?: Record<string, unknown>;
  level: string;
  createdAt: string;
  // Computed
  relativeTime?: string;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const params = url.searchParams;
    const limit = Math.min(parseInt(params.get('limit') || '50'), 200);
    const since = params.get('since');
    const agentFilter = params.get('agent');
    const levelFilter = params.get('level');

    // Build query conditions
    const conditions = [];

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        conditions.push(gt(AgentEvents.createdAt, sinceDate));
      }
    }

    if (agentFilter) {
      conditions.push(eq(AgentEvents.agentType, agentFilter));
    }

    if (levelFilter) {
      conditions.push(eq(AgentEvents.level, levelFilter));
    }

    // Fetch events
    let query = db.select().from(AgentEvents).orderBy(desc(AgentEvents.createdAt)).limit(limit);

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as typeof query;
    }

    const events = await query;

    // Transform to response format
    const eventResponses: EventResponse[] = events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      agentType: event.agentType,
      runId: event.runId ?? undefined,
      message: event.message ?? undefined,
      data: (event.data as Record<string, unknown>) ?? undefined,
      level: event.level,
      createdAt: event.createdAt.toISOString(),
      relativeTime: getRelativeTime(event.createdAt),
    }));

    return new Response(
      JSON.stringify({
        events: eventResponses,
        count: eventResponses.length,
        timestamp: new Date().toISOString(),
        // Include the latest event timestamp for next poll
        latestEventAt: eventResponses.length > 0 ? eventResponses[0].createdAt : null,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Allow caching for 2 seconds to reduce load
          'Cache-Control': 'public, max-age=2',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching agent events:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        events: [],
        count: 0,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * DELETE: Clear old events (admin only)
 * Keeps events from the last 24 hours
 */
export const DELETE: APIRoute = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Note: Astro DB doesn't support direct delete with where clause
    // This would need to be implemented with raw SQL or batch delete
    // For now, return a not implemented response
    return new Response(
      JSON.stringify({
        message: 'Event cleanup should be handled by a scheduled task',
        retentionPeriod: '24 hours',
      }),
      {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error clearing events:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
