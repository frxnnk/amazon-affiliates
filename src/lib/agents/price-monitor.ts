/**
 * Price Monitor Agent
 *
 * Monitors price changes for tracked products.
 * Creates alerts when significant price drops are detected.
 */

import { db, Products, CuratedDeals, PriceHistory, PriceAlerts, PublishQueue } from 'astro:db';
import { eq, and, desc } from 'astro:db';
import { BaseAgent } from './base-agent';
import type { AgentContext, PriceMonitorConfig, PriceAlertData } from './types';
import { getProductRainforest, isRainforestConfigured } from '@lib/rainforest-api';
import { recordUsage, canMakeCall } from '@lib/quota';
import { trackPrice, getPriceHistory, isKeepaConfigured } from '@lib/keepa-api';
import { trackApiCall } from '@lib/api-tracker';

const DEFAULT_CONFIG: PriceMonitorConfig = {
  maxProductsPerRun: 20,
  dropThresholdPercent: 15,
  checkCuratedDeals: true,
  checkProducts: true,
  createAlerts: true,
};

interface TrackedProduct {
  asin: string;
  marketplace: string;
  currentPrice: number;
  originalPrice?: number;
  currency: string;
  productId?: number;
  title?: string;
  affiliateUrl?: string;
  imageUrl?: string;
}

export class PriceMonitorAgent extends BaseAgent {
  readonly name = 'Price Monitor';
  readonly type = 'price_monitor' as const;
  readonly defaultConfig = DEFAULT_CONFIG;

  private alertsCreated: PriceAlertData[] = [];

  async execute(context: AgentContext): Promise<void> {
    this.log('Starting price monitoring...');

    // Check if RapidAPI is configured
    if (!isRainforestConfigured()) {
      this.addError('RapidAPI not configured');
      return;
    }

    // Get agent config
    const agentConfig = await this.getConfig();
    const config: PriceMonitorConfig = {
      ...DEFAULT_CONFIG,
      ...(agentConfig?.config as Partial<PriceMonitorConfig>),
    };

    // Get products to monitor
    const productsToMonitor = await this.getProductsToMonitor(config);

    if (productsToMonitor.length === 0) {
      this.log('No products to monitor');
      return;
    }

    this.log(`Monitoring ${productsToMonitor.length} products`);

    // Process each product
    let processed = 0;
    for (const product of productsToMonitor) {
      if (processed >= config.maxProductsPerRun) {
        this.addWarning('Max products per run reached');
        break;
      }

      // Check quota
      if (!(await canMakeCall('rapidapi'))) {
        this.addWarning('RapidAPI quota exhausted, stopping');
        break;
      }

      if (context.dryRun) {
        this.log(`[DRY RUN] Would check price for: ${product.asin}`);
        processed++;
        continue;
      }

      await this.checkPrice(product, config);
      processed++;

      // Rate limiting
      await this.delay(500);
    }

    this.log(
      `Price monitoring complete: ${this.metrics.itemsProcessed} checked, ${this.alertsCreated.length} alerts`
    );
  }

  private async getProductsToMonitor(config: PriceMonitorConfig): Promise<TrackedProduct[]> {
    const products: TrackedProduct[] = [];
    const seenAsins = new Set<string>();

    // Get from CuratedDeals if enabled
    if (config.checkCuratedDeals) {
      const curatedDeals = await db
        .select()
        .from(CuratedDeals)
        .where(eq(CuratedDeals.isActive, true))
        .orderBy(desc(CuratedDeals.priority))
        .limit(config.maxProductsPerRun);

      for (const deal of curatedDeals) {
        if (!seenAsins.has(deal.asin)) {
          seenAsins.add(deal.asin);
          products.push({
            asin: deal.asin,
            marketplace: deal.marketplace,
            currentPrice: deal.price || 0,
            originalPrice: deal.originalPrice || undefined,
            currency: deal.currency || 'USD',
            title: deal.title || undefined,
            affiliateUrl: deal.affiliateUrl || undefined,
            imageUrl: deal.imageUrl || undefined,
          });
        }
      }
    }

    // Get from Products if enabled and still have room
    if (config.checkProducts && products.length < config.maxProductsPerRun) {
      const remaining = config.maxProductsPerRun - products.length;
      const dbProducts = await db
        .select()
        .from(Products)
        .where(eq(Products.status, 'published'))
        .orderBy(desc(Products.updatedAt))
        .limit(remaining);

      for (const product of dbProducts) {
        if (!seenAsins.has(product.asin)) {
          seenAsins.add(product.asin);
          products.push({
            asin: product.asin,
            marketplace: product.lang === 'es' ? 'es' : 'com',
            currentPrice: product.price,
            originalPrice: product.originalPrice || undefined,
            currency: product.currency,
            productId: product.id,
            title: product.title,
            affiliateUrl: product.affiliateUrl,
            imageUrl: product.featuredImageUrl || undefined,
          });
        }
      }
    }

    return products;
  }

