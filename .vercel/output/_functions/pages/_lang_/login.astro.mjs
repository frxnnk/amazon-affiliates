import { f as createAstro, c as createComponent, e as addAttribute, r as renderHead, a as renderComponent, b as renderTemplate } from "../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
/* empty css                                    */
import { $ as $$SignIn } from "../../chunks/SignIn_By_RPnWZ.mjs";
import { renderers } from "../../renderers.mjs";
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const prerender = false;
function getStaticPaths() {
  return [
    { params: { lang: "es" } },
    { params: { lang: "en" } }
  ];
}
const $$Login = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Login;
  const { lang } = Astro2.params;
  const validLangs = ["es", "en"];
  if (!validLangs.includes(lang)) {
    return Astro2.redirect("/es/login");
  }
  const content = {
    es: {
      title: "Iniciar Sesion",
      subtitle: "Accede a tu cuenta para gestionar tu cashback",
      back: "Volver al inicio"
    },
    en: {
      title: "Sign In",
      subtitle: "Access your account to manage your cashback",
      back: "Back to home"
    }
  };
  const t = content[lang];
  return renderTemplate`<html${addAttribute(lang, "lang")} data-astro-cid-gzzmkpqv> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${t.title}</title><meta name="robots" content="noindex, nofollow">${renderHead()}</head> <body data-astro-cid-gzzmkpqv> <div class="login-container" data-astro-cid-gzzmkpqv> <a${addAttribute(`/${lang}`, "href")} class="logo" data-astro-cid-gzzmkpqv> <svg class="logo-mark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-astro-cid-gzzmkpqv> <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9" data-astro-cid-gzzmkpqv></path> <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-gzzmkpqv></path> <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-gzzmkpqv></path> </svg>
BestDeals
</a> <p class="subtitle" data-astro-cid-gzzmkpqv>${t.subtitle}</p> ${renderComponent($$result, "SignIn", $$SignIn, { "path": `/${lang}/login`, "routing": "path", "signUpUrl": `/${lang}/login`, "afterSignInUrl": `/${lang}/dashboard`, "afterSignUpUrl": `/${lang}/dashboard`, "data-astro-cid-gzzmkpqv": true })} <div class="back-link" data-astro-cid-gzzmkpqv> <a${addAttribute(`/${lang}`, "href")} data-astro-cid-gzzmkpqv>&larr; ${t.back}</a> </div> </div> </body></html>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/login.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/[lang]/login.astro";
const $$url = "/[lang]/login";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$Login,
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
