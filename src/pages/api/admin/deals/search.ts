/**
 * API Endpoint: Search Products
 * 
 * POST /api/admin/deals/search
 * 
 * Searches Amazon products using PA-API with Rainforest fallback.
 */

import type { APIRoute } from 'astro';
import { searchProducts, isPaapiConfigured, type SearchFilters } from '@lib/amazon-paapi';
import { searchProductsRainforest, isRainforestConfigured, type RainforestSearchFilters } from '@lib/rainforest-api';
import { rankProducts, toAnalyzableProduct, type AnalyzableProduct } from '@lib/deal-analyzer';

export const prerender = false;

interface SearchRequest {
  keywords: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'reviews';
  marketplace?: string;
  page?: number;
}

interface SearchResponse {
  success: boolean;
  products?: Array<AnalyzableProduct & { quickScore: number }>;
  totalResults?: number;
  source?: 'paapi' | 'rainforest';
  error?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: SearchRequest = await request.json();

    if (!body.keywords || body.keywords.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Keywords are required',
        } as SearchResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const marketplace = body.marketplace || 'com';
    let products: AnalyzableProduct[] = [];
    let totalResults = 0;
    let source: 'paapi' | 'rainforest' = 'paapi';

    // Try PA-API first
    if (isPaapiConfigured()) {
      const filters: SearchFilters = {
        keywords: body.keywords,
        category: body.category,
        minPrice: body.minPrice,
        maxPrice: body.maxPrice,
        minSavingsPercent: body.minDiscount,
        sortBy: body.sortBy,
        itemCount: 10,
      };

      const result = await searchProducts(filters, marketplace);

      if (result.success && result.data.length > 0) {
        products = result.data.map(p => toAnalyzableProduct(p, body.category));
        totalResults = result.totalResults;
        source = 'paapi';
      }
    }

    // Fallback to Rainforest if PA-API failed or returned no results
    if (products.length === 0 && isRainforestConfigured()) {
      const filters: RainforestSearchFilters = {
        keywords: body.keywords,
        category: body.category,
        minPrice: body.minPrice,
        maxPrice: body.maxPrice,
        sortBy: body.sortBy,
        amazonDomain: marketplace,
        page: body.page || 1,
      };

      const result = await searchProductsRainforest(filters);

      if (result.success) {
        products = result.data.map(p => toAnalyzableProduct(p, body.category));
        totalResults = result.totalResults;
        source = 'rainforest';
      } else {
        // Both APIs failed
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error.message,
          } as SearchResponse),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // If neither API is configured
    if (products.length === 0 && !isPaapiConfigured() && !isRainforestConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No search API configured. Set PA-API or Rainforest API credentials.',
        } as SearchResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rank products by quick score
    const rankedProducts = rankProducts(products);

    return new Response(
      JSON.stringify({
        success: true,
        products: rankedProducts,
        totalResults,
        source,
      } as SearchResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      } as SearchResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
