import { i as isUserAdmin, u as unauthorizedResponse } from "../../../../chunks/auth_e0GtV7VA.mjs";
import { b as getProductById, d as getProductBySlug, u as updateProduct, e as deleteProduct } from "../../../../chunks/db_Bes6smIA.mjs";
import { renderers } from "../../../../renderers.mjs";
const GET = async (context) => {
  const { locals, params } = context;
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
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Product ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    let product = null;
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      product = await getProductById(numericId);
    }
    if (!product) {
      product = await getProductBySlug(id);
    }
    if (!product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ success: true, product }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[Get Product Error]", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch product" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const PUT = async (context) => {
  const { request, locals, params } = context;
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
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Product ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const numericId = parseInt(id);
    let product = null;
    if (!isNaN(numericId)) {
      product = await getProductById(numericId);
    }
    if (!product) {
      product = await getProductBySlug(id);
    }
    if (!product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const data = await request.json();
    const updateData = {};
    if (data.title !== void 0) updateData.title = data.title;
    if (data.brand !== void 0) updateData.brand = data.brand;
    if (data.model !== void 0) updateData.model = data.model;
    if (data.description !== void 0) updateData.description = data.description;
    if (data.shortDescription !== void 0) updateData.shortDescription = data.shortDescription;
    if (data.category !== void 0) updateData.category = data.category;
    if (data.subcategory !== void 0) updateData.subcategory = data.subcategory;
    if (data.tags !== void 0) updateData.tags = data.tags;
    if (data.price !== void 0) updateData.price = parseFloat(data.price);
    if (data.originalPrice !== void 0) updateData.originalPrice = data.originalPrice ? parseFloat(data.originalPrice) : null;
    if (data.currency !== void 0) updateData.currency = data.currency;
    if (data.affiliateUrl !== void 0) updateData.affiliateUrl = data.affiliateUrl;
    if (data.rating !== void 0) updateData.rating = data.rating ? parseFloat(data.rating) : null;
    if (data.totalReviews !== void 0) updateData.totalReviews = data.totalReviews ? parseInt(data.totalReviews) : null;
    if (data.ourRating !== void 0) updateData.ourRating = data.ourRating ? parseFloat(data.ourRating) : null;
    if (data.pros !== void 0) updateData.pros = data.pros;
    if (data.cons !== void 0) updateData.cons = data.cons;
    if (data.specifications !== void 0) updateData.specifications = data.specifications;
    if (data.featuredImageUrl !== void 0) updateData.featuredImageUrl = data.featuredImageUrl;
    if (data.featuredImageAlt !== void 0) updateData.featuredImageAlt = data.featuredImageAlt;
    if (data.gallery !== void 0) updateData.gallery = data.gallery;
    if (data.content !== void 0) updateData.content = data.content;
    if (data.status !== void 0) updateData.status = data.status;
    if (data.isFeatured !== void 0) updateData.isFeatured = Boolean(data.isFeatured);
    if (data.isOnSale !== void 0) updateData.isOnSale = Boolean(data.isOnSale);
    if (data.relatedProducts !== void 0) updateData.relatedProducts = data.relatedProducts;
    const updatedProduct = await updateProduct(product.id, updateData);
    return new Response(
      JSON.stringify({
        success: true,
        product: updatedProduct,
        message: "Product updated successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Update Product Error]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to update product: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const DELETE = async (context) => {
  const { locals, params } = context;
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
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Product ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const numericId = parseInt(id);
    let product = null;
    if (!isNaN(numericId)) {
      product = await getProductById(numericId);
    }
    if (!product) {
      product = await getProductBySlug(id);
    }
    if (!product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    await deleteProduct(product.id);
    return new Response(
      JSON.stringify({
        success: true,
        productId: product.productId,
        message: "Product deleted successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Delete Product Error]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to delete product: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const prerender = false;
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  PUT,
  prerender
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
