import { f as createAstro, c as createComponent, m as maybeRenderHead, e as addAttribute, b as renderTemplate, h as renderSlot, d as renderScript, a as renderComponent, F as Fragment } from "./astro/server_NRwpav8g.mjs";
import "piccolore";
import "clsx";
import { a as formatPrice, g as getTranslation } from "./BaseLayout_0e6k9Rku.mjs";
import { s as siteConfig } from "./site-config_BzdwJVhh.mjs";
/* empty css                          */
function getAmazonTag(lang) {
  return siteConfig.amazon.associates[lang].tag;
}
function getAmazonUrl(baseUrl, tag, _lang) {
  const url = new URL(baseUrl);
  url.searchParams.set("tag", tag);
  url.searchParams.set("linkCode", "ogi");
  url.searchParams.set("th", "1");
  url.searchParams.set("psc", "1");
  return url.toString();
}
function calculateDiscount(originalPrice, currentPrice) {
  if (originalPrice <= 0) return 0;
  return Math.round((1 - currentPrice / originalPrice) * 100);
}
const $$Astro$4 = createAstro("https://amazon-affiliates.vercel.app");
const $$PriceDisplay = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$PriceDisplay;
  const { price, originalPrice, currency, lang, size = "md" } = Astro2.props;
  const discount = originalPrice ? calculateDiscount(originalPrice, price) : 0;
  const formattedPrice = formatPrice(price, currency, lang);
  const formattedOriginalPrice = originalPrice ? formatPrice(originalPrice, currency, lang) : null;
  const sizeClasses = {
    sm: { price: "text-lg", original: "text-sm" },
    md: { price: "text-2xl", original: "text-base" },
    lg: { price: "text-3xl", original: "text-lg" }
  };
  return renderTemplate`${maybeRenderHead()}<div class="price-display flex items-baseline gap-2 flex-wrap"> <span${addAttribute(["font-bold text-gray-900", sizeClasses[size].price], "class:list")}> ${formattedPrice} </span> ${formattedOriginalPrice && renderTemplate`<span${addAttribute(["text-gray-400 line-through", sizeClasses[size].original], "class:list")}> ${formattedOriginalPrice} </span>`} ${discount > 0 && renderTemplate`<span class="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-sm font-medium rounded">
-${discount}%
</span>`} </div>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/affiliate/PriceDisplay.astro", void 0);
const $$Astro$3 = createAstro("https://amazon-affiliates.vercel.app");
const $$AffiliateLink = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$AffiliateLink;
  const {
    productId,
    asin,
    affiliateUrl,
    lang,
    variant = "button",
    class: className,
    trackingLabel
  } = Astro2.props;
  const amazonTag = getAmazonTag(lang);
  const finalUrl = getAmazonUrl(affiliateUrl, amazonTag);
  const trackingData = JSON.stringify({
    productId,
    asin,
    lang,
    label: trackingLabel,
    timestamp: Date.now()
  });
  const variantClasses = {
    button: "inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors duration-200",
    text: "text-primary-600 hover:text-primary-700 underline",
    card: "block w-full text-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200"
  };
  return renderTemplate`${maybeRenderHead()}<a${addAttribute(finalUrl, "href")} target="_blank" rel="nofollow noopener sponsored"${addAttribute([variantClasses[variant], className], "class:list")}${addAttribute(trackingData, "data-tracking")}${addAttribute(productId, "data-product-id")}> ${renderSlot($$result, $$slots["default"])} ${variant === "button" && renderTemplate`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path> </svg>`} </a> ${renderScript($$result, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/affiliate/AffiliateLink.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/affiliate/AffiliateLink.astro", void 0);
const $$Astro$2 = createAstro("https://amazon-affiliates.vercel.app");
const $$ProductRating = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$ProductRating;
  const { rating, totalReviews, size = "md", showNumber = true } = Astro2.props;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };
  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };
  return renderTemplate`${maybeRenderHead()}<div class="flex items-center gap-1"> <div class="flex items-center"> ${Array(fullStars).fill(0).map(() => renderTemplate`<svg${addAttribute(["text-amber-400", sizeClasses[size]], "class:list")} fill="currentColor" viewBox="0 0 20 20"> <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path> </svg>`)} ${hasHalfStar && renderTemplate`<svg${addAttribute(["text-amber-400", sizeClasses[size]], "class:list")} fill="currentColor" viewBox="0 0 20 20"> <defs> <linearGradient id="half-star"> <stop offset="50%" stop-color="currentColor"></stop> <stop offset="50%" stop-color="#D1D5DB"></stop> </linearGradient> </defs> <path fill="url(#half-star)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path> </svg>`} ${Array(emptyStars).fill(0).map(() => renderTemplate`<svg${addAttribute(["text-gray-300", sizeClasses[size]], "class:list")} fill="currentColor" viewBox="0 0 20 20"> <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path> </svg>`)} </div> ${showNumber && renderTemplate`<span${addAttribute(["text-gray-600", textSizeClasses[size]], "class:list")}> ${rating.toFixed(1)} </span>`} ${totalReviews !== void 0 && renderTemplate`<span${addAttribute(["text-gray-400", textSizeClasses[size]], "class:list")}>
