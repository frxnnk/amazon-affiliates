/**
 * API Endpoint: Run Agent Manually
 *
 * POST /api/admin/agents/run
 * Body: { agentType: string, dryRun?: boolean }
 *
 * Triggers a specific agent to run immediately.
 */

import type { APIRoute } from 'astro';
import { AgentOrchestrator } from '@lib/agents/orchestrator';
import { db, AgentEvents } from 'astro:db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { agentType, dryRun = false } = body;

    if (!agentType) {
      return new Response(
        JSON.stringify({ error: 'agentType is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validAgents = ['deal_hunter', 'content_creator', 'price_monitor', 'channel_manager'];
    if (!validAgents.includes(agentType)) {
      return new Response(
        JSON.stringify({ error: `Invalid agentType. Must be one of: ${validAgents.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log the manual trigger event
    await db.insert(AgentEvents).values({
      eventType: 'manual_trigger',
      agentType,
      message: `Manual execution triggered${dryRun ? ' (dry run)' : ''}`,
      level: 'info',
      data: { triggeredBy: 'admin', dryRun },
      createdAt: new Date(),
    });

    // Create orchestrator and run specific agent
    const orchestrator = new AgentOrchestrator();

    // Run in background (don't await) so we can return immediately
    // The SSE stream will show progress
    runAgentInBackground(orchestrator, agentType, dryRun);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${agentType} execution started${dryRun ? ' (dry run)' : ''}`,
        agentType,
        dryRun,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 202, // Accepted
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error running agent:', error);
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

/**
 * Run agent in background without blocking the response
 */
async function runAgentInBackground(
  orchestrator: AgentOrchestrator,
  agentType: string,
  dryRun: boolean
): Promise<void> {
  try {
    await orchestrator.runSingleAgent(agentType as 'deal_hunter' | 'content_creator' | 'price_monitor' | 'channel_manager', {
      dryRun,
      triggeredBy: 'manual',
      maxItems: 10,
    });
  } catch (error) {
    console.error(`Background agent ${agentType} failed:`, error);
    // Log error event
    await db.insert(AgentEvents).values({
      eventType: 'error',
      agentType,
      message: `Manual execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      level: 'error',
      createdAt: new Date(),
    });
  }
}
