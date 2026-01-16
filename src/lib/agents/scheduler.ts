/**
 * Agent Scheduler Service
 *
 * DISABLED FOR MVP - Using direct orchestrator instead.
 * This module provides scheduled tasks, shifts, and compliance tracking.
 * Re-enable when advanced scheduling features are needed.
 *
 * Manages scheduled tasks, shifts, and compliance tracking for the agent system.
 * Works with the orchestrator to execute tasks at scheduled times.
 */

import {
  db,
  AgentSchedule,
  AgentTask,
  AgentShift,
  TaskCompletion,
  AgentAlerts,
  AgentConfig,
  ContentQueue,
} from 'astro:db';
import { eq, and, lte, gte, desc, sql, inArray } from 'astro:db';
import { getOrchestrator } from './orchestrator';
import type { AgentType, AgentResult, TriggerSource } from './types';

// ============================================================================
// TYPES
// ============================================================================

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'overdue';
export type TaskType = 'routine' | 'ad_hoc' | 'conditional' | 'deep_scan' | 'cleanup';
export type AlertType = 'task_delayed' | 'task_failed' | 'streak_broken' | 'low_performance';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ScheduleConditions {
  queueMinItems?: number;
  onlyIfIdle?: boolean;
  maxDelayMinutes?: number;
}

export interface TaskExecutionResult {
  taskId: number;
  success: boolean;
  wasOnTime: boolean;
  delayMinutes: number;
  runId?: number;
  error?: string;
}

export interface ComplianceMetrics {
  onTimeRate: number;
  successRate: number;
  averageDelay: number;
  currentStreak: number;
  tasksCompleted: number;
  tasksFailed: number;
}

export interface CalendarDay {
  date: string;
  tasks: CalendarTask[];
  shifts: CalendarShift[];
}

export interface CalendarTask {
  id: number;
  agentType: string;
  name: string;
  hour: number;
  minute: number;
  status: TaskStatus;
  duration?: number;
  isRecurring: boolean;
  scheduleId?: number;
}

export interface CalendarShift {
  id: number;
  name: string;
  startHour: number;
  endHour: number;
  agents: string[];
}

// ============================================================================
// SCHEDULER CLASS
// ============================================================================

export class AgentScheduler {
  private timezone: string;

  constructor(timezone: string = 'America/New_York') {
    this.timezone = timezone;
  }

  // --------------------------------------------------------------------------
  // TASK GENERATION
  // --------------------------------------------------------------------------

  /**
   * Generate tasks from schedules for the upcoming period
   */
  async generateTasksFromSchedules(days: number = 3): Promise<number> {
    const schedules = await db
      .select()
      .from(AgentSchedule)
      .where(eq(AgentSchedule.isEnabled, true));

    let tasksCreated = 0;
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    for (const schedule of schedules) {
      const daysOfWeek = (schedule.daysOfWeek as number[]) || [1, 2, 3, 4, 5];

      // Generate tasks for each day in the range
      for (let d = 0; d < days; d++) {
        const targetDate = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
        const dayOfWeek = targetDate.getDay();

        // Check if this schedule runs on this day
        if (!daysOfWeek.includes(dayOfWeek)) continue;

        // Create the scheduled datetime
        const scheduledFor = new Date(targetDate);
        scheduledFor.setHours(schedule.hour, schedule.minute, 0, 0);

        // Skip if already past
        if (scheduledFor < now) continue;

        // Check if task already exists for this schedule and time
        const existingTask = await db
          .select()
          .from(AgentTask)
          .where(
            and(
              eq(AgentTask.scheduleId, schedule.id),
              eq(AgentTask.scheduledFor, scheduledFor)
            )
          )
          .limit(1);

        if (existingTask.length > 0) continue;

        // Create the task
        const dueBy = new Date(scheduledFor.getTime() + 15 * 60 * 1000); // 15 min grace

        await db.insert(AgentTask).values({
          agentType: schedule.agentType,
          scheduleId: schedule.id,
          name: schedule.name,
          taskType: schedule.taskType,
          config: schedule.config as Record<string, unknown>,
          scheduledFor,
          dueBy,
          status: 'pending',
          priority: schedule.priority,
          createdAt: new Date(),
          createdBy: 'system',
        });

        tasksCreated++;
      }
    }

    console.log(`[Scheduler] Generated ${tasksCreated} tasks for next ${days} days`);
    return tasksCreated;
  }

