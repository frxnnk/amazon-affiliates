/**
 * Channel Manager Agent
 *
 * Publishes content to Telegram channel.
 * Processes items from PublishQueue and PriceAlerts.
 *
 * MVP: Telegram only (Twitter/Discord disabled)
 */

import { db, PublishQueue, PriceAlerts, SocialAccounts } from 'astro:db';
import { eq, and, lte, or, isNull } from 'astro:db';
import { BaseAgent } from './base-agent';
import type { AgentContext, ChannelManagerConfig, PublishItem, PublishResult } from './types';
import { publishProduct, isTelegramConfigured, type ProductMessage } from '@lib/telegram-bot';
// MVP: Twitter and Discord disabled
// import { postTweet, formatTweet, isTwitterConfigured } from '@lib/social/twitter-client';
// import { sendProductDeal, isDiscordConfigured } from '@lib/social/discord-client';
import { trackApiCall } from '@lib/api-tracker';

const DEFAULT_CONFIG: ChannelManagerConfig = {
  enabledChannels: ['telegram'], // MVP: Telegram only
  maxPostsPerRun: 10,
  delayBetweenPosts: 2000, // 2 seconds
  language: 'es',
};

type ChannelType = 'telegram' | 'twitter' | 'discord';

export class ChannelManagerAgent extends BaseAgent {
  readonly name = 'Channel Manager';
  readonly type = 'channel_manager' as const;
  readonly defaultConfig = DEFAULT_CONFIG;

  private publishedItems: Array<{ asin: string; channels: ChannelType[] }> = [];

  async execute(context: AgentContext): Promise<void> {
    this.log('Starting channel management...');

    // Get agent config
    const agentConfig = await this.getConfig();
    const config: ChannelManagerConfig = {
      ...DEFAULT_CONFIG,
      ...(agentConfig?.config as Partial<ChannelManagerConfig>),
    };

    // Check which channels are available
    const availableChannels = await this.getAvailableChannels(config.enabledChannels);

    if (availableChannels.length === 0) {
      this.addWarning('No social channels configured');
      return;
    }

    this.log(`Available channels: ${availableChannels.join(', ')}`);

    // Get pending items from queue
    const pendingItems = await this.getPendingItems(config.maxPostsPerRun);

    if (pendingItems.length === 0) {
      this.log('No pending items to publish');
      return;
    }

    this.log(`Found ${pendingItems.length} items to publish`);

    // Process each item
    for (const item of pendingItems) {
      if (context.dryRun) {
        this.log(`[DRY RUN] Would publish: ${item.asin} to ${item.channels.join(', ')}`);
        continue;
      }

      await this.publishItem(item, availableChannels, config);

      // Rate limiting between posts
      await this.delay(config.delayBetweenPosts);
    }

    // Process price alerts
    await this.processPriceAlerts(availableChannels, config, context);

    this.log(`Publishing complete: ${this.metrics.itemsSucceeded} items published`);
  }

  private async getAvailableChannels(enabledChannels: ChannelType[]): Promise<ChannelType[]> {
    const available: ChannelType[] = [];

    // MVP: Only Telegram supported
    if (enabledChannels.includes('telegram') && isTelegramConfigured()) {
      available.push('telegram');
    }

    // MVP: Twitter disabled
    // if (enabledChannels.includes('twitter') && isTwitterConfigured()) {
    //   if (await canMakeCall('twitter')) {
    //     available.push('twitter');
    //   } else {
    //     this.addWarning('Twitter quota exhausted');
    //   }
    // }

    // MVP: Discord disabled
    // if (enabledChannels.includes('discord') && isDiscordConfigured()) {
    //   available.push('discord');
    // }

    return available;
  }

