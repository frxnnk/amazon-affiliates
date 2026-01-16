/**
 * API Endpoint: Agent Schedules CRUD
 *
 * GET - List all schedules
 * POST - Create new schedule
 * PUT - Update schedule (pass id in body)
 * DELETE - Delete schedule (pass id in query)
 */

import type { APIRoute } from 'astro';
import { db, AgentSchedule } from 'astro:db';
import { eq } from 'astro:db';

interface ScheduleInput {
  id?: number;
  agentType: string;
  name: string;
  daysOfWeek: number[];
  hour: number;
  minute?: number;
  timezone?: string;
  taskType?: string;
  config?: Record<string, unknown>;
  maxItems?: number;
  priority?: number;
  conditions?: Record<string, unknown>;
  isEnabled?: boolean;
}

// Calculate next run time for a schedule
function calculateNextRun(schedule: {
  daysOfWeek: number[];
  hour: number;
  minute: number;
  isEnabled: boolean;
}): string | null {
  if (!schedule.isEnabled) return null;

  const now = new Date();
  const daysOfWeek = schedule.daysOfWeek;

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + i);
    const dayOfWeek = checkDate.getDay();

    if (daysOfWeek.includes(dayOfWeek)) {
      const scheduledTime = new Date(checkDate);
      scheduledTime.setHours(schedule.hour, schedule.minute, 0, 0);

      if (scheduledTime > now) {
        return scheduledTime.toISOString();
      }
    }
  }

  return null;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const agentType = url.searchParams.get('agentType');

    let query = db.select().from(AgentSchedule);
    if (agentType) {
      query = query.where(eq(AgentSchedule.agentType, agentType)) as typeof query;
    }

    const schedules = await query.orderBy(AgentSchedule.hour, AgentSchedule.minute);

    const response = schedules.map((s) => ({
      id: s.id,
      agentType: s.agentType,
      name: s.name,
      daysOfWeek: s.daysOfWeek,
      hour: s.hour,
      minute: s.minute,
      timezone: s.timezone,
      taskType: s.taskType,
      config: s.config,
      maxItems: s.maxItems,
      priority: s.priority,
      conditions: s.conditions,
      isEnabled: s.isEnabled,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
      nextRun: calculateNextRun({
        daysOfWeek: (s.daysOfWeek as number[]) || [],
        hour: s.hour,
        minute: s.minute,
        isEnabled: s.isEnabled,
      }),
    }));

    return new Response(
      JSON.stringify({
        schedules: response,
        count: response.length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: ScheduleInput = await request.json();

    if (!body.agentType || !body.name || body.hour === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agentType, name, hour' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await db.insert(AgentSchedule).values({
      agentType: body.agentType,
      name: body.name,
      daysOfWeek: body.daysOfWeek || [1, 2, 3, 4, 5],
      hour: body.hour,
      minute: body.minute || 0,
      timezone: body.timezone || 'America/New_York',
      taskType: body.taskType || 'routine',
      config: body.config || {},
      maxItems: body.maxItems || 10,
      priority: body.priority || 50,
      conditions: body.conditions,
      isEnabled: body.isEnabled !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: Number(result.lastInsertRowid),
        message: 'Schedule created successfully',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating schedule:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body: ScheduleInput = await request.json();

    if (!body.id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.daysOfWeek !== undefined) updateData.daysOfWeek = body.daysOfWeek;
    if (body.hour !== undefined) updateData.hour = body.hour;
    if (body.minute !== undefined) updateData.minute = body.minute;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.taskType !== undefined) updateData.taskType = body.taskType;
    if (body.config !== undefined) updateData.config = body.config;
    if (body.maxItems !== undefined) updateData.maxItems = body.maxItems;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.conditions !== undefined) updateData.conditions = body.conditions;
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;

    await db.update(AgentSchedule).set(updateData).where(eq(AgentSchedule.id, body.id));

    return new Response(
      JSON.stringify({ success: true, message: 'Schedule updated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating schedule:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing required query param: id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db.delete(AgentSchedule).where(eq(AgentSchedule.id, parseInt(id)));

    return new Response(
      JSON.stringify({ success: true, message: 'Schedule deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
