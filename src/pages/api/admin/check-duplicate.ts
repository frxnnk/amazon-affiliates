import type { APIRoute } from 'astro';
import { isUserAdmin, unauthorizedResponse } from '@lib/auth';
import { isValidAsin } from '@utils/amazon';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface DuplicateCheckResult {
  exists: boolean;
  products: {
    productId: string;
    lang: string;
    title: string;
    filePath: string;
  }[];
}

/**
 * Checks if a product with the given ASIN already exists
 */
export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const userId = locals.auth?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify admin role
  const isAdmin = await isUserAdmin(userId, context);
  if (!isAdmin) {
    return unauthorizedResponse('Admin access required');
  }

  try {
    const body = await request.json();
    const { asin } = body;

    if (!asin || !isValidAsin(asin)) {
      return new Response(
        JSON.stringify({ error: 'Invalid ASIN provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const normalizedAsin = asin.toUpperCase();
    const productsDir = path.join(process.cwd(), 'src', 'content', 'products');
    const result: DuplicateCheckResult = { exists: false, products: [] };

    // Check both language directories
    const langDirs = ['es', 'en'];

    for (const lang of langDirs) {
      const langDir = path.join(productsDir, lang);

      if (!fs.existsSync(langDir)) {
        continue;
      }

      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.md'));

      for (const file of files) {
        const filePath = path.join(langDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check if this file contains the ASIN
        const asinMatch = content.match(/^asin:\s*["']?([A-Z0-9]{10})["']?\s*$/im);

        if (asinMatch && asinMatch[1].toUpperCase() === normalizedAsin) {
          // Extract additional info
          const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/im);
          const productIdMatch = content.match(/^productId:\s*["']?(.+?)["']?\s*$/im);

          result.exists = true;
          result.products.push({
            productId: productIdMatch?.[1] || file.replace('.md', ''),
            lang,
            title: titleMatch?.[1] || 'Unknown',
            filePath: `src/content/products/${lang}/${file}`,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        asin: normalizedAsin,
        ...result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Check Duplicate Error]', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check for duplicates' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const prerender = false;