  private async checkPrice(product: TrackedProduct, config: PriceMonitorConfig): Promise<void> {
    try {
      this.log(`Checking price for: ${product.asin}`);

      // Fetch current price from API
      const startTime = Date.now();
      const result = await getProductRainforest(product.asin, product.marketplace);
      const responseTimeMs = Date.now() - startTime;

      // Track API call
      this.trackApiCall();
      await recordUsage('rapidapi', 1, { asin: product.asin, type: 'price_check' });
      await trackApiCall({
        apiName: 'rapidapi',
        endpoint: 'product',
        agentType: this.type,
        context: { asin: product.asin, marketplace: product.marketplace },
        success: result.success,
        responseTimeMs,
      });
      await this.incrementQuota();

      if (!result.success || !result.data) {
        this.addWarning(`Failed to get price for ${product.asin}`);
        this.trackItem(false);
        return;
      }

      const newPrice = result.data.price;
      const newOriginalPrice = result.data.originalPrice;

      if (!newPrice) {
        this.addWarning(`No price available for ${product.asin}`);
        this.trackItem(false);
        return;
      }

      // Record the price
      await trackPrice({
        asin: product.asin,
        price: newPrice,
        originalPrice: newOriginalPrice ?? undefined,
        currency: product.currency,
        marketplace: product.marketplace,
      });

      // Compare with stored price
      const previousPrice = product.currentPrice;
      const priceDrop = previousPrice - newPrice;
      const dropPercent = previousPrice > 0 ? (priceDrop / previousPrice) * 100 : 0;

      this.trackItem(true);

      // Check if significant drop
      if (dropPercent >= config.dropThresholdPercent) {
        this.log(
          `Price drop detected for ${product.asin}: ${previousPrice} -> ${newPrice} (${dropPercent.toFixed(1)}%)`
        );

        // Get lowest price for context from price history
        const priceHistoryData = await getPriceHistory(product.asin, product.marketplace, { days: 90 });
        const lowestPrice = priceHistoryData.history.length > 0
          ? Math.min(...priceHistoryData.history.map((p) => p.price))
          : undefined;

        // Determine alert type
        let alertType: 'price_drop' | 'lowest_ever' = 'price_drop';
        if (lowestPrice && newPrice <= lowestPrice) {
          alertType = 'lowest_ever';
        }

        if (config.createAlerts) {
          await this.createAlert({
            asin: product.asin,
            marketplace: product.marketplace,
            productId: product.productId,
            alertType,
            previousPrice,
            currentPrice: newPrice,
            lowestPrice,
            dropPercent,
            dropAmount: priceDrop,
            currency: product.currency,
          });

          // Queue for publishing
          await this.queueAlertForPublish(product, newPrice, dropPercent, alertType);
        }
      }

      // Update stored price in database
      await this.updateStoredPrice(product, newPrice, newOriginalPrice ?? undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addError(`${product.asin}: ${message}`);
      this.trackItem(false);
    }
  }

  private async createAlert(alertData: PriceAlertData): Promise<void> {
    try {
      await db.insert(PriceAlerts).values({
        asin: alertData.asin,
        marketplace: alertData.marketplace,
        productId: alertData.productId,
        alertType: alertData.alertType,
        previousPrice: alertData.previousPrice,
        currentPrice: alertData.currentPrice,
        lowestPrice: alertData.lowestPrice,
        dropPercent: alertData.dropPercent,
        dropAmount: alertData.dropAmount,
        currency: alertData.currency,
        isNotified: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour validity
      });

      this.alertsCreated.push(alertData);
      this.log(`Created ${alertData.alertType} alert for ${alertData.asin}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addWarning(`Failed to create alert for ${alertData.asin}: ${message}`);
    }
  }

  private async queueAlertForPublish(
    product: TrackedProduct,
    newPrice: number,
    dropPercent: number,
    alertType: string
  ): Promise<void> {
    try {
      // Check if already in queue
      const existing = await db
        .select()
        .from(PublishQueue)
        .where(and(eq(PublishQueue.asin, product.asin), eq(PublishQueue.status, 'pending')));

      if (existing.length > 0) {
        return;
      }

      await db.insert(PublishQueue).values({
        asin: product.asin,
        marketplace: product.marketplace,
        productId: product.productId,
        channels: ['telegram', 'twitter', 'discord'],
        status: 'pending',
        priority: alertType === 'lowest_ever' ? 20 : 10, // Highest priority for lowest ever
        contentSnapshot: {
          title: product.title || `Product ${product.asin}`,
          brand: undefined,
          price: newPrice,
          originalPrice: product.originalPrice,
          currency: product.currency,
          imageUrl: product.imageUrl,
          affiliateUrl: product.affiliateUrl || `https://amazon.com/dp/${product.asin}`,
          discount: Math.round(dropPercent),
          alertType,
        },
        createdAt: new Date(),
      });

      this.log(`Queued price alert for ${product.asin} for publishing`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addWarning(`Failed to queue alert for ${product.asin}: ${message}`);
    }
  }

  private async updateStoredPrice(
    product: TrackedProduct,
    newPrice: number,
    newOriginalPrice?: number
  ): Promise<void> {
    // Update in CuratedDeals
    await db
      .update(CuratedDeals)
      .set({
        price: newPrice,
        originalPrice: newOriginalPrice,
        updatedAt: new Date(),
      })
      .where(eq(CuratedDeals.asin, product.asin));

    // Update in Products if we have an ID
    if (product.productId) {
      await db
        .update(Products)
        .set({
          price: newPrice,
          originalPrice: newOriginalPrice,
          updatedAt: new Date(),
        })
        .where(eq(Products.id, product.productId));
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected override buildResultData(): Record<string, unknown> {
    return {
      ...super.buildResultData(),
      alertsCreated: this.alertsCreated.length,
      alerts: this.alertsCreated,
    };
  }
}
