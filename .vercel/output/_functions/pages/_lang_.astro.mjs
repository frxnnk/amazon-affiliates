import { f as createAstro, c as createComponent, m as maybeRenderHead, e as addAttribute, h as renderSlot, b as renderTemplate, a as renderComponent } from "../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$BaseLayout, g as getTranslation } from "../chunks/BaseLayout_0e6k9Rku.mjs";
import { $ as $$ProductGrid } from "../chunks/ProductGrid_DJ6odZ33.mjs";
import "clsx";
/* empty css                                 */
import { g as getCollection } from "../chunks/_astro_content_DsUv7PQc.mjs";
import { s as siteConfig } from "../chunks/site-config_BzdwJVhh.mjs";
import { renderers } from "../renderers.mjs";
const $$Astro$1 = createAstro("https://amazon-affiliates.vercel.app");
const $$Button = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Button;
  const {
    variant = "primary",
    size = "md",
    href,
    type = "button",
    disabled = false,
    fullWidth = false,
    class: className
  } = Astro2.props;
  return renderTemplate`${href ? renderTemplate`${maybeRenderHead()}<a${addAttribute(href, "href")}${addAttribute(["btn", `btn-${variant}`, `btn-${size}`, fullWidth && "btn-full", className], "class:list")} data-astro-cid-6ygtcg62>${renderSlot($$result, $$slots["default"])}</a>` : renderTemplate`<button${addAttribute(type, "type")}${addAttribute(disabled, "disabled")}${addAttribute(["btn", `btn-${variant}`, `btn-${size}`, fullWidth && "btn-full", className], "class:list")} data-astro-cid-6ygtcg62>${renderSlot($$result, $$slots["default"])}</button>`}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/ui/Button.astro", void 0);
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
function getStaticPaths() {
  return [
    { params: { lang: "es" } },
    { params: { lang: "en" } }
  ];
}
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { lang } = Astro2.params;
  const validLangs = ["es", "en"];
  if (!validLangs.includes(lang)) {
    return Astro2.redirect("/es/", 302);
  }
  const t = getTranslation(lang);
  const allProducts = await getCollection("products");
  const featuredProducts = allProducts.filter((p) => p.data.lang === lang && p.data.status === "published").slice(0, 6).map((p) => ({
    productId: p.data.productId,
    asin: p.data.asin,
    title: p.data.title,
    brand: p.data.brand,
    price: p.data.price,
    originalPrice: p.data.originalPrice,
    currency: p.data.currency,
    rating: p.data.rating,
    featuredImage: p.data.featuredImage,
    affiliateUrl: p.data.affiliateUrl,
    isOnSale: p.data.isOnSale,
    isFeatured: p.data.isFeatured
  }));
  const heroContent = {
    es: {
      headline: "Las mejores ofertas.",
      subheadline: "En un solo lugar.",
      description: "Productos de calidad cuidadosamente seleccionados de Amazon. Encontramos las mejores ofertas para que tú no tengas que hacerlo.",
      cta1: "Ver productos",
      cta2: "Ver categorias"
    },
    en: {
      headline: "Best deals.",
      subheadline: "All in one place.",
      description: "Quality products carefully curated from Amazon. We find the best deals so you don't have to.",
      cta1: "Browse products",
      cta2: "View categories"
    }
  };
  const howItWorksContent = {
    es: {
      title: "Como funciona",
      steps: [
        { number: "01", title: "Explora", description: "Navega por nuestra seleccion de productos verificados." },
        { number: "02", title: "Compara", description: "Lee nuestras descripciones y comparativas." },
        { number: "03", title: "Decide", description: "Elige el producto que mejor se adapta a ti." },
        { number: "04", title: "Compra", description: "Compra seguro en Amazon con un solo clic." }
      ]
    },
    en: {
      title: "How it works",
      steps: [
        { number: "01", title: "Explore", description: "Browse our selection of verified products." },
        { number: "02", title: "Compare", description: "Read our descriptions and comparisons." },
        { number: "03", title: "Decide", description: "Choose the product that fits you best." },
        { number: "04", title: "Buy", description: "Shop safely on Amazon with one click." }
      ]
    }
  };
  const hero = heroContent[lang];
  const howItWorks = howItWorksContent[lang];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": siteConfig.site.tagline[lang], "lang": lang, "data-astro-cid-ct3bgug4": true }, { "default": async ($$result2) => renderTemplate`  ${maybeRenderHead()}<section class="hero" data-astro-cid-ct3bgug4> <div class="hero-bg" data-astro-cid-ct3bgug4> <div class="hero-gradient" data-astro-cid-ct3bgug4></div> <div class="hero-pattern" data-astro-cid-ct3bgug4></div> </div> <div class="hero-content" data-astro-cid-ct3bgug4> <div class="hero-badge animate-in" style="--delay: 0ms;" data-astro-cid-ct3bgug4> <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" data-astro-cid-ct3bgug4> <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" data-astro-cid-ct3bgug4></path> </svg> <span data-astro-cid-ct3bgug4>${lang === "es" ? "Productos verificados" : "Verified products"}</span> </div> <h1 class="hero-headline animate-in" style="--delay: 100ms;" data-astro-cid-ct3bgug4> <span class="headline-main" data-astro-cid-ct3bgug4>${hero.headline}</span> <span class="headline-accent" data-astro-cid-ct3bgug4>${hero.subheadline}</span> </h1> <p class="hero-description animate-in" style="--delay: 200ms;" data-astro-cid-ct3bgug4> ${hero.description} </p> <div class="hero-actions animate-in" style="--delay: 300ms;" data-astro-cid-ct3bgug4> ${renderComponent($$result2, "Button", $$Button, { "href": `/${lang}/products`, "variant": "primary", "size": "lg", "data-astro-cid-ct3bgug4": true }, { "default": async ($$result3) => renderTemplate`${hero.cta1}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" data-astro-cid-ct3bgug4> <path d="M5 12h14M12 5l7 7-7 7" data-astro-cid-ct3bgug4></path> </svg> ` })} ${renderComponent($$result2, "Button", $$Button, { "href": `/${lang}/categories`, "variant": "outline", "size": "lg", "data-astro-cid-ct3bgug4": true }, { "default": async ($$result3) => renderTemplate`${hero.cta2}` })} </div> </div> </section>  <section id="how-it-works" class="how-it-works" data-astro-cid-ct3bgug4> <div class="section-container" data-astro-cid-ct3bgug4> <div class="section-header" data-astro-cid-ct3bgug4> <span class="section-eyebrow" data-astro-cid-ct3bgug4>${lang === "es" ? "Proceso simple" : "Simple process"}</span> <h2 class="section-title" data-astro-cid-ct3bgug4>${howItWorks.title}</h2> </div> <div class="steps-grid" data-astro-cid-ct3bgug4> ${howItWorks.steps.map((step, index) => renderTemplate`<div class="step-card"${addAttribute(`--step-delay: ${index * 100}ms;`, "style")} data-astro-cid-ct3bgug4> <span class="step-number" data-astro-cid-ct3bgug4>${step.number}</span> <h3 class="step-title" data-astro-cid-ct3bgug4>${step.title}</h3> <p class="step-description" data-astro-cid-ct3bgug4>${step.description}</p> </div>`)} </div> </div> </section>  <section class="products-section" data-astro-cid-ct3bgug4> <div class="section-container" data-astro-cid-ct3bgug4> <div class="section-header-row" data-astro-cid-ct3bgug4> <div data-astro-cid-ct3bgug4> <span class="section-eyebrow" data-astro-cid-ct3bgug4>${lang === "es" ? "Seleccion curada" : "Curated selection"}</span> <h2 class="section-title" data-astro-cid-ct3bgug4> ${lang === "es" ? "Productos destacados" : "Featured products"} </h2> </div> <a${addAttribute(`/${lang}/products`, "href")} class="see-all-link" data-astro-cid-ct3bgug4> ${t("common.seeAll")} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" data-astro-cid-ct3bgug4> <path d="M5 12h14M12 5l7 7-7 7" data-astro-cid-ct3bgug4></path> </svg> </a> </div> ${featuredProducts.length > 0 ? renderTemplate`${renderComponent($$result2, "ProductGrid", $$ProductGrid, { "products": featuredProducts, "lang": lang, "columns": 3, "data-astro-cid-ct3bgug4": true })}` : renderTemplate`<div class="empty-state" data-astro-cid-ct3bgug4> <div class="empty-icon" data-astro-cid-ct3bgug4> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-ct3bgug4> <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" data-astro-cid-ct3bgug4></path> </svg> </div> <p data-astro-cid-ct3bgug4>${lang === "es" ? "Proximamente productos destacados" : "Featured products coming soon"}</p> </div>`} </div> </section> ` })} `;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/index.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/index.astro";
const $$url = "/[lang]";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
