/**
 * Price History API
 * 
 * Provides price history tracking and validation for Amazon products.
 * Uses internal database for tracking prices over time.
 * Can optionally integrate with Keepa API for historical data.
 */

import { recordPrice, getPriceStats, getPriceHistory as getDbPriceHistory, type PriceHistoryInput } from './db';

// Keepa API configuration (optional)
const KEEPA_API_BASE = 'https://api.keepa.com';

export interface PricePoint {
  price: number;
  originalPrice?: number;
  date: Date;
  source: string;
}

export interface PriceHistoryData {
  asin: string;
  marketplace: string;
  history: PricePoint[];
  stats: {
    avg30Day: number;
    avg90Day: number;
    min30Day: number;
    min90Day: number;
    max30Day: number;
    max90Day: number;
    lowestEver: number;
    highestEver: number;
    dataPoints30: number;
    dataPoints90: number;
  } | null;
}

export interface KeepaConfig {
  apiKey: string;
}

/**
 * Get Keepa API key from environment
 */
function getKeepaConfig(): KeepaConfig | null {
  const apiKey = import.meta.env.KEEPA_API_KEY || process.env.KEEPA_API_KEY;
  if (!apiKey) return null;
  return { apiKey };
}

/**
 * Check if Keepa API is configured
 */
export function isKeepaConfigured(): boolean {
  return getKeepaConfig() !== null;
}

/**
 * Marketplace to Keepa domain ID mapping
 */
const KEEPA_DOMAINS: Record<string, number> = {
  'com': 1,    // Amazon.com
  'co.uk': 2,  // Amazon.co.uk
  'de': 3,     // Amazon.de
  'fr': 4,     // Amazon.fr
  'jp': 5,     // Amazon.co.jp
  'ca': 6,     // Amazon.ca
  'cn': 7,     // Amazon.cn
  'it': 8,     // Amazon.it
  'es': 9,     // Amazon.es
  'in': 10,    // Amazon.in
  'mx': 11,    // Amazon.com.mx
  'br': 12,    // Amazon.com.br
  'au': 13,    // Amazon.com.au
};

/**
 * Fetch price history from Keepa API
 * Note: Keepa API requires a paid subscription
 */
async function fetchFromKeepa(asin: string, marketplace: string = 'com'): Promise<PricePoint[] | null> {
  const config = getKeepaConfig();
  if (!config) return null;

  const domainId = KEEPA_DOMAINS[marketplace] || 1;

  try {
    const url = `${KEEPA_API_BASE}/product?key=${config.apiKey}&domain=${domainId}&asin=${asin}&history=1`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Keepa API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.products || data.products.length === 0) {
      return null;
    }

    const product = data.products[0];
    const csvData = product.csv;

    // Keepa CSV format: [timestamp, price, timestamp, price, ...]
    // Prices are in cents, timestamps are in Keepa time (minutes since Jan 1, 2011)
    if (!csvData || !csvData[0]) return null;

    const priceHistory: PricePoint[] = [];
    const amazonPrices = csvData[0]; // Amazon price history

    for (let i = 0; i < amazonPrices.length; i += 2) {
      const keepaTime = amazonPrices[i];
      const price = amazonPrices[i + 1];

      // Skip invalid prices
      if (price <= 0 || keepaTime <= 0) continue;

      // Convert Keepa time to Date
      const keepaEpoch = new Date('2011-01-01T00:00:00Z').getTime();
      const date = new Date(keepaEpoch + keepaTime * 60000);

      priceHistory.push({
        price: price / 100, // Convert cents to dollars
        date,
        source: 'keepa',
      });
    }

    return priceHistory;
  } catch (error) {
    console.error('Error fetching from Keepa:', error);
    return null;
  }
}

/**
 * Record a price point to our database
 * Call this whenever you fetch product data from any source
 */
export async function trackPrice(data: PriceHistoryInput): Promise<void> {
  try {
    await recordPrice(data);
  } catch (error) {
    console.error('Error tracking price:', error);
  }
}

/**
 * Get price history for a product
 * First tries our database, then optionally fetches from Keepa
 */
