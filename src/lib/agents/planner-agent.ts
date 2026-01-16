/**
 * Planner Agent - AI-Powered Schedule Generation
 *
 * DISABLED FOR MVP - Advanced scheduling not needed for initial version.
 * Re-enable when you need AI-optimized scheduling.
 *
 * Uses GPT to analyze system state and generate optimal schedules
 * for all agents based on:
 * - Historical performance data
 * - Current workload and priorities
 * - Business rules and constraints
 * - Time-of-day effectiveness patterns
 */

import { db, AgentRunHistory, AgentConfig, AgentTask, TaskCompletion, AgentSchedule } from 'astro:db';
import { eq, desc, gte, and } from 'astro:db';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

interface AgentPerformanceData {
  agentType: string;
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  avgItemsProcessed: number;
  bestHours: number[]; // Hours with highest success rate
  recentErrors: string[];
}

interface PlanningContext {
  agents: AgentPerformanceData[];
  currentTasks: { agentType: string; scheduledFor: Date; status: string }[];
  complianceData: { agentType: string; onTimeRate: number; successRate: number }[];
  businessPriorities: string[];
  constraints: {
    maxConcurrentAgents: number;
    workingHours: { start: number; end: number };
    timezone: string;
  };
}

interface GeneratedTask {
  agentType: string;
  name: string;
  description: string;
  scheduledFor: string; // ISO string
  priority: number;
  reasoning: string;
}

interface PlanningResult {
  success: boolean;
  tasks: GeneratedTask[];
  reasoning: string;
  tokensUsed?: number;
  error?: string;
}

/**
 * Get OpenAI API key
 */
function getApiKey(): string {
  const apiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Gather performance data for all agents
 */
async function getAgentPerformanceData(days: number = 7): Promise<AgentPerformanceData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const configs = await db.select().from(AgentConfig);
  const results: AgentPerformanceData[] = [];

  for (const config of configs) {
    const runs = await db
      .select()
      .from(AgentRunHistory)
      .where(
        and(
          eq(AgentRunHistory.agentType, config.agentType),
          gte(AgentRunHistory.startedAt, startDate)
        )
      )
      .orderBy(desc(AgentRunHistory.startedAt))
      .limit(50);

    if (runs.length === 0) {
      results.push({
        agentType: config.agentType,
        totalRuns: 0,
        successRate: 0,
        avgDuration: 0,
        avgItemsProcessed: 0,
        bestHours: [9, 10, 11, 14, 15, 16], // Default hours
        recentErrors: [],
      });
      continue;
    }

    const successfulRuns = runs.filter(r => r.status === 'success');
    const successRate = (successfulRuns.length / runs.length) * 100;

    const avgDuration = runs.reduce((sum, r) => sum + (r.durationMs || 0), 0) / runs.length;
    const avgItemsProcessed = runs.reduce((sum, r) => sum + (r.itemsProcessed || 0), 0) / runs.length;

    // Calculate best hours based on success rate per hour
    const hourStats = new Map<number, { success: number; total: number }>();
    for (const run of runs) {
      if (run.startedAt) {
        const hour = new Date(run.startedAt).getHours();
        const stats = hourStats.get(hour) || { success: 0, total: 0 };
        stats.total++;
        if (run.status === 'success') stats.success++;
        hourStats.set(hour, stats);
      }
    }

    const bestHours = Array.from(hourStats.entries())
      .filter(([_, stats]) => stats.total >= 2) // At least 2 runs
      .sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total))
      .slice(0, 6)
      .map(([hour]) => hour);

    // Get recent errors
    const recentErrors = runs
      .filter(r => r.status === 'error' && r.errors)
      .slice(0, 3)
      .map(r => {
        const errors = r.errors as string[] | null;
        return errors?.[0] || 'Unknown error';
      });

    results.push({
      agentType: config.agentType,
      totalRuns: runs.length,
      successRate: Math.round(successRate),
      avgDuration: Math.round(avgDuration),
      avgItemsProcessed: Math.round(avgItemsProcessed * 10) / 10,
      bestHours: bestHours.length > 0 ? bestHours : [9, 10, 11, 14, 15, 16],
      recentErrors,
    });
  }

  return results;
}

/**
 * Get current pending tasks
 */
