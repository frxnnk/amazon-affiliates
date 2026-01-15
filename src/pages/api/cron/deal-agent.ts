/**
 * API Endpoint: Automated Deal Agent (Cron Job)
 * 
 * POST /api/cron/deal-agent
 * 
 * This endpoint can be called by:
 * - Vercel Cron: Add to vercel.json
 * - GitHub Actions: Schedule workflow
 * - Manual trigger from admin panel
 * 
 * Security: Requires CRON_SECRET header or admin auth
 */

import type { APIRoute } from 'astro';
import { getDealAgentKeywords, updateKeywordSearched, createProduct, setDealAgentConfig, getDealAgentConfig } from '@lib/db';
import { searchProductsRainforest, isRainforestConfigured } from '@lib/rainforest-api';
import { analyzeDealPotential } from '@lib/deal-analyzer';
import { sendDealAlert, isTelegramConfigured, type ProductMessage } from '@lib/telegram-bot';

export const prerender = false;

interface AgentResult {
  success: boolean;
  keywordsSearched: number;
  productsFound: number;
  dealsAnalyzed: number;
  productsImported: number;
  telegramSent: boolean;
  error?: string;
  details?: {
    keyword: string;
    found: number;
    imported: number;
  }[];
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
    .replace(/-$/, '');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Security check
    const cronSecret = import.meta.env.CRON_SECRET || process.env.CRON_SECRET;
    const authHeader = request.headers.get('Authorization');
    const cronHeader = request.headers.get('x-cron-secret');

    // Allow if: has valid cron secret, or is admin (has auth header), or no security configured
    const isAuthorized = 
      (cronSecret && cronHeader === cronSecret) ||
      (authHeader && authHeader.startsWith('Bearer ')) ||
      !cronSecret;

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if API is configured
    if (!isRainforestConfigured()) {
      return new Response(
        JSON.stringify({ success: false, error: 'RapidAPI not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get affiliate tag
    const affiliateTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';

    // Get active keywords
    const keywords = await getDealAgentKeywords(true); // active only

    if (keywords.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          keywordsSearched: 0,
          productsFound: 0,
          dealsAnalyzed: 0,
          productsImported: 0,
          telegramSent: false,
          message: 'No active keywords configured'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result: AgentResult = {
      success: true,
      keywordsSearched: 0,
      productsFound: 0,
      dealsAnalyzed: 0,
      productsImported: 0,
      telegramSent: false,
      details: [],
    };

    const allDeals: ProductMessage[] = [];
    const minDiscount = await getDealAgentConfig('minDiscount') as number || 15;
    const autoImport = await getDealAgentConfig('autoImport') as boolean ?? true;
    const maxImportsPerRun = await getDealAgentConfig('maxImportsPerRun') as number || 5;

    let totalImported = 0;

    // Search each keyword
    for (const kw of keywords) {
      try {
        result.keywordsSearched++;

        const searchResult = await searchProductsRainforest({
          keywords: kw.keyword,
          amazonDomain: kw.marketplace,
          category: kw.category || undefined,
        });

        if (!searchResult.success || !searchResult.data) {
          continue;
        }

        const products = searchResult.data;
        result.productsFound += products.length;

        // Update keyword stats
        await updateKeywordSearched(kw.id, products.length);

        // Filter for deals (products with good discounts)
        const deals = products.filter(p => {
          if (!p.price || !p.originalPrice) return false;
          const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
          return discount >= minDiscount;
        });

        const keywordDetail = {
          keyword: kw.keyword,
          found: products.length,
          imported: 0,
        };

        // Process deals
        for (const deal of deals.slice(0, 3)) { // Max 3 per keyword
          if (!autoImport || totalImported >= maxImportsPerRun) break;

          result.dealsAnalyzed++;

          // Quick score check - analyze with GPT if configured
          let shouldImport = true;
          try {
            const analysis = await analyzeDealPotential(deal, 'es');
            shouldImport = analysis.recommendation !== 'skip';
          } catch {
            // Continue without analysis
          }

          if (shouldImport && autoImport) {
            // Generate affiliate URL
            const amazonDomain = kw.marketplace === 'es' ? 'amazon.es' : 'amazon.com';
            const affiliateUrl = `https://www.${amazonDomain}/dp/${deal.asin}?tag=${affiliateTag}`;

            // Create product
            try {
              await createProduct({
                productId: generateSlug(deal.title) + '-' + deal.asin.slice(-4),
                asin: deal.asin,
                lang: kw.marketplace === 'es' ? 'es' : 'en',
                title: deal.title,
                brand: deal.brand || 'Amazon',
                description: deal.description || deal.title,
                price: deal.price!,
                originalPrice: deal.originalPrice || undefined,
                currency: deal.currency,
                affiliateUrl,
                rating: deal.rating || undefined,
                totalReviews: deal.totalReviews || undefined,
                featuredImageUrl: deal.imageUrl || '',
                category: kw.category || 'electronics',
                status: 'draft',
                isOnSale: true,
              });

              totalImported++;
              keywordDetail.imported++;
              result.productsImported++;

              // Add to deals list for Telegram
              allDeals.push({
                title: deal.title,
                brand: deal.brand || 'Amazon',
                price: deal.price!,
                originalPrice: deal.originalPrice || undefined,
                currency: deal.currency,
                affiliateUrl,
                imageUrl: deal.imageUrl || undefined,
                rating: deal.rating || undefined,
              });
            } catch (err) {
              // Product might already exist
              console.error('Failed to create product:', err);
            }
          }
        }

        result.details!.push(keywordDetail);

        // Rate limiting between keywords
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`Error searching keyword "${kw.keyword}":`, err);
      }
    }

    // Send Telegram notification if configured and we found deals
    if (isTelegramConfigured() && allDeals.length > 0) {
      try {
        const telegramResult = await sendDealAlert(allDeals, 'es');
        result.telegramSent = telegramResult.success;
      } catch {
        result.telegramSent = false;
      }
    }

    // Update last run time
    await setDealAgentConfig('lastRunAt', new Date().toISOString());
    await setDealAgentConfig('lastRunResult', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Deal agent error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        keywordsSearched: 0,
        productsFound: 0,
        dealsAnalyzed: 0,
        productsImported: 0,
        telegramSent: false,
      } as AgentResult),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET endpoint for status check
export const GET: APIRoute = async () => {
  try {
    const lastRunAt = await getDealAgentConfig('lastRunAt');
    const lastRunResult = await getDealAgentConfig('lastRunResult');
    const keywords = await getDealAgentKeywords(true);

    return new Response(
      JSON.stringify({
        success: true,
        configured: isRainforestConfigured(),
        telegramConfigured: isTelegramConfigured(),
        activeKeywords: keywords.length,
        lastRunAt,
        lastRunResult,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
