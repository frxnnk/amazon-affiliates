/**
 * API Endpoint: Personalized Recommendations
 * 
 * GET /api/user/recommendations
 * 
 * Returns personalized product recommendations based on user's likes.
 * If not logged in, returns trending products from the feed.
 * 
 * Query params:
 * - limit: number of products to return (default: 8)
 * - includeHero: if true, includes a featured product with video for hero section
 */

import type { APIRoute } from 'astro';
import { db, ProductLikes, Products, eq, desc } from 'astro:db';
import { searchProductsRainforest, isRainforestConfigured } from '@lib/rainforest-api';
import { getProductVideo, getQuotaStatus } from '@lib/video-cache';
import { getVideoEmbedUrl, isYouTubeConfigured } from '@lib/youtube-api';

export const prerender = false;

interface RecommendedProduct {
  productId: string;
  asin: string;
  title: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating?: number;
  featuredImage: { url: string; alt: string };
  affiliateUrl: string;
  category?: string;
  discountPercent?: number;
  youtubeVideo?: {
    videoId: string;
    title: string;
    embedUrl: string;
    thumbnail: string;
  } | null;
}

interface HeroProduct extends RecommendedProduct {
  youtubeVideo: {
    videoId: string;
    title: string;
    embedUrl: string;
    thumbnail: string;
  };
}

// Brand to related keywords mapping for recommendations
const BRAND_RELATED: Record<string, string[]> = {
  'apple': ['iphone', 'airpods', 'macbook', 'ipad', 'apple watch'],
  'samsung': ['samsung galaxy', 'samsung buds', 'samsung watch', 'samsung tv'],
  'sony': ['sony headphones', 'playstation', 'sony camera', 'sony earbuds'],
  'bose': ['bose headphones', 'bose speaker', 'bose earbuds', 'soundbar'],
  'amazon': ['kindle', 'echo', 'fire tv', 'alexa', 'ring'],
  'logitech': ['logitech mouse', 'logitech keyboard', 'webcam', 'logitech headset'],
  'nintendo': ['nintendo switch', 'joy-con', 'nintendo games'],
  'razer': ['razer mouse', 'razer keyboard', 'razer headset', 'gaming'],
  'jbl': ['jbl speaker', 'jbl headphones', 'jbl earbuds', 'bluetooth speaker'],
  'anker': ['anker charger', 'power bank', 'usb cable', 'anker speaker'],
};

