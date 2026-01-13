import { g as getCollection } from "../../../chunks/_astro_content_DsUv7PQc.mjs";
import { j as getUser, k as calculateCashback, l as createPurchaseClaim } from "../../../chunks/db_Bes6smIA.mjs";
import { renderers } from "../../../renderers.mjs";
const POST = async ({ request, locals }) => {
  const auth = locals.auth();
  if (!auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { amazonOrderId, productSlug, purchaseDate } = body;
    if (!amazonOrderId || !productSlug || !purchaseDate) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const orderIdPattern = /^\d{3}-\d{7}-\d{7}$/;
    if (!orderIdPattern.test(amazonOrderId)) {
      return new Response(JSON.stringify({ error: "Invalid Amazon order ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    let product = null;
    try {
      const allProducts = await getCollection("products");
      product = allProducts.find(
        (p) => p.id.endsWith(`/${productSlug}`) || p.id === productSlug
      );
    } catch {
    }
    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const user = await getUser(auth.userId);
    const tier = user?.tier || "bronze";
    const priceInCents = Math.round(product.data.price * 100);
    const claimedAmount = calculateCashback(priceInCents, tier);
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
        status: claim?.status
      }
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create claim";
    if (message.includes("already exists")) {
      return new Response(JSON.stringify({ error: "A claim for this order already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
