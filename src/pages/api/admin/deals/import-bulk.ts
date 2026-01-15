/**
 * API Endpoint: Bulk Import Products
 * 
 * POST /api/admin/deals/import-bulk
 * 
 * Imports multiple products to the content collection.
 */

import type { APIRoute } from 'astro';
import { commitProductToGitHub } from '@utils/github';
import type { AnalyzableProduct } from '@lib/deal-analyzer';

export const prerender = false;

interface ImportRequest {
  products: Array<AnalyzableProduct & {
    affiliateUrl?: string;
    shortDescription?: string;
  }>;
  lang?: 'es' | 'en';
  category?: string;
  status?: 'draft' | 'published';
  generateContent?: boolean; // If true, generate AI content for each product
}

interface ImportResult {
  asin: string;
  success: boolean;
  productId?: string;
  error?: string;
}

interface ImportResponse {
  success: boolean;
  results?: ImportResult[];
  imported?: number;
  failed?: number;
  error?: string;
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');
}

// Generate product ID
function generateProductId(asin: string, title: string): string {
  const slug = generateSlug(title);
  return `${slug}-${asin.toLowerCase()}`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: ImportRequest = await request.json();

    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Products array is required',
        } as ImportResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lang = body.lang || 'es';
    const category = body.category || 'electronics';
    const status = body.status || 'draft';
    const results: ImportResult[] = [];

    for (const product of body.products) {
      try {
        const productId = generateProductId(product.asin, product.title);
        const marketplace = lang === 'es' ? 'es' : 'com';
        
        // Build affiliate URL if not provided
        const affiliateUrl = product.affiliateUrl || 
          `https://www.amazon.${marketplace}/dp/${product.asin}?tag=${
            import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'affiliate-20'
          }`;

        // Create product data for markdown file
        const productData = {
          productId,
          asin: product.asin,
          title: product.title,
          brand: product.brand || 'Unknown',
          price: product.price || 0,
          originalPrice: product.originalPrice || undefined,
          currency: product.currency || (lang === 'es' ? 'EUR' : 'USD'),
          rating: product.rating || undefined,
          totalReviews: product.totalReviews || undefined,
          category,
          lang,
          status,
          affiliateUrl,
          featuredImage: product.imageUrl ? {
            url: product.imageUrl,
            alt: product.title,
          } : undefined,
          shortDescription: product.shortDescription || `${product.brand || ''} ${product.title}`.slice(0, 150),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Generate markdown content
        const frontmatter = Object.entries(productData)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => {
            if (k === 'featuredImage') {
              return `${k}:\n  url: "${(v as any).url}"\n  alt: "${(v as any).alt}"`;
            }
            if (typeof v === 'string') return `${k}: "${v}"`;
            if (typeof v === 'number') return `${k}: ${v}`;
            return `${k}: ${JSON.stringify(v)}`;
          })
          .join('\n');

        const markdownContent = `---
${frontmatter}
---

# ${product.title}

${product.shortDescription || ''}
`;

        // Commit to GitHub
        const filePath = `src/content/products/${lang}/${productId}.md`;
        const commitResult = await commitProductToGitHub(
          filePath,
          markdownContent,
          `Add product: ${product.title}`
        );

        if (commitResult.success) {
          results.push({
            asin: product.asin,
            success: true,
            productId,
          });
        } else {
          results.push({
            asin: product.asin,
            success: false,
            error: commitResult.error || 'Failed to commit to GitHub',
          });
        }
      } catch (productError) {
        results.push({
          asin: product.asin,
          success: false,
          error: productError instanceof Error ? productError.message : 'Unknown error',
        });
      }
    }

    const imported = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: imported > 0,
        results,
        imported,
        failed,
      } as ImportResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      } as ImportResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
