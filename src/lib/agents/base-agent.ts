/**
 * Base Agent Class
 *
 * Abstract base class that all agents must extend.
 * Provides common functionality for quota tracking, logging, and state management.
 */

import { db, AgentConfig, AgentRunHistory } from 'astro:db';
import { eq } from 'astro:db';
import type {
  AgentType,
  AgentResult,
  AgentContext,
  AgentMetrics,
  AgentConfig as AgentConfigType,
} from './types';

export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly type: AgentType;
  abstract readonly defaultConfig: unknown;

  protected metrics: AgentMetrics = {
    apiCalls: 0,
    tokensUsed: 0,
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    duration: 0,
  };

  protected errors: string[] = [];
  protected warnings: string[] = [];
  protected startTime: number = 0;

  /**
   * Check if the agent can run based on quota and time constraints
   */
  async canRun(context: AgentContext): Promise<{ canRun: boolean; reason?: string }> {
    const config = await this.getConfig();

    if (!config) {
      return { canRun: false, reason: 'Agent not configured' };
    }

    if (!config.isEnabled) {
      return { canRun: false, reason: 'Agent is disabled' };
    }

    // Check if enough time has passed since last run
    if (config.lastRunAt && config.nextRunAt) {
      const now = new Date();
      if (now < config.nextRunAt) {
        return {
          canRun: false,
          reason: `Next run scheduled for ${config.nextRunAt.toISOString()}`,
        };
      }
    }

    // Check quota
    if (config.quotaUsedToday >= config.quotaLimit) {
      return { canRun: false, reason: 'Daily quota exhausted' };
    }

    return { canRun: true };
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract execute(context: AgentContext): Promise<void>;

  /**
   * Run the agent with proper lifecycle management
   */
  async run(context: AgentContext): Promise<AgentResult> {
    this.resetState();
    this.startTime = Date.now();

    // Create run history entry
    const runId = await this.createRunEntry(context.triggeredBy);
    context.runId = runId;

    try {
      // Update status to running
      await this.updateRunStatus(runId, 'running');

      // Execute agent logic
      await this.execute(context);

      // Calculate duration
      this.metrics.duration = Date.now() - this.startTime;

      // Update last run time
      await this.updateLastRun();

      // Mark as completed
      await this.updateRunStatus(runId, 'completed', {
        result: this.buildResultData(),
        metrics: this.metrics,
      });

      return this.buildResult(true);
    } catch (error) {
      this.metrics.duration = Date.now() - this.startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push(errorMessage);

      // Mark as failed
      await this.updateRunStatus(runId, 'failed', {
        error: errorMessage,
        metrics: this.metrics,
      });

      return this.buildResult(false);
    }
  }

  /**
   * Get agent configuration from database
   */
  async getConfig(): Promise<AgentConfigType | null> {
    const configs = await db
      .select()
      .from(AgentConfig)
      .where(eq(AgentConfig.agentType, this.type));

    if (configs.length === 0) {
      // Initialize default config
      await this.initializeConfig();
      return this.getConfig();
    }

    const config = configs[0];
    return {
      agentType: config.agentType as AgentType,
      isEnabled: config.isEnabled,
      intervalHours: config.intervalHours,
      lastRunAt: config.lastRunAt,
      nextRunAt: config.nextRunAt,
      config: config.config as Record<string, unknown>,
      quotaUsedToday: config.quotaUsedToday,
      quotaLimit: config.quotaLimit,
    };
  }

  /**
   * Initialize agent configuration with defaults
   */
  private async initializeConfig(): Promise<void> {
    await db.insert(AgentConfig).values({
      agentType: this.type,
      isEnabled: true,
      intervalHours: 6,
      config: this.defaultConfig,
      quotaUsedToday: 0,
      quotaLimit: 100,
      updatedAt: new Date(),
    });
  }

  /**
   * Update agent configuration
   */
  async updateConfig(updates: Partial<AgentConfigType>): Promise<void> {
    await db
      .update(AgentConfig)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(AgentConfig.agentType, this.type));
  }

  /**
   * Create a new run history entry
   */
  private async createRunEntry(triggeredBy: string): Promise<number> {
    const result = await db
      .insert(AgentRunHistory)
      .values({
        agentType: this.type,
        status: 'pending',
        startedAt: new Date(),
        triggeredBy,
      })
      .returning({ id: AgentRunHistory.id });

    return result[0].id;
  }

  /**
   * Update run history status
   */
  private async updateRunStatus(
    runId: number,
    status: string,
    data?: { result?: unknown; error?: string; metrics?: AgentMetrics }
  ): Promise<void> {
    const updates: Record<string, unknown> = { status };

    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }

    if (data?.result) {
      updates.result = data.result;
    }

    if (data?.error) {
      updates.error = data.error;
    }

    if (data?.metrics) {
      updates.metrics = data.metrics;
    }

    await db.update(AgentRunHistory).set(updates).where(eq(AgentRunHistory.id, runId));
  }

  /**
   * Update last run timestamp and calculate next run
   */
  private async updateLastRun(): Promise<void> {
    const config = await this.getConfig();
    if (!config) return;

    const now = new Date();
    const nextRun = new Date(now.getTime() + config.intervalHours * 60 * 60 * 1000);

    await db
      .update(AgentConfig)
      .set({
        lastRunAt: now,
        nextRunAt: nextRun,
        updatedAt: now,
      })
      .where(eq(AgentConfig.agentType, this.type));
  }

  /**
   * Increment quota usage
   */
  protected async incrementQuota(amount: number = 1): Promise<void> {
    const config = await this.getConfig();
    if (!config) return;

    // Check if quota needs reset (new day)
    await this.checkQuotaReset();

    await db
      .update(AgentConfig)
      .set({
        quotaUsedToday: config.quotaUsedToday + amount,
        updatedAt: new Date(),
      })
      .where(eq(AgentConfig.agentType, this.type));
  }

  /**
   * Check and reset daily quota if needed
   */
  private async checkQuotaReset(): Promise<void> {
    const configs = await db
      .select()
      .from(AgentConfig)
      .where(eq(AgentConfig.agentType, this.type));

    if (configs.length === 0) return;

    const config = configs[0];
    const now = new Date();
    const resetAt = config.quotaResetAt;

    // Reset if no reset date or if it's a new day
    if (!resetAt || now.toDateString() !== resetAt.toDateString()) {
      await db
        .update(AgentConfig)
        .set({
          quotaUsedToday: 0,
          quotaResetAt: now,
          updatedAt: now,
        })
        .where(eq(AgentConfig.agentType, this.type));
    }
  }

  /**
   * Track API call for metrics
   */
  protected trackApiCall(count: number = 1): void {
    this.metrics.apiCalls += count;
  }

  /**
   * Track token usage for metrics
   */
  protected trackTokens(count: number): void {
    this.metrics.tokensUsed += count;
  }

  /**
   * Track processed item
   */
  protected trackItem(success: boolean): void {
    this.metrics.itemsProcessed++;
    if (success) {
      this.metrics.itemsSucceeded++;
    } else {
      this.metrics.itemsFailed++;
    }
  }

  /**
   * Add error message
   */
  protected addError(message: string): void {
    this.errors.push(message);
  }

  /**
   * Add warning message
   */
  protected addWarning(message: string): void {
    this.warnings.push(message);
  }

  /**
   * Log message with agent prefix
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[${this.name}]`;
    switch (level) {
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  /**
   * Reset internal state for new run
   */
  private resetState(): void {
    this.metrics = {
      apiCalls: 0,
      tokensUsed: 0,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      duration: 0,
    };
    this.errors = [];
    this.warnings = [];
    this.startTime = 0;
  }

  /**
   * Build result data for storage
   */
  protected buildResultData(): Record<string, unknown> {
    return {
      itemsProcessed: this.metrics.itemsProcessed,
      itemsSucceeded: this.metrics.itemsSucceeded,
      itemsFailed: this.metrics.itemsFailed,
    };
  }

  /**
   * Build final result object
   */
  private buildResult(success: boolean): AgentResult {
    return {
      success: success && this.errors.length === 0,
      agentType: this.type,
      itemsProcessed: this.metrics.itemsProcessed,
      errors: this.errors,
      warnings: this.warnings,
      metrics: this.metrics,
      data: this.buildResultData(),
    };
  }
}
