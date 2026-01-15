/**
 * API Endpoint: Analyze Products with AI
 * 
 * POST /api/admin/deals/analyze
 * 
 * Uses GPT to analyze products and calculate revenue potential.
 */

import type { APIRoute } from 'astro';
import { analyzeDeals, type AnalyzableProduct } from '@lib/deal-analyzer';

export const prerender = false;

interface AnalyzeRequest {
  products: AnalyzableProduct[];
  lang?: 'es' | 'en';
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: AnalyzeRequest = await request.json();

    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Products array is required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 10 products to avoid token limits
    const productsToAnalyze = body.products.slice(0, 10);
    const lang = body.lang || 'es';

    const result = await analyzeDeals(productsToAnalyze, lang);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        analyses: result.analyses,
        summary: result.summary,
        tokensUsed: result.tokensUsed,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
