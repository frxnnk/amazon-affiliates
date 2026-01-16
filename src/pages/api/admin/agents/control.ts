/**
 * API Endpoint: Agent Control
 *
 * POST /api/admin/agents/control
 *
 * Provides control operations for the orchestrator and individual agents:
 * - start: Start an agent or all agents
 * - stop: Stop current execution
 * - enable/disable: Toggle agent availability
 * - config: Update agent configuration
 */

import type { APIRoute } from 'astro';
import { db, AgentConfig, AgentEvents } from 'astro:db';
import { eq } from 'astro:db';
import { getOrchestrator } from '@lib/agents/orchestrator';
import type { AgentType } from '@lib/agents/types';

type ControlAction = 'start' | 'stop' | 'stop_all' | 'enable' | 'disable' | 'config';

interface ControlRequest {
  action: ControlAction;
  agentType?: AgentType;
  dryRun?: boolean;
  config?: Record<string, unknown>;
}

const VALID_AGENTS: AgentType[] = ['deal_hunter', 'content_creator', 'price_monitor', 'channel_manager'];

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as ControlRequest;
    const { action, agentType, dryRun = false, config } = body;

    if (!action) {
      return jsonResponse({ error: 'action is required' }, 400);
    }

    const orchestrator = getOrchestrator();

    switch (action) {
      case 'start': {
        if (!agentType) {
          return jsonResponse({ error: 'agentType is required for start action' }, 400);
        }
        if (!VALID_AGENTS.includes(agentType)) {
          return jsonResponse({ error: `Invalid agentType. Must be one of: ${VALID_AGENTS.join(', ')}` }, 400);
        }

        // Check if already running
        const state = orchestrator.getState();
        if (state.status === 'running') {
          return jsonResponse(
            { error: 'Orchestrator is already running', state },
            409
          );
        }

        // Log the action
        await logEvent('start', agentType, { dryRun });

        // Run in background
        runAgentInBackground(orchestrator, agentType, dryRun);

        return jsonResponse({
          success: true,
          message: `${agentType} execution started${dryRun ? ' (dry run)' : ''}`,
          agentType,
          state: orchestrator.getState(),
        }, 202);
      }

      case 'stop': {
        if (!agentType) {
          return jsonResponse({ error: 'agentType is required for stop action' }, 400);
        }

        const stopped = await orchestrator.stopAgent(agentType);
        await logEvent('stop', agentType);

        return jsonResponse({
          success: stopped,
          message: stopped ? `Stop requested for ${agentType}` : `Agent ${agentType} not found or not running`,
          state: orchestrator.getState(),
        });
      }

      case 'stop_all': {
        orchestrator.requestStop();
        await logEvent('stop_all', 'orchestrator');

        return jsonResponse({
          success: true,
          message: 'Stop requested for all agents',
          state: orchestrator.getState(),
        });
      }

      case 'enable': {
        if (!agentType) {
          return jsonResponse({ error: 'agentType is required for enable action' }, 400);
        }

        await db
          .update(AgentConfig)
          .set({ isEnabled: true, updatedAt: new Date() })
          .where(eq(AgentConfig.agentType, agentType));

        await logEvent('enable', agentType);

        return jsonResponse({
          success: true,
          message: `${agentType} enabled`,
        });
      }

      case 'disable': {
        if (!agentType) {
          return jsonResponse({ error: 'agentType is required for disable action' }, 400);
        }

        await db
          .update(AgentConfig)
          .set({ isEnabled: false, updatedAt: new Date() })
          .where(eq(AgentConfig.agentType, agentType));

        await logEvent('disable', agentType);

        return jsonResponse({
          success: true,
          message: `${agentType} disabled`,
        });
      }

      case 'config': {
        if (!agentType) {
          return jsonResponse({ error: 'agentType is required for config action' }, 400);
        }
        if (!config) {
          return jsonResponse({ error: 'config object is required' }, 400);
        }

        // Only allow specific config updates
        const allowedUpdates: Record<string, unknown> = {};
        if (typeof config.intervalHours === 'number') {
          allowedUpdates.intervalHours = config.intervalHours;
        }
        if (typeof config.quotaLimit === 'number') {
          allowedUpdates.quotaLimit = config.quotaLimit;
        }
        if (config.config && typeof config.config === 'object') {
          allowedUpdates.config = config.config;
        }

        if (Object.keys(allowedUpdates).length === 0) {
          return jsonResponse({ error: 'No valid config updates provided' }, 400);
        }

        await db
          .update(AgentConfig)
          .set({ ...allowedUpdates, updatedAt: new Date() })
          .where(eq(AgentConfig.agentType, agentType));

        await logEvent('config', agentType, { updates: allowedUpdates });

        return jsonResponse({
          success: true,
          message: `${agentType} configuration updated`,
          updates: allowedUpdates,
        });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('Agent control error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
};

// GET endpoint to retrieve current orchestrator state
export const GET: APIRoute = async () => {
  try {
    const orchestrator = getOrchestrator();
    const state = orchestrator.getState();

    // Get agent configs
    const configs = await db.select().from(AgentConfig);

    return jsonResponse({
      orchestrator: state,
      agents: configs.map((c) => ({
        type: c.agentType,
        isEnabled: c.isEnabled,
        intervalHours: c.intervalHours,
        lastRunAt: c.lastRunAt?.toISOString(),
        nextRunAt: c.nextRunAt?.toISOString(),
        quotaUsedToday: c.quotaUsedToday,
        quotaLimit: c.quotaLimit,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get orchestrator state error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
};

/**
 * Helper to create JSON response
 */
function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Log control event
 */
async function logEvent(
  action: string,
  agentType: string,
  data?: Record<string, unknown>
): Promise<void> {
  await db.insert(AgentEvents).values({
    eventType: `control_${action}`,
    agentType,
    message: `Control action: ${action}`,
    level: 'info',
    data: data ?? undefined,
    createdAt: new Date(),
  });
}

/**
 * Run agent in background
 */
async function runAgentInBackground(
  orchestrator: ReturnType<typeof getOrchestrator>,
  agentType: AgentType,
  dryRun: boolean
): Promise<void> {
  try {
    await orchestrator.runSingleAgent(agentType, {
      dryRun,
      triggeredBy: 'manual',
      maxItems: 10,
    });
  } catch (error) {
    console.error(`Background agent ${agentType} failed:`, error);
    await db.insert(AgentEvents).values({
      eventType: 'error',
      agentType,
      message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      level: 'error',
      createdAt: new Date(),
    });
  }
}
