/**
 * Content Creator Agent
 *
 * Autonomously generates product content using OpenAI GPT.
 * Processes items from ContentQueue and updates Products table.
 */

import { db, ContentQueue, Products, PublishQueue } from 'astro:db';
import { eq, and, lte } from 'astro:db';
import { BaseAgent } from './base-agent';
import type { AgentContext, ContentCreatorConfig, ContentItem } from './types';
import { generateProductContent, type GeneratedProductContent } from '@lib/openai';
import { recordUsage, canMakeCall } from '@lib/quota';

const DEFAULT_CONFIG: ContentCreatorConfig = {
  maxItemsPerRun: 5,
  contentTypes: ['full'],
  language: 'en',
  autoPublish: true,
  minScoreToPublish: 7,
};

export class ContentCreatorAgent extends BaseAgent {
  readonly name = 'Content Creator';
  readonly type = 'content_creator' as const;
  readonly defaultConfig = DEFAULT_CONFIG;

  private processedAsins: string[] = [];

  async execute(context: AgentContext): Promise<void> {
    this.log('Starting content generation...');

    // Get agent config
    const agentConfig = await this.getConfig();
    const config: ContentCreatorConfig = {
      ...DEFAULT_CONFIG,
      ...(agentConfig?.config as Partial<ContentCreatorConfig>),
    };

    // Get pending items from queue
    const pendingItems = await this.getPendingItems(config.maxItemsPerRun);

    if (pendingItems.length === 0) {
      this.log('No pending items in content queue');
      return;
    }

    this.log(`Found ${pendingItems.length} items to process`);

    // Process each item
    for (const item of pendingItems) {
      // Check OpenAI quota
      if (!(await canMakeCall('openai', 2000))) {
        // ~2000 tokens per request
        this.addWarning('OpenAI quota exhausted, stopping');
        break;
      }

      if (context.dryRun) {
        this.log(`[DRY RUN] Would generate content for: ${item.asin}`);
        continue;
      }

      await this.processItem(item, config);
    }

    this.log(`Content generation complete: ${this.metrics.itemsSucceeded} items processed`);
  }

  private async getPendingItems(limit: number): Promise<ContentItem[]> {
    const items = await db
      .select()
      .from(ContentQueue)
      .where(
        and(eq(ContentQueue.status, 'pending'), lte(ContentQueue.attempts, ContentQueue.maxAttempts))
      )
      .orderBy(ContentQueue.priority)
      .limit(limit);

    return items.map((item) => ({
      id: item.id,
      asin: item.asin,
      marketplace: item.marketplace,
      productId: item.productId ?? undefined,
      contentType: item.contentType,
      priority: item.priority,
      attempts: item.attempts,
    }));
  }

