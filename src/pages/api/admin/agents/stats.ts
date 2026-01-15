/**
 * API Endpoint: Agent Statistics
 *
 * Returns statistics for the agents dashboard:
 * - Active keywords count
 * - Content queue count
 * - Publish queue count
 * - Runs today count
 */

import type { APIRoute } from 'astro';
import { db, DealAgentKeywords, ContentQueue, PublishQueue, AgentRunHistory } from 'astro:db';
import { eq, gte, count } from 'astro:db';

export const GET: APIRoute = async () => {
  try {
    // Get today's start (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [keywordsResult, contentQueueResult, publishQueueResult, runsResult] = await Promise.all([
      // Count active keywords
      db
        .select({ count: count() })
        .from(DealAgentKeywords)
        .where(eq(DealAgentKeywords.isActive, true))
        .catch(() => [{ count: 0 }]),

      // Count pending content queue items
      db
        .select({ count: count() })
        .from(ContentQueue)
        .where(eq(ContentQueue.status, 'pending'))
        .catch(() => [{ count: 0 }]),

      // Count pending publish queue items
      db
        .select({ count: count() })
        .from(PublishQueue)
        .where(eq(PublishQueue.status, 'pending'))
        .catch(() => [{ count: 0 }]),

      // Count agent runs today
      db
        .select({ count: count() })
        .from(AgentRunHistory)
        .where(gte(AgentRunHistory.startedAt, today))
        .catch(() => [{ count: 0 }]),
    ]);

    const stats = {
      keywords: keywordsResult[0]?.count ?? 0,
      contentQueue: contentQueueResult[0]?.count ?? 0,
      publishQueue: publishQueueResult[0]?.count ?? 0,
      runsToday: runsResult[0]?.count ?? 0,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);

    // Return default values on error
    return new Response(
      JSON.stringify({
        keywords: 0,
        contentQueue: 0,
        publishQueue: 0,
        runsToday: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 200, // Return 200 with defaults to not break the UI
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
