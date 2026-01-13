import { f as createAstro, c as createComponent, a as renderComponent, b as renderTemplate, m as maybeRenderHead, e as addAttribute } from "../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import { g as getTranslation, $ as $$BaseLayout } from "../../chunks/BaseLayout_0e6k9Rku.mjs";
import { $ as $$ProductGrid } from "../../chunks/ProductGrid_DJ6odZ33.mjs";
import { o as getPublishedProducts } from "../../chunks/db_Bes6smIA.mjs";
import { c as categories } from "../../chunks/categories_mZfeSJ8D.mjs";
import { renderers } from "../../renderers.mjs";
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const prerender = false;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { lang } = Astro2.params;
  const validLangs = ["es", "en"];
  if (!lang || !validLangs.includes(lang)) {
    return Astro2.redirect("/es/products/", 302);
  }
  const t = getTranslation(lang);
  const dbProducts = await getPublishedProducts(lang);
  const products = dbProducts.map((p) => ({
    productId: p.productId,
    asin: p.asin,
    title: p.title,
    brand: p.brand,
    price: p.price,
    originalPrice: p.originalPrice,
    currency: p.currency,
    rating: p.rating,
    featuredImage: {
      url: p.featuredImageUrl,
      alt: p.featuredImageAlt || p.title
    },
    affiliateUrl: p.affiliateUrl,
    isOnSale: p.isOnSale,
    isFeatured: p.isFeatured
  }));
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": t("nav.products"), "description": lang === "es" ? "Descubre nuestra seleccion de productos con las mejores ofertas y reviews" : "Discover our selection of products with the best deals and reviews", "lang": lang }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="max-w-7xl mx-auto px-4 py-12"> <!-- Header --> <div class="mb-8"> <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4"> ${t("nav.products")} </h1> <p class="text-gray-600"> ${lang === "es" ? "Explora nuestra seleccion de productos cuidadosamente analizados" : "Explore our carefully analyzed product selection"} </p> </div> <!-- Categories --> <div class="mb-8 flex flex-wrap gap-2"> <a${addAttribute(`/${lang}/products`, "href")} class="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"> ${lang === "es" ? "Todos" : "All"} </a> ${categories.categories.map((cat) => renderTemplate`<a${addAttribute(`/${lang}/categories/${cat.id}`, "href")} class="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors"> ${cat.name[lang]} </a>`)} </div> <!-- Products Grid --> ${products.length > 0 ? renderTemplate`${renderComponent($$result2, "ProductGrid", $$ProductGrid, { "products": products, "lang": lang, "columns": 4 })}` : renderTemplate`<div class="text-center py-16"> <div class="text-gray-400 mb-4"> <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path> </svg> </div> <h2 class="text-xl font-semibold text-gray-700 mb-2"> ${lang === "es" ? "Aun no hay productos" : "No products yet"} </h2> <p class="text-gray-500"> ${lang === "es" ? "Estamos preparando contenido increible. Vuelve pronto!" : "We are preparing amazing content. Come back soon!"} </p> </div>`} </div> ` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/products/index.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/products/index.astro";
const $$url = "/[lang]/products";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
