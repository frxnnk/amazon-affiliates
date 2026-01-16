/**
 * Deal Hunter Agent
 *
 * Autonomously searches for deals using configured keywords,
 * scores them, imports to database, and queues for content generation.
 */

import { db, DealAgentKeywords, Products, ContentQueue } from 'astro:db';
import { eq, and } from 'astro:db';
import { BaseAgent } from './base-agent';
import type { AgentContext, DealHunterConfig } from './types';
import { getDealAgentKeywords, updateKeywordSearched, getDealAgentConfig } from '@lib/db';
import { searchProductsRainforest, isRainforestConfigured } from '@lib/rainforest-api';
import { calculateQuickScore, type AnalyzableProduct } from '@lib/deal-analyzer';
import { recordUsage, canMakeCall } from '@lib/quota';
import { trackApiCall } from '@lib/api-tracker';

const DEFAULT_CONFIG: DealHunterConfig = {
  maxKeywordsPerRun: 5,
  minScore: 25, // Quick score threshold (1-100) - lowered for better discovery
  minDiscount: 10, // Minimum discount percentage
  autoImport: true,
  autoQueueContent: true,
};

export class DealHunterAgent extends BaseAgent {
  readonly name = 'Deal Hunter';
  readonly type = 'deal_hunter' as const;
  readonly defaultConfig = DEFAULT_CONFIG;

  private importedAsins: string[] = [];

  async execute(context: AgentContext): Promise<void> {
    this.log('Starting deal hunt...');

    // Check if RapidAPI is configured
    if (!isRainforestConfigured()) {
      this.addError('RapidAPI not configured');
      return;
    }

    // Get agent config
    const agentConfig = await this.getConfig();
    const config: DealHunterConfig = {
      ...DEFAULT_CONFIG,
      ...(agentConfig?.config as Partial<DealHunterConfig>),
    };

    // Get additional settings from DealAgentConfig
    const minDiscount = ((await getDealAgentConfig('minDiscount')) as number) || config.minDiscount;

    // Get active keywords
    const keywords = await getDealAgentKeywords(true);
    if (keywords.length === 0) {
      this.addWarning('No active keywords configured');
      return;
    }

    this.log(`Found ${keywords.length} active keywords`);

    // Limit keywords per run
    const keywordsToProcess = keywords.slice(0, config.maxKeywordsPerRun);

    // Get affiliate tag
    const affiliateTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';

    // Process each keyword
    for (let i = 0; i < keywordsToProcess.length; i++) {
      const keyword = keywordsToProcess[i];

      // Emit progress
      await this.emitProgress(i + 1, keywordsToProcess.length, `Searching: ${keyword.keyword}`);

      // Check quota before each search
      if (!(await canMakeCall('rapidapi'))) {
        this.addWarning('RapidAPI quota exhausted, stopping');
        await this.emitEvent('warning', 'RapidAPI quota exhausted', { keyword: keyword.keyword });
        break;
      }

      if (context.dryRun) {
        this.log(`[DRY RUN] Would search for: ${keyword.keyword}`);
        continue;
      }

      await this.processKeyword(keyword, {
        minDiscount,
        minScore: config.minScore,
        autoImport: config.autoImport,
        autoQueueContent: config.autoQueueContent,
        affiliateTag,
        maxItemsPerKeyword: 3,
        maxTotalImports: context.maxItems,
      });

      // Rate limiting between keywords
      await this.delay(500);
    }

    this.log(`Hunt complete: ${this.metrics.itemsSucceeded} products imported`);
  }