export async function getPriceHistory(
  asin: string,
  marketplace: string = 'com',
  options: { useKeepa?: boolean; days?: number } = {}
): Promise<PriceHistoryData> {
  const { useKeepa = false, days = 90 } = options;

  // Get history from our database
  const dbHistory = await getDbPriceHistory(asin, marketplace, days);
  const stats = await getPriceStats(asin, marketplace);

  // Convert to PricePoint format
  const history: PricePoint[] = dbHistory.map(h => ({
    price: h.price,
    originalPrice: h.originalPrice || undefined,
    date: h.recordedAt,
    source: h.source,
  }));

  // Optionally try Keepa if we don't have enough data
  if (useKeepa && history.length < 10 && isKeepaConfigured()) {
    const keepaHistory = await fetchFromKeepa(asin, marketplace);
    if (keepaHistory) {
      // Merge Keepa data with our data (avoiding duplicates)
      const existingDates = new Set(history.map(h => h.date.toISOString().split('T')[0]));
      
      for (const point of keepaHistory) {
        const dateStr = point.date.toISOString().split('T')[0];
        if (!existingDates.has(dateStr)) {
          history.push(point);
          // Also store in our database for future use
          await trackPrice({
            asin,
            marketplace,
            price: point.price,
            source: 'keepa',
          });
        }
      }

      // Sort by date
      history.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
  }

  return {
    asin,
    marketplace,
    history,
    stats,
  };
}

/**
 * Calculate if a price is a good deal based on history
 */
export function analyzePriceHistory(history: PriceHistoryData, currentPrice: number): {
  isGoodDeal: boolean;
  isGreatDeal: boolean;
  isInflated: boolean;
  savingsVsAvg: number;
  savingsVsMin: number;
  recommendation: 'great_deal' | 'good_deal' | 'fair' | 'inflated' | 'unknown';
} {
  if (!history.stats || history.history.length < 3) {
    return {
      isGoodDeal: false,
      isGreatDeal: false,
      isInflated: false,
      savingsVsAvg: 0,
      savingsVsMin: 0,
      recommendation: 'unknown',
    };
  }

  const { avg30Day, avg90Day, min30Day, min90Day } = history.stats;
  const avgPrice = avg30Day || avg90Day;
  const minPrice = min30Day || min90Day;

  // Calculate savings percentages
  const savingsVsAvg = avgPrice > 0 ? ((avgPrice - currentPrice) / avgPrice) * 100 : 0;
  const savingsVsMin = minPrice > 0 ? ((currentPrice - minPrice) / minPrice) * 100 : 0;

  // Determine deal quality
  let isGoodDeal = false;
  let isGreatDeal = false;
  let isInflated = false;
  let recommendation: 'great_deal' | 'good_deal' | 'fair' | 'inflated' | 'unknown' = 'fair';

  if (savingsVsAvg >= 20) {
    // 20%+ below average - great deal
    isGreatDeal = true;
    isGoodDeal = true;
    recommendation = 'great_deal';
  } else if (savingsVsAvg >= 10) {
    // 10-20% below average - good deal
    isGoodDeal = true;
    recommendation = 'good_deal';
  } else if (savingsVsAvg <= -10) {
    // 10%+ above average - potentially inflated
    isInflated = true;
    recommendation = 'inflated';
  }

  // Extra check: if current price is near or at the lowest
  if (currentPrice <= minPrice * 1.05) {
    isGreatDeal = true;
    recommendation = 'great_deal';
  }

  return {
    isGoodDeal,
    isGreatDeal,
    isInflated,
    savingsVsAvg: Math.round(savingsVsAvg * 100) / 100,
    savingsVsMin: Math.round(savingsVsMin * 100) / 100,
    recommendation,
  };
}

/**
 * Batch record prices for multiple products
 * Useful when fetching product lists
 */
export async function trackPrices(products: Array<{
  asin: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  marketplace?: string;
}>): Promise<void> {
  const promises = products.map(p =>
    trackPrice({
      asin: p.asin,
      price: p.price,
      originalPrice: p.originalPrice,
      currency: p.currency,
      marketplace: p.marketplace,
      source: 'rainforest',
    })
  );

  await Promise.allSettled(promises);
}
