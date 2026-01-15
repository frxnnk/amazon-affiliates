/**
 * Agent Orchestrator
 *
 * Central coordinator that manages the execution of all agents.
 * Handles scheduling, quota management, and sequential execution.
 */

import { db, AgentConfig } from 'astro:db';
import type { BaseAgent } from './base-agent';
import type { AgentType, AgentContext, AgentResult, TriggerSource } from './types';

export interface OrchestratorConfig {
  dryRun: boolean;
  maxItemsPerAgent: number;
  agents?: AgentType[]; // Specific agents to run, or all if not specified
  triggeredBy: TriggerSource;
}

export interface OrchestratorResult {
  success: boolean;
  totalDuration: number;
  agentsRun: number;
  agentsSkipped: number;
  results: Map<AgentType, AgentResult>;
  errors: string[];
}

// Agent execution order (priority)
const AGENT_EXECUTION_ORDER: AgentType[] = [
  'price_monitor', // Lightweight, runs first to detect price changes
  'deal_hunter', // Main discovery agent
  'content_creator', // Process new imports
  'channel_manager', // Publish ready content
];

export class AgentOrchestrator {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private results: Map<AgentType, AgentResult> = new Map();
  private errors: string[] = [];

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.type, agent);
  }

  /**
   * Get registered agent by type
   */
  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }

  /**
   * Run all registered agents in order
   */
  async runAll(config: OrchestratorConfig): Promise<OrchestratorResult> {
    const startTime = Date.now();
    this.results.clear();
    this.errors = [];

    let agentsRun = 0;
    let agentsSkipped = 0;

    // Get quota status for all APIs
    const quotaRemaining = await this.getQuotaStatus();

    // Determine which agents to run
    const agentsToRun = config.agents || AGENT_EXECUTION_ORDER;

    // Filter to only registered agents and maintain order
    const orderedAgents = AGENT_EXECUTION_ORDER.filter(
      (type) => agentsToRun.includes(type) && this.agents.has(type)
    );

    console.log(`[Orchestrator] Starting run with ${orderedAgents.length} agents`);
    console.log(`[Orchestrator] Dry run: ${config.dryRun}`);

    for (const agentType of orderedAgents) {
      const agent = this.agents.get(agentType);
      if (!agent) {
        console.log(`[Orchestrator] Agent ${agentType} not registered, skipping`);
        agentsSkipped++;
        continue;
      }

      // Check if agent can run
      const canRunResult = await agent.canRun({
        dryRun: config.dryRun,
        maxItems: config.maxItemsPerAgent,
        triggeredBy: config.triggeredBy,
        quotaRemaining,
      });

      if (!canRunResult.canRun) {
        console.log(`[Orchestrator] Skipping ${agent.name}: ${canRunResult.reason}`);
        agentsSkipped++;
        continue;
      }

      console.log(`[Orchestrator] Running ${agent.name}...`);

      try {
        const context: AgentContext = {
          dryRun: config.dryRun,
          maxItems: config.maxItemsPerAgent,
          triggeredBy: config.triggeredBy,
          quotaRemaining,
        };

        const result = await agent.run(context);
        this.results.set(agentType, result);
        agentsRun++;

        console.log(
          `[Orchestrator] ${agent.name} completed: ${result.itemsProcessed} items, ${result.errors.length} errors`
        );

        // Update quota remaining based on agent's usage
        if (result.metrics.apiCalls > 0) {
          // Decrement relevant quotas
          quotaRemaining.rapidapi = Math.max(0, (quotaRemaining.rapidapi || 0) - result.metrics.apiCalls);
        }
        if (result.metrics.tokensUsed > 0) {
          quotaRemaining.openai = Math.max(0, (quotaRemaining.openai || 0) - result.metrics.tokensUsed);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.errors.push(`${agent.name}: ${errorMessage}`);
        console.error(`[Orchestrator] ${agent.name} failed:`, errorMessage);
      }
    }

    const totalDuration = Date.now() - startTime;

    console.log(
      `[Orchestrator] Run complete: ${agentsRun} agents run, ${agentsSkipped} skipped, ${totalDuration}ms`
    );

    return {
      success: this.errors.length === 0,
      totalDuration,
      agentsRun,
      agentsSkipped,
      results: this.results,
      errors: this.errors,
    };
  }

  /**
   * Run a specific agent
   */
  async runAgent(agentType: AgentType, config: Omit<OrchestratorConfig, 'agents'>): Promise<AgentResult | null> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      console.error(`[Orchestrator] Agent ${agentType} not registered`);
      return null;
    }

    const quotaRemaining = await this.getQuotaStatus();

    const context: AgentContext = {
      dryRun: config.dryRun,
      maxItems: config.maxItemsPerAgent,
      triggeredBy: config.triggeredBy,
      quotaRemaining,
    };

    return agent.run(context);
  }

  /**
   * Get current quota status for all APIs
   */
  async getQuotaStatus(): Promise<Record<string, number>> {
    // Default quotas (can be customized via environment or database)
    const quotas: Record<string, number> = {
      rapidapi: 16, // ~500/month ÷ 30 days
      openai: 50000, // tokens per day
      twitter: 50, // ~1500/month ÷ 30 days
      youtube: 95, // 10000 units / 100 per search
    };

    // Get usage from agent configs
    const configs = await db.select().from(AgentConfig);

    for (const config of configs) {
      // Subtract used quota from limits
      const used = config.quotaUsedToday || 0;
      // Each agent type might have different API associations
      // For now, we track per-agent quota
    }

    return quotas;
  }

  /**
   * Get status of all registered agents
   */
  async getAgentStatuses(): Promise<
    Array<{
      type: AgentType;
      name: string;
      isEnabled: boolean;
      lastRunAt: Date | null;
      nextRunAt: Date | null;
      quotaUsed: number;
      quotaLimit: number;
    }>
  > {
    const statuses = [];

    for (const [type, agent] of this.agents) {
      const config = await agent.getConfig();
      statuses.push({
        type,
        name: agent.name,
        isEnabled: config?.isEnabled ?? false,
        lastRunAt: config?.lastRunAt ?? null,
        nextRunAt: config?.nextRunAt ?? null,
        quotaUsed: config?.quotaUsedToday ?? 0,
        quotaLimit: config?.quotaLimit ?? 0,
      });
    }

    return statuses;
  }

  /**
   * Enable or disable an agent
   */
  async setAgentEnabled(agentType: AgentType, enabled: boolean): Promise<boolean> {
    const agent = this.agents.get(agentType);
    if (!agent) return false;

    await agent.updateConfig({ isEnabled: enabled });
    return true;
  }

  /**
   * Update agent interval
   */
  async setAgentInterval(agentType: AgentType, intervalHours: number): Promise<boolean> {
    const agent = this.agents.get(agentType);
    if (!agent) return false;

    await agent.updateConfig({ intervalHours });
    return true;
  }
}

// Singleton instance
let orchestratorInstance: AgentOrchestrator | null = null;

/**
 * Get the orchestrator singleton instance
 */
export function getOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Initialize orchestrator with all agents
 * Called once at startup
 */
export async function initializeOrchestrator(): Promise<AgentOrchestrator> {
  const orchestrator = getOrchestrator();

  // Import and register agents dynamically to avoid circular deps
  const { DealHunterAgent } = await import('./deal-hunter');
  const { ContentCreatorAgent } = await import('./content-creator');
  const { PriceMonitorAgent } = await import('./price-monitor');
  const { ChannelManagerAgent } = await import('./channel-manager');

  orchestrator.registerAgent(new DealHunterAgent());
  orchestrator.registerAgent(new ContentCreatorAgent());
  orchestrator.registerAgent(new PriceMonitorAgent());
  orchestrator.registerAgent(new ChannelManagerAgent());

  return orchestrator;
}
