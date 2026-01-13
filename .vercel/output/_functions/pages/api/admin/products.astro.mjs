import { i as isUserAdmin, u as unauthorizedResponse } from "../../../chunks/auth_e0GtV7VA.mjs";
import { g as getAllProducts, h as createProduct } from "../../../chunks/db_Bes6smIA.mjs";
import { s as slugify } from "../../../chunks/markdown_DdU4YeJ3.mjs";
import { renderers } from "../../../renderers.mjs";
const GET = async (context) => {
  const { locals, url } = context;
  const userId = locals.auth?.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const isAdmin = await isUserAdmin(userId, context);
  if (!isAdmin) {
    return unauthorizedResponse("Admin access required");
  }
  try {
    const lang = url.searchParams.get("lang") || void 0;
    const status = url.searchParams.get("status");
    const products = await getAllProducts({ lang, status });
    return new Response(JSON.stringify({ success: true, products }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[List Products Error]", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch products" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const POST = async (context) => {
  const { request, locals } = context;
  const userId = locals.auth?.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const isAdmin = await isUserAdmin(userId, context);
  if (!isAdmin) {
    return unauthorizedResponse("Admin access required");
  }
  try {
    const data = await request.json();
    if (!data.title || !data.asin) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, asin" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const productId = data.productId || slugify(data.title);
    const lang = data.lang || "en";
    const productInput = {
      productId,
      asin: data.asin,
      lang,
      title: data.title,
      brand: data.brand || "",
      model: data.model || void 0,
      description: data.description || "",
      shortDescription: data.shortDescription || void 0,
      category: data.category || void 0,
      subcategory: data.subcategory || void 0,
      tags: data.tags || [],
      price: parseFloat(data.price) || 0,
      originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : void 0,
      currency: data.currency || "USD",
      affiliateUrl: data.affiliateUrl || `https://www.amazon.${lang === "en" ? "com" : "es"}/dp/${data.asin}`,
      rating: data.rating ? parseFloat(data.rating) : void 0,
      totalReviews: data.totalReviews ? parseInt(data.totalReviews) : void 0,
      ourRating: data.ourRating ? parseFloat(data.ourRating) : void 0,
      pros: data.pros || [],
      cons: data.cons || [],
      specifications: data.specifications || void 0,
      featuredImageUrl: data.featuredImageUrl || data.featuredImage?.url || "",
      featuredImageAlt: data.featuredImageAlt || data.featuredImage?.alt || data.title,
      gallery: data.gallery || void 0,
      content: data.content || void 0,
      status: data.status || "draft",
      isFeatured: Boolean(data.isFeatured),
      isOnSale: Boolean(data.isOnSale),
      relatedProducts: data.relatedProducts || void 0
    };
    const product = await createProduct(productInput);
    return new Response(
      JSON.stringify({
        success: true,
        product,
        message: "Product created successfully"
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Create Product Error]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to create product: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const prerender = false;
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