  // --------------------------------------------------------------------------
  // TASK EXECUTION
  // --------------------------------------------------------------------------

  /**
   * Get tasks that are due for execution (within ±5 minute window)
   */
  async getDueTasks(): Promise<typeof AgentTask.$inferSelect[]> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 5 * 60 * 1000);

    const tasks = await db
      .select()
      .from(AgentTask)
      .where(
        and(
          eq(AgentTask.status, 'pending'),
          gte(AgentTask.scheduledFor, windowStart),
          lte(AgentTask.scheduledFor, windowEnd)
        )
      )
      .orderBy(AgentTask.priority);

    return tasks;
  }

  /**
   * Get overdue tasks that haven't been executed
   */
  async getOverdueTasks(): Promise<typeof AgentTask.$inferSelect[]> {
    const now = new Date();
    const maxOverdue = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour max

    const tasks = await db
      .select()
      .from(AgentTask)
      .where(
        and(
          eq(AgentTask.status, 'pending'),
          lte(AgentTask.scheduledFor, now),
          gte(AgentTask.scheduledFor, maxOverdue)
        )
      );

    return tasks;
  }

  /**
   * Check if a task should run based on conditions
   */
  async shouldRunTask(task: typeof AgentTask.$inferSelect): Promise<{
    should: boolean;
    reason?: string;
  }> {
    // Check if dependent task is complete
    if (task.dependsOnTaskId) {
      const dependentTask = await db
        .select()
        .from(AgentTask)
        .where(eq(AgentTask.id, task.dependsOnTaskId))
        .limit(1);

      if (dependentTask.length > 0 && dependentTask[0].status !== 'completed') {
        return { should: false, reason: 'Dependent task not completed' };
      }
    }

    // Check conditions
    const conditions = task.config as ScheduleConditions | undefined;
    if (conditions) {
      // Check queue minimum items
      if (conditions.queueMinItems) {
        const queueCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(ContentQueue)
          .where(eq(ContentQueue.status, 'pending'));

        if ((queueCount[0]?.count || 0) < conditions.queueMinItems) {
          return { should: false, reason: `Queue has less than ${conditions.queueMinItems} items` };
        }
      }
    }

    // Check if within active shift
    const activeShift = await this.getActiveShift();
    if (activeShift) {
      const shiftAgents = (activeShift.agents as string[]) || [];
      if (!shiftAgents.includes(task.agentType)) {
        return { should: false, reason: `Agent not in active shift: ${activeShift.name}` };
      }
    }

    return { should: true };
  }

  /**
   * Execute a scheduled task
   */
  async executeTask(task: typeof AgentTask.$inferSelect): Promise<TaskExecutionResult> {
    const now = new Date();
    const scheduledFor = new Date(task.scheduledFor);
    const delayMinutes = Math.max(0, Math.floor((now.getTime() - scheduledFor.getTime()) / 60000));
    const wasOnTime = task.dueBy ? now <= new Date(task.dueBy) : delayMinutes <= 15;

    // Update task to running
    await db
      .update(AgentTask)
      .set({
        status: 'running',
        startedAt: now,
        wasOnTime,
        delayMinutes,
      })
      .where(eq(AgentTask.id, task.id));

    try {
      const orchestrator = getOrchestrator();
      const result = await orchestrator.runSingleAgent(task.agentType as AgentType, {
        dryRun: false,
        triggeredBy: 'cron' as TriggerSource,
        maxItems: (task.config as { maxItems?: number })?.maxItems || 10,
      });

      if (result) {
        // Update task to completed
        await db
          .update(AgentTask)
          .set({
            status: result.success ? 'completed' : 'failed',
            completedAt: new Date(),
            runId: result.data?.runId as number | undefined,
          })
          .where(eq(AgentTask.id, task.id));

        // Update compliance metrics
        await this.updateComplianceMetrics(task.agentType, result.success, wasOnTime, delayMinutes);

        // Create alert if task failed
        if (!result.success) {
          await this.createAlert(task.agentType, 'task_failed', task.id, {
            errors: result.errors,
            taskName: task.name,
          });
        }

        // Create alert if task was late
        if (!wasOnTime && delayMinutes > 15) {
          await this.createAlert(task.agentType, 'task_delayed', task.id, {
            delayMinutes,
            taskName: task.name,
          });
        }

        return {
          taskId: task.id,
          success: result.success,
          wasOnTime,
          delayMinutes,
          runId: result.data?.runId as number | undefined,
        };
      }

      // No result returned
      await db
        .update(AgentTask)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(AgentTask.id, task.id));

      return {
        taskId: task.id,
        success: false,
        wasOnTime,
        delayMinutes,
        error: 'Agent returned no result',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await db
        .update(AgentTask)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(AgentTask.id, task.id));

      await this.createAlert(task.agentType, 'task_failed', task.id, {
        error: errorMessage,
        taskName: task.name,
      });

      return {
        taskId: task.id,
        success: false,
        wasOnTime,
        delayMinutes,
        error: errorMessage,
      };
    }
  }

  /**
   * Run all due tasks
   */
  async runDueTasks(): Promise<TaskExecutionResult[]> {
    const results: TaskExecutionResult[] = [];

    // Generate tasks if needed
    await this.generateTasksFromSchedules(3);

    // Get due tasks
    const dueTasks = await this.getDueTasks();
    console.log(`[Scheduler] Found ${dueTasks.length} due tasks`);

    for (const task of dueTasks) {
      const shouldRun = await this.shouldRunTask(task);
      if (!shouldRun.should) {
        console.log(`[Scheduler] Skipping task ${task.name}: ${shouldRun.reason}`);
        await db.update(AgentTask).set({ status: 'skipped' }).where(eq(AgentTask.id, task.id));
        continue;
      }

      console.log(`[Scheduler] Executing task: ${task.name}`);
      const result = await this.executeTask(task);
      results.push(result);
    }

    // Check for overdue tasks and create alerts
    const overdueTasks = await this.getOverdueTasks();
    for (const task of overdueTasks) {
      await db.update(AgentTask).set({ status: 'overdue' }).where(eq(AgentTask.id, task.id));
      await this.createAlert(task.agentType, 'task_delayed', task.id, {
        taskName: task.name,
        scheduledFor: task.scheduledFor,
      });
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // SHIFT MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get the currently active shift
   */
  async getActiveShift(): Promise<typeof AgentShift.$inferSelect | null> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const shifts = await db
      .select()
      .from(AgentShift)
      .where(eq(AgentShift.isEnabled, true));

    for (const shift of shifts) {
      const daysOfWeek = (shift.daysOfWeek as number[]) || [1, 2, 3, 4, 5];
      if (!daysOfWeek.includes(currentDay)) continue;

      // Handle shifts that span midnight
      if (shift.startHour <= shift.endHour) {
        if (currentHour >= shift.startHour && currentHour < shift.endHour) {
          return shift;
        }
      } else {
        if (currentHour >= shift.startHour || currentHour < shift.endHour) {
          return shift;
        }
      }
    }

    return null;
  }

  /**
   * Get all shifts
   */
  async getShifts(): Promise<typeof AgentShift.$inferSelect[]> {
    return db.select().from(AgentShift).orderBy(AgentShift.startHour);
  }

  /**
   * Create or update a shift
   */
  async upsertShift(
    data: Omit<typeof AgentShift.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
    id?: number
  ): Promise<number> {
    if (id) {
      await db
        .update(AgentShift)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(AgentShift.id, id));
      return id;
    }

    const result = await db.insert(AgentShift).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return Number(result.lastInsertRowid);
  }

  // --------------------------------------------------------------------------
  // COMPLIANCE TRACKING
  // --------------------------------------------------------------------------

  /**
   * Update compliance metrics after task execution
   */
  async updateComplianceMetrics(
    agentType: string,
    success: boolean,
    wasOnTime: boolean,
    delayMinutes: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Get or create today's completion record
    const existing = await db
      .select()
      .from(TaskCompletion)
      .where(and(eq(TaskCompletion.date, today), eq(TaskCompletion.agentType, agentType)))
      .limit(1);

    if (existing.length > 0) {
      const record = existing[0];
      const newCompleted = success ? record.tasksCompleted + 1 : record.tasksCompleted;
      const newFailed = success ? record.tasksFailed : record.tasksFailed + 1;
      const newOnTime = wasOnTime ? record.onTimeCount + 1 : record.onTimeCount;
      const newLate = wasOnTime ? record.lateCount : record.lateCount + 1;
      const totalTasks = newCompleted + newFailed;
      const newAvgDelay =
        totalTasks > 0
          ? Math.round((record.averageDelayMinutes * (totalTasks - 1) + delayMinutes) / totalTasks)
          : delayMinutes;

      // Update streak
      let streak = record.consecutiveSuccessDays;
      if (success && wasOnTime) {
        // Keep or increment streak
      } else {
        // Check if this breaks the streak
        if (record.tasksFailed === 0 && !success) {
          // First failure of the day - create alert
          await this.createAlert(agentType, 'streak_broken', undefined, {
            previousStreak: streak,
            reason: success ? 'late' : 'failed',
          });
          streak = 0;
        }
      }

      await db
        .update(TaskCompletion)
        .set({
          tasksCompleted: newCompleted,
          tasksFailed: newFailed,
          onTimeCount: newOnTime,
          lateCount: newLate,
          averageDelayMinutes: newAvgDelay,
          consecutiveSuccessDays: streak,
          updatedAt: new Date(),
        })
        .where(eq(TaskCompletion.id, record.id));
    } else {
      // Create new record for today
      // First, get yesterday's streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayRecord = await db
        .select()
        .from(TaskCompletion)
        .where(and(eq(TaskCompletion.date, yesterdayStr), eq(TaskCompletion.agentType, agentType)))
        .limit(1);

      let streak = 0;
      if (yesterdayRecord.length > 0 && yesterdayRecord[0].tasksFailed === 0) {
        streak = yesterdayRecord[0].consecutiveSuccessDays + 1;
      }
      if (!success) streak = 0;

      await db.insert(TaskCompletion).values({
        date: today,
        agentType,
        tasksScheduled: 1,
        tasksCompleted: success ? 1 : 0,
        tasksFailed: success ? 0 : 1,
        onTimeCount: wasOnTime ? 1 : 0,
        lateCount: wasOnTime ? 0 : 1,
        averageDelayMinutes: delayMinutes,
        consecutiveSuccessDays: streak,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Calculate compliance metrics for an agent
   */
  async calculateComplianceMetrics(
    agentType: string,
    days: number = 7
  ): Promise<ComplianceMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const records = await db
      .select()
      .from(TaskCompletion)
      .where(
        and(eq(TaskCompletion.agentType, agentType), gte(TaskCompletion.date, startDateStr))
      )
      .orderBy(desc(TaskCompletion.date));

    if (records.length === 0) {
      return {
        onTimeRate: 100,
        successRate: 100,
        averageDelay: 0,
        currentStreak: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
      };
    }

    const totals = records.reduce(
      (acc, r) => ({
        completed: acc.completed + r.tasksCompleted,
        failed: acc.failed + r.tasksFailed,
        onTime: acc.onTime + r.onTimeCount,
        late: acc.late + r.lateCount,
        delay: acc.delay + r.averageDelayMinutes,
      }),
      { completed: 0, failed: 0, onTime: 0, late: 0, delay: 0 }
    );

    const total = totals.completed + totals.failed;
    const totalTimeTasks = totals.onTime + totals.late;

    return {
      onTimeRate: totalTimeTasks > 0 ? Math.round((totals.onTime / totalTimeTasks) * 100) : 100,
      successRate: total > 0 ? Math.round((totals.completed / total) * 100) : 100,
      averageDelay: records.length > 0 ? Math.round(totals.delay / records.length) : 0,
      currentStreak: records[0]?.consecutiveSuccessDays || 0,
      tasksCompleted: totals.completed,
      tasksFailed: totals.failed,
    };
  }

  /**
   * Get overall compliance metrics for all agents
   */
  async getOverallCompliance(days: number = 7): Promise<{
    overall: ComplianceMetrics;
    byAgent: Record<string, ComplianceMetrics>;
  }> {
    const agentTypes: AgentType[] = ['deal_hunter', 'content_creator', 'price_monitor', 'channel_manager'];
    const byAgent: Record<string, ComplianceMetrics> = {};

    let totalCompleted = 0;
    let totalFailed = 0;
    let totalOnTime = 0;
    let totalLate = 0;
    let totalDelay = 0;
    let maxStreak = 0;

    for (const agentType of agentTypes) {
      const metrics = await this.calculateComplianceMetrics(agentType, days);
      byAgent[agentType] = metrics;
      totalCompleted += metrics.tasksCompleted;
      totalFailed += metrics.tasksFailed;
      totalOnTime += Math.round((metrics.onTimeRate / 100) * (metrics.tasksCompleted + metrics.tasksFailed));
      totalLate += Math.round(((100 - metrics.onTimeRate) / 100) * (metrics.tasksCompleted + metrics.tasksFailed));
      totalDelay += metrics.averageDelay;
      maxStreak = Math.max(maxStreak, metrics.currentStreak);
    }

    const total = totalCompleted + totalFailed;
    const totalTimeTasks = totalOnTime + totalLate;

    return {
      overall: {
        onTimeRate: totalTimeTasks > 0 ? Math.round((totalOnTime / totalTimeTasks) * 100) : 100,
        successRate: total > 0 ? Math.round((totalCompleted / total) * 100) : 100,
        averageDelay: agentTypes.length > 0 ? Math.round(totalDelay / agentTypes.length) : 0,
        currentStreak: maxStreak,
        tasksCompleted: totalCompleted,
        tasksFailed: totalFailed,
      },
      byAgent,
    };
  }

  // --------------------------------------------------------------------------
  // ALERTS
  // --------------------------------------------------------------------------

  /**
   * Create a compliance alert
   */
  async createAlert(
    agentType: string,
    alertType: AlertType,
    taskId?: number,
    data?: Record<string, unknown>
  ): Promise<void> {
    const messages: Record<AlertType, string> = {
      task_delayed: `Task was delayed by ${data?.delayMinutes || 'unknown'} minutes`,
      task_failed: `Task failed: ${data?.error || 'Unknown error'}`,
      streak_broken: `Success streak broken after ${data?.previousStreak || 0} days`,
      low_performance: `Performance below threshold: ${data?.metric || 'unknown'} at ${data?.value || 'unknown'}%`,
    };

    const severities: Record<AlertType, AlertSeverity> = {
      task_delayed: 'warning',
      task_failed: 'error',
      streak_broken: 'warning',
      low_performance: 'warning',
    };

    await db.insert(AgentAlerts).values({
      agentType,
      taskId,
      alertType,
      severity: severities[alertType],
      message: messages[alertType],
      data: data as Record<string, unknown>,
      createdAt: new Date(),
    });
  }

  /**
   * Get recent alerts
   */
  async getAlerts(options: {
    agentType?: string;
    unreadOnly?: boolean;
    limit?: number;
  } = {}): Promise<typeof AgentAlerts.$inferSelect[]> {
    const { agentType, unreadOnly = false, limit = 50 } = options;

    let query = db.select().from(AgentAlerts);

    if (agentType) {
      query = query.where(eq(AgentAlerts.agentType, agentType)) as typeof query;
    }

    if (unreadOnly) {
      query = query.where(eq(AgentAlerts.isRead, false)) as typeof query;
    }

    return query.orderBy(desc(AgentAlerts.createdAt)).limit(limit);
  }

  /**
   * Mark alerts as read
   */
  async markAlertsRead(alertIds: number[]): Promise<void> {
    if (alertIds.length === 0) return;

    await db
      .update(AgentAlerts)
      .set({ isRead: true })
      .where(inArray(AgentAlerts.id, alertIds));
  }

  // --------------------------------------------------------------------------
  // CALENDAR DATA
  // --------------------------------------------------------------------------

  /**
   * Get calendar data for a date range
   */
  async getCalendarData(
    startDate: Date,
    endDate: Date
  ): Promise<CalendarDay[]> {
    const days: CalendarDay[] = [];
    const current = new Date(startDate);

    // Get all tasks in range
    const tasks = await db
      .select()
      .from(AgentTask)
      .where(
        and(gte(AgentTask.scheduledFor, startDate), lte(AgentTask.scheduledFor, endDate))
      )
      .orderBy(AgentTask.scheduledFor);

    // Get all shifts
    const shifts = await db.select().from(AgentShift).where(eq(AgentShift.isEnabled, true));

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();

      // Filter tasks for this day
      const dayTasks: CalendarTask[] = tasks
        .filter((t) => {
          const taskDate = new Date(t.scheduledFor).toISOString().split('T')[0];
          return taskDate === dateStr;
        })
        .map((t) => ({
          id: t.id,
          agentType: t.agentType,
          name: t.name,
          hour: new Date(t.scheduledFor).getHours(),
          minute: new Date(t.scheduledFor).getMinutes(),
          status: t.status as TaskStatus,
          duration: t.completedAt && t.startedAt
            ? new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()
            : undefined,
          isRecurring: t.scheduleId !== null,
          scheduleId: t.scheduleId || undefined,
        }));

      // Filter shifts for this day
      const dayShifts: CalendarShift[] = shifts
        .filter((s) => {
          const shiftDays = (s.daysOfWeek as number[]) || [1, 2, 3, 4, 5];
          return shiftDays.includes(dayOfWeek);
        })
        .map((s) => ({
          id: s.id,
          name: s.name,
          startHour: s.startHour,
          endHour: s.endHour,
          agents: (s.agents as string[]) || [],
        }));

      days.push({
        date: dateStr,
        tasks: dayTasks,
        shifts: dayShifts,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  /**
   * Reschedule a task to a new time
   */
  async rescheduleTask(taskId: number, newScheduledFor: Date): Promise<boolean> {
    const task = await db.select().from(AgentTask).where(eq(AgentTask.id, taskId)).limit(1);

    if (task.length === 0) return false;
    if (task[0].status !== 'pending') return false;

    const newDueBy = new Date(newScheduledFor.getTime() + 15 * 60 * 1000);

    await db
      .update(AgentTask)
      .set({
        scheduledFor: newScheduledFor,
        dueBy: newDueBy,
      })
      .where(eq(AgentTask.id, taskId));

    return true;
  }
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

let schedulerInstance: AgentScheduler | null = null;

export function getScheduler(timezone?: string): AgentScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new AgentScheduler(timezone);
  }
  return schedulerInstance;
}

/**
 * Initialize default shifts (Morning and Afternoon)
 */
export async function initializeDefaultShifts(): Promise<void> {
  const existingShifts = await db.select().from(AgentShift);
  if (existingShifts.length > 0) return;

  // Morning shift
  await db.insert(AgentShift).values({
    name: 'Turno Mañana',
    description: 'Deal hunting and price monitoring',
    startHour: 8,
    endHour: 14,
    daysOfWeek: [1, 2, 3, 4, 5],
    timezone: 'America/New_York',
    agents: ['deal_hunter', 'price_monitor'],
    maxConcurrentAgents: 1,
    runIntervalMinutes: 60,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Afternoon shift
  await db.insert(AgentShift).values({
    name: 'Turno Tarde',
    description: 'Content creation and publishing',
    startHour: 14,
    endHour: 20,
    daysOfWeek: [1, 2, 3, 4, 5],
    timezone: 'America/New_York',
    agents: ['content_creator', 'channel_manager'],
    maxConcurrentAgents: 1,
    runIntervalMinutes: 60,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('[Scheduler] Default shifts initialized');
}