  private async processKeyword(
    keyword: { id: number; keyword: string; marketplace: string; category: string | null },
    options: {
      minDiscount: number;
      minScore: number;
      autoImport: boolean;
      autoQueueContent: boolean;
      affiliateTag: string;
      maxItemsPerKeyword: number;
      maxTotalImports: number;
    }
  ): Promise<void> {
    try {
      this.log(`Searching: "${keyword.keyword}" in ${keyword.marketplace}`);

      // Search products
      const startTime = Date.now();
      const searchResult = await searchProductsRainforest({
        keywords: keyword.keyword,
        amazonDomain: keyword.marketplace,
        category: keyword.category || undefined,
      });
      const responseTimeMs = Date.now() - startTime;

      // Track API call
      this.trackApiCall();
      await recordUsage('rapidapi', 1, { keyword: keyword.keyword });
      // Track in ApiUsage table for cost dashboard
      await trackApiCall({
        apiName: 'rapidapi',
        endpoint: 'search',
        agentType: this.type,
        context: { keyword: keyword.keyword, marketplace: keyword.marketplace },
        success: searchResult.success,
        responseTimeMs,
      });
      await this.incrementQuota();

      if (!searchResult.success || !searchResult.data) {
        this.addWarning(`No results for "${keyword.keyword}"`);
        return;
      }

      const products = searchResult.data;
      this.log(`Found ${products.length} products for "${keyword.keyword}"`);

      // Update keyword stats
      await updateKeywordSearched(keyword.id, products.length);

      // Emit search results event
      await this.emitEvent('info', `Found ${products.length} products for "${keyword.keyword}"`, {
        keyword: keyword.keyword,
        resultsCount: products.length,
      });

      // Filter for deals with minimum discount
      const deals = products.filter((p) => {
        if (!p.price || !p.originalPrice) return false;
        const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
        return discount >= options.minDiscount;
      });

      this.log(`${deals.length} products meet minimum discount of ${options.minDiscount}%`);

      if (deals.length > 0) {
        await this.emitEvent('info', `${deals.length} deals found with ${options.minDiscount}%+ discount`, {
          keyword: keyword.keyword,
          dealsCount: deals.length,
        });
      }

      // Process each deal
      let imported = 0;
      for (const deal of deals.slice(0, options.maxItemsPerKeyword)) {
        if (this.metrics.itemsSucceeded >= options.maxTotalImports) {
          this.addWarning('Max imports reached');
          break;
        }

        // Calculate quick score
        const analyzable: AnalyzableProduct = {
          asin: deal.asin,
          title: deal.title,
          price: deal.price!,
          originalPrice: deal.originalPrice,
          currency: deal.currency,
          rating: deal.rating,
          totalReviews: deal.totalReviews,
          brand: deal.brand,
          imageUrl: deal.imageUrl,
        };
        const quickScore = calculateQuickScore(analyzable);

        if (quickScore < options.minScore) {
          this.log(`Skipping ${deal.asin}: score ${quickScore} < ${options.minScore}`);
          await this.emitEvent('info', `Skipped: score ${quickScore} < ${options.minScore}`, {
            asin: deal.asin,
            score: quickScore,
            minScore: options.minScore,
          });
          continue;
        }

        // Check if already imported
        if (await this.isAlreadyImported(deal.asin)) {
          this.log(`Skipping ${deal.asin}: already exists`);
          await this.emitEvent('info', `Skipped: already exists`, { asin: deal.asin });
          continue;
        }

        if (options.autoImport) {
          const success = await this.importProduct(deal, keyword, options.affiliateTag);
          if (success) {
            imported++;
            this.importedAsins.push(deal.asin);

            // Queue for content generation
            if (options.autoQueueContent) {
              await this.queueForContent(deal.asin, keyword.marketplace);
            }
          }
        }
      }

      if (imported > 0) {
        this.log(`Imported ${imported} products from "${keyword.keyword}"`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addError(`Keyword "${keyword.keyword}": ${message}`);
    }
  }

  private async isAlreadyImported(asin: string): Promise<boolean> {
    // Check in-memory first
    if (this.importedAsins.includes(asin)) return true;

    // Check database
    const existing = await db.select().from(Products).where(eq(Products.asin, asin));
    return existing.length > 0;
  }

  private async importProduct(
    deal: {
      asin: string;
      title: string;
      price: number | null;
      originalPrice?: number | null;
      currency?: string;
      rating?: number | null;
      totalReviews?: number | null;
      brand?: string | null;
      imageUrl?: string | null;
      description?: string | null;
    },
    keyword: { marketplace: string; category: string | null },
    affiliateTag: string
  ): Promise<boolean> {
    // Validate required fields
    if (!deal.price) {
      this.addWarning(`Skipping ${deal.asin}: no price available`);
      return false;
    }
    try {
      const amazonDomain = keyword.marketplace === 'es' ? 'amazon.es' : 'amazon.com';
      const affiliateUrl = `https://www.${amazonDomain}/dp/${deal.asin}?tag=${affiliateTag}`;
      const productId = this.generateSlug(deal.title) + '-' + deal.asin.slice(-4);

      await db.insert(Products).values({
        productId,
        asin: deal.asin,
        lang: keyword.marketplace === 'es' ? 'es' : 'en',
        title: deal.title,
        brand: deal.brand || 'Amazon',
        description: deal.description || deal.title,
        price: deal.price,
        originalPrice: deal.originalPrice || undefined,
        currency: deal.currency || 'USD',
        affiliateUrl,
        rating: deal.rating || undefined,
        totalReviews: deal.totalReviews || undefined,
        featuredImageUrl: deal.imageUrl || '',
        category: keyword.category || 'electronics',
        status: 'draft',
        isOnSale: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.trackItem(true);
      this.log(`Imported: ${deal.asin} - ${deal.title.slice(0, 50)}...`);

      // Emit item processed event
      await this.emitItemProcessed(deal.asin, true, {
        title: deal.title.slice(0, 60),
        price: deal.price,
        originalPrice: deal.originalPrice,
        discount: deal.originalPrice ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100) : 0,
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addError(`Import failed for ${deal.asin}: ${message}`);
      this.trackItem(false);
      return false;
    }
  }

  private async queueForContent(asin: string, marketplace: string): Promise<void> {
    try {
      // Check if already in queue
      const existing = await db
        .select()
        .from(ContentQueue)
        .where(and(eq(ContentQueue.asin, asin), eq(ContentQueue.status, 'pending')));

      if (existing.length > 0) {
        return;
      }

      // Get the product ID from Products table
      const products = await db.select().from(Products).where(eq(Products.asin, asin));

      await db.insert(ContentQueue).values({
        asin,
        marketplace,
        productId: products.length > 0 ? products[0].id : undefined,
        contentType: 'full',
        status: 'pending',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
      });

      this.log(`Queued ${asin} for content generation`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addWarning(`Failed to queue ${asin} for content: ${message}`);
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50)
      .replace(/-$/, '');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected override buildResultData(): Record<string, unknown> {
    return {
      ...super.buildResultData(),
      importedAsins: this.importedAsins,
    };
  }
}
