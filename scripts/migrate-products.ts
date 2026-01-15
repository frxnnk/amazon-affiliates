/**
 * Script to migrate products from local DB to remote DB
 * Run with: npx tsx scripts/migrate-products.ts
 */

import { db, Products, eq, and } from 'astro:db';

async function migrateProducts() {
  console.log('Starting product migration...');

  // Get all imported products from local DB
  const localProducts = await db
    .select()
    .from(Products)
    .where(eq(Products.status, 'imported'))
    .all();

  console.log(`Found ${localProducts.length} products to migrate`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of localProducts) {
    try {
      // Check if already exists in remote
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

      // Insert into remote DB
      await db.insert(Products).values({
        productId: product.productId,
        asin: product.asin,
        lang: product.lang,
        title: product.title,
        brand: product.brand,
        description: product.description,
        shortDescription: product.shortDescription,
        category: product.category,
        price: product.price,
        originalPrice: product.originalPrice,
        currency: product.currency,
        affiliateUrl: product.affiliateUrl,
        rating: product.rating,
        totalReviews: product.totalReviews,
        featuredImageUrl: product.featuredImageUrl,
        featuredImageAlt: product.featuredImageAlt,
        gallery: product.gallery,
        pros: product.pros,
        cons: product.cons || [],
        status: 'imported',
        createdAt: product.createdAt || new Date(),
        updatedAt: new Date(),
      });

      migrated++;

      if (migrated % 50 === 0) {
        console.log(`Progress: ${migrated} migrated, ${skipped} skipped`);
      }
    } catch (error) {
      errors++;
      console.error(`Error migrating ${product.asin}:`, error);
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

migrateProducts().catch(console.error);
