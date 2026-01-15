/**
 * Telegram Bot API Client
 * 
 * Sends product notifications and publishes to a Telegram channel.
 * 
 * Required environment variables:
 * - TELEGRAM_BOT_TOKEN: Bot token from @BotFather
 * - TELEGRAM_CHANNEL_ID: Channel ID (e.g., @mychannel or -100123456789)
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export interface TelegramConfig {
  botToken: string;
  channelId: string;
}

export interface ProductMessage {
  title: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;
  discount?: number;
  imageUrl?: string;
  affiliateUrl: string;
  rating?: number;
  category?: string;
}

export interface TelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Get Telegram configuration from environment
 */
export function getTelegramConfig(): TelegramConfig | null {
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const channelId = import.meta.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !channelId) {
    return null;
  }

  return { botToken, channelId };
}

/**
 * Check if Telegram is configured
 */
export function isTelegramConfigured(): boolean {
  return getTelegramConfig() !== null;
}

/**
 * Format price with currency
 */
function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Build product message for Telegram
 */
function buildProductMessage(product: ProductMessage, lang: string = 'es'): string {
  const labels = {
    es: {
      deal: '🔥 OFERTA',
      brand: '🏷️',
      price: '💰 Precio',
      was: 'Antes',
      save: 'Ahorras',
      rating: '⭐ Rating',
      buy: '🛒 Comprar ahora',
    },
    en: {
      deal: '🔥 DEAL',
      brand: '🏷️',
      price: '💰 Price',
      was: 'Was',
      save: 'Save',
      rating: '⭐ Rating',
      buy: '🛒 Buy now',
    },
  };

  const t = labels[lang as keyof typeof labels] || labels.es;
  const discount = product.discount || (product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0);

  let message = '';

  // Header with deal badge if applicable
  if (discount >= 10) {
    message += `${t.deal} -${discount}%\n\n`;
  }

  // Title
  message += `*${escapeMarkdown(product.title)}*\n\n`;

  // Brand
  if (product.brand) {
    message += `${t.brand} ${escapeMarkdown(product.brand)}\n`;
  }

  // Price
  message += `${t.price}: *${formatPrice(product.price, product.currency)}*`;
  
  if (product.originalPrice && product.originalPrice > product.price) {
    message += ` ~~${formatPrice(product.originalPrice, product.currency)}~~`;
    const savings = product.originalPrice - product.price;
    message += `\n${t.save}: ${formatPrice(savings, product.currency)}`;
  }
  message += '\n';

  // Rating
  if (product.rating) {
    message += `${t.rating}: ${product.rating.toFixed(1)}/5\n`;
  }

  message += '\n';

  return message;
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Send a message to the Telegram channel
 */
export async function sendToChannel(
  text: string,
  options?: {
    imageUrl?: string;
    replyMarkup?: object;
    parseMode?: 'MarkdownV2' | 'HTML';
  },
  config?: TelegramConfig
): Promise<TelegramResult> {
  const telegramConfig = config || getTelegramConfig();

  if (!telegramConfig) {
    return {
      success: false,
      error: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID.',
    };
  }

  const { botToken, channelId } = telegramConfig;
  const parseMode = options?.parseMode || 'MarkdownV2';

  try {
    let response: Response;
    let endpoint: string;

    if (options?.imageUrl) {
      // Send photo with caption
      endpoint = `${TELEGRAM_API_BASE}${botToken}/sendPhoto`;
      const params = new URLSearchParams({
        chat_id: channelId,
        photo: options.imageUrl,
        caption: text,
        parse_mode: parseMode,
      });

      if (options.replyMarkup) {
        params.append('reply_markup', JSON.stringify(options.replyMarkup));
      }

      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
    } else {
      // Send text message
      endpoint = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;
      const body: Record<string, unknown> = {
        chat_id: channelId,
        text,
        parse_mode: parseMode,
      };

      if (options?.replyMarkup) {
        body.reply_markup = options.replyMarkup;
      }

      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    const data = await response.json();

    if (data.ok) {
      return {
        success: true,
        messageId: data.result.message_id,
      };
    } else {
      return {
        success: false,
        error: data.description || 'Unknown Telegram API error',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Publish a product to the Telegram channel
 */
export async function publishProduct(
  product: ProductMessage,
  lang: string = 'es',
  config?: TelegramConfig
): Promise<TelegramResult> {
  const message = buildProductMessage(product, lang);
  
  // Build inline keyboard with buy button
  const buyLabel = lang === 'es' ? '🛒 Comprar en Amazon' : '🛒 Buy on Amazon';
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: buyLabel,
          url: product.affiliateUrl,
        },
      ],
    ],
  };

  return sendToChannel(
    message,
    {
      imageUrl: product.imageUrl,
      replyMarkup,
    },
    config
  );
}

/**
 * Send a deal alert to the channel
 */
export async function sendDealAlert(
  products: ProductMessage[],
  lang: string = 'es',
  config?: TelegramConfig
): Promise<TelegramResult> {
  const title = lang === 'es' 
    ? '🔥 *NUEVAS OFERTAS ENCONTRADAS* 🔥\n\n'
    : '🔥 *NEW DEALS FOUND* 🔥\n\n';

  let message = title;

  products.slice(0, 5).forEach((product, index) => {
    const discount = product.discount || (product.originalPrice 
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0);

    message += `${index + 1}\\. *${escapeMarkdown(product.title.slice(0, 50))}*`;
    if (discount > 0) {
      message += ` \\-${discount}%`;
    }
    message += `\n   ${formatPrice(product.price, product.currency)}`;
    message += `\n   [Ver oferta](${product.affiliateUrl})\n\n`;
  });

  return sendToChannel(message, { parseMode: 'MarkdownV2' }, config);
}

/**
 * Test the bot connection
 */
export async function testConnection(config?: TelegramConfig): Promise<TelegramResult> {
  const telegramConfig = config || getTelegramConfig();

  if (!telegramConfig) {
    return {
      success: false,
      error: 'Telegram not configured',
    };
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}${telegramConfig.botToken}/getMe`
    );
    const data = await response.json();

    if (data.ok) {
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        error: data.description,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
