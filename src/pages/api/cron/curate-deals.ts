/**
 * Cron Job: AI Deal Curation
 * 
 * POST /api/cron/curate-deals
 * 
 * Automatically discovers and curates the best deals using:
 * 1. Rainforest API to find trending products
 * 2. Price history validation
 * 3. AI analysis for quality scoring
 * 
 * Should be called via cron (e.g., Vercel Cron, Cloudflare Workers, etc.)
 * Recommended: Run every 6-12 hours
 */

import type { APIRoute } from 'astro';
import { searchProductsRainforest, isRainforestConfigured } from '@lib/rainforest-api';
import { 
  analyzeDeals, 
  toAnalyzableProduct, 
  calculateEnhancedScore, 
  validateDeal,
  type AnalyzableProduct 
} from '@lib/deal-analyzer';
import { 
  saveCuratedDeal, 
  expireCuratedDeals, 
  getDealAgentKeywords,
  getAllDealAgentConfig 
} from '@lib/db';
import { trackPrices } from '@lib/keepa-api';

export const prerender = false;

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const cronSecret = import.meta.env.CRON_SECRET;
  if (!cronSecret) return true; // No secret configured, allow all
  
  const authHeader = request.headers.get('Authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');
  
  return providedSecret === cronSecret;
}

interface CurationResult {
  success: boolean;
  dealsFound: number;
  dealsCreated: number;
  dealsSkipped: number;
  errors: string[];
  duration: number;
}

// Default search terms for deal discovery
const DEFAULT_SEARCH_TERMS = [
  'deals today',
  'best sellers electronics',
  'lightning deals',
  'daily deals',
  'trending tech',
];

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result: CurationResult = {
    success: true,
    dealsFound: 0,
    dealsCreated: 0,
    dealsSkipped: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Check if Rainforest API is configured
    if (!isRainforestConfigured()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rainforest API not configured' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get configuration
    const config = await getAllDealAgentConfig();
    const minScore = (config.minCurationScore as number) || 7;
    const maxDealsPerRun = (config.maxDealsPerRun as number) || 10;
    const marketplace = (config.marketplace as string) || 'com';

    // Expire old curated deals first
    await expireCuratedDeals();

    // Get active keywords from database
    const keywords = await getDealAgentKeywords(true);
    const searchTerms = keywords.length > 0 
      ? keywords.map(k => k.keyword)
      : DEFAULT_SEARCH_TERMS;

    console.log(`[Curation] Starting with ${searchTerms.length} search terms`);

    // Collect products from searches
    const allProducts: AnalyzableProduct[] = [];
    const seenAsins = new Set<string>();

    for (const term of searchTerms.slice(0, 5)) { // Limit to 5 searches per run
      try {
        console.log(`[Curation] Searching: "${term}"`);
        
        const searchResult = await searchProductsRainforest({
          keywords: term,
          amazonDomain: marketplace,
          page: 1,
        });

        if (searchResult.success && searchResult.data) {
          for (const product of searchResult.data) {
            // Skip if already seen
            if (seenAsins.has(product.asin)) continue;
            seenAsins.add(product.asin);

            // Skip products without price
            if (!product.price) continue;

            const analyzable = toAnalyzableProduct(product);
            allProducts.push(analyzable);
          }

          // Track prices for history
          await trackPrices(
            searchResult.data
              .filter(p => p.price)
              .map(p => ({
                asin: p.asin,
                price: p.price!,
                originalPrice: p.originalPrice || undefined,
                currency: p.currency,
                marketplace,
              }))
          );
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Search "${term}": ${message}`);
      }
    }

    result.dealsFound = allProducts.length;
    console.log(`[Curation] Found ${allProducts.length} products to analyze`);

    if (allProducts.length === 0) {
      result.duration = Date.now() - startTime;
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Analyze with AI (in batches to avoid token limits)
    const batchSize = 10;
    const scoredProducts: Array<{
      product: AnalyzableProduct;
      score: number;
      validation: Awaited<ReturnType<typeof validateDeal>>;
      aiAnalysis?: any;
    }> = [];

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      
      // Validate prices for each product
      const validatedBatch = await Promise.all(
        batch.map(async (product) => {
          const validation = await validateDeal(
            product.asin,
            product.price!,
            marketplace
          );
          
          const enhancedScore = calculateEnhancedScore({
            product,
            dealValidation: validation,
            isCurated: false,
          });

          return {
            product,
            score: enhancedScore.totalScore,
            validation,
          };
        })
      );

      scoredProducts.push(...validatedBatch);

      // Optional: Run AI analysis on top candidates
      const topCandidates = validatedBatch
        .filter(p => p.score >= minScore - 1)
        .slice(0, 5);

      if (topCandidates.length > 0) {
        try {
          const aiResult = await analyzeDeals(
            topCandidates.map(p => p.product),
            'en'
          );

          if (aiResult.success && aiResult.analyses) {
            for (const analysis of aiResult.analyses) {
              const match = scoredProducts.find(p => p.product.asin === analysis.asin);
              if (match) {
                match.aiAnalysis = analysis;
                // Boost score based on AI recommendation
                if (analysis.recommendation === 'import_now') {
                  match.score = Math.min(10, match.score + 1);
                }
              }
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'AI error';
          result.errors.push(`AI analysis: ${message}`);
        }
      }
    }

    // Sort by score and curate top deals
    const topDeals = scoredProducts
      .filter(p => p.score >= minScore)
      .filter(p => p.validation.recommendation !== 'inflated')
      .sort((a, b) => b.score - a.score)
      .slice(0, maxDealsPerRun);

    console.log(`[Curation] ${topDeals.length} deals pass threshold (min score: ${minScore})`);

    // Save curated deals
    for (const deal of topDeals) {
      try {
        const { product, score, validation, aiAnalysis } = deal;
        
        // Build affiliate URL
        const affiliateTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';
        const domain = marketplace === 'es' ? 'amazon.es' : 'amazon.com';
        const affiliateUrl = `https://www.${domain}/dp/${product.asin}?tag=${affiliateTag}`;

        // Build reason string
        let reason = `Score: ${score}/10`;
        if (validation.hasEnoughData) {
          reason += ` | ${validation.savingsVsAvg}% below avg`;
        }
        if (aiAnalysis?.reasoning) {
          reason += ` | ${aiAnalysis.reasoning}`;
        }

        await saveCuratedDeal({
          asin: product.asin,
          marketplace,
          curationType: 'ai',
          priority: Math.round(score * 10),
          reason: reason.slice(0, 500),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          isActive: true,
          createdBy: 'system',
          aiScore: score,
          // Cached product data
          title: product.title,
          brand: product.brand || undefined,
          price: product.price || undefined,
          originalPrice: product.originalPrice || undefined,
          currency: product.currency,
          imageUrl: product.imageUrl || undefined,
          affiliateUrl,
          rating: product.rating || undefined,
          totalReviews: product.totalReviews || undefined,
        });

        result.dealsCreated++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Save error';
        result.errors.push(`Save ${deal.product.asin}: ${message}`);
        result.dealsSkipped++;
      }
    }

    result.dealsSkipped = scoredProducts.length - topDeals.length;
    result.duration = Date.now() - startTime;

    console.log(`[Curation] Complete: ${result.dealsCreated} created, ${result.dealsSkipped} skipped`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        } 
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.success = false;
    result.errors.push(message);
    result.duration = Date.now() - startTime;

    console.error('[Curation] Failed:', message);

    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Also support GET for manual triggering (with auth)
export const GET: APIRoute = async ({ request }) => {
  // Redirect to POST handler
  return POST({ request } as any);
};