  private async getPendingItems(limit: number): Promise<PublishItem[]> {
    const now = new Date();

    const items = await db
      .select()
      .from(PublishQueue)
      .where(
        and(
          eq(PublishQueue.status, 'pending'),
          or(isNull(PublishQueue.scheduledFor), lte(PublishQueue.scheduledFor, now))
        )
      )
      .orderBy(PublishQueue.priority)
      .limit(limit);

    return items.map((item) => ({
      id: item.id,
      asin: item.asin,
      marketplace: item.marketplace,
      channels: (item.channels as string[]) || [],
      priority: item.priority,
      contentSnapshot: item.contentSnapshot as PublishItem['contentSnapshot'],
    }));
  }

  private async publishItem(
    item: PublishItem,
    availableChannels: ChannelType[],
    config: ChannelManagerConfig
  ): Promise<void> {
    // Mark as processing
    await db.update(PublishQueue).set({ status: 'processing' }).where(eq(PublishQueue.id, item.id));

    const results: Record<ChannelType, PublishResult> = {} as Record<ChannelType, PublishResult>;
    const channelsToPublish = item.channels.filter((c) =>
      availableChannels.includes(c as ChannelType)
    ) as ChannelType[];

    if (channelsToPublish.length === 0) {
      await db
        .update(PublishQueue)
        .set({
          status: 'failed',
          publishResults: { error: 'No available channels' },
        })
        .where(eq(PublishQueue.id, item.id));
      this.trackItem(false);
      return;
    }

    this.log(`Publishing ${item.asin} to: ${channelsToPublish.join(', ')}`);

    // Publish to each channel
    for (const channel of channelsToPublish) {
      const result = await this.publishToChannel(channel, item.contentSnapshot, config.language);
      results[channel] = result;

      if (result.success) {
        // MVP: Twitter quota tracking disabled
        // if (channel === 'twitter') {
        //   await recordUsage('twitter', 1, { asin: item.asin });
        // }

        // Track API call for cost dashboard
        await trackApiCall({
          apiName: channel,
          endpoint: 'publish',
          agentType: this.type,
          context: { asin: item.asin },
          success: true,
        });

        // Emit event for real-time dashboard
        await this.emitEvent('item_processed', `Published to ${channel}: ${item.asin}`, {
          asin: item.asin,
          channel,
        });

        // Update social account stats
        await this.updateSocialAccountStats(channel);
      } else {
        // Track failed call
        await trackApiCall({
          apiName: channel,
          endpoint: 'publish',
          agentType: this.type,
          context: { asin: item.asin },
          success: false,
          errorMessage: result.error,
        });
      }

      // Small delay between channels
      await this.delay(500);
    }

    // Determine overall status
    const successCount = Object.values(results).filter((r) => r.success).length;
    const status =
      successCount === channelsToPublish.length
        ? 'published'
        : successCount > 0
          ? 'partial'
          : 'failed';

    // Update queue item
    await db
      .update(PublishQueue)
      .set({
        status,
        publishResults: results,
        publishedAt: new Date(),
      })
      .where(eq(PublishQueue.id, item.id));

    this.trackItem(successCount > 0);

    if (successCount > 0) {
      this.publishedItems.push({
        asin: item.asin,
        channels: Object.entries(results)
          .filter(([, r]) => r.success)
          .map(([c]) => c as ChannelType),
      });
    }
  }

