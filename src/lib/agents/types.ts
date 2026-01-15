/**
 * Multi-Agent System Types
 *
 * Shared type definitions for the agent orchestration system.
 */

export type AgentType = 'deal_hunter' | 'content_creator' | 'price_monitor' | 'channel_manager';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';

export type TriggerSource = 'cron' | 'manual' | 'api';

export interface AgentMetrics {
  apiCalls: number;
  tokensUsed: number;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  duration: number; // milliseconds
}

export interface AgentResult {
  success: boolean;
  agentType: AgentType;
  itemsProcessed: number;
  errors: string[];
  warnings: string[];
  metrics: AgentMetrics;
  data?: Record<string, unknown>;
}

export interface AgentContext {
  dryRun: boolean;
  maxItems: number;
  triggeredBy: TriggerSource;
  runId?: number; // AgentRunHistory ID
  quotaRemaining: Record<string, number>;
}

export interface AgentConfig {
  agentType: AgentType;
  isEnabled: boolean;
  intervalHours: number;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  config: Record<string, unknown>;
  quotaUsedToday: number;
  quotaLimit: number;
}

// Deal Hunter specific types
export interface DealHunterConfig {
  maxKeywordsPerRun: number;
  minScore: number;
  minDiscount: number;
  autoImport: boolean;
  autoQueueContent: boolean;
}

// Content Creator specific types
export interface ContentCreatorConfig {
  maxItemsPerRun: number;
  contentTypes: ('full' | 'description' | 'pros_cons')[];
  language: 'en' | 'es';
  autoPublish: boolean;
  minScoreToPublish: number;
}

// Price Monitor specific types
export interface PriceMonitorConfig {
  maxProductsPerRun: number;
  dropThresholdPercent: number;
  checkCuratedDeals: boolean;
  checkProducts: boolean;
  createAlerts: boolean;
}

// Channel Manager specific types
export interface ChannelManagerConfig {
  enabledChannels: ('telegram' | 'twitter' | 'discord')[];
  maxPostsPerRun: number;
  delayBetweenPosts: number; // milliseconds
  language: 'en' | 'es';
}

// Publish queue item
export interface PublishItem {
  id: number;
  asin: string;
  marketplace: string;
  channels: string[];
  priority: number;
  contentSnapshot: {
    title: string;
    brand?: string;
    price: number;
    originalPrice?: number;
    currency: string;
    imageUrl?: string;
    affiliateUrl: string;
    rating?: number;
    totalReviews?: number;
    discount?: number;
    alertType?: string;
  };
}

// Content queue item
export interface ContentItem {
  id: number;
  asin: string;
  marketplace: string;
  productId?: number;
  contentType: string;
  priority: number;
  attempts: number;
}

// Price alert
export interface PriceAlertData {
  asin: string;
  marketplace: string;
  productId?: number;
  alertType: 'price_drop' | 'lowest_ever' | 'back_in_stock' | 'threshold';
  previousPrice: number;
  currentPrice: number;
  lowestPrice?: number;
  dropPercent: number;
  dropAmount: number;
  currency: string;
}

// Social platform result
export interface PublishResult {
  success: boolean;
  platform: string;
  messageId?: string;
  error?: string;
  timestamp: Date;
}
