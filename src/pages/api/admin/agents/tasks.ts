/**
 * API Endpoint: Agent Tasks CRUD
 *
 * GET - List tasks with filters (date range, agentType, status)
 * POST - Create ad-hoc task
 * PUT - Reschedule or skip task
 */

import type { APIRoute } from 'astro';
import { db, AgentTask } from 'astro:db';
import { eq, and, gte, lte, desc } from 'astro:db';
import { getScheduler } from '@lib/agents/scheduler';

interface TaskInput {
  id?: number;
  agentType: string;
  name: string;
  description?: string;
  scheduledFor: string;
  dueBy?: string;
  config?: Record<string, unknown>;
  priority?: number;
  dependsOnTaskId?: number;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const agentType = url.searchParams.get('agentType');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    let query = db.select().from(AgentTask);

    // Build conditions
    const conditions = [];

    if (from) {
      conditions.push(gte(AgentTask.scheduledFor, new Date(from)));
    }
    if (to) {
      conditions.push(lte(AgentTask.scheduledFor, new Date(to)));
    }
    if (agentType) {
      conditions.push(eq(AgentTask.agentType, agentType));
    }
    if (status) {
      conditions.push(eq(AgentTask.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const tasks = await query.orderBy(desc(AgentTask.scheduledFor)).limit(limit);

    const response = tasks.map((t) => ({
      id: t.id,
      agentType: t.agentType,
      scheduleId: t.scheduleId,
      name: t.name,
      description: t.description,
      taskType: t.taskType,
      config: t.config,
      scheduledFor: t.scheduledFor?.toISOString(),
      dueBy: t.dueBy?.toISOString(),
      dependsOnTaskId: t.dependsOnTaskId,
      status: t.status,
      runId: t.runId,
      startedAt: t.startedAt?.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      wasOnTime: t.wasOnTime,
      delayMinutes: t.delayMinutes,
      priority: t.priority,
      isRecurring: t.scheduleId !== null,
      createdAt: t.createdAt?.toISOString(),
    }));

    return new Response(
      JSON.stringify({
        tasks: response,
        count: response.length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: TaskInput = await request.json();

    if (!body.agentType || !body.name || !body.scheduledFor) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agentType, name, scheduledFor' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const scheduledFor = new Date(body.scheduledFor);
    const dueBy = body.dueBy
      ? new Date(body.dueBy)
      : new Date(scheduledFor.getTime() + 15 * 60 * 1000);

    const result = await db.insert(AgentTask).values({
      agentType: body.agentType,
      scheduleId: null, // Ad-hoc tasks have no schedule
      name: body.name,
      description: body.description,
      taskType: 'ad_hoc',
      config: body.config || {},
      scheduledFor,
      dueBy,
      dependsOnTaskId: body.dependsOnTaskId,
      status: 'pending',
      priority: body.priority || 50,
      createdAt: new Date(),
      createdBy: 'admin',
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: Number(result.lastInsertRowid),
        message: 'Task created successfully',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating task:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reschedule task
    if (body.scheduledFor) {
      const scheduler = getScheduler();
      const success = await scheduler.rescheduleTask(body.id, new Date(body.scheduledFor));

      if (!success) {
        return new Response(
          JSON.stringify({ error: 'Cannot reschedule task - not found or not pending' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Task rescheduled successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Skip task
    if (body.status === 'skipped') {
      await db.update(AgentTask).set({ status: 'skipped' }).where(eq(AgentTask.id, body.id));

      return new Response(
        JSON.stringify({ success: true, message: 'Task skipped successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update priority
    if (body.priority !== undefined) {
      await db.update(AgentTask).set({ priority: body.priority }).where(eq(AgentTask.id, body.id));

      return new Response(
        JSON.stringify({ success: true, message: 'Task priority updated' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'No valid update fields provided' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating task:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