  private async processItem(item: ContentItem, config: ContentCreatorConfig): Promise<void> {
    try {
      // Mark as processing
      await db
        .update(ContentQueue)
        .set({
          status: 'processing',
          attempts: item.attempts + 1,
        })
        .where(eq(ContentQueue.id, item.id));

      // Get product data
      const product = await this.getProduct(item);
      if (!product) {
        await this.markFailed(item.id, 'Product not found');
        return;
      }

      this.log(`Generating content for: ${item.asin} (${product.title.slice(0, 40)}...)`);

      // Generate content
      const result = await generateProductContent({
        title: product.title,
        brand: product.brand || undefined,
        category: product.category || undefined,
        imageUrl: product.featuredImageUrl || undefined,
        currentDescription: product.description || undefined,
        lang: (product.lang as 'es' | 'en') || config.language,
      });

      // Track API usage
      this.trackApiCall();
      if (result.tokensUsed) {
        this.trackTokens(result.tokensUsed);
        await recordUsage('openai', result.tokensUsed, {
          asin: item.asin,
          type: item.contentType,
        });
      }
      await this.incrementQuota();

      if (!result.success || !result.content) {
        await this.markFailed(item.id, result.error || 'Generation failed');
        this.trackItem(false);
        return;
      }

      // Update product with generated content
      await this.updateProduct(product.id, result.content);

      // Mark queue item as completed
      await db
        .update(ContentQueue)
        .set({
          status: 'completed',
          generatedContent: result.content,
          processedAt: new Date(),
        })
        .where(eq(ContentQueue.id, item.id));

      this.processedAsins.push(item.asin);
      this.trackItem(true);

      // Queue for publishing if auto-publish is enabled
      if (config.autoPublish) {
        await this.queueForPublish(item.asin, item.marketplace, product);
      }

      this.log(`Generated content for ${item.asin} (${result.tokensUsed} tokens)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.markFailed(item.id, message);
      this.addError(`${item.asin}: ${message}`);
      this.trackItem(false);
    }
  }

  private async getProduct(
    item: ContentItem
  ): Promise<{
    id: number;
    title: string;
    brand: string | null;
    category: string | null;
    featuredImageUrl: string | null;
    description: string | null;
    lang: string;
    price: number;
    originalPrice: number | null;
    currency: string;
    affiliateUrl: string;
    rating: number | null;
    totalReviews: number | null;
  } | null> {
    // Try to get by productId first, then by ASIN
    let products;

    if (item.productId) {
      products = await db.select().from(Products).where(eq(Products.id, item.productId));
    }

    if (!products || products.length === 0) {
      products = await db.select().from(Products).where(eq(Products.asin, item.asin));
    }

    if (products.length === 0) return null;

    const p = products[0];
    return {
      id: p.id,
      title: p.title,
      brand: p.brand,
      category: p.category,
      featuredImageUrl: p.featuredImageUrl,
      description: p.description,
      lang: p.lang,
      price: p.price,
      originalPrice: p.originalPrice,
      currency: p.currency,
      affiliateUrl: p.affiliateUrl,
      rating: p.rating,
      totalReviews: p.totalReviews,
    };
  }

  private async updateProduct(productId: number, content: GeneratedProductContent): Promise<void> {
    await db
      .update(Products)
      .set({
        title: content.title,
        shortDescription: content.shortDescription,
        description: content.description,
        pros: content.pros,
        cons: content.cons,
        status: 'draft', // Keep as draft, require manual publish
        updatedAt: new Date(),
      })
      .where(eq(Products.id, productId));
  }

  private async markFailed(queueId: number, error: string): Promise<void> {
    await db
      .update(ContentQueue)
      .set({
        status: 'failed',
        error,
        processedAt: new Date(),
      })
      .where(eq(ContentQueue.id, queueId));
  }

  private async queueForPublish(
    asin: string,
    marketplace: string,
    product: {
      id: number;
      title: string;
      brand: string | null;
      price: number;
      originalPrice: number | null;
      currency: string;
      affiliateUrl: string;
      featuredImageUrl: string | null;
      rating: number | null;
      totalReviews: number | null;
    }
  ): Promise<void> {
    try {
      // Check if already in queue
      const existing = await db
        .select()
        .from(PublishQueue)
        .where(and(eq(PublishQueue.asin, asin), eq(PublishQueue.status, 'pending')));

      if (existing.length > 0) {
        return;
      }

      // Calculate discount
      const discount = product.originalPrice
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;

      await db.insert(PublishQueue).values({
        asin,
        marketplace,
        productId: product.id,
        channels: ['telegram', 'twitter', 'discord'],
        status: 'pending',
        priority: discount >= 30 ? 10 : 0, // High priority for big discounts
        contentSnapshot: {
          title: product.title,
          brand: product.brand,
          price: product.price,
          originalPrice: product.originalPrice,
          currency: product.currency,
          imageUrl: product.featuredImageUrl,
          affiliateUrl: product.affiliateUrl,
          rating: product.rating,
          totalReviews: product.totalReviews,
          discount,
        },
        createdAt: new Date(),
      });

      this.log(`Queued ${asin} for publishing`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addWarning(`Failed to queue ${asin} for publish: ${message}`);
    }
  }

  protected override buildResultData(): Record<string, unknown> {
    return {
      ...super.buildResultData(),
      processedAsins: this.processedAsins,
      tokensUsed: this.metrics.tokensUsed,
    };
  }
}
