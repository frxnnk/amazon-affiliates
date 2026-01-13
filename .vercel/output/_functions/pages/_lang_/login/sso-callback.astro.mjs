import { f as createAstro, c as createComponent, e as addAttribute, r as renderHead, a as renderComponent, b as renderTemplate } from "../../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
/* empty css                                              */
import { $ as $$AuthenticateWithRedirectCallback } from "../../../chunks/AuthenticateWithRedirectCallback_BrcB-8B8.mjs";
import { renderers } from "../../../renderers.mjs";
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const prerender = false;
function getStaticPaths() {
  return [
    { params: { lang: "es" } },
    { params: { lang: "en" } }
  ];
}
const $$SsoCallback = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$SsoCallback;
  const { lang } = Astro2.params;
  return renderTemplate`<html${addAttribute(lang, "lang")} data-astro-cid-muh2mvgz> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Authenticating...</title>${renderHead()}</head> <body data-astro-cid-muh2mvgz> <div class="loading" data-astro-cid-muh2mvgz> <div class="spinner" data-astro-cid-muh2mvgz></div> <p data-astro-cid-muh2mvgz>${lang === "es" ? "Autenticando..." : "Authenticating..."}</p> </div> ${renderComponent($$result, "AuthenticateWithRedirectCallback", $$AuthenticateWithRedirectCallback, { "data-astro-cid-muh2mvgz": true })} </body></html>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/login/sso-callback.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/login/sso-callback.astro";
const $$url = "/[lang]/login/sso-callback";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$SsoCallback,
  file: $$file,
  getStaticPaths,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
