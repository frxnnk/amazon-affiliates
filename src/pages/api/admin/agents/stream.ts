/**
 * API Endpoint: Agent Event Stream (SSE)
 *
 * Server-Sent Events endpoint for real-time agent activity.
 * Polls database every 2 seconds and sends new events to connected clients.
 * Includes orchestrator state for central control visibility.
 *
 * Note: Due to Vercel serverless constraints, the connection will timeout
 * after ~25 seconds. Clients should reconnect automatically.
 */

import type { APIRoute } from 'astro';
import { db, AgentEvents, AgentHeartbeat, AgentConfig } from 'astro:db';
import { desc, gt } from 'astro:db';
import { getOrchestrator } from '@lib/agents/orchestrator';

// Maximum connection time before timeout (25s to be safe under Vercel's 30s limit)
const MAX_CONNECTION_TIME_MS = 25000;

// Poll interval
const POLL_INTERVAL_MS = 2000;

export const GET: APIRoute = async ({ request }) => {
  // Check if client accepts SSE
  const accept = request.headers.get('accept');
  if (!accept?.includes('text/event-stream')) {
    return new Response(
      JSON.stringify({ error: 'This endpoint requires Accept: text/event-stream' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const encoder = new TextEncoder();
  let lastEventTimestamp = new Date();
  let isActive = true;
  const connectionStart = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'connected',
            message: 'Connected to agent event stream',
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      // Poll for events
      const poll = async () => {
        if (!isActive) return;

        // Check if we've exceeded max connection time
        if (Date.now() - connectionStart > MAX_CONNECTION_TIME_MS) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'timeout',
                message: 'Connection timeout - please reconnect',
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        try {
          // Fetch new events since last check
          const newEvents = await db
            .select()
            .from(AgentEvents)
            .where(gt(AgentEvents.createdAt, lastEventTimestamp))
            .orderBy(desc(AgentEvents.createdAt))
            .limit(20);

          if (newEvents.length > 0) {
            // Update timestamp
            lastEventTimestamp = newEvents[0].createdAt;

            // Send events (oldest first for proper ordering)
            for (const event of newEvents.reverse()) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'event',
                    event: {
                      id: event.id,
                      eventType: event.eventType,
                      agentType: event.agentType,
                      runId: event.runId,
                      message: event.message,
                      data: event.data,
                      level: event.level,
                      createdAt: event.createdAt.toISOString(),
                    },
                  })}\n\n`
                )
              );
            }
          }

          // Fetch current heartbeats for status updates
          const heartbeats = await db.select().from(AgentHeartbeat);

          // Fetch agent configs for enabled status
          const configs = await db.select().from(AgentConfig);
          const configMap = new Map(configs.map((c) => [c.agentType, c]));

          // Get orchestrator state
          const orchestrator = getOrchestrator();
          const orchestratorState = orchestrator.getState();

          // Send orchestrator state
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'orchestrator',
                state: {
                  status: orchestratorState.status,
                  currentAgent: orchestratorState.currentAgent,
                  runningAgents: orchestratorState.runningAgents,
                  queuedAgents: orchestratorState.queuedAgents,
                  startedAt: orchestratorState.startedAt?.toISOString(),
                  stoppedAt: orchestratorState.stoppedAt?.toISOString(),
                  lastError: orchestratorState.lastError,
                },
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );

          // Send agent statuses with heartbeat data
          const agentStatuses = heartbeats.map((h) => {
            const config = configMap.get(h.agentType);
            return {
              type: h.agentType,
              status: h.status,
              isEnabled: config?.isEnabled ?? true,
              currentTask: h.currentTask,
              progress: h.progress,
              itemsProcessed: h.itemsProcessed,
              itemsTotal: h.itemsTotal,
              lastHeartbeat: h.lastHeartbeat?.toISOString(),
              lastRunAt: config?.lastRunAt?.toISOString(),
              nextRunAt: config?.nextRunAt?.toISOString(),
              quotaUsedToday: config?.quotaUsedToday ?? 0,
              quotaLimit: config?.quotaLimit ?? 100,
            };
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'heartbeat',
                agents: agentStatuses,
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );

          // Send keepalive ping
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (error) {
          console.error('SSE poll error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                message: 'Error polling for events',
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );
        }

        // Schedule next poll
        if (isActive) {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      };

      // Start polling
      poll();
    },

    cancel() {
      isActive = false;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
};
