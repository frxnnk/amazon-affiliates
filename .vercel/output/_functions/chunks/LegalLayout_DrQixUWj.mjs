import { f as createAstro, c as createComponent, a as renderComponent, b as renderTemplate, m as maybeRenderHead, h as renderSlot } from "./astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$BaseLayout, f as formatDate } from "./BaseLayout_0e6k9Rku.mjs";
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$LegalLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$LegalLayout;
  const { title, description, lang, updatedAt } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title, "description": description, "lang": lang }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="max-w-3xl mx-auto px-4 py-12"> <article class="bg-white rounded-xl shadow-sm p-8 md:p-12"> <header class="mb-8 pb-8 border-b border-gray-200"> <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4"> ${title} </h1> ${updatedAt && renderTemplate`<p class="text-sm text-gray-500"> ${lang === "es" ? "Ultima actualizacion:" : "Last updated:"} ${formatDate(updatedAt, lang)} </p>`} </header> <div class="prose prose-gray max-w-none prose-headings:font-semibold prose-a:text-primary-600 hover:prose-a:text-primary-700"> ${renderSlot($$result2, $$slots["default"])} </div> </article> </div> ` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/layouts/LegalLayout.astro", void 0);
export {
  $$LegalLayout as $
};
