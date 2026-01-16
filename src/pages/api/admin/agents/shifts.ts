/**
 * API Endpoint: Agent Shifts CRUD
 *
 * GET - List all shifts
 * POST - Create new shift
 * PUT - Update shift
 * DELETE - Delete shift
 */

import type { APIRoute } from 'astro';
import { db, AgentShift } from 'astro:db';
import { eq } from 'astro:db';
import { getScheduler } from '@lib/agents/scheduler';

interface ShiftInput {
  id?: number;
  name: string;
  description?: string;
  startHour: number;
  endHour: number;
  daysOfWeek?: number[];
  timezone?: string;
  agents?: string[];
  maxConcurrentAgents?: number;
  runIntervalMinutes?: number;
  isEnabled?: boolean;
}

export const GET: APIRoute = async () => {
  try {
    const scheduler = getScheduler();
    const shifts = await scheduler.getShifts();
    const activeShift = await scheduler.getActiveShift();

    const response = shifts.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      startHour: s.startHour,
      endHour: s.endHour,
      daysOfWeek: s.daysOfWeek,
      timezone: s.timezone,
      agents: s.agents,
      maxConcurrentAgents: s.maxConcurrentAgents,
      runIntervalMinutes: s.runIntervalMinutes,
      isEnabled: s.isEnabled,
      isActive: activeShift?.id === s.id,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    }));

    return new Response(
      JSON.stringify({
        shifts: response,
        activeShiftId: activeShift?.id || null,
        count: response.length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: ShiftInput = await request.json();

    if (!body.name || body.startHour === undefined || body.endHour === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, startHour, endHour' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await db.insert(AgentShift).values({
      name: body.name,
      description: body.description,
      startHour: body.startHour,
      endHour: body.endHour,
      daysOfWeek: body.daysOfWeek || [1, 2, 3, 4, 5],
      timezone: body.timezone || 'America/New_York',
      agents: body.agents || [],
      maxConcurrentAgents: body.maxConcurrentAgents || 1,
      runIntervalMinutes: body.runIntervalMinutes || 60,
      isEnabled: body.isEnabled !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: Number(result.lastInsertRowid),
        message: 'Shift created successfully',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating shift:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body: ShiftInput = await request.json();

    if (!body.id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.startHour !== undefined) updateData.startHour = body.startHour;
    if (body.endHour !== undefined) updateData.endHour = body.endHour;
    if (body.daysOfWeek !== undefined) updateData.daysOfWeek = body.daysOfWeek;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.agents !== undefined) updateData.agents = body.agents;
    if (body.maxConcurrentAgents !== undefined) updateData.maxConcurrentAgents = body.maxConcurrentAgents;
    if (body.runIntervalMinutes !== undefined) updateData.runIntervalMinutes = body.runIntervalMinutes;
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;

    await db.update(AgentShift).set(updateData).where(eq(AgentShift.id, body.id));

    return new Response(
      JSON.stringify({ success: true, message: 'Shift updated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating shift:', error);
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

    await db.delete(AgentShift).where(eq(AgentShift.id, parseInt(id)));

    return new Response(
      JSON.stringify({ success: true, message: 'Shift deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting shift:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
