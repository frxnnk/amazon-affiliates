import type { APIRoute } from 'astro';
import { generateProductMarkdown, generateProductFilename, slugify } from '@utils/markdown';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.auth?.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.asin || !data.brand) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, asin, brand' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const productId = data.productId || slugify(data.title);
    const lang = data.lang || 'es';
    const now = new Date().toISOString().split('T')[0];

    const frontmatter = {
      productId,
      asin: data.asin,
      lang,
      title: data.title,
      brand: data.brand,
      model: data.model || undefined,
      description: data.description || '',
      shortDescription: data.shortDescription || '',
      category: data.category || 'electronics',
      subcategory: data.subcategory || undefined,
      tags: data.tags || [],
      price: parseFloat(data.price) || 0,
      originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : undefined,
      currency: data.currency || 'EUR',
      affiliateUrl: data.affiliateUrl || `https://www.amazon.${lang === 'en' ? 'com' : 'es'}/dp/${data.asin}`,
      rating: parseFloat(data.rating) || 0,
      totalReviews: data.totalReviews ? parseInt(data.totalReviews) : undefined,
      ourRating: data.ourRating ? parseFloat(data.ourRating) : undefined,
      pros: data.pros || [],
      cons: data.cons || [],
      specifications: data.specifications || undefined,
      featuredImage: data.featuredImage || { url: '', alt: data.title },
      gallery: data.gallery || undefined,
      status: data.status || 'draft',
      isFeatured: Boolean(data.isFeatured),
      isOnSale: Boolean(data.isOnSale),
      publishedAt: now,
      updatedAt: now,
      relatedProducts: data.relatedProducts || undefined,
    };

    const markdownContent = generateProductMarkdown(frontmatter as any, data.content || '');
    const relativePath = generateProductFilename(productId, lang);

    // Write file locally (for development)
    const absolutePath = path.join(process.cwd(), relativePath);
    const dir = path.dirname(absolutePath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absolutePath, markdownContent, 'utf-8');

    return new Response(
      JSON.stringify({
        success: true,
        productId,
        filePath: relativePath,
        message: 'Product created locally. Run git commit to save changes.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Create Product Error]', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create product: ' + (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const prerender = false;
