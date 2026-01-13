import { c as createComponent, f as createAstro, b as renderTemplate, g as defineScriptVars, a as renderComponent, F as Fragment, u as unescapeHTML, h as renderSlot, r as renderHead } from "../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
/* empty css                                           */
import { g as generateSafeId } from "../../chunks/index_D3GXOACt.mjs";
import { renderers } from "../../renderers.mjs";
function addUnstyledAttributeToFirstTag(html, attributeValue) {
  return html.replace(/(<[^>]+)>/, `$1 data-clerk-unstyled-id="${attributeValue}">`);
}
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$SignOutButton = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$SignOutButton;
  const safeId = generateSafeId();
  if ("as" in Astro2.props) ;
  const { as: Tag = "button", asChild, redirectUrl = "/", sessionId, ...elementProps } = Astro2.props;
  let htmlElement = "";
  if (asChild) {
    htmlElement = await Astro2.slots.render("default");
    htmlElement = addUnstyledAttributeToFirstTag(htmlElement, safeId);
  }
  return renderTemplate(_a || (_a = __template(["", "<script>(function(){", "\n  const btn = document.querySelector(`[data-clerk-unstyled-id=\"${safeId}\"]`);\n\n  btn.addEventListener('click', () => {\n    window.Clerk.signOut({ redirectUrl, sessionId });\n  });\n})();<\/script>"], ["", "<script>(function(){", "\n  const btn = document.querySelector(\\`[data-clerk-unstyled-id=\"\\${safeId}\"]\\`);\n\n  btn.addEventListener('click', () => {\n    window.Clerk.signOut({ redirectUrl, sessionId });\n  });\n})();<\/script>"])), asChild ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result2) => renderTemplate`${unescapeHTML(htmlElement)}` })}` : renderTemplate`${renderComponent($$result, "Tag", Tag, { ...elementProps, "data-clerk-unstyled-id": safeId }, { "default": async ($$result2) => renderTemplate`${renderSlot($$result2, $$slots["default"], renderTemplate`Sign out`)}` })}`, defineScriptVars({ redirectUrl, sessionId, safeId }));
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/unstyled/SignOutButton.astro", void 0);
const prerender = false;
const $$Unauthorized = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="es" data-astro-cid-tov64x5r> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Acceso Denegado | Admin</title><meta name="robots" content="noindex, nofollow"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">${renderHead()}</head> <body data-astro-cid-tov64x5r> <div class="container" data-astro-cid-tov64x5r> <div class="icon" data-astro-cid-tov64x5r> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-tov64x5r> <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" data-astro-cid-tov64x5r></path> </svg> </div> <h1 data-astro-cid-tov64x5r>Acceso Denegado</h1> <p data-astro-cid-tov64x5r>
No tienes permisos de administrador para acceder a esta seccion.
      Si crees que esto es un error, contacta al administrador del sitio.
</p> <div class="actions" data-astro-cid-tov64x5r> <a href="/" class="btn btn-primary" data-astro-cid-tov64x5r>
Volver al inicio
</a> ${renderComponent($$result, "SignOutButton", $$SignOutButton, { "data-astro-cid-tov64x5r": true }, { "default": ($$result2) => renderTemplate` <button class="btn btn-secondary" data-astro-cid-tov64x5r>
Cerrar sesion
</button> ` })} </div> </div> </body></html>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/unauthorized.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/unauthorized.astro";
const $$url = "/admin/unauthorized";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$Unauthorized,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
