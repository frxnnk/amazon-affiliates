/**
 * API endpoint to migrate products to remote DB
 * POST /api/admin/migrate-products
 * Body: { products: [...] }
 */

import type { APIRoute } from 'astro';
import { db, Products, eq, and } from 'astro:db';

export const prerender = false;

interface ProductData {
  productId: string;
  asin: string;
  lang: string;
  title: string;
  brand: string;
  description: string;
  shortDescription?: string;
  category?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  affiliateUrl: string;
  rating?: number;
  totalReviews?: number;
  featuredImageUrl: string;
  featuredImageAlt?: string;
  gallery?: any;
  pros?: string[];
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { products, secret } = await request.json();

    // Simple security check
    if (secret !== 'migrate-2024') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!Array.isArray(products)) {
      return new Response(JSON.stringify({ error: 'Products must be an array' }), { status: 400 });
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products as ProductData[]) {
      try {
        // Check if already exists
        const existing = await db
          .select()
          .from(Products)
          .where(and(
            eq(Products.asin, product.asin),
            eq(Products.lang, product.lang)
          ))
          .get();

        if (existing) {
          skipped++;
          continue;
        }

        // Insert new product
        await db.insert(Products).values({
          productId: product.productId,
          asin: product.asin,
          lang: product.lang,
          title: product.title,
          brand: product.brand || 'Amazon',
          description: product.description || product.title,
          shortDescription: product.shortDescription,
          category: product.category || 'electronics',
          price: product.price,
          originalPrice: product.originalPrice,
          currency: product.currency || 'EUR',
          affiliateUrl: product.affiliateUrl,
          rating: product.rating,
          totalReviews: product.totalReviews,
          featuredImageUrl: product.featuredImageUrl,
          featuredImageAlt: product.featuredImageAlt || product.title,
          gallery: product.gallery,
          pros: product.pros || [],
          cons: [],
          status: 'imported',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        migrated++;
      } catch (error) {
        errors++;
        console.error(`Error migrating ${product.asin}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      migrated,
      skipped,
      errors,
      total: products.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500 });
  }
};

// GET to check status
export const GET: APIRoute = async () => {
  try {
    const count = await db.select().from(Products).all();
    const imported = count.filter(p => p.status === 'imported').length;
    const published = count.filter(p => p.status === 'published').length;

    return new Response(JSON.stringify({
      total: count.length,
      imported,
      published,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get count' }), { status: 500 });
  }
};
