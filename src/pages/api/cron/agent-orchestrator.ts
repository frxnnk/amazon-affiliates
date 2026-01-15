/**
 * API Endpoint: Agent Orchestrator (Cron Job)
 *
 * POST /api/cron/agent-orchestrator
 *
 * Main entry point for the multi-agent system.
 * Orchestrates all agents (Deal Hunter, Content Creator, Price Monitor, Channel Manager).
 *
 * Called by:
 * - Vercel Cron (scheduled)
 * - Manual trigger from admin panel
 *
 * Security: Requires CRON_SECRET header or admin auth
 */

import type { APIRoute } from 'astro';
import { initializeOrchestrator, type OrchestratorResult } from '@lib/agents';

export const prerender = false;

interface CronResponse {
  success: boolean;
  message: string;
  duration?: number;
  agentsRun?: number;
  agentsSkipped?: number;
  results?: Record<string, unknown>;
  error?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();

  try {
    // Security check
    const cronSecret = import.meta.env.CRON_SECRET || process.env.CRON_SECRET;
    const authHeader = request.headers.get('Authorization');
    const cronHeader = request.headers.get('x-cron-secret');

    // Allow if: has valid cron secret, or is admin (has auth header), or no security configured
    const isAuthorized =
      (cronSecret && cronHeader === cronSecret) ||
      (authHeader && authHeader.startsWith('Bearer ')) ||
      !cronSecret;

    if (!isAuthorized) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' } as CronResponse), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body for optional configuration
    let body: { dryRun?: boolean; agents?: string[]; maxItems?: number } = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is fine
    }

    console.log('[Cron] Starting agent orchestrator...');
    console.log('[Cron] Config:', {
      dryRun: body.dryRun || false,
      agents: body.agents || 'all',
      maxItems: body.maxItems || 10,
    });

    // Initialize orchestrator with all agents
    const orchestrator = await initializeOrchestrator();

    // Run all agents
    const result: OrchestratorResult = await orchestrator.runAll({
      dryRun: body.dryRun || false,
      maxItemsPerAgent: body.maxItems || 10,
      agents: body.agents as ('deal_hunter' | 'content_creator' | 'price_monitor' | 'channel_manager')[] | undefined,
      triggeredBy: cronHeader ? 'cron' : 'manual',
    });

    const duration = Date.now() - startTime;

    // Format results for response
    const formattedResults: Record<string, unknown> = {};
    for (const [agentType, agentResult] of result.results) {
      formattedResults[agentType] = {
        success: agentResult.success,
        itemsProcessed: agentResult.itemsProcessed,
        errors: agentResult.errors,
        metrics: agentResult.metrics,
        data: agentResult.data,
      };
    }

    const response: CronResponse = {
      success: result.success,
      message: result.success
        ? `Orchestrator completed successfully`
        : `Orchestrator completed with errors`,
      duration,
      agentsRun: result.agentsRun,
      agentsSkipped: result.agentsSkipped,
      results: formattedResults,
    };

    if (result.errors.length > 0) {
      response.error = result.errors.join('; ');
    }

    console.log(`[Cron] Completed in ${duration}ms`);
    console.log(`[Cron] Agents run: ${result.agentsRun}, Skipped: ${result.agentsSkipped}`);

    return new Response(JSON.stringify(response), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Fatal error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Orchestrator failed',
        duration,
        error: message,
      } as CronResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * GET endpoint for status check
 */
export const GET: APIRoute = async () => {
  try {
    const orchestrator = await initializeOrchestrator();
    const statuses = await orchestrator.getAgentStatuses();

    return new Response(
      JSON.stringify({
        success: true,
        agents: statuses,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
