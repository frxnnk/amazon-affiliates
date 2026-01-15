/**
 * Discord Webhook Client
 *
 * Posts messages to Discord channels using webhooks.
 * Webhooks have no rate limits (within reason).
 *
 * Required environment variable:
 * - DISCORD_WEBHOOK_URL
 */

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

export interface DiscordMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordResult {
  success: boolean;
  error?: string;
}

// Discord brand color
const DISCORD_COLORS = {
  deal: 0x00ff00, // Green for deals
  alert: 0xff9900, // Orange for alerts
  lowestEver: 0xff0000, // Red for lowest ever
  info: 0x5865f2, // Discord blurple
};

/**
 * Check if Discord webhook is configured
 */
export function isDiscordConfigured(): boolean {
  const webhookUrl = import.meta.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  return !!webhookUrl;
}

/**
 * Get webhook URL from environment
 */
function getWebhookUrl(): string {
  const webhookUrl = import.meta.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL environment variable is not set');
  }
  return webhookUrl;
}

/**
 * Send a message to Discord
 */
export async function sendDiscordMessage(message: DiscordMessage): Promise<DiscordResult> {
  try {
    const webhookUrl = getWebhookUrl();

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Discord webhook error (${response.status}): ${errorText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a simple text message
 */
export async function sendTextMessage(content: string): Promise<DiscordResult> {
  return sendDiscordMessage({ content });
}

/**
 * Send an embed message
 */
export async function sendEmbed(embed: DiscordEmbed): Promise<DiscordResult> {
  return sendDiscordMessage({ embeds: [embed] });
}

/**
 * Format a product as a Discord embed
 */
export function formatProductEmbed(product: {
  title: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  affiliateUrl: string;
  imageUrl?: string;
  rating?: number;
  totalReviews?: number;
  discount?: number;
  alertType?: string;
}): DiscordEmbed {
  // Determine color based on alert type and discount
  let color = DISCORD_COLORS.deal;
  if (product.alertType === 'lowest_ever') {
    color = DISCORD_COLORS.lowestEver;
  } else if (product.alertType === 'price_drop') {
    color = DISCORD_COLORS.alert;
  } else if (product.discount && product.discount >= 40) {
    color = DISCORD_COLORS.lowestEver;
  }

  // Build description
  const descParts: string[] = [];

  if (product.brand) {
    descParts.push(`**Brand:** ${product.brand}`);
  }

  // Price info
  if (product.originalPrice && product.originalPrice > product.price) {
    descParts.push(
      `**Price:** ~~$${product.originalPrice.toFixed(2)}~~ → **$${product.price.toFixed(2)}**`
    );
    const savings = product.originalPrice - product.price;
    descParts.push(`**You Save:** $${savings.toFixed(2)} (${product.discount || 0}% off)`);
  } else {
    descParts.push(`**Price:** $${product.price.toFixed(2)}`);
  }

  // Rating
  if (product.rating) {
    const stars = '⭐'.repeat(Math.round(product.rating));
    descParts.push(
      `**Rating:** ${stars} ${product.rating.toFixed(1)}/5${product.totalReviews ? ` (${product.totalReviews.toLocaleString()} reviews)` : ''}`
    );
  }

  // Alert type badge
  if (product.alertType === 'lowest_ever') {
    descParts.unshift('🔥 **LOWEST PRICE EVER!** 🔥\n');
  } else if (product.alertType === 'price_drop') {
    descParts.unshift('📉 **PRICE DROP ALERT!** 📉\n');
  }

  const embed: DiscordEmbed = {
    title: product.title.length > 256 ? product.title.slice(0, 253) + '...' : product.title,
    url: product.affiliateUrl,
    description: descParts.join('\n'),
    color,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Amazon Deal • Click title to buy',
    },
  };

  // Add image if available
  if (product.imageUrl) {
    embed.thumbnail = { url: product.imageUrl };
  }

  return embed;
}

/**
 * Send a product deal to Discord
 */
export async function sendProductDeal(product: {
  title: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  affiliateUrl: string;
  imageUrl?: string;
  rating?: number;
  totalReviews?: number;
  discount?: number;
  alertType?: string;
}): Promise<DiscordResult> {
  const embed = formatProductEmbed(product);
  return sendEmbed(embed);
}

/**
 * Send multiple deals as a batch
 */
export async function sendDealsBatch(
  products: Array<{
    title: string;
    brand?: string;
    price: number;
    originalPrice?: number;
    currency: string;
    affiliateUrl: string;
    imageUrl?: string;
    rating?: number;
    discount?: number;
    alertType?: string;
  }>,
  batchTitle?: string
): Promise<DiscordResult> {
  // Discord allows up to 10 embeds per message
  const embeds = products.slice(0, 10).map((p) => formatProductEmbed(p));

  const message: DiscordMessage = {
    content: batchTitle || '🎉 **New Deals Found!**',
    embeds,
  };

  return sendDiscordMessage(message);
}
