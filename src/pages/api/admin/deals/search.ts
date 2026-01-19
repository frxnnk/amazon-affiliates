/**
 * API Endpoint: Search Products
 *
 * POST /api/admin/deals/search
 *
 * Searches Amazon products using RapidAPI (search is not available in Creators API).
 */

import type { APIRoute } from 'astro';
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
  source?: 'rapidapi';
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

    // Check if RapidAPI is configured (search is not available in Creators API)
    if (!isRainforestConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Search API not configured. Set RAPIDAPI_KEY environment variable.',
        } as SearchResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Search using RapidAPI
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

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error.message,
        } as SearchResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    products = result.data.map(p => toAnalyzableProduct(p, body.category));
    totalResults = result.totalResults;

    // Rank products by quick score
    const rankedProducts = rankProducts(products);

    return new Response(
      JSON.stringify({
        success: true,
        products: rankedProducts,
        totalResults,
        source: 'rapidapi',
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
