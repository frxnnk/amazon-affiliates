import { c as createComponent, r as renderHead, a as renderComponent, b as renderTemplate } from "../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
/* empty css                                    */
import { $ as $$SignIn } from "../../chunks/SignIn_By_RPnWZ.mjs";
import { renderers } from "../../renderers.mjs";
const prerender = false;
const $$Login = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="es" data-astro-cid-rf56lckb> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Login | Admin Panel</title><meta name="robots" content="noindex, nofollow"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">${renderHead()}</head> <body data-astro-cid-rf56lckb> <div class="login-container" data-astro-cid-rf56lckb> <div class="logo" data-astro-cid-rf56lckb>BestDeals Admin</div> ${renderComponent($$result, "SignIn", $$SignIn, { "path": "/admin/login", "routing": "path", "signUpUrl": "/admin/login", "afterSignInUrl": "/admin", "appearance": {
    elements: {
      rootBox: "mx-auto",
      card: "shadow-xl"
    }
  }, "data-astro-cid-rf56lckb": true })} <div class="back-link" data-astro-cid-rf56lckb> <a href="/" data-astro-cid-rf56lckb>&larr; Volver al sitio</a> </div> </div> </body></html>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/login.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/login.astro";
const $$url = "/admin/login";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
