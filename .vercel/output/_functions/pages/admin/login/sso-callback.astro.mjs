import { c as createComponent, r as renderHead, a as renderComponent, b as renderTemplate } from "../../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
/* empty css                                              */
import { $ as $$AuthenticateWithRedirectCallback } from "../../../chunks/AuthenticateWithRedirectCallback_BrcB-8B8.mjs";
import { renderers } from "../../../renderers.mjs";
const prerender = false;
const $$SsoCallback = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="es" data-astro-cid-ens44khl> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Authenticating...</title>${renderHead()}</head> <body data-astro-cid-ens44khl> <div class="loading" data-astro-cid-ens44khl> <div class="spinner" data-astro-cid-ens44khl></div> <p data-astro-cid-ens44khl>Authenticating...</p> </div> ${renderComponent($$result, "AuthenticateWithRedirectCallback", $$AuthenticateWithRedirectCallback, { "data-astro-cid-ens44khl": true })} </body></html>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/login/sso-callback.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/login/sso-callback.astro";
const $$url = "/admin/login/sso-callback";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$SsoCallback,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
