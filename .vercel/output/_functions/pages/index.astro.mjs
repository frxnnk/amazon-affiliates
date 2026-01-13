import { f as createAstro, c as createComponent } from "../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import "clsx";
import { renderers } from "../renderers.mjs";
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  return Astro2.redirect("/es");
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/index.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/index.astro";
const $$url = "";
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
