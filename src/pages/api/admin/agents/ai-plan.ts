/**
 * API Endpoint: AI-Powered Schedule Planning
 *
 * POST - Generate and apply AI schedule
 * GET - Preview AI-generated schedule without applying
 */

import type { APIRoute } from 'astro';
import { generateAISchedule, runAIPlanning } from '@lib/agents/planner-agent';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const daysAhead = parseInt(url.searchParams.get('days') || '3');
    const timezone = url.searchParams.get('timezone') || 'America/New_York';

    console.log(`[AI Plan API] Previewing schedule for ${daysAhead} days`);

    const result = await generateAISchedule(daysAhead, { timezone });

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        preview: true,
        tasks: result.tasks,
        reasoning: result.reasoning,
        tokensUsed: result.tokensUsed,
        daysAhead,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AI Plan API] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));

    const daysAhead = body.daysAhead || 3;
    const clearExisting = body.clearExisting === true;
    const priorities = body.priorities as string[] | undefined;
    const focusAgents = body.focusAgents as string[] | undefined;
    const timezone = body.timezone || 'America/New_York';

    console.log(`[AI Plan API] Running AI planning for ${daysAhead} days`);
    console.log(`[AI Plan API] Options:`, { clearExisting, priorities, focusAgents, timezone });

    const result = await runAIPlanning(daysAhead, {
      clearExisting,
      priorities,
      focusAgents,
      timezone,
      createdBy: 'admin_api',
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          tasksGenerated: result.tasksGenerated,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tasksGenerated: result.tasksGenerated,
        tasksCreated: result.tasksCreated,
        reasoning: result.reasoning,
        tokensUsed: result.tokensUsed,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AI Plan API] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
