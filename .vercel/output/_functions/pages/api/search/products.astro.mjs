import { g as getCollection } from "../../../chunks/_astro_content_DsUv7PQc.mjs";
import { renderers } from "../../../renderers.mjs";
const GET = async ({ url }) => {
  try {
    const lang = url.searchParams.get("lang") || "es";
    const allProducts = await getCollection("products");
    const products = allProducts.filter((p) => p.data.lang === lang && p.data.status === "published").map((p) => ({
      productId: p.data.productId,
      title: p.data.title,
      brand: p.data.brand,
      price: p.data.price,
      currency: p.data.currency,
      featuredImage: p.data.featuredImage,
      lang: p.data.lang
    }));
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
        // Cache for 1 minute
      }
    });
  } catch (error) {
    console.error("Search products error:", error);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
