import type { APIRoute } from 'astro';
import { searchProductsRainforest, isRainforestConfigured } from '@lib/rainforest-api';
import { db, Products, like, eq } from 'astro:db';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q');
  const lang = url.searchParams.get('lang') || 'es';
  
  if (!query || query.length < 2) {
    return new Response(
      JSON.stringify({ success: false, error: 'Query too short', products: [] }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const PARTNER_TAG = import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';
    const amazonDomain = lang === 'es' ? 'es' : 'com';
    
    let products: any[] = [];

    // Try RapidAPI first if configured
    if (isRainforestConfigured()) {
      try {
        const result = await searchProductsRainforest({
          keywords: query,
          amazonDomain: amazonDomain,
          page: 1,
        });
        
        if (result.success && result.data?.length) {
          products = result.data.slice(0, 20).map((p) => {
            const discount = p.originalPrice && p.price && p.originalPrice > p.price
              ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
              : 0;
            
            return {
              asin: p.asin,
              title: p.title,
              brand: p.brand || '',
              price: p.price,
              originalPrice: p.originalPrice || null,
              formattedPrice: p.price 
                ? new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', {
                    style: 'currency',
                    currency: p.currency || 'EUR'
                  }).format(p.price)
                : '',
              formattedOriginalPrice: p.originalPrice
                ? new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', {
                    style: 'currency',
                    currency: p.currency || 'EUR'
                  }).format(p.originalPrice)
                : null,
              discount,
              rating: p.rating || null,
              totalReviews: p.totalReviews || null,
              image: p.imageUrl || '',
              isPrime: p.isPrime || false,
              affiliateUrl: `https://www.amazon.${amazonDomain}/dp/${p.asin}?tag=${PARTNER_TAG}`,
              source: 'rapidapi',
            };
          });
        }
      } catch (e) {
        console.error('[Search] RapidAPI error:', e);
      }
    }

    // Fallback to local database if no RapidAPI results
    if (products.length === 0) {
      console.log('[Search] Falling back to local database for query:', query);
      
      try {
        // Search in Products table
        const queryLower = query.toLowerCase();
        const dbProducts = await db
          .select()
          .from(Products)
          .where(eq(Products.lang, lang))
          .all();
        
        // Filter by title, brand, or category containing the query
        const matchedProducts = dbProducts.filter(p => 
          p.title.toLowerCase().includes(queryLower) ||
          p.brand.toLowerCase().includes(queryLower) ||
          (p.category && p.category.toLowerCase().includes(queryLower)) ||
          (p.description && p.description.toLowerCase().includes(queryLower))
        ).slice(0, 20);

        products = matchedProducts.map(p => {
          const discount = p.originalPrice && p.price && p.originalPrice > p.price
            ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
            : 0;

          return {
            asin: p.asin,
            title: p.title,
            brand: p.brand || '',
            price: p.price,
            originalPrice: p.originalPrice || null,
            formattedPrice: p.price 
              ? new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', {
                  style: 'currency',
                  currency: p.currency || 'EUR'
                }).format(p.price)
              : '',
            formattedOriginalPrice: p.originalPrice
              ? new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', {
                  style: 'currency',
                  currency: p.currency || 'EUR'
                }).format(p.originalPrice)
              : null,
            discount,
            rating: p.rating || null,
            totalReviews: null,
            image: p.featuredImageUrl || '',
            isPrime: false,
            affiliateUrl: p.affiliateUrl || `https://www.amazon.${amazonDomain}/dp/${p.asin}?tag=${PARTNER_TAG}`,
            source: 'database',
          };
        });

        console.log('[Search] Found', products.length, 'products in database');
      } catch (dbError) {
        console.error('[Search] Database error:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        products,
        source: products.length > 0 ? products[0].source : 'none'
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        } 
      }
    );
  } catch (error) {
    console.error('Search API error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Search failed', products: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