// Category to search terms mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'electronics': ['electronics deals', 'tech gadgets', 'best electronics'],
  'audio': ['wireless headphones', 'bluetooth speaker', 'earbuds deals'],
  'gaming': ['gaming accessories', 'gaming headset', 'controller'],
  'smartphones': ['phone accessories', 'phone case', 'charger'],
  'home': ['smart home', 'home gadgets', 'kitchen accessories'],
  'wearables': ['smartwatch', 'fitness tracker', 'smart band'],
  'computers': ['laptop accessories', 'monitor', 'keyboard mouse'],
};

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '8', 10);
    const includeHero = url.searchParams.get('includeHero') === 'true';
    const lang = url.searchParams.get('lang') || 'es';
    
    // Check authentication
    const auth = locals.auth?.();
    const userId = auth?.userId || null;
    const isLoggedIn = !!userId;
    
    let recommendations: RecommendedProduct[] = [];
    let heroProduct: HeroProduct | null = null;
    let source = 'trending';
    let searchKeywords: string[] = [];
    
    // If logged in, analyze user's likes for personalization
    if (isLoggedIn && userId) {
      const likes = await db
        .select()
        .from(ProductLikes)
        .where(eq(ProductLikes.userId, userId))
        .orderBy(desc(ProductLikes.createdAt))
        .limit(20)
        .all();
      
      if (likes.length > 0) {
        // Analyze liked products for categories and brands
        const brandCounts: Record<string, number> = {};
        const categoryCounts: Record<string, number> = {};
        
        for (const like of likes) {
          if (like.productId) {
            const product = await db
              .select()
              .from(Products)
              .where(eq(Products.productId, like.productId))
              .get();
            
            if (product) {
              // Count brands
              const brand = product.brand?.toLowerCase() || '';
              if (brand) brandCounts[brand] = (brandCounts[brand] || 0) + 1;
              
              // Count categories
              const category = product.category?.toLowerCase() || '';
              if (category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
          }
        }
        
        // Get top brands and categories
        const topBrands = Object.entries(brandCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([brand]) => brand);
        
        const topCategories = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([cat]) => cat);
        
        // Build search keywords from preferences
        for (const brand of topBrands) {
          if (BRAND_RELATED[brand]) {
            searchKeywords.push(...BRAND_RELATED[brand].slice(0, 2));
          } else {
            searchKeywords.push(brand);
          }
        }
        
        for (const category of topCategories) {
          if (CATEGORY_KEYWORDS[category]) {
            searchKeywords.push(...CATEGORY_KEYWORDS[category].slice(0, 2));
          }
        }
        
        // Deduplicate
        searchKeywords = [...new Set(searchKeywords)].slice(0, 6);
        source = 'personalized';
      }
    }
    
    // Fallback to trending keywords if no personalization
    if (searchKeywords.length === 0) {
      searchKeywords = lang === 'es'
        ? ['ofertas tecnología', 'auriculares bluetooth', 'gadgets']
        : ['tech deals', 'wireless headphones', 'gadgets'];
      source = 'trending';
    }
    
    // Fetch products from RapidAPI
    if (isRainforestConfigured()) {
      const keyword = searchKeywords[Math.floor(Math.random() * searchKeywords.length)];
      const marketplace = lang === 'es' ? 'es' : 'com';
      
      const result = await searchProductsRainforest({
        keywords: keyword,
        amazonDomain: marketplace,
      });
      
      if (result.success && result.data && result.data.length > 0) {
        const affiliateTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';
        
        recommendations = result.data
          .filter(p => p.imageUrl && p.price && p.price > 0)
          .slice(0, limit + (includeHero ? 5 : 0)) // Get extra for hero selection
          .map((p, idx) => {
            const amazonDomain = marketplace === 'es' ? 'amazon.es' : 'amazon.com';
            const discountPercent = p.originalPrice && p.price
              ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
              : 0;
            
            return {
              productId: `rec-${p.asin}-${idx}`,
              asin: p.asin,
              title: p.title,
              brand: p.brand || 'Amazon',
              price: p.price!,
              originalPrice: p.originalPrice || undefined,
              currency: p.currency || (marketplace === 'es' ? 'EUR' : 'USD'),
              rating: p.rating || undefined,
              featuredImage: {
                url: p.imageUrl!,
                alt: p.title,
              },
              affiliateUrl: `https://www.${amazonDomain}/dp/${p.asin}?tag=${affiliateTag}`,
              category: undefined,
              discountPercent,
              youtubeVideo: null,
            };
          });
      }
    }
    
    // Fallback to database products if RapidAPI failed
    if (recommendations.length === 0) {
      const dbProducts = await db
        .select()
        .from(Products)
        .where(eq(Products.status, 'published'))
        .orderBy(desc(Products.isFeatured), desc(Products.createdAt))
        .limit(limit + (includeHero ? 5 : 0))
        .all();
      
      recommendations = dbProducts.map((p, idx) => ({
        productId: p.productId,
        asin: p.asin,
        title: p.title,
        brand: p.brand,
        price: p.price,
        originalPrice: p.originalPrice || undefined,
        currency: p.currency,
        rating: p.rating || undefined,
        featuredImage: {
          url: p.featuredImageUrl,
          alt: p.featuredImageAlt || p.title,
        },
        affiliateUrl: p.affiliateUrl,
        category: p.category || undefined,
        discountPercent: p.originalPrice && p.price
          ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
          : 0,
        youtubeVideo: null,
      }));
      source = 'database';
    }
    
    // If hero requested, find a product with video
    if (includeHero && recommendations.length > 0 && isYouTubeConfigured()) {
      const quotaStatus = await getQuotaStatus();

      if (quotaStatus.remaining > 0) {
        // Try to find a product with video for hero
        for (const product of recommendations.slice(0, 5)) {
          const video = await getProductVideo(product.asin, product.title, lang as 'es' | 'en');
          
          if (video) {
            heroProduct = {
              ...product,
              youtubeVideo: {
                videoId: video.videoId,
                title: video.title,
                embedUrl: getVideoEmbedUrl(video.videoId, { autoplay: false, mute: false, loop: true }),
                thumbnail: video.thumbnail,
              },
            };
            // Remove hero from regular recommendations
            recommendations = recommendations.filter(p => p.asin !== product.asin);
            break;
          }
        }
      }
    }
    
    // Limit to requested amount
    recommendations = recommendations.slice(0, limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        isLoggedIn,
        source,
        searchKeywords: isLoggedIn ? searchKeywords : undefined,
        recommendations,
        heroProduct,
        total: recommendations.length,
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': isLoggedIn ? 'private, no-cache' : 'public, max-age=300',
        } 
      }
    );
    
  } catch (error) {
    console.error('Recommendations error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: [],
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
