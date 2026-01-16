/**
 * AI Deal Analyzer
 * 
 * Uses GPT to analyze products and calculate revenue potential for affiliates.
 * Provides scoring, recommendations, and insights.
 */

import type { PAAPIProductData } from './amazon-paapi';
import type { RainforestProductData } from './rainforest-api';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

// Unified product type for analysis
export interface AnalyzableProduct {
  asin: string;
  title: string;
  brand: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  rating: number | null;
  totalReviews: number | null;
  imageUrl: string | null;
  category?: string;
  dealType?: string | null;
  isPrime?: boolean;
  // Extended fields from RapidAPI MCP
  salesVolume?: string | null; // "10K+ bought in past month"
  isBestSeller?: boolean;
  isAmazonChoice?: boolean;
  couponText?: string | null;
  productBadge?: string | null;
  numOffers?: number | null;
}

export interface ProductAnalysis {
  asin: string;
  revenueScore: number; // 1-10
  conversionPotential: 'high' | 'medium' | 'low';
  competitionLevel: 'high' | 'medium' | 'low';
  recommendation: 'import_now' | 'consider' | 'skip';
  reasoning: string;
  estimatedCommission: number | null; // in dollars
  highlights: string[];
  risks: string[];
}

export interface DealAnalysisResult {
  success: boolean;
  analyses?: ProductAnalysis[];
  summary?: {
    totalProducts: number;
    recommendedCount: number;
    averageScore: number;
    bestPick: string | null;
  };
  error?: string;
  tokensUsed?: number;
}

// Amazon affiliate commission rates by category (approximate)
const COMMISSION_RATES: Record<string, number> = {
  'electronics': 0.03,
  'computers': 0.025,
  'smartphones': 0.02,
  'audio': 0.03,
  'tv': 0.02,
  'gaming': 0.01,
  'home': 0.08,
  'kitchen': 0.045,
  'sports': 0.03,
  'fashion': 0.04,
  'beauty': 0.06,
  'books': 0.045,
  'toys': 0.03,
  'default': 0.03,
};

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const apiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Convert PA-API or Rainforest product to analyzable format
 */
export function toAnalyzableProduct(
  product: PAAPIProductData | RainforestProductData,
  category?: string
): AnalyzableProduct {
  const rfProduct = product as RainforestProductData;

  return {
    asin: product.asin,
    title: product.title,
    brand: product.brand,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: product.currency,
    rating: product.rating,
    totalReviews: product.totalReviews,
    imageUrl: product.imageUrl,
    category: category || (rfProduct.categories?.[0]) || undefined,
    dealType: rfProduct.dealType || null,
    isPrime: rfProduct.isPrime || false,
    // Extended fields from RapidAPI MCP
    salesVolume: rfProduct.salesVolume || null,
    isBestSeller: rfProduct.isBestSeller || false,
    isAmazonChoice: rfProduct.isAmazonChoice || false,
    couponText: rfProduct.couponText || null,
    productBadge: rfProduct.productBadge || null,
    numOffers: rfProduct.numOffers || null,
  };
}

/**
 * Calculate estimated commission for a product
 */
export function estimateCommission(product: AnalyzableProduct): number | null {
  if (!product.price) return null;
  
  const rate = product.category 
    ? COMMISSION_RATES[product.category.toLowerCase()] || COMMISSION_RATES.default
    : COMMISSION_RATES.default;
  
  return Math.round(product.price * rate * 100) / 100;
}

/**
 * Calculate discount percentage
 */