(${totalReviews.toLocaleString()})
</span>`} </div>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/products/ProductRating.astro", void 0);
const $$Astro$1 = createAstro("https://amazon-affiliates.vercel.app");
const $$ProductCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$ProductCard;
  const { product, lang, variant = "default", showCashback = true } = Astro2.props;
  const t = getTranslation(lang);
  const discount = product.originalPrice ? Math.round((product.originalPrice - product.price) / product.originalPrice * 100) : 0;
  const estimatedCashback = (product.price * 0.02).toFixed(2);
  return renderTemplate`${maybeRenderHead()}<article${addAttribute(["product-card", `variant-${variant}`], "class:list")} data-astro-cid-q7fx7bxx> <!-- Badge --> ${product.isFeatured && renderTemplate`<span class="card-badge badge-featured" data-astro-cid-q7fx7bxx> <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" data-astro-cid-q7fx7bxx> <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" data-astro-cid-q7fx7bxx></path> </svg> ${t("common.featured")} </span>`} ${!product.isFeatured && product.isOnSale && discount > 0 && renderTemplate`<span class="card-badge badge-sale" data-astro-cid-q7fx7bxx>-${discount}%</span>`} <!-- Image --> <a${addAttribute(`/${lang}/products/${product.productId}`, "href")} class="card-image-link" data-astro-cid-q7fx7bxx> <div class="card-image" data-astro-cid-q7fx7bxx> ${product.featuredImage?.url ? renderTemplate`<img${addAttribute(product.featuredImage.url, "src")}${addAttribute(product.featuredImage.alt || product.title, "alt")} loading="lazy" decoding="async" data-astro-cid-q7fx7bxx>` : renderTemplate`<div class="image-placeholder" data-astro-cid-q7fx7bxx> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" data-astro-cid-q7fx7bxx> <rect x="3" y="3" width="18" height="18" rx="2" data-astro-cid-q7fx7bxx></rect> <circle cx="8.5" cy="8.5" r="1.5" data-astro-cid-q7fx7bxx></circle> <path d="M21 15l-5-5L5 21" data-astro-cid-q7fx7bxx></path> </svg> </div>`} </div> </a> <!-- Content --> <div class="card-content" data-astro-cid-q7fx7bxx> <!-- Brand & Category --> <div class="card-meta" data-astro-cid-q7fx7bxx> <span class="meta-brand" data-astro-cid-q7fx7bxx>${product.brand}</span> ${product.category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-q7fx7bxx": true }, { "default": ($$result2) => renderTemplate` <span class="meta-separator" data-astro-cid-q7fx7bxx>/</span> <span class="meta-category" data-astro-cid-q7fx7bxx>${product.category}</span> ` })}`} </div> <!-- Title --> <h3 class="card-title" data-astro-cid-q7fx7bxx> <a${addAttribute(`/${lang}/products/${product.productId}`, "href")} data-astro-cid-q7fx7bxx> ${product.title} </a> </h3> <!-- Description (non-compact only) --> ${variant !== "compact" && product.shortDescription && renderTemplate`<p class="card-description" data-astro-cid-q7fx7bxx>${product.shortDescription}</p>`} <!-- Rating --> <div class="card-rating" data-astro-cid-q7fx7bxx> ${renderComponent($$result, "ProductRating", $$ProductRating, { "rating": product.rating, "size": "sm", "data-astro-cid-q7fx7bxx": true })} </div> <!-- Price & Cashback --> <div class="card-footer" data-astro-cid-q7fx7bxx> <div class="price-section" data-astro-cid-q7fx7bxx> ${renderComponent($$result, "PriceDisplay", $$PriceDisplay, { "price": product.price, "originalPrice": product.originalPrice, "currency": product.currency, "lang": lang, "size": "md", "data-astro-cid-q7fx7bxx": true })} ${showCashback && renderTemplate`<span class="cashback-hint" data-astro-cid-q7fx7bxx>
+$${estimatedCashback} cashback
</span>`} </div> ${renderComponent($$result, "AffiliateLink", $$AffiliateLink, { "productId": product.productId, "asin": product.asin, "affiliateUrl": product.affiliateUrl, "lang": lang, "variant": "card", "trackingLabel": "product-card", "data-astro-cid-q7fx7bxx": true }, { "default": ($$result2) => renderTemplate` <span class="cta-text" data-astro-cid-q7fx7bxx>${t("common.viewOnAmazon")}</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="cta-arrow" data-astro-cid-q7fx7bxx> <path d="M5 12h14M12 5l7 7-7 7" data-astro-cid-q7fx7bxx></path> </svg> ` })} </div> </div> </article> `;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/products/ProductCard.astro", void 0);
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$ProductGrid = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$ProductGrid;
  const { products, lang, columns = 3 } = Astro2.props;
  const gridClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(["grid gap-6", gridClasses[columns]], "class:list")}> ${products.map((product) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, { "product": product, "lang": lang })}`)} </div>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/products/ProductGrid.astro", void 0);
export {
  $$ProductGrid as $,
  $$AffiliateLink as a,
  $$ProductRating as b,
  $$PriceDisplay as c
};
