/**
 * API Endpoint: Agent Calendar Data
 *
 * GET - Get calendar data for a date range
 * Returns tasks and shifts organized by day for calendar visualization
 */

import type { APIRoute } from 'astro';
import { getScheduler } from '@lib/agents/scheduler';

export const GET: APIRoute = async ({ url }) => {
  try {
    const view = url.searchParams.get('view') || '3day'; // '3day' | 'week'
    const fromParam = url.searchParams.get('from');

    // Calculate date range
    const startDate = fromParam ? new Date(fromParam) : new Date();
    startDate.setHours(0, 0, 0, 0);

    const days = view === 'week' ? 7 : 3;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days - 1);
    endDate.setHours(23, 59, 59, 999);

    const scheduler = getScheduler();

    // First, generate tasks from schedules to ensure we have upcoming tasks
    await scheduler.generateTasksFromSchedules(days);

    // Get calendar data
    const calendarDays = await scheduler.getCalendarData(startDate, endDate);

    // Calculate summary
    const allTasks = calendarDays.flatMap((d) => d.tasks);
    const summary = {
      totalTasks: allTasks.length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
      pending: allTasks.filter((t) => t.status === 'pending').length,
      running: allTasks.filter((t) => t.status === 'running').length,
      failed: allTasks.filter((t) => t.status === 'failed').length,
      skipped: allTasks.filter((t) => t.status === 'skipped').length,
      overdue: allTasks.filter((t) => t.status === 'overdue').length,
    };

    return new Response(
      JSON.stringify({
        days: calendarDays,
        summary,
        view,
        dateRange: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=30', // 30 second cache
        },
      }
    );
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
