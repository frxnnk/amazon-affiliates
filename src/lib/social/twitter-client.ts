/**
 * Twitter API v2 Client
 *
 * Posts tweets using the Twitter API v2.
 * Free tier: 1,500 tweets/month
 *
 * Required environment variables:
 * - TWITTER_API_KEY
 * - TWITTER_API_SECRET
 * - TWITTER_ACCESS_TOKEN
 * - TWITTER_ACCESS_SECRET
 */

import { createHmac, randomBytes } from 'crypto';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface TweetResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

export interface TweetData {
  id: string;
  text: string;
}

/**
 * Check if Twitter is configured
 */
export function isTwitterConfigured(): boolean {
  const apiKey = import.meta.env.TWITTER_API_KEY || process.env.TWITTER_API_KEY;
  const apiSecret = import.meta.env.TWITTER_API_SECRET || process.env.TWITTER_API_SECRET;
  const accessToken = import.meta.env.TWITTER_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = import.meta.env.TWITTER_ACCESS_SECRET || process.env.TWITTER_ACCESS_SECRET;

  return !!(apiKey && apiSecret && accessToken && accessSecret);
}

/**
 * Get Twitter configuration from environment
 */
function getConfig(): TwitterConfig {
  const apiKey = import.meta.env.TWITTER_API_KEY || process.env.TWITTER_API_KEY;
  const apiSecret = import.meta.env.TWITTER_API_SECRET || process.env.TWITTER_API_SECRET;
  const accessToken = import.meta.env.TWITTER_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = import.meta.env.TWITTER_ACCESS_SECRET || process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Twitter API credentials not configured');
  }

  return { apiKey, apiSecret, accessToken, accessSecret };
}

/**
 * Generate OAuth 1.0a signature
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  config: TwitterConfig
): string {
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(
      Object.keys(params)
        .sort()
        .map((key) => `${key}=${encodeURIComponent(params[key])}`)
        .join('&')
    ),
  ].join('&');

  const signingKey = `${encodeURIComponent(config.apiSecret)}&${encodeURIComponent(config.accessSecret)}`;

  return createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
}

/**
 * Generate OAuth 1.0a header
 */
function generateOAuthHeader(
  method: string,
  url: string,
  body: Record<string, string>,
  config: TwitterConfig
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.apiKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.accessToken,
    oauth_version: '1.0',
  };

  // Combine OAuth params with body for signature
  const allParams = { ...oauthParams, ...body };
  const signature = generateOAuthSignature(method, url, allParams, config);
  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

/**
 * Post a tweet
 */
export async function postTweet(text: string): Promise<TweetResult> {
  try {
    const config = getConfig();
    const url = `${TWITTER_API_BASE}/tweets`;

    // OAuth 1.0a for v2 API
    const authHeader = generateOAuthHeader('POST', url, {}, config);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: `Twitter API error (${response.status}): ${errorData}`,
      };
    }

    const data = (await response.json()) as { data: TweetData };

    return {
      success: true,
      tweetId: data.data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Post a tweet with media (image URL)
 * Note: Twitter v2 requires uploading media first, which is more complex
 * For simplicity, this posts a tweet with a link to the image
 */
export async function postTweetWithImage(text: string, imageUrl: string): Promise<TweetResult> {
  // For v2 free tier, we can't upload media directly
  // Instead, append the image URL to the tweet if there's room
  const maxLength = 280;
  const linkLength = 23; // Twitter shortens URLs to ~23 chars

  if (text.length + linkLength + 1 <= maxLength) {
    return postTweet(`${text}\n${imageUrl}`);
  }

  // If no room for image URL, just post the text
  return postTweet(text);
}

/**
 * Post a thread (multiple tweets)
 */
export async function postThread(tweets: string[]): Promise<TweetResult[]> {
  const results: TweetResult[] = [];
  let previousTweetId: string | undefined;

  for (const tweet of tweets) {
    // Note: Twitter v2 free tier doesn't support reply_to easily
    // This posts tweets sequentially without threading
    const result = await postTweet(tweet);
    results.push(result);

    if (!result.success) {
      break;
    }

    previousTweetId = result.tweetId;

    // Rate limiting between tweets
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Format a product message for Twitter (max 280 chars)
 */
export function formatTweet(product: {
  title: string;
  price: number;
  originalPrice?: number;
  currency: string;
  affiliateUrl: string;
  discount?: number;
  alertType?: string;
}): string {
  const emoji = product.alertType === 'lowest_ever' ? '🔥🔥' : product.discount && product.discount >= 30 ? '🔥' : '💰';
  const discountText = product.discount ? `-${product.discount}%` : '';

  // Twitter shortens URLs to ~23 chars
  const urlLength = 23;

  // Build tweet parts
  const parts = [emoji, discountText, product.title];

  // Price info
  const priceText =
    product.originalPrice && product.originalPrice > product.price
      ? `$${product.price} (was $${product.originalPrice})`
      : `$${product.price}`;

  // Calculate available space
  const fixedParts = `${emoji} ${discountText}\n\n${priceText}\n\n`;
  const availableForTitle = 280 - fixedParts.length - urlLength - 5; // 5 for safety margin

  // Truncate title if needed
  let title = product.title;
  if (title.length > availableForTitle) {
    title = title.slice(0, availableForTitle - 3) + '...';
  }

  return `${emoji} ${discountText} ${title}\n\n${priceText}\n\n${product.affiliateUrl}`;
}