function calculateDiscount(product: AnalyzableProduct): number {
  if (!product.price || !product.originalPrice) return 0;
  if (product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}

/**
 * Pre-calculate basic metrics for AI context
 */
function getProductMetrics(product: AnalyzableProduct): Record<string, any> {
  const discount = calculateDiscount(product);
  const commission = estimateCommission(product);
  
  return {
    asin: product.asin,
    title: product.title.slice(0, 100), // Truncate for token efficiency
    brand: product.brand,
    price: product.price,
    originalPrice: product.originalPrice,
    discount: `${discount}%`,
    rating: product.rating,
    reviews: product.totalReviews,
    category: product.category,
    hasDeal: !!product.dealType,
    isPrime: product.isPrime,
    estimatedCommission: commission,
  };
}

/**
 * Analyze products using GPT for revenue potential
 */
export async function analyzeDeals(
  products: AnalyzableProduct[],
  lang: 'es' | 'en' = 'es'
): Promise<DealAnalysisResult> {
  if (products.length === 0) {
    return {
      success: false,
      error: 'No products to analyze',
    };
  }

  try {
    const apiKey = getApiKey();
    
    // Prepare product data for analysis
    const productsData = products.map(getProductMetrics);

    const systemPromptEs = `Eres un experto en marketing de afiliados de Amazon con años de experiencia.
Tu trabajo es analizar productos y determinar cuáles tienen el mayor potencial de generar comisiones.

Factores a considerar:
1. Precio (productos de $30-300 suelen convertir mejor)
2. Descuento (mayor descuento = mayor urgencia de compra)
3. Rating (4+ estrellas es ideal)
4. Reviews (más reviews = más confianza)
5. Marca reconocida
6. Si tiene deal/oferta activa
7. Si es Prime (mejor conversión)

Responde SOLO con JSON válido.`;

    const systemPromptEn = `You are an expert Amazon affiliate marketer with years of experience.
Your job is to analyze products and determine which ones have the highest potential to generate commissions.

Factors to consider:
1. Price ($30-300 products tend to convert better)
2. Discount (higher discount = more purchase urgency)
3. Rating (4+ stars is ideal)
4. Reviews (more reviews = more trust)
5. Recognized brand
6. Active deal/offer
7. Prime eligible (better conversion)

Respond ONLY with valid JSON.`;

    const userPromptEs = `Analiza estos ${products.length} productos de Amazon para un afiliado:

${JSON.stringify(productsData, null, 2)}

Para CADA producto, devuelve un análisis con este formato JSON:
{
  "analyses": [
    {
      "asin": "ASIN del producto",
      "revenueScore": 8,
      "conversionPotential": "high",
      "competitionLevel": "medium",
      "recommendation": "import_now",
      "reasoning": "Explicación breve de por qué",
      "highlights": ["punto fuerte 1", "punto fuerte 2"],
      "risks": ["riesgo 1"]
    }
  ],
  "summary": {
    "bestPick": "ASIN del mejor producto",
    "averageScore": 7.5
  }
}

Valores permitidos:
- revenueScore: 1-10
- conversionPotential: "high" | "medium" | "low"
- competitionLevel: "high" | "medium" | "low"  
- recommendation: "import_now" | "consider" | "skip"`;

    const userPromptEn = `Analyze these ${products.length} Amazon products for an affiliate:

${JSON.stringify(productsData, null, 2)}

For EACH product, return an analysis with this JSON format:
{
  "analyses": [
    {
      "asin": "Product ASIN",
      "revenueScore": 8,
      "conversionPotential": "high",
      "competitionLevel": "medium",
      "recommendation": "import_now",
      "reasoning": "Brief explanation why",
      "highlights": ["strength 1", "strength 2"],
      "risks": ["risk 1"]
    }
  ],
  "summary": {
    "bestPick": "ASIN of best product",
    "averageScore": 7.5
  }
}

Allowed values:
- revenueScore: 1-10
- conversionPotential: "high" | "medium" | "low"
- competitionLevel: "high" | "medium" | "low"
- recommendation: "import_now" | "consider" | "skip"`;

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: lang === 'es' ? systemPromptEs : systemPromptEn },
          { role: 'user', content: lang === 'es' ? userPromptEs : userPromptEn },
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `OpenAI API error: ${error}`,
      };
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: 'No response from GPT',
      };
    }

    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      
      if (!parsed.analyses || !Array.isArray(parsed.analyses)) {
        return {
          success: false,
          error: 'Invalid response structure from GPT',
        };
      }

      // Enrich analyses with estimated commission
      const analyses: ProductAnalysis[] = parsed.analyses.map((analysis: any) => {
        const product = products.find(p => p.asin === analysis.asin);
        return {
          ...analysis,
          estimatedCommission: product ? estimateCommission(product) : null,
        };
      });

      const recommendedCount = analyses.filter(a => a.recommendation === 'import_now').length;
      const averageScore = analyses.reduce((sum, a) => sum + a.revenueScore, 0) / analyses.length;

      return {
        success: true,
        analyses,
        summary: {
          totalProducts: products.length,
          recommendedCount,
          averageScore: Math.round(averageScore * 10) / 10,
          bestPick: parsed.summary?.bestPick || null,
        },
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse GPT response: ${content.slice(0, 200)}...`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse sales volume string to get approximate number
 * e.g. "10K+ bought in past month" -> 10000
 */
function parseSalesVolume(salesVolume: string | null | undefined): number {
  if (!salesVolume) return 0;

  const match = salesVolume.match(/(\d+)([KkMm])?/);
  if (!match) return 0;

  let num = parseInt(match[1]);
  const multiplier = match[2]?.toUpperCase();

  if (multiplier === 'K') num *= 1000;
  else if (multiplier === 'M') num *= 1000000;

  return num;
}

/**
 * Quick score calculation without AI (for initial filtering)
 * Now includes salesVolume, isBestSeller, isAmazonChoice from MCP
 */
export function calculateQuickScore(product: AnalyzableProduct): number {
  let score = 5; // Base score

  // Price factor (sweet spot: $30-200)
  if (product.price) {
    if (product.price >= 30 && product.price <= 200) score += 1.5;
    else if (product.price >= 20 && product.price <= 300) score += 1;
    else if (product.price < 15) score -= 1;
    else if (product.price > 500) score -= 0.5;
  }

  // Discount factor
  const discount = calculateDiscount(product);
  if (discount >= 30) score += 1.5;
  else if (discount >= 20) score += 1;
  else if (discount >= 10) score += 0.5;

  // Rating factor
  if (product.rating) {
    if (product.rating >= 4.5) score += 1;
    else if (product.rating >= 4.0) score += 0.5;
    else if (product.rating < 3.5) score -= 1;
  }

  // Reviews factor
  if (product.totalReviews) {
    if (product.totalReviews >= 1000) score += 1;
    else if (product.totalReviews >= 100) score += 0.5;
    else if (product.totalReviews < 10) score -= 0.5;
  }

  // Deal factor
  if (product.dealType) score += 1;

  // Prime factor
  if (product.isPrime) score += 0.5;

  // Brand factor (if known brand)
  if (product.brand) score += 0.25;

  // === NEW MCP FACTORS ===

  // Sales volume factor - high demand products convert better
  const salesNum = parseSalesVolume(product.salesVolume);
  if (salesNum >= 10000) score += 1.5; // 10K+ bought
  else if (salesNum >= 5000) score += 1.0; // 5K+ bought
  else if (salesNum >= 1000) score += 0.5; // 1K+ bought

  // Best Seller badge - Amazon's endorsement of popularity
  if (product.isBestSeller) score += 1.0;

  // Amazon's Choice badge - quality + value endorsement
  if (product.isAmazonChoice) score += 0.75;

  // Coupon available - extra savings signal
  if (product.couponText) score += 0.5;

  // Product badge (Overall Pick, Limited time deal, etc.)
  if (product.productBadge) {
    const badge = product.productBadge.toLowerCase();
    if (badge.includes('overall pick')) score += 0.75;
    else if (badge.includes('limited')) score += 0.5;
    else score += 0.25;
  }

  // Multiple sellers = competitive pricing, good for affiliate
  if (product.numOffers && product.numOffers > 3) score += 0.25;

  // Clamp to 1-10
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

/**
 * Filter and sort products by quick score
 */
export function rankProducts(products: AnalyzableProduct[]): Array<AnalyzableProduct & { quickScore: number }> {
  return products
    .map(product => ({
      ...product,
      quickScore: calculateQuickScore(product),
    }))
    .sort((a, b) => b.quickScore - a.quickScore);
}

// ==================== DEAL VALIDATION ====================

import { getPriceStats } from './db';

export interface DealValidation {
  isRealDeal: boolean;
  currentPrice: number;
  avg30DayPrice: number | null;
  avg90DayPrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  inflationScore: number; // 0-100, higher = more likely inflated
  savingsVsAvg: number; // % savings vs 30-day average
  savingsVsLowest: number; // % above lowest price
  recommendation: 'great_deal' | 'good_deal' | 'fair' | 'inflated' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  hasEnoughData: boolean;
}

/**
 * Validate if a deal is genuine based on price history
 */
export async function validateDeal(
  asin: string,
  currentPrice: number,
  marketplace: string = 'com'
): Promise<DealValidation> {
  const stats = await getPriceStats(asin, marketplace);

  // Not enough data
  if (!stats || stats.dataPoints90 < 3) {
    return {
      isRealDeal: false,
      currentPrice,
      avg30DayPrice: null,
      avg90DayPrice: null,
      lowestPrice: null,
      highestPrice: null,
      inflationScore: 0,
      savingsVsAvg: 0,
      savingsVsLowest: 0,
      recommendation: 'unknown',
      confidence: 'low',
      hasEnoughData: false,
    };
  }

  const avgPrice = stats.avg30Day || stats.avg90Day;
  const lowestPrice = stats.min90Day;
  const highestPrice = stats.max90Day;

  // Calculate savings percentages
  const savingsVsAvg = avgPrice > 0 
    ? Math.round(((avgPrice - currentPrice) / avgPrice) * 100) 
    : 0;
  
  const savingsVsLowest = lowestPrice > 0 
    ? Math.round(((currentPrice - lowestPrice) / lowestPrice) * 100) 
    : 0;

  // Calculate inflation score (0-100)
  // Higher score = more likely the "original price" is artificially inflated
  let inflationScore = 0;
  
  // If current price is above average, that's suspicious
  if (currentPrice > avgPrice) {
    inflationScore += Math.min(30, Math.round((currentPrice - avgPrice) / avgPrice * 100));
  }
  
  // If current price is much higher than lowest, add to score
  if (lowestPrice > 0 && currentPrice > lowestPrice * 1.5) {
    inflationScore += 20;
  }

  // Determine recommendation
  let recommendation: 'great_deal' | 'good_deal' | 'fair' | 'inflated' | 'unknown' = 'fair';
  let isRealDeal = false;

  if (savingsVsAvg >= 20 && savingsVsLowest <= 10) {
    // 20%+ below average and close to lowest - great deal
    recommendation = 'great_deal';
    isRealDeal = true;
  } else if (savingsVsAvg >= 10 && savingsVsLowest <= 20) {
    // 10-20% below average - good deal
    recommendation = 'good_deal';
    isRealDeal = true;
  } else if (savingsVsAvg <= -15 || inflationScore > 40) {
    // Above average or high inflation score - potentially inflated
    recommendation = 'inflated';
    isRealDeal = false;
  } else if (currentPrice <= lowestPrice * 1.05) {
    // At or near the lowest price ever
    recommendation = 'great_deal';
    isRealDeal = true;
  }

  // Determine confidence based on data points
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (stats.dataPoints90 >= 20) {
    confidence = 'high';
  } else if (stats.dataPoints90 >= 10) {
    confidence = 'medium';
  }

  return {
    isRealDeal,
    currentPrice,
    avg30DayPrice: stats.avg30Day,
    avg90DayPrice: stats.avg90Day,
    lowestPrice: stats.min90Day,
    highestPrice: stats.max90Day,
    inflationScore,
    savingsVsAvg,
    savingsVsLowest,
    recommendation,
    confidence,
    hasEnoughData: true,
  };
}

// ==================== ENHANCED SCORING ====================

/**
 * Scoring weights - can be configured via admin
 */
export const SCORING_WEIGHTS = {
  discount: 1.5,
  rating: 1.0,
  reviews: 0.8,
  pricePoint: 0.5,
  brand: 0.25,
  prime: 0.5,
  dealType: 1.0,
  // New weights
  priceValidation: 2.0, // Bonus for verified real deals
  userMatch: 1.5, // Bonus for matching user preferences
  curatedBonus: 2.0, // Bonus for manually curated deals
};

export interface EnhancedScoreInput {
  product: AnalyzableProduct;
  // Optional enhancements
  dealValidation?: DealValidation;
  userPreferences?: {
    categories?: string[];
    brands?: string[];
    budgetRange?: 'low' | 'mid' | 'high' | 'premium';
    dealSensitivity?: 'low' | 'medium' | 'high';
  };
  isCurated?: boolean;
}

export interface EnhancedScore {
  totalScore: number;
  breakdown: {
    base: number;
    discount: number;
    rating: number;
    reviews: number;
    pricePoint: number;
    brand: number;
    prime: number;
    dealType: number;
    priceValidation: number;
    userMatch: number;
    curatedBonus: number;
  };
  badges: string[]; // ['verified_deal', 'for_you', 'curated', 'great_discount']
  recommendation: 'import_now' | 'consider' | 'skip';
}

/**
 * Calculate enhanced score with all factors
 */
export function calculateEnhancedScore(input: EnhancedScoreInput): EnhancedScore {
  const { product, dealValidation, userPreferences, isCurated } = input;
  
  const breakdown = {
    base: 5, // Starting base score
    discount: 0,
    rating: 0,
    reviews: 0,
    pricePoint: 0,
    brand: 0,
    prime: 0,
    dealType: 0,
    priceValidation: 0,
    userMatch: 0,
    curatedBonus: 0,
  };

  const badges: string[] = [];

  // Discount score
  const discount = calculateDiscount(product);
  if (discount >= 30) {
    breakdown.discount = 1.5 * SCORING_WEIGHTS.discount;
    badges.push('great_discount');
  } else if (discount >= 20) {
    breakdown.discount = 1.0 * SCORING_WEIGHTS.discount;
  } else if (discount >= 10) {
    breakdown.discount = 0.5 * SCORING_WEIGHTS.discount;
  }

  // Rating score
  if (product.rating) {
    if (product.rating >= 4.5) breakdown.rating = 1.0 * SCORING_WEIGHTS.rating;
    else if (product.rating >= 4.0) breakdown.rating = 0.5 * SCORING_WEIGHTS.rating;
    else if (product.rating < 3.5) breakdown.rating = -0.5 * SCORING_WEIGHTS.rating;
  }

  // Reviews score
  if (product.totalReviews) {
    if (product.totalReviews >= 1000) breakdown.reviews = 1.0 * SCORING_WEIGHTS.reviews;
    else if (product.totalReviews >= 100) breakdown.reviews = 0.5 * SCORING_WEIGHTS.reviews;
    else if (product.totalReviews < 10) breakdown.reviews = -0.5 * SCORING_WEIGHTS.reviews;
  }

  // Price point score (sweet spot: $30-200)
  if (product.price) {
    if (product.price >= 30 && product.price <= 200) {
      breakdown.pricePoint = 1.0 * SCORING_WEIGHTS.pricePoint;
    } else if (product.price >= 20 && product.price <= 300) {
      breakdown.pricePoint = 0.5 * SCORING_WEIGHTS.pricePoint;
    } else if (product.price < 15) {
      breakdown.pricePoint = -0.5 * SCORING_WEIGHTS.pricePoint;
    }
  }

  // Brand score
  if (product.brand) {
    breakdown.brand = SCORING_WEIGHTS.brand;
  }

  // Prime score
  if (product.isPrime) {
    breakdown.prime = SCORING_WEIGHTS.prime;
  }

  // Deal type score
  if (product.dealType) {
    breakdown.dealType = SCORING_WEIGHTS.dealType;
  }

  // Price validation score (new)
  if (dealValidation?.hasEnoughData) {
    if (dealValidation.recommendation === 'great_deal') {
      breakdown.priceValidation = SCORING_WEIGHTS.priceValidation;
      badges.push('verified_deal');
    } else if (dealValidation.recommendation === 'good_deal') {
      breakdown.priceValidation = SCORING_WEIGHTS.priceValidation * 0.5;
      badges.push('verified_deal');
    } else if (dealValidation.recommendation === 'inflated') {
      breakdown.priceValidation = -SCORING_WEIGHTS.priceValidation;
    }
  }

  // User match score (new)
  if (userPreferences) {
    let matchScore = 0;

    // Category match
    if (product.category && userPreferences.categories?.includes(product.category.toLowerCase())) {
      matchScore += 0.5;
    }

    // Brand match
    if (product.brand && userPreferences.brands?.some(b => 
      b.toLowerCase() === product.brand?.toLowerCase()
    )) {
      matchScore += 0.5;
    }

    // Budget match
    if (product.price && userPreferences.budgetRange) {
      const inBudget = (
        (userPreferences.budgetRange === 'low' && product.price < 50) ||
        (userPreferences.budgetRange === 'mid' && product.price >= 50 && product.price < 200) ||
        (userPreferences.budgetRange === 'high' && product.price >= 200 && product.price < 500) ||
        (userPreferences.budgetRange === 'premium' && product.price >= 500)
      );
      if (inBudget) matchScore += 0.3;
    }

    // Deal sensitivity adjustment
    if (userPreferences.dealSensitivity === 'high' && discount >= 20) {
      matchScore += 0.3;
    }

    if (matchScore > 0) {
      breakdown.userMatch = matchScore * SCORING_WEIGHTS.userMatch;
      if (matchScore >= 0.5) badges.push('for_you');
    }
  }

  // Curated bonus (new)
  if (isCurated) {
    breakdown.curatedBonus = SCORING_WEIGHTS.curatedBonus;
    badges.push('curated');
  }

  // Calculate total score
  const totalScore = Math.max(1, Math.min(10, 
    breakdown.base +
    breakdown.discount +
    breakdown.rating +
    breakdown.reviews +
    breakdown.pricePoint +
    breakdown.brand +
    breakdown.prime +
    breakdown.dealType +
    breakdown.priceValidation +
    breakdown.userMatch +
    breakdown.curatedBonus
  ));

  // Determine recommendation
  let recommendation: 'import_now' | 'consider' | 'skip' = 'consider';
  if (totalScore >= 8) recommendation = 'import_now';
  else if (totalScore < 5) recommendation = 'skip';

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    breakdown,
    badges,
    recommendation,
  };
}
