/**
 * API Endpoint: Curated Deals Management
 * 
 * GET /api/admin/curated-deals - Get all curated deals
 * POST /api/admin/curated-deals - Create a new curated deal
 */

import type { APIRoute } from 'astro';
import { getAllCuratedDeals, saveCuratedDeal } from '@lib/db';
import { getProductByAsin, type PAAPIConfig } from '@lib/amazon-paapi';

export const prerender = false;

interface CreateDealRequest {
  asin: string;
  marketplace?: string;
  priority?: number;
  reason?: string;
  validUntil?: string;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const marketplace = url.searchParams.get('marketplace') || undefined;
    const curationType = url.searchParams.get('type') as any;
    const activeOnly = url.searchParams.get('active') === 'true';

    const deals = await getAllCuratedDeals({
      marketplace,
      curationType,
      activeOnly,
      limit: 100,
    });

    return new Response(
      JSON.stringify({ success: true, deals }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: CreateDealRequest = await request.json();

    if (!body.asin || !/^[A-Z0-9]{10}$/i.test(body.asin)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid ASIN format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const marketplace = body.marketplace || 'com';
    const affiliateTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';
    const domain = marketplace === 'es' ? 'amazon.es' : 'amazon.com';

    // Try to fetch product data from PA-API
    let productData: {
      title?: string;
      brand?: string;
      price?: number;
      originalPrice?: number;
      currency?: string;
      imageUrl?: string;
      rating?: number;
      totalReviews?: number;
    } = {};

    try {
      const result = await getProductByAsin(body.asin, marketplace);
      if (result.success) {
        productData = {
          title: result.data.title,
          brand: result.data.brand || undefined,
          price: result.data.price || undefined,
          originalPrice: result.data.originalPrice || undefined,
          currency: result.data.currency,
          imageUrl: result.data.imageUrl || undefined,
          rating: result.data.rating || undefined,
          totalReviews: result.data.totalReviews || undefined,
        };
      }
    } catch (e) {
      // Silently fail - we'll create the deal without product data
      console.log('Could not fetch product data:', e);
    }

    const affiliateUrl = `https://www.${domain}/dp/${body.asin.toUpperCase()}?tag=${affiliateTag}`;

    const deal = await saveCuratedDeal({
      asin: body.asin.toUpperCase(),
      marketplace,
      curationType: 'admin',
      priority: body.priority || 50,
      reason: body.reason,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      isActive: true,
      createdBy: 'admin', // TODO: Get from auth
      ...productData,
      affiliateUrl,
    });

    return new Response(
      JSON.stringify({ success: true, deal }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
