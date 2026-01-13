import { f as createAstro, c as createComponent, a as renderComponent, b as renderTemplate, m as maybeRenderHead, h as renderSlot, u as unescapeHTML, e as addAttribute } from "../../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$BaseLayout, b as $$AffiliateDisclosure, g as getTranslation, f as formatDate } from "../../../chunks/BaseLayout_0e6k9Rku.mjs";
import { a as $$AffiliateLink, b as $$ProductRating, c as $$PriceDisplay, $ as $$ProductGrid } from "../../../chunks/ProductGrid_DJ6odZ33.mjs";
import "clsx";
import { d as getProductBySlug, n as getRelatedProducts } from "../../../chunks/db_Bes6smIA.mjs";
import { s as siteConfig } from "../../../chunks/site-config_BzdwJVhh.mjs";
import { renderers } from "../../../renderers.mjs";
const $$Astro$5 = createAstro("https://amazon-affiliates.vercel.app");
const $$ProductLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$ProductLayout;
  const { title, description, lang, image } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title, "description": description, "lang": lang, "image": image }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="max-w-7xl mx-auto px-4 py-8"> ${renderComponent($$result2, "AffiliateDisclosure", $$AffiliateDisclosure, { "lang": lang, "variant": "full" })} ${renderSlot($$result2, $$slots["default"])} </div> ` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/layouts/ProductLayout.astro", void 0);
const $$Astro$4 = createAstro("https://amazon-affiliates.vercel.app");
const $$BuyButton = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$BuyButton;
  const {
    productId,
    asin,
    affiliateUrl,
    lang,
    size = "md",
    fullWidth = false
  } = Astro2.props;
  const t = getTranslation(lang);
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };
  return renderTemplate`${renderComponent($$result, "AffiliateLink", $$AffiliateLink, { "productId": productId, "asin": asin, "affiliateUrl": affiliateUrl, "lang": lang, "variant": "button", "trackingLabel": "buy-button", "class:list": [sizeClasses[size], fullWidth && "w-full"] }, { "default": ($$result2) => renderTemplate`${t("common.viewOnAmazon")}` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/affiliate/BuyButton.astro", void 0);
const $$Astro$3 = createAstro("https://amazon-affiliates.vercel.app");
const $$ProsConsList = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$ProsConsList;
  const { pros, cons, lang } = Astro2.props;
  const t = getTranslation(lang);
  return renderTemplate`${maybeRenderHead()}<div class="grid md:grid-cols-2 gap-6"> <!-- Pros --> <div class="bg-green-50 rounded-xl p-6"> <h3 class="flex items-center gap-2 font-semibold text-green-800 mb-4"> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg> ${t("product.pros")} </h3> <ul class="space-y-2"> ${pros.map((pro) => renderTemplate`<li class="flex items-start gap-2 text-green-700"> <svg class="w-4 h-4 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"> <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path> </svg> <span>${pro}</span> </li>`)} </ul> </div> <!-- Cons --> <div class="bg-red-50 rounded-xl p-6"> <h3 class="flex items-center gap-2 font-semibold text-red-800 mb-4"> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg> ${t("product.cons")} </h3> <ul class="space-y-2"> ${cons.map((con) => renderTemplate`<li class="flex items-start gap-2 text-red-700"> <svg class="w-4 h-4 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"> <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path> </svg> <span>${con}</span> </li>`)} </ul> </div> </div>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/products/ProsConsList.astro", void 0);
var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(cooked.slice()) }));
var _a$1;
const $$Astro$2 = createAstro("https://amazon-affiliates.vercel.app");
const $$ProductSchema = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$ProductSchema;
  const {
    name,
    description,
    image,
    brand,
    sku,
    gtin,
    price,
    originalPrice,
    currency,
    availability = "InStock",
    rating,
    reviewCount,
    url,
    seller = "Amazon"
  } = Astro2.props;
  const images = Array.isArray(image) ? image : [image];
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: images,
    brand: {
      "@type": "Brand",
      name: brand
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: currency,
      price: price.toFixed(2),
      availability: `https://schema.org/${availability}`,
      seller: {
        "@type": "Organization",
        name: seller
      }
    }
  };
  if (sku) {
    schema.sku = sku;
  }
  if (gtin) {
    schema.gtin = gtin;
  }
  if (originalPrice && originalPrice > price) {
    schema.offers = {
      ...schema.offers,
      priceSpecification: {
        "@type": "PriceSpecification",
        price: price.toFixed(2),
        priceCurrency: currency
      }
    };
  }
  if (rating && reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.toFixed(1),
      bestRating: "5",
      worstRating: "1",
      reviewCount
    };
  }
  return renderTemplate(_a$1 || (_a$1 = __template$1(['<script type="application/ld+json">', "<\/script>"])), unescapeHTML(JSON.stringify(schema)));
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/seo/ProductSchema.astro", void 0);
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro$1 = createAstro("https://amazon-affiliates.vercel.app");
const $$BreadcrumbSchema = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$BreadcrumbSchema;
  const { items } = Astro2.props;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
  return renderTemplate(_a || (_a = __template(['<script type="application/ld+json">', "<\/script>"])), unescapeHTML(JSON.stringify(schema)));
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/seo/BreadcrumbSchema.astro", void 0);
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const prerender = false;
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { lang, slug } = Astro2.params;
  if (!lang || !["en", "es"].includes(lang)) {
    return Astro2.redirect("/es/products/", 302);
  }
  const product = await getProductBySlug(slug, lang);
  if (!product || product.status !== "published") {
    return Astro2.redirect(`/${lang}/products/`, 302);
  }
  const t = getTranslation(lang);
  const relatedProducts = product.relatedProducts ? await getRelatedProducts(product.relatedProducts, lang) : [];
  const relatedProductsForGrid = relatedProducts.map((p) => ({
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
  const siteUrl = siteConfig.site.url;
  const productUrl = `${siteUrl}/${lang}/products/${product.productId}`;
  const productsUrl = `${siteUrl}/${lang}/products`;
  const homeUrl = `${siteUrl}/${lang}`;
  const breadcrumbItems = [
    { name: lang === "es" ? "Inicio" : "Home", url: homeUrl },
    { name: lang === "es" ? "Productos" : "Products", url: productsUrl },
    { name: product.title, url: productUrl }
  ];
  const productImages = [product.featuredImageUrl];
  if (product.gallery && Array.isArray(product.gallery)) {
    productImages.push(...product.gallery.map((img) => img.url));
  }
  const pros = Array.isArray(product.pros) ? product.pros : [];
  const cons = Array.isArray(product.cons) ? product.cons : [];
  const specifications = product.specifications;
  const gallery = product.gallery;
  return renderTemplate`${renderComponent($$result, "ProductSchema", $$ProductSchema, { "name": product.title, "description": product.shortDescription || product.description, "image": productImages, "brand": product.brand, "sku": product.asin, "price": product.price, "originalPrice": product.originalPrice, "currency": product.currency, "rating": product.rating, "reviewCount": product.totalReviews, "url": productUrl })} ${renderComponent($$result, "BreadcrumbSchema", $$BreadcrumbSchema, { "items": breadcrumbItems })} ${renderComponent($$result, "ProductLayout", $$ProductLayout, { "title": product.title, "description": product.shortDescription || product.description, "lang": lang, "image": product.featuredImageUrl }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<article class="bg-white rounded-xl shadow-sm overflow-hidden"> <div class="grid lg:grid-cols-2 gap-8 p-6 lg:p-8"> <!-- Product Image --> <div class="space-y-4"> <div class="aspect-square bg-gray-50 rounded-xl overflow-hidden"> <img${addAttribute(product.featuredImageUrl, "src")}${addAttribute(product.featuredImageAlt || product.title, "alt")} class="w-full h-full object-contain p-8"> </div> ${gallery && gallery.length > 0 && renderTemplate`<div class="grid grid-cols-4 gap-2"> ${gallery.slice(0, 4).map((img) => renderTemplate`<div class="aspect-square bg-gray-50 rounded-lg overflow-hidden"> <img${addAttribute(img.url, "src")}${addAttribute(img.alt, "alt")} class="w-full h-full object-contain p-2"> </div>`)} </div>`} </div> <!-- Product Info --> <div class="space-y-6"> <div> <p class="text-sm text-gray-500 uppercase tracking-wide mb-2">${product.brand}</p> <h1 class="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">${product.title}</h1> <div class="flex items-center gap-4 mb-4"> ${renderComponent($$result2, "ProductRating", $$ProductRating, { "rating": product.rating, "totalReviews": product.totalReviews, "size": "md" })} ${product.ourRating && renderTemplate`<span class="px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full"> ${lang === "es" ? "Nuestra puntuacion" : "Our score"}: ${product.ourRating}/10
</span>`} </div> </div> ${renderComponent($$result2, "PriceDisplay", $$PriceDisplay, { "price": product.price, "originalPrice": product.originalPrice, "currency": product.currency, "lang": lang, "size": "lg" })} <p class="text-gray-600">${product.description}</p> ${renderComponent($$result2, "BuyButton", $$BuyButton, { "productId": product.productId, "asin": product.asin, "affiliateUrl": product.affiliateUrl, "lang": lang, "size": "lg", "fullWidth": true })} <p class="text-xs text-gray-400"> ${t("product.lastUpdated")}: ${formatDate(product.updatedAt, lang)} </p> </div> </div> <!-- Pros and Cons --> ${(pros.length > 0 || cons.length > 0) && renderTemplate`<div class="p-6 lg:p-8 border-t"> ${renderComponent($$result2, "ProsConsList", $$ProsConsList, { "pros": pros, "cons": cons, "lang": lang })} </div>`} <!-- Specifications --> ${specifications && Object.keys(specifications).length > 0 && renderTemplate`<div class="p-6 lg:p-8 border-t"> <h2 class="text-xl font-bold text-gray-900 mb-4">${t("product.specifications")}</h2> <div class="grid sm:grid-cols-2 gap-4"> ${Object.entries(specifications).map(([key, value]) => renderTemplate`<div class="flex justify-between py-2 border-b border-gray-100"> <span class="text-gray-600">${key}</span> <span class="font-medium text-gray-900">${value}</span> </div>`)} </div> </div>`} <!-- Content (markdown) --> ${product.content && renderTemplate`<div class="p-6 lg:p-8 border-t prose prose-gray max-w-none">${unescapeHTML(product.content)}</div>`} </article>  ${relatedProductsForGrid.length > 0 && renderTemplate`<section class="mt-12"> <h2 class="text-2xl font-bold text-gray-900 mb-6">${t("product.relatedProducts")}</h2> ${renderComponent($$result2, "ProductGrid", $$ProductGrid, { "products": relatedProductsForGrid, "lang": lang, "columns": 4 })} </section>`}` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/products/[slug].astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/products/[slug].astro";
const $$url = "/[lang]/products/[slug]";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
