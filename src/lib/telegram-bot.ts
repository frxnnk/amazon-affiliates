/**
 * Telegram Bot API Client
 *
 * Sends beautiful product notifications to a Telegram channel.
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
  brand?: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  discount?: number;
  imageUrl?: string | null;
  affiliateUrl: string;
  rating?: number | null;
  totalReviews?: number | null;
  category?: string;
  isPrime?: boolean;
  shortDescription?: string;
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
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Format price with currency (escaped for MarkdownV2)
 */
function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    MXN: 'MX$',
  };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${price.toFixed(2).replace('.', '\\.')}`;
}

/**
 * Format large numbers (1500 → 1.5K)
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace('.', '\\.')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace('.', '\\.')}K`;
  }
  return num.toString();
}

/**
 * Generate star rating display
 */
function formatRating(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let stars = '★'.repeat(fullStars);
  if (hasHalf) stars += '½';
  stars += '☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0));
  return stars;
}

/**
 * Build beautiful product message for Telegram
 */
function buildProductMessage(product: ProductMessage, lang: string = 'es'): string {
  const labels = {
    es: {
      hotDeal: '🔥 OFERTÓN',
      deal: '💰 OFERTA',
      brand: 'Marca',
      price: 'Precio',
      was: 'Antes',
      save: 'Ahorras',
      reviews: 'opiniones',
      prime: '✓ Prime',
      limited: '⚡ Oferta limitada',
    },
    en: {
      hotDeal: '🔥 HOT DEAL',
      deal: '💰 DEAL',
      brand: 'Brand',
      price: 'Price',
      was: 'Was',
      save: 'You save',
      reviews: 'reviews',
      prime: '✓ Prime',
      limited: '⚡ Limited offer',
    },
  };

  const t = labels[lang as keyof typeof labels] || labels.es;

  const discount =
    product.discount ||
    (product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);

  let message = '';

  // Header badge based on discount level
  if (discount >= 40) {
    message += `${t.hotDeal} \\-${discount}%\n`;
    message += `${'━'.repeat(20)}\n\n`;
  } else if (discount >= 15) {
    message += `${t.deal} \\-${discount}%\n`;
    message += `${'─'.repeat(20)}\n\n`;
  }

  // Title (truncated if too long)
  const title = product.title.length > 100 ? product.title.slice(0, 97) + '...' : product.title;
  message += `*${escapeMarkdown(title)}*\n\n`;

  // Brand (if available)
  if (product.brand) {
    message += `🏷 ${escapeMarkdown(product.brand)}\n`;
  }

  // Rating with stars
  if (product.rating) {
    const stars = formatRating(product.rating);
    message += `${stars} *${product.rating.toFixed(1).replace('.', '\\.')}*`;
    if (product.totalReviews) {
      message += ` \\(${formatNumber(product.totalReviews)} ${t.reviews}\\)`;
    }
    message += '\n';
  }

  // Prime badge
  if (product.isPrime) {
    message += `${t.prime}\n`;
  }

  message += '\n';

  // Price section - the star of the show
  message += `💵 *${formatPrice(product.price, product.currency)}*`;

  if (product.originalPrice && product.originalPrice > product.price) {
    message += `  ~~${formatPrice(product.originalPrice, product.currency)}~~\n`;
    const savings = product.originalPrice - product.price;
    message += `✨ ${t.save}: *${formatPrice(savings, product.currency)}*\n`;
  } else {
    message += '\n';
  }

  // Short description if available
  if (product.shortDescription) {
    const desc = product.shortDescription.length > 120 ? product.shortDescription.slice(0, 117) + '...' : product.shortDescription;
    message += `\n_${escapeMarkdown(desc)}_\n`;
  }

  // Limited offer indicator for high discounts
  if (discount >= 30) {
    message += `\n${t.limited}`;
  }

  return message;
}

/**
 * Send a message to the Telegram channel
 */
export async function sendToChannel(
  text: string,
  options?: {
    imageUrl?: string | null;
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
        disable_web_page_preview: false,
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
      console.error('[Telegram] API Error:', data.description);
      return {
        success: false,
        error: data.description || 'Unknown Telegram API error',
      };
    }
  } catch (error) {
    console.error('[Telegram] Network Error:', error);
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
  const buyLabels = {
    es: '🛒 Ver en Amazon',
    en: '🛒 View on Amazon',
  };
  const buyLabel = buyLabels[lang as keyof typeof buyLabels] || buyLabels.es;

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
 * Send a batch deal alert to the channel
 */
export async function sendDealAlert(
  products: ProductMessage[],
  lang: string = 'es',
  config?: TelegramConfig
): Promise<TelegramResult> {
  const titles = {
    es: '🔥 *OFERTAS DEL DÍA* 🔥',
    en: '🔥 *DEALS OF THE DAY* 🔥',
  };

  let message = `${titles[lang as keyof typeof titles] || titles.es}\n`;
  message += `${'━'.repeat(22)}\n\n`;

  products.slice(0, 5).forEach((product, index) => {
    const discount =
      product.discount ||
      (product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);

    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}\\.`;

    message += `${emoji} *${escapeMarkdown(product.title.slice(0, 45))}*`;
    if (product.title.length > 45) message += '\\.\\.\\. ';

    if (discount > 0) {
      message += ` \\-${discount}%`;
    }
    message += '\n';
    message += `    ${formatPrice(product.price, product.currency)}`;
    if (product.originalPrice && product.originalPrice > product.price) {
      message += ` ~~${formatPrice(product.originalPrice, product.currency)}~~`;
    }
    message += '\n';
    message += `    [Ver oferta ➜](${product.affiliateUrl})\n\n`;
  });

  const footers = {
    es: '_Ofertas por tiempo limitado_',
    en: '_Limited time offers_',
  };
  message += footers[lang as keyof typeof footers] || footers.es;

  return sendToChannel(message, { parseMode: 'MarkdownV2' }, config);
}

/**
 * Send a price drop alert
 */
export async function sendPriceDropAlert(
  product: ProductMessage & {
    previousPrice: number;
    dropPercent: number;
  },
  lang: string = 'es',
  config?: TelegramConfig
): Promise<TelegramResult> {
  const titles = {
    es: '📉 *BAJADA DE PRECIO* 📉',
    en: '📉 *PRICE DROP* 📉',
  };

  let message = `${titles[lang as keyof typeof titles] || titles.es}\n`;
  message += `${'━'.repeat(22)}\n\n`;

  message += `*${escapeMarkdown(product.title.slice(0, 80))}*\n\n`;

  message += `❌ Antes: ~~${formatPrice(product.previousPrice, product.currency)}~~\n`;
  message += `✅ Ahora: *${formatPrice(product.price, product.currency)}*\n`;
  message += `📉 Bajó: *${product.dropPercent}%*\n`;

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: '🛒 Aprovechar oferta',
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
      parseMode: 'MarkdownV2',
    },
    config
  );
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
    const response = await fetch(`${TELEGRAM_API_BASE}${telegramConfig.botToken}/getMe`);
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

/**
 * Send a test message to verify everything works
 */
export async function sendTestMessage(config?: TelegramConfig): Promise<TelegramResult> {
  const message = `✅ *Bot conectado correctamente*\n\n` + `El sistema de ofertas está activo y funcionando\\.\n\n` + `_Mensaje de prueba_`;

  return sendToChannel(message, { parseMode: 'MarkdownV2' }, config);
}
