/**
 * API Endpoint: Agent Status
 *
 * Returns real-time status of all agents including:
 * - Current status (idle/running/error)
 * - Last heartbeat
 * - Current task (if running)
 * - Progress (if running)
 * - Configuration
 */

import type { APIRoute } from 'astro';
import { db, AgentConfig, AgentHeartbeat, AgentRunHistory } from 'astro:db';
import { eq, desc } from 'astro:db';

interface AgentStatus {
  type: string;
  name: string;
  status: 'idle' | 'running' | 'error' | 'disabled';
  isEnabled: boolean;
  // Runtime info
  currentTask?: string;
  progress?: number;
  itemsProcessed?: number;
  itemsTotal?: number;
  lastHeartbeat?: string;
  lastError?: string;
  // Config
  intervalHours: number;
  quotaUsedToday: number;
  quotaLimit: number;
  // Last run
  lastRunAt?: string;
  nextRunAt?: string;
  lastRunStatus?: string;
  lastRunDuration?: number;
}

// Agent display names
const AGENT_NAMES: Record<string, string> = {
  deal_hunter: 'Deal Hunter',
  content_creator: 'Content Creator',
  price_monitor: 'Price Monitor',
  channel_manager: 'Channel Manager',
  news_hunter: 'News Hunter',
  review_generator: 'Review Generator',
  telegram_bot: 'Telegram Bot',
  discord_bot: 'Discord Bot',
};

export const GET: APIRoute = async () => {
  try {
    // Get all agent configs
    const configs = await db.select().from(AgentConfig);

    // Get all heartbeats
    const heartbeats = await db.select().from(AgentHeartbeat);
    const heartbeatMap = new Map(heartbeats.map((h) => [h.agentType, h]));

    // Get last run for each agent
    const lastRuns = await db
      .select()
      .from(AgentRunHistory)
      .orderBy(desc(AgentRunHistory.startedAt))
      .limit(20);

    const lastRunMap = new Map<string, (typeof lastRuns)[0]>();
    for (const run of lastRuns) {
      if (!lastRunMap.has(run.agentType)) {
        lastRunMap.set(run.agentType, run);
      }
    }

    // Build status for each configured agent
    const statuses: AgentStatus[] = configs.map((config) => {
      const heartbeat = heartbeatMap.get(config.agentType);
      const lastRun = lastRunMap.get(config.agentType);

      // Determine status
      let status: AgentStatus['status'] = 'idle';
      if (!config.isEnabled) {
        status = 'disabled';
      } else if (heartbeat?.status === 'running') {
        status = 'running';
      } else if (heartbeat?.status === 'error') {
        status = 'error';
      }

      // Calculate last run duration
      let lastRunDuration: number | undefined;
      if (lastRun?.startedAt && lastRun?.completedAt) {
        lastRunDuration = new Date(lastRun.completedAt).getTime() - new Date(lastRun.startedAt).getTime();
      }

      return {
        type: config.agentType,
        name: AGENT_NAMES[config.agentType] || config.agentType,
        status,
        isEnabled: config.isEnabled,
        // Runtime
        currentTask: heartbeat?.currentTask ?? undefined,
        progress: heartbeat?.progress ?? undefined,
        itemsProcessed: heartbeat?.itemsProcessed ?? undefined,
        itemsTotal: heartbeat?.itemsTotal ?? undefined,
        lastHeartbeat: heartbeat?.lastHeartbeat?.toISOString(),
        lastError: heartbeat?.lastError ?? undefined,
        // Config
        intervalHours: config.intervalHours,
        quotaUsedToday: config.quotaUsedToday,
        quotaLimit: config.quotaLimit,
        // Last run
        lastRunAt: config.lastRunAt?.toISOString(),
        nextRunAt: config.nextRunAt?.toISOString(),
        lastRunStatus: lastRun?.status,
        lastRunDuration,
      };
    });

    // Sort: running first, then by name
    statuses.sort((a, b) => {
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (a.status !== 'running' && b.status === 'running') return 1;
      return a.name.localeCompare(b.name);
    });

    return new Response(
      JSON.stringify({
        agents: statuses,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching agent status:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        agents: [],
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
