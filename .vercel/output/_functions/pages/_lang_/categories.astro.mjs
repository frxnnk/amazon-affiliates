import { f as createAstro, c as createComponent, a as renderComponent, b as renderTemplate, m as maybeRenderHead, e as addAttribute, F as Fragment, u as unescapeHTML } from "../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$BaseLayout } from "../../chunks/BaseLayout_0e6k9Rku.mjs";
import { c as categories } from "../../chunks/categories_mZfeSJ8D.mjs";
/* empty css                                    */
import { renderers } from "../../renderers.mjs";
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { lang } = Astro2.params;
  const validLangs = ["es", "en"];
  if (!validLangs.includes(lang)) {
    return Astro2.redirect("/es/categories/", 302);
  }
  const pageContent = {
    es: {
      title: "Categorias",
      subtitle: "Explora productos por categoria",
      description: "Encuentra los mejores productos organizados por categoria. Desde electronica hasta fitness, tenemos todo lo que necesitas.",
      viewProducts: "Ver productos"
    },
    en: {
      title: "Categories",
      subtitle: "Explore products by category",
      description: "Find the best products organized by category. From electronics to fitness, we have everything you need.",
      viewProducts: "View products"
    }
  };
  const content = pageContent[lang];
  const iconMap = {
    laptop: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />`,
    home: `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />`,
    gamepad: `<path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />`,
    dumbbell: `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />`
  };
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": content.title, "description": content.description, "lang": lang, "data-astro-cid-yz7svqin": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="categories-page" data-astro-cid-yz7svqin> <!-- Hero Section --> <section class="hero-section" data-astro-cid-yz7svqin> <div class="hero-content" data-astro-cid-yz7svqin> <span class="hero-eyebrow" data-astro-cid-yz7svqin>${lang === "es" ? "Descubre" : "Discover"}</span> <h1 class="hero-title" data-astro-cid-yz7svqin>${content.title}</h1> <p class="hero-description" data-astro-cid-yz7svqin>${content.description}</p> </div> </section> <!-- Categories Grid --> <section class="categories-section" data-astro-cid-yz7svqin> <div class="section-container" data-astro-cid-yz7svqin> <div class="categories-grid" data-astro-cid-yz7svqin> ${categories.categories.map((category, index) => renderTemplate`<a${addAttribute(`/${lang}/categories/${category.id}`, "href")} class="category-card"${addAttribute(`--card-delay: ${index * 100}ms;`, "style")} data-astro-cid-yz7svqin> <div class="card-image" data-astro-cid-yz7svqin> <div class="image-placeholder" data-astro-cid-yz7svqin> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-yz7svqin> ${renderComponent($$result2, "Fragment", Fragment, {}, { "default": ($$result3) => renderTemplate`${unescapeHTML(iconMap[category.icon] || iconMap.laptop)}` })} </svg> </div> <div class="card-overlay" data-astro-cid-yz7svqin></div> </div> <div class="card-content" data-astro-cid-yz7svqin> <div class="card-icon" data-astro-cid-yz7svqin> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-yz7svqin> ${renderComponent($$result2, "Fragment", Fragment, {}, { "default": ($$result3) => renderTemplate`${unescapeHTML(iconMap[category.icon] || iconMap.laptop)}` })} </svg> </div> <h2 class="card-title" data-astro-cid-yz7svqin>${category.name[lang]}</h2> <p class="card-description" data-astro-cid-yz7svqin>${category.description[lang]}</p> <span class="card-link" data-astro-cid-yz7svqin> ${content.viewProducts} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-yz7svqin> <path d="M5 12h14M12 5l7 7-7 7" data-astro-cid-yz7svqin></path> </svg> </span> </div> </a>`)} </div> </div> </section> </div> ` })} `;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/categories/index.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/categories/index.astro";
const $$url = "/[lang]/categories";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
