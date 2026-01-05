import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ url }) => {
  try {
    const lang = url.searchParams.get('lang') || 'es';

    const allProducts = await getCollection('products');

    const products = allProducts
      .filter(p => p.data.lang === lang && p.data.status === 'published')
      .map(p => ({
        productId: p.data.productId,
        title: p.data.title,
        brand: p.data.brand,
        price: p.data.price,
        currency: p.data.currency,
        featuredImage: p.data.featuredImage,
        lang: p.data.lang,
      }));

    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('Search products error:', error);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