  private async publishToChannel(
    channel: ChannelType,
    content: PublishItem['contentSnapshot'],
    language: string
  ): Promise<PublishResult> {
    try {
      switch (channel) {
        case 'telegram':
          return await this.publishToTelegram(content, language);
        // MVP: Twitter and Discord disabled
        case 'twitter':
        case 'discord':
          return {
            success: false,
            platform: channel,
            error: `Channel ${channel} disabled in MVP`,
            timestamp: new Date(),
          };
        default:
          return {
            success: false,
            platform: channel,
            error: `Unknown channel: ${channel}`,
            timestamp: new Date(),
          };
      }
    } catch (error) {
      return {
        success: false,
        platform: channel,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  private async publishToTelegram(
    content: PublishItem['contentSnapshot'],
    language: string
  ): Promise<PublishResult> {
    const product: ProductMessage = {
      title: content.title,
      brand: content.brand || 'Amazon',
      price: content.price,
      originalPrice: content.originalPrice,
      currency: content.currency,
      affiliateUrl: content.affiliateUrl,
      imageUrl: content.imageUrl,
      rating: content.rating,
      totalReviews: content.totalReviews,
      discount: content.discount,
    };

    const result = await publishProduct(product, language as 'es' | 'en');

    return {
      success: result.success,
      platform: 'telegram',
      messageId: result.messageId?.toString(),
      error: result.error,
      timestamp: new Date(),
    };
  }

  // MVP: Twitter disabled
  // private async publishToTwitter(content: PublishItem['contentSnapshot']): Promise<PublishResult> {
  //   const tweet = formatTweet({
  //     title: content.title,
  //     price: content.price,
  //     originalPrice: content.originalPrice,
  //     currency: content.currency,
  //     affiliateUrl: content.affiliateUrl,
  //     discount: content.discount,
  //     alertType: content.alertType,
  //   });
  //
  //   const result = await postTweet(tweet);
  //   this.trackApiCall();
  //
  //   return {
  //     success: result.success,
  //     platform: 'twitter',
  //     messageId: result.tweetId,
  //     error: result.error,
  //     timestamp: new Date(),
  //   };
  // }

  // MVP: Discord disabled
  // private async publishToDiscord(content: PublishItem['contentSnapshot']): Promise<PublishResult> {
  //   const result = await sendProductDeal({
  //     title: content.title,
  //     brand: content.brand,
  //     price: content.price,
  //     originalPrice: content.originalPrice,
  //     currency: content.currency,
  //     affiliateUrl: content.affiliateUrl,
  //     imageUrl: content.imageUrl,
  //     rating: content.rating,
  //     totalReviews: content.totalReviews,
  //     discount: content.discount,
  //     alertType: content.alertType,
  //   });
  //
  //   return {
  //     success: result.success,
  //     platform: 'discord',
  //     error: result.error,
  //     timestamp: new Date(),
  //   };
  // }

  private async processPriceAlerts(
    availableChannels: ChannelType[],
    config: ChannelManagerConfig,
    context: AgentContext
  ): Promise<void> {
    // Get unnotified alerts
    const alerts = await db
      .select()
      .from(PriceAlerts)
      .where(eq(PriceAlerts.isNotified, false))
      .limit(5);

    if (alerts.length === 0) {
      return;
    }

    this.log(`Processing ${alerts.length} price alerts`);

    for (const alert of alerts) {
      if (context.dryRun) {
        this.log(`[DRY RUN] Would notify alert for: ${alert.asin}`);
        continue;
      }

      // These are already in PublishQueue via PriceMonitor agent
      // Just mark them as notified
      await db
        .update(PriceAlerts)
        .set({
          isNotified: true,
          notifiedAt: new Date(),
          notifiedChannels: availableChannels,
        })
        .where(eq(PriceAlerts.id, alert.id));
    }
  }

  private async updateSocialAccountStats(platform: ChannelType): Promise<void> {
    try {
      const accounts = await db
        .select()
        .from(SocialAccounts)
        .where(eq(SocialAccounts.platform, platform));

      if (accounts.length > 0) {
        await db
          .update(SocialAccounts)
          .set({
            lastPostAt: new Date(),
            postCount: accounts[0].postCount + 1,
            errorCount: 0, // Reset error count on success
            updatedAt: new Date(),
          })
          .where(eq(SocialAccounts.platform, platform));
      }
    } catch {
      // Ignore stats update errors
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected override buildResultData(): Record<string, unknown> {
    return {
      ...super.buildResultData(),
      publishedItems: this.publishedItems,
      channelStats: this.getChannelStats(),
    };
  }

  private getChannelStats(): Record<ChannelType, number> {
    const stats: Record<ChannelType, number> = {
      telegram: 0,
      twitter: 0,
      discord: 0,
    };

    for (const item of this.publishedItems) {
      for (const channel of item.channels) {
        stats[channel]++;
      }
    }

    return stats;
  }
}
