import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createPurchaseClaim, getUser, calculateCashback, type UserTier } from '@lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const auth = locals.auth();
  if (!auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { amazonOrderId, productSlug, purchaseDate } = body;

    // Validate required fields
    if (!amazonOrderId || !productSlug || !purchaseDate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate Amazon order ID format (XXX-XXXXXXX-XXXXXXX)
    const orderIdPattern = /^\d{3}-\d{7}-\d{7}$/;
    if (!orderIdPattern.test(amazonOrderId)) {
      return new Response(JSON.stringify({ error: 'Invalid Amazon order ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find the product
    let product = null;
    try {
      const allProducts = await getCollection('products');
      product = allProducts.find(p =>
        p.id.endsWith(`/${productSlug}`) || p.id === productSlug
      );
    } catch {
      // Collection might be empty
    }

    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user to calculate their tier bonus
    const user = await getUser(auth.userId);
    const tier = (user?.tier || 'bronze') as UserTier;

    // Calculate cashback amount (price is in dollars, convert to cents)
    const priceInCents = Math.round(product.data.price * 100);
    const claimedAmount = calculateCashback(priceInCents, tier);

    // Create the claim
    const claim = await createPurchaseClaim(
      auth.userId,
      amazonOrderId,
      productSlug,
      product.data.title,
      new Date(purchaseDate),
      claimedAmount
    );

    return new Response(JSON.stringify({
      success: true,
      claim: {
        id: claim?.id,
        amazonOrderId: claim?.amazonOrderId,
        productTitle: claim?.productTitle,
        claimedAmount: claim?.claimedAmount,
        status: claim?.status,
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create claim';

    // Check for duplicate order error
    if (message.includes('already exists')) {
      return new Response(JSON.stringify({ error: 'A claim for this order already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
