import { f as createAstro, c as createComponent, a as renderComponent, d as renderScript, b as renderTemplate, m as maybeRenderHead, e as addAttribute, F as Fragment, u as unescapeHTML } from "../../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$BaseLayout } from "../../../chunks/BaseLayout_0e6k9Rku.mjs";
import { $ as $$ProductGrid } from "../../../chunks/ProductGrid_DJ6odZ33.mjs";
import { g as getCollection } from "../../../chunks/_astro_content_DsUv7PQc.mjs";
import { c as categories } from "../../../chunks/categories_mZfeSJ8D.mjs";
/* empty css                                        */
import { renderers } from "../../../renderers.mjs";
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { lang, slug } = Astro2.params;
  const validLangs = ["es", "en"];
  if (!validLangs.includes(lang)) {
    return Astro2.redirect("/es/categories/", 302);
  }
  const category = categories.categories.find((c) => c.id === slug);
  if (!category) {
    return Astro2.redirect(`/${lang}/categories/`, 302);
  }
  const allProducts = await getCollection("products");
  const categoryProducts = allProducts.filter((p) => p.data.lang === lang && p.data.status === "published" && p.data.category === category.id).sort((a, b) => {
    if (a.data.isFeatured && !b.data.isFeatured) return -1;
    if (!a.data.isFeatured && b.data.isFeatured) return 1;
    return b.data.publishedAt.getTime() - a.data.publishedAt.getTime();
  }).map((p) => ({
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
  const brands = [...new Set(categoryProducts.map((p) => p.brand))].sort();
  const breadcrumbs = [
    { label: lang === "es" ? "Inicio" : "Home", href: `/${lang}/` },
    { label: lang === "es" ? "Categorias" : "Categories", href: `/${lang}/categories/` },
    { label: category.name[lang], href: null }
  ];
  const iconMap = {
    laptop: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />`,
    home: `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />`,
    gamepad: `<path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />`,
    dumbbell: `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />`
  };
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${category.name[lang]} - ${lang === "es" ? "Productos" : "Products"}`, "description": category.description[lang], "lang": lang, "data-astro-cid-heuenqe5": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="category-page" data-astro-cid-heuenqe5> <!-- Breadcrumbs --> <nav class="breadcrumbs" aria-label="Breadcrumb" data-astro-cid-heuenqe5> <div class="breadcrumbs-container" data-astro-cid-heuenqe5> <ol class="breadcrumbs-list" data-astro-cid-heuenqe5> ${breadcrumbs.map((item, index) => renderTemplate`<li class="breadcrumb-item" data-astro-cid-heuenqe5> ${item.href ? renderTemplate`<a${addAttribute(item.href, "href")} data-astro-cid-heuenqe5>${item.label}</a>` : renderTemplate`<span class="current" data-astro-cid-heuenqe5>${item.label}</span>`} ${index < breadcrumbs.length - 1 && renderTemplate`<svg class="separator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-heuenqe5> <path d="M9 18l6-6-6-6" data-astro-cid-heuenqe5></path> </svg>`} </li>`)} </ol> </div> </nav> <!-- Hero Section --> <section class="hero-section" data-astro-cid-heuenqe5> <div class="hero-content" data-astro-cid-heuenqe5> <div class="hero-icon" data-astro-cid-heuenqe5> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-heuenqe5> ${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate`${unescapeHTML(iconMap[category.icon] || iconMap.laptop)}` })} </svg> </div> <h1 class="hero-title" data-astro-cid-heuenqe5>${category.name[lang]}</h1> <p class="hero-description" data-astro-cid-heuenqe5>${category.description[lang]}</p> <div class="hero-stats" data-astro-cid-heuenqe5> <span class="stat" data-astro-cid-heuenqe5> <strong data-astro-cid-heuenqe5>${categoryProducts.length}</strong> ${lang === "es" ? "productos" : "products"} </span> ${brands.length > 0 && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-heuenqe5": true }, { "default": async ($$result3) => renderTemplate` <span class="stat-divider" data-astro-cid-heuenqe5></span> <span class="stat" data-astro-cid-heuenqe5> <strong data-astro-cid-heuenqe5>${brands.length}</strong> ${lang === "es" ? "marcas" : "brands"} </span> ` })}`} </div> </div> </section> <!-- Products Section --> <section class="products-section" data-astro-cid-heuenqe5> <div class="section-container" data-astro-cid-heuenqe5> ${categoryProducts.length > 0 ? renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-heuenqe5": true }, { "default": async ($$result3) => renderTemplate`  ${brands.length > 1 && renderTemplate`<div class="filters-bar" data-astro-cid-heuenqe5> <span class="filters-label" data-astro-cid-heuenqe5>${lang === "es" ? "Marcas:" : "Brands:"}</span> <div class="filter-chips" data-astro-cid-heuenqe5> <button class="filter-chip active" data-brand="all" data-astro-cid-heuenqe5> ${lang === "es" ? "Todas" : "All"} </button> ${brands.map((brand) => renderTemplate`<button class="filter-chip"${addAttribute(brand, "data-brand")} data-astro-cid-heuenqe5> ${brand} </button>`)} </div> </div>`}${renderComponent($$result3, "ProductGrid", $$ProductGrid, { "products": categoryProducts, "lang": lang, "columns": 4, "data-astro-cid-heuenqe5": true })} ` })}` : renderTemplate`<div class="empty-state" data-astro-cid-heuenqe5> <div class="empty-icon" data-astro-cid-heuenqe5> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-heuenqe5> <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" data-astro-cid-heuenqe5></path> </svg> </div> <h2 class="empty-title" data-astro-cid-heuenqe5> ${lang === "es" ? "Proximamente" : "Coming soon"} </h2> <p class="empty-description" data-astro-cid-heuenqe5> ${lang === "es" ? "Estamos preparando productos increibles para esta categoria." : "We are preparing amazing products for this category."} </p> <a${addAttribute(`/${lang}/products/`, "href")} class="empty-link" data-astro-cid-heuenqe5> ${lang === "es" ? "Ver todos los productos" : "View all products"} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-heuenqe5> <path d="M5 12h14M12 5l7 7-7 7" data-astro-cid-heuenqe5></path> </svg> </a> </div>`} </div> </section> <!-- Related Categories --> <section class="related-section" data-astro-cid-heuenqe5> <div class="section-container" data-astro-cid-heuenqe5> <h2 class="related-title" data-astro-cid-heuenqe5> ${lang === "es" ? "Otras categorias" : "Other categories"} </h2> <div class="related-grid" data-astro-cid-heuenqe5> ${categories.categories.filter((c) => c.id !== category.id).slice(0, 3).map((cat) => renderTemplate`<a${addAttribute(`/${lang}/categories/${cat.id}`, "href")} class="related-card" data-astro-cid-heuenqe5> <div class="related-icon" data-astro-cid-heuenqe5> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-heuenqe5> ${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate`${unescapeHTML(iconMap[cat.icon] || iconMap.laptop)}` })} </svg> </div> <span class="related-name" data-astro-cid-heuenqe5>${cat.name[lang]}</span> <svg class="related-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-heuenqe5> <path d="M5 12h14M12 5l7 7-7 7" data-astro-cid-heuenqe5></path> </svg> </a>`)} </div> </div> </section> </div> ` })}  ${renderScript($$result, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/categories/[slug].astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/categories/[slug].astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/categories/[slug].astro";
const $$url = "/[lang]/categories/[slug]";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