async function getCurrentTasks(): Promise<{ agentType: string; scheduledFor: Date; status: string }[]> {
  const tasks = await db
    .select()
    .from(AgentTask)
    .where(eq(AgentTask.status, 'pending'))
    .orderBy(AgentTask.scheduledFor)
    .limit(20);

  return tasks.map(t => ({
    agentType: t.agentType,
    scheduledFor: t.scheduledFor!,
    status: t.status,
  }));
}

/**
 * Get compliance data for context
 */
async function getComplianceData(days: number = 7): Promise<{ agentType: string; onTimeRate: number; successRate: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const records = await db
    .select()
    .from(TaskCompletion)
    .where(gte(TaskCompletion.date, startDateStr));

  // Aggregate by agent
  const agentMap = new Map<string, { onTime: number; success: number; total: number }>();

  for (const record of records) {
    const existing = agentMap.get(record.agentType) || { onTime: 0, success: 0, total: 0 };
    existing.onTime += record.onTimeCount;
    existing.success += record.tasksCompleted;
    existing.total += record.tasksCompleted + record.tasksFailed;
    agentMap.set(record.agentType, existing);
  }

  return Array.from(agentMap.entries()).map(([agentType, data]) => ({
    agentType,
    onTimeRate: data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 100,
    successRate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 100,
  }));
}

/**
 * Generate AI-powered schedule using GPT
 */
export async function generateAISchedule(
  daysAhead: number = 3,
  options: {
    priorities?: string[];
    focusAgents?: string[];
    timezone?: string;
  } = {}
): Promise<PlanningResult> {
  try {
    const apiKey = getApiKey();

    // Gather context data
    const agents = await getAgentPerformanceData(14); // 2 weeks of history
    const currentTasks = await getCurrentTasks();
    const complianceData = await getComplianceData(7);

    const context: PlanningContext = {
      agents,
      currentTasks,
      complianceData,
      businessPriorities: options.priorities || [
        'Find deals with high discount percentages',
        'Maintain content freshness',
        'Monitor price changes for user alerts',
        'Ensure social media presence'
      ],
      constraints: {
        maxConcurrentAgents: 2,
        workingHours: { start: 8, end: 20 },
        timezone: options.timezone || 'America/New_York',
      },
    };

    // Build the prompt
    const systemPrompt = `Eres un experto en planificación y optimización de sistemas de agentes automáticos.
Tu tarea es generar un horario óptimo de tareas para los próximos ${daysAhead} días.

REGLAS IMPORTANTES:
1. Cada agente debe tener entre 2-4 tareas por día
2. No programar tareas simultáneas del mismo agente
3. Respetar las horas de trabajo (${context.constraints.workingHours.start}:00 - ${context.constraints.workingHours.end}:00)
4. Priorizar agentes con bajo rendimiento en horas donde históricamente funcionan mejor
5. Espaciar tareas al menos 2 horas entre sí para el mismo agente
6. Dar prioridad más alta (70-100) a tareas críticas, media (40-69) a rutinas, baja (1-39) a mantenimiento

TIPOS DE AGENTES:
- deal_hunter: Busca ofertas y descuentos en Amazon
- content_creator: Genera contenido para productos
- price_monitor: Monitorea cambios de precios
- channel_manager: Gestiona publicaciones en redes sociales

Responde SOLO con JSON válido, sin markdown ni explicaciones.`;

    const userPrompt = `CONTEXTO ACTUAL:

## Rendimiento de Agentes (últimos 14 días)
${JSON.stringify(agents, null, 2)}

## Tareas Pendientes
${JSON.stringify(currentTasks, null, 2)}

## Métricas de Cumplimiento (últimos 7 días)
${JSON.stringify(complianceData, null, 2)}

## Prioridades de Negocio
${context.businessPriorities.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Fecha y Hora Actual
${new Date().toISOString()} (Timezone: ${context.constraints.timezone})

---

Genera un plan de tareas para los próximos ${daysAhead} días con el siguiente formato JSON:

{
  "tasks": [
    {
      "agentType": "deal_hunter",
      "name": "Búsqueda matutina de ofertas",
      "description": "Búsqueda de ofertas del día con descuentos >30%",
      "scheduledFor": "2024-01-15T09:00:00.000Z",
      "priority": 80,
      "reasoning": "El deal_hunter tiene mejor rendimiento a las 9am según histórico"
    }
  ],
  "reasoning": "Explicación general del plan generado"
}`;

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        tasks: [],
        reasoning: '',
        error: `OpenAI API error: ${error}`,
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        tasks: [],
        reasoning: '',
        error: 'No response from GPT',
      };
    }

    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    // Validate and adjust dates to be in the future
    const now = new Date();
    const validTasks: GeneratedTask[] = [];

    for (const task of parsed.tasks || []) {
      const scheduledFor = new Date(task.scheduledFor);

      // If the date is in the past, adjust to tomorrow at the same time
      if (scheduledFor < now) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(scheduledFor.getHours(), scheduledFor.getMinutes(), 0, 0);
        task.scheduledFor = tomorrow.toISOString();
      }

      validTasks.push({
        agentType: task.agentType,
        name: task.name,
        description: task.description || '',
        scheduledFor: task.scheduledFor,
        priority: task.priority || 50,
        reasoning: task.reasoning || '',
      });
    }

    return {
      success: true,
      tasks: validTasks,
      reasoning: parsed.reasoning || 'Plan generado por IA',
      tokensUsed: data.usage?.total_tokens,
    };
  } catch (error) {
    return {
      success: false,
      tasks: [],
      reasoning: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Apply AI-generated schedule to the database
 */
export async function applyAISchedule(
  tasks: GeneratedTask[],
  options: { clearExisting?: boolean; createdBy?: string } = {}
): Promise<{ success: boolean; tasksCreated: number; error?: string }> {
  try {
    // Optionally clear existing pending tasks
    if (options.clearExisting) {
      await db.delete(AgentTask).where(eq(AgentTask.status, 'pending'));
    }

    let tasksCreated = 0;

    for (const task of tasks) {
      const scheduledFor = new Date(task.scheduledFor);
      const dueBy = new Date(scheduledFor.getTime() + 30 * 60 * 1000); // 30 min window

      await db.insert(AgentTask).values({
        agentType: task.agentType,
        scheduleId: null, // AI-generated, not from recurring schedule
        name: task.name,
        description: task.description,
        taskType: 'ai_planned',
        config: { reasoning: task.reasoning },
        scheduledFor,
        dueBy,
        status: 'pending',
        priority: task.priority,
        createdAt: new Date(),
        createdBy: options.createdBy || 'ai_planner',
      });

      tasksCreated++;
    }

    return { success: true, tasksCreated };
  } catch (error) {
    return {
      success: false,
      tasksCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Full AI planning cycle: generate and apply
 */
export async function runAIPlanning(
  daysAhead: number = 3,
  options: {
    clearExisting?: boolean;
    priorities?: string[];
    focusAgents?: string[];
    timezone?: string;
    createdBy?: string;
  } = {}
): Promise<{
  success: boolean;
  tasksGenerated: number;
  tasksCreated: number;
  reasoning: string;
  tokensUsed?: number;
  error?: string;
}> {
  console.log('[AI Planner] Starting AI planning cycle...');

  // Generate schedule
  const planResult = await generateAISchedule(daysAhead, {
    priorities: options.priorities,
    focusAgents: options.focusAgents,
    timezone: options.timezone,
  });

  if (!planResult.success) {
    console.error('[AI Planner] Failed to generate schedule:', planResult.error);
    return {
      success: false,
      tasksGenerated: 0,
      tasksCreated: 0,
      reasoning: '',
      error: planResult.error,
    };
  }

  console.log(`[AI Planner] Generated ${planResult.tasks.length} tasks`);

  // Apply to database
  const applyResult = await applyAISchedule(planResult.tasks, {
    clearExisting: options.clearExisting,
    createdBy: options.createdBy,
  });

  if (!applyResult.success) {
    console.error('[AI Planner] Failed to apply schedule:', applyResult.error);
    return {
      success: false,
      tasksGenerated: planResult.tasks.length,
      tasksCreated: 0,
      reasoning: planResult.reasoning,
      tokensUsed: planResult.tokensUsed,
      error: applyResult.error,
    };
  }

  console.log(`[AI Planner] Successfully created ${applyResult.tasksCreated} tasks`);

  return {
    success: true,
    tasksGenerated: planResult.tasks.length,
    tasksCreated: applyResult.tasksCreated,
    reasoning: planResult.reasoning,
    tokensUsed: planResult.tokensUsed,
  };
}
