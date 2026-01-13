import { c as createComponent, f as createAstro, a as renderComponent, d as renderScript, b as renderTemplate, h as renderSlot, g as defineScriptVars, m as maybeRenderHead, e as addAttribute, u as unescapeHTML, r as renderHead } from "./astro/server_NRwpav8g.mjs";
import "piccolore";
/* empty css                         */
import "clsx";
import { s as siteConfig } from "./site-config_BzdwJVhh.mjs";
import { $ as $$InternalUIComponentRenderer } from "./InternalUIComponentRenderer_4tbiGPM9.mjs";
const $$Astro$i = createAstro("https://amazon-affiliates.vercel.app");
const $$SignedInCSR = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$i, $$props, $$slots);
  Astro2.self = $$SignedInCSR;
  const { class: className } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "clerk-signed-in", "clerk-signed-in", { "class": className, "hidden": true }, { "default": () => renderTemplate` ${renderSlot($$result, $$slots["default"])} ` })} ${renderScript($$result, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/control/SignedInCSR.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/control/SignedInCSR.astro", void 0);
const $$Astro$h = createAstro("https://amazon-affiliates.vercel.app");
const $$SignedInSSR = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$h, $$props, $$slots);
  Astro2.self = $$SignedInSSR;
  const { userId } = Astro2.locals.auth();
  return renderTemplate`${userId ? renderTemplate`${renderSlot($$result, $$slots["default"])}` : null}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/control/SignedInSSR.astro", void 0);
const configOutput = "server";
function isStaticOutput(forceStatic) {
  if (forceStatic !== void 0) {
    return forceStatic;
  }
  return configOutput === "static";
}
const $$Astro$g = createAstro("https://amazon-affiliates.vercel.app");
const $$SignedIn = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$g, $$props, $$slots);
  Astro2.self = $$SignedIn;
  const { isStatic, class: className } = Astro2.props;
  const SignedInComponent = isStaticOutput(isStatic) ? $$SignedInCSR : $$SignedInSSR;
  return renderTemplate`${renderComponent($$result, "SignedInComponent", SignedInComponent, { "class": className }, { "default": ($$result2) => renderTemplate` ${renderSlot($$result2, $$slots["default"])} ` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/control/SignedIn.astro", void 0);
const $$Astro$f = createAstro("https://amazon-affiliates.vercel.app");
const $$SignedOutCSR = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$f, $$props, $$slots);
  Astro2.self = $$SignedOutCSR;
  const { class: className } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "clerk-signed-out", "clerk-signed-out", { "class": className, "hidden": true }, { "default": () => renderTemplate` ${renderSlot($$result, $$slots["default"])} ` })} ${renderScript($$result, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/control/SignedOutCSR.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/control/SignedOutCSR.astro", void 0);
const $$Astro$e = createAstro("https://amazon-affiliates.vercel.app");
const $$SignedOutSSR = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$e, $$props, $$slots);
  Astro2.self = $$SignedOutSSR;
  const { userId } = Astro2.locals.auth();
  return renderTemplate`${!userId ? renderTemplate`${renderSlot($$result, $$slots["default"])}` : null}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/control/SignedOutSSR.astro", void 0);
const $$Astro$d = createAstro("https://amazon-affiliates.vercel.app");
const $$SignedOut = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$d, $$props, $$slots);
  Astro2.self = $$SignedOut;
  const { isStatic, class: className } = Astro2.props;
  const SignedOutComponent = isStaticOutput(isStatic) ? $$SignedOutCSR : $$SignedOutSSR;
  return renderTemplate`${renderComponent($$result, "SignedOutComponent", SignedOutComponent, { "class": className }, { "default": ($$result2) => renderTemplate` ${renderSlot($$result2, $$slots["default"])} ` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/control/SignedOut.astro", void 0);
const $$Astro$c = createAstro("https://amazon-affiliates.vercel.app");
const $$UserButton = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$c, $$props, $$slots);
  Astro2.self = $$UserButton;
  return renderTemplate`${renderComponent($$result, "InternalUIComponentRenderer", $$InternalUIComponentRenderer, { ...Astro2.props, "component": "user-button" })} ${renderSlot($$result, $$slots["default"])}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/interactive/UserButton/UserButton.astro", void 0);
var __freeze$3 = Object.freeze;
var __defProp$3 = Object.defineProperty;
var __template$3 = (cooked, raw) => __freeze$3(__defProp$3(cooked, "raw", { value: __freeze$3(raw || cooked.slice()) }));
var _a$3;
const $$Astro$b = createAstro("https://amazon-affiliates.vercel.app");
const $$MenuItemRenderer = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$b, $$props, $$slots);
  Astro2.self = $$MenuItemRenderer;
  const { label, href, open, clickIdentifier, parent } = Astro2.props;
  let labelIcon = "";
  if (Astro2.slots.has("label-icon")) {
    labelIcon = await Astro2.slots.render("label-icon");
  }
  const isDevMode = false;
  return renderTemplate(_a$3 || (_a$3 = __template$3(["<script>(function(){", "\n  const parentElement = document.currentScript.parentElement;\n\n  // We used a web component in the `<UserButton.MenuItems>` component.\n  const hasParentMenuItem = parentElement.tagName.toLowerCase() === 'clerk-user-button-menu-items';\n  if (!hasParentMenuItem) {\n    if (isDevMode) {\n      throw new Error(\n        `Clerk: <UserButton.MenuItems /> component can only accept <UserButton.Action /> and <UserButton.Link /> as its children. Any other provided component will be ignored.`,\n      );\n    }\n    return;\n  }\n\n  // Get the user button map from window that we set in the `<InternalUIComponentRenderer />`.\n  const userButtonComponentMap = window.__astro_clerk_component_props.get('user-button');\n\n  let userButton;\n  if (parent) {\n    userButton = document.querySelector(`[data-clerk-id=\"clerk-user-button-${parent}\"]`);\n  } else {\n    userButton = document.querySelector('[data-clerk-id^=\"clerk-user-button\"]');\n  }\n\n  const safeId = userButton.getAttribute('data-clerk-id');\n  const currentOptions = userButtonComponentMap.get(safeId);\n\n  const reorderItemsLabels = ['manageAccount', 'signOut'];\n  const isReorderItem = reorderItemsLabels.includes(label);\n\n  let newMenuItem = {\n    label,\n  };\n\n  if (!isReorderItem) {\n    newMenuItem = {\n      ...newMenuItem,\n      mountIcon: el => {\n        el.innerHTML = labelIcon;\n      },\n      unmountIcon: () => {\n        /* What to clean up? */\n      },\n    };\n\n    if (href) {\n      newMenuItem.href = href;\n    } else if (open) {\n      newMenuItem.open = open.startsWith('/') ? open : `/${open}`;\n    } else if (clickIdentifier) {\n      const clickEvent = new CustomEvent('clerk:menu-item-click', { detail: clickIdentifier });\n      newMenuItem.onClick = () => {\n        document.dispatchEvent(clickEvent);\n      };\n    }\n  }\n\n  userButtonComponentMap.set(safeId, {\n    ...currentOptions,\n    customMenuItems: [...(currentOptions?.customMenuItems ?? []), newMenuItem],\n  });\n})();<\/script>"], ["<script>(function(){", "\n  const parentElement = document.currentScript.parentElement;\n\n  // We used a web component in the \\`<UserButton.MenuItems>\\` component.\n  const hasParentMenuItem = parentElement.tagName.toLowerCase() === 'clerk-user-button-menu-items';\n  if (!hasParentMenuItem) {\n    if (isDevMode) {\n      throw new Error(\n        \\`Clerk: <UserButton.MenuItems /> component can only accept <UserButton.Action /> and <UserButton.Link /> as its children. Any other provided component will be ignored.\\`,\n      );\n    }\n    return;\n  }\n\n  // Get the user button map from window that we set in the \\`<InternalUIComponentRenderer />\\`.\n  const userButtonComponentMap = window.__astro_clerk_component_props.get('user-button');\n\n  let userButton;\n  if (parent) {\n    userButton = document.querySelector(\\`[data-clerk-id=\"clerk-user-button-\\${parent}\"]\\`);\n  } else {\n    userButton = document.querySelector('[data-clerk-id^=\"clerk-user-button\"]');\n  }\n\n  const safeId = userButton.getAttribute('data-clerk-id');\n  const currentOptions = userButtonComponentMap.get(safeId);\n\n  const reorderItemsLabels = ['manageAccount', 'signOut'];\n  const isReorderItem = reorderItemsLabels.includes(label);\n\n  let newMenuItem = {\n    label,\n  };\n\n  if (!isReorderItem) {\n    newMenuItem = {\n      ...newMenuItem,\n      mountIcon: el => {\n        el.innerHTML = labelIcon;\n      },\n      unmountIcon: () => {\n        /* What to clean up? */\n      },\n    };\n\n    if (href) {\n      newMenuItem.href = href;\n    } else if (open) {\n      newMenuItem.open = open.startsWith('/') ? open : \\`/\\${open}\\`;\n    } else if (clickIdentifier) {\n      const clickEvent = new CustomEvent('clerk:menu-item-click', { detail: clickIdentifier });\n      newMenuItem.onClick = () => {\n        document.dispatchEvent(clickEvent);\n      };\n    }\n  }\n\n  userButtonComponentMap.set(safeId, {\n    ...currentOptions,\n    customMenuItems: [...(currentOptions?.customMenuItems ?? []), newMenuItem],\n  });\n})();<\/script>"])), defineScriptVars({ label, href, open, clickIdentifier, labelIcon, isDevMode, parent }));
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/interactive/UserButton/MenuItemRenderer.astro", void 0);
const $$Astro$a = createAstro("https://amazon-affiliates.vercel.app");
const $$UserButtonLink = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$a, $$props, $$slots);
  Astro2.self = $$UserButtonLink;
  const { label, href, parent } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "MenuItemRenderer", $$MenuItemRenderer, { "label": label, "href": href, "parent": parent }, { "label-icon": ($$result2) => renderTemplate`${renderSlot($$result2, $$slots["label-icon"])}` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/interactive/UserButton/UserButtonLink.astro", void 0);
const $$Astro$9 = createAstro("https://amazon-affiliates.vercel.app");
const $$UserButtonAction = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$9, $$props, $$slots);
  Astro2.self = $$UserButtonAction;
  const { label, open, clickIdentifier, parent } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "MenuItemRenderer", $$MenuItemRenderer, { "label": label, "open": open, "clickIdentifier": clickIdentifier, "parent": parent }, { "label-icon": ($$result2) => renderTemplate`${renderSlot($$result2, $$slots["label-icon"])}` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/interactive/UserButton/UserButtonAction.astro", void 0);
const $$UserButtonMenuItems = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "clerk-user-button-menu-items", "clerk-user-button-menu-items", {}, { "default": () => renderTemplate` ${renderSlot($$result, $$slots["default"])} ` })} ${renderScript($$result, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/interactive/UserButton/UserButtonMenuItems.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/interactive/UserButton/UserButtonMenuItems.astro", void 0);
var __freeze$2 = Object.freeze;
var __defProp$2 = Object.defineProperty;
var __template$2 = (cooked, raw) => __freeze$2(__defProp$2(cooked, "raw", { value: __freeze$2(raw || cooked.slice()) }));
var _a$2;
const $$Astro$8 = createAstro("https://amazon-affiliates.vercel.app");
const $$UserButtonUserProfilePage = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$8, $$props, $$slots);
  Astro2.self = $$UserButtonUserProfilePage;
  const { url, label, parent } = Astro2.props;
  let labelIcon = "";
  let content = "";
  if (Astro2.slots.has("label-icon")) {
    labelIcon = await Astro2.slots.render("label-icon");
  }
  if (Astro2.slots.has("default")) {
    content = await Astro2.slots.render("default");
  }
  return renderTemplate(_a$2 || (_a$2 = __template$2(["<script>(function(){", "\n  // Get the user button map from window that we set in the `<InternalUIComponentRenderer />`.\n  const userButtonComponentMap = window.__astro_clerk_component_props.get('user-button');\n\n  let userButton;\n  if (parent) {\n    userButton = document.querySelector(`[data-clerk-id=\"clerk-user-button-${parent}\"]`);\n  } else {\n    userButton = document.querySelector('[data-clerk-id^=\"clerk-user-button\"]');\n  }\n\n  const safeId = userButton.getAttribute('data-clerk-id');\n  const currentOptions = userButtonComponentMap.get(safeId);\n\n  const newCustomPage = {\n    label,\n    url,\n    mountIcon: el => {\n      el.innerHTML = labelIcon;\n    },\n    unmountIcon: () => {\n      /* What to clean up? */\n    },\n    mount: el => {\n      el.innerHTML = content;\n    },\n    unmount: () => {\n      /* What to clean up? */\n    },\n  };\n\n  userButtonComponentMap.set(safeId, {\n    ...currentOptions,\n    userProfileProps: {\n      customPages: [...(currentOptions?.userProfileProps?.customPages ?? []), newCustomPage],\n    },\n  });\n})();<\/script>"], ["<script>(function(){", "\n  // Get the user button map from window that we set in the \\`<InternalUIComponentRenderer />\\`.\n  const userButtonComponentMap = window.__astro_clerk_component_props.get('user-button');\n\n  let userButton;\n  if (parent) {\n    userButton = document.querySelector(\\`[data-clerk-id=\"clerk-user-button-\\${parent}\"]\\`);\n  } else {\n    userButton = document.querySelector('[data-clerk-id^=\"clerk-user-button\"]');\n  }\n\n  const safeId = userButton.getAttribute('data-clerk-id');\n  const currentOptions = userButtonComponentMap.get(safeId);\n\n  const newCustomPage = {\n    label,\n    url,\n    mountIcon: el => {\n      el.innerHTML = labelIcon;\n    },\n    unmountIcon: () => {\n      /* What to clean up? */\n    },\n    mount: el => {\n      el.innerHTML = content;\n    },\n    unmount: () => {\n      /* What to clean up? */\n    },\n  };\n\n  userButtonComponentMap.set(safeId, {\n    ...currentOptions,\n    userProfileProps: {\n      customPages: [...(currentOptions?.userProfileProps?.customPages ?? []), newCustomPage],\n    },\n  });\n})();<\/script>"])), defineScriptVars({ url, label, content, labelIcon, parent }));
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/interactive/UserButton/UserButtonUserProfilePage.astro", void 0);
const UserButton = Object.assign($$UserButton, {
  MenuItems: $$UserButtonMenuItems,
  Link: $$UserButtonLink,
  Action: $$UserButtonAction,
  UserProfilePage: $$UserButtonUserProfilePage
});
const nav$1 = { "home": "Inicio", "products": "Productos", "categories": "Categorias", "reviews": "Reviews", "lists": "Guias", "deals": "Ofertas", "search": "Buscar", "dashboard": "Mi Panel", "login": "Iniciar Sesion", "logout": "Cerrar Sesion" };
const common$1 = { "viewOnAmazon": "Ver en Amazon", "buyNow": "Comprar ahora", "readMore": "Leer mas", "featured": "Destacado", "bestSeller": "Mas vendido", "ourPick": "Nuestra eleccion", "seeAll": "Ver todos", "searchPlaceholder": "Buscar productos...", "noResults": "No se encontraron resultados", "loading": "Cargando...", "priceFrom": "Desde", "offDiscount": "de descuento" };
const product$1 = { "price": "Precio", "rating": "Valoracion", "specifications": "Especificaciones", "pros": "Ventajas", "cons": "Desventajas", "relatedProducts": "Productos relacionados", "lastUpdated": "Actualizado el", "reviews": "opiniones" };
const review$1 = { "verdict": "Veredicto", "score": "Puntuacion", "writtenBy": "Escrito por", "quality": "Calidad", "value": "Relacion calidad-precio", "features": "Funcionalidades", "easeOfUse": "Facilidad de uso" };
const deal$1 = { "expires": "Expira", "discount": "Descuento", "limitedTime": "Oferta limitada", "expired": "Oferta expirada", "daysLeft": "dias restantes", "hoursLeft": "horas restantes" };
const footer$1 = { "about": "Sobre nosotros", "privacy": "Politica de privacidad", "terms": "Terminos de servicio", "contact": "Contacto", "affiliateDisclosure": "Como participante del Programa de Afiliados de Amazon EU, obtenemos ingresos por las compras adscritas que cumplen los requisitos aplicables." };
const meta$1 = { "siteTitle": "Las mejores ofertas y reviews de productos", "siteDescription": "Encuentra los mejores productos con nuestras reviews detalladas, comparativas y ofertas exclusivas de Amazon." };
const esTranslations = {
  nav: nav$1,
  common: common$1,
  product: product$1,
  review: review$1,
  deal: deal$1,
  footer: footer$1,
  meta: meta$1
};
const nav = { "home": "Home", "products": "Products", "categories": "Categories", "reviews": "Reviews", "lists": "Guides", "deals": "Deals", "search": "Search", "dashboard": "Dashboard", "login": "Login", "logout": "Logout" };
const common = { "viewOnAmazon": "View on Amazon", "buyNow": "Buy now", "readMore": "Read more", "featured": "Featured", "bestSeller": "Best Seller", "ourPick": "Our Pick", "seeAll": "See all", "searchPlaceholder": "Search products...", "noResults": "No results found", "loading": "Loading...", "priceFrom": "From", "offDiscount": "off" };
const product = { "price": "Price", "rating": "Rating", "specifications": "Specifications", "pros": "Pros", "cons": "Cons", "relatedProducts": "Related Products", "lastUpdated": "Last updated", "reviews": "reviews" };
const review = { "verdict": "Verdict", "score": "Score", "writtenBy": "Written by", "quality": "Quality", "value": "Value for money", "features": "Features", "easeOfUse": "Ease of use" };
const deal = { "expires": "Expires", "discount": "Discount", "limitedTime": "Limited time", "expired": "Expired", "daysLeft": "days left", "hoursLeft": "hours left" };
const footer = { "about": "About us", "privacy": "Privacy Policy", "terms": "Terms of Service", "contact": "Contact", "affiliateDisclosure": "As an Amazon Associate, we earn from qualifying purchases." };
const meta = { "siteTitle": "Best deals and product reviews", "siteDescription": "Find the best products with our detailed reviews, comparisons and exclusive Amazon deals." };
const enTranslations = {
  nav,
  common,
  product,
  review,
  deal,
  footer,
  meta
};
const translations = {
  es: esTranslations,
  en: enTranslations
};
function getTranslation(lang) {
  const t = translations[lang];
  return function translate(key) {
    const keys = key.split(".");
    let result = t;
    for (const k of keys) {
      result = result?.[k];
    }
    return result || key;
  };
}
function getLocalizedUrl(path, lang) {
  const cleanPath = path.replace(/^\/(es|en)/, "");
  return `/${lang}${cleanPath}`;
}
function getAlternateLanguages(currentPath, currentLang) {
  const languages2 = ["es", "en"];
  return languages2.filter((lang) => lang !== currentLang).map((lang) => ({
    lang,
    url: getLocalizedUrl(currentPath, lang)
  }));
}
function formatDate(date, lang) {
  return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}
function formatPrice(price, currency, lang) {
  return new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency
  }).format(price);
}
const languages = {
  es: { name: "Espanol", flag: "ES" },
  en: { name: "English", flag: "EN" }
};
const $$Astro$7 = createAstro("https://amazon-affiliates.vercel.app");
const $$LanguageSwitcher = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$LanguageSwitcher;
  const { currentLang, currentPath } = Astro2.props;
  const alternates = getAlternateLanguages(currentPath, currentLang);
  return renderTemplate`${maybeRenderHead()}<div class="language-switcher relative"> <button type="button" class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Change language" id="lang-toggle"> <span class="uppercase">${currentLang}</span> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path> </svg> </button> <div id="lang-dropdown" class="hidden absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50"> <a${addAttribute(`/${currentLang}${currentPath.replace(/^\/(es|en)/, "")}`, "href")} class="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 bg-primary-50"> <span class="uppercase font-medium">${currentLang}</span> <span>${languages[currentLang].name}</span> </a> ${alternates.map(({ lang, url }) => renderTemplate`<a${addAttribute(url, "href")} class="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"${addAttribute(lang, "hreflang")}> <span class="uppercase font-medium">${lang}</span> <span>${languages[lang].name}</span> </a>`)} </div> </div> ${renderScript($$result, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/common/LanguageSwitcher.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/common/LanguageSwitcher.astro", void 0);
const $$Astro$6 = createAstro("https://amazon-affiliates.vercel.app");
const $$Header = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$Header;
  const { lang, currentPath } = Astro2.props;
  const t = getTranslation(lang);
  const navItems = [
    { href: `/${lang}`, label: t("nav.home"), exact: true },
    { href: `/${lang}/products`, label: t("nav.products") },
    { href: `/${lang}/categories`, label: t("nav.categories") }
  ];
  function isActive(href, exact) {
    if (exact) return currentPath === href || currentPath === href + "/";
    return currentPath === href || currentPath.startsWith(href + "/");
  }
  return renderTemplate`${maybeRenderHead()}<header class="header" data-astro-cid-qmpwvs2w> <div class="header-inner" data-astro-cid-qmpwvs2w> <!-- Logo --> <a${addAttribute(`/${lang}`, "href")} class="logo" data-astro-cid-qmpwvs2w> <span class="logo-mark" data-astro-cid-qmpwvs2w> <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-astro-cid-qmpwvs2w> <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9" data-astro-cid-qmpwvs2w></path> <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-qmpwvs2w></path> <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-qmpwvs2w></path> </svg> </span> <span class="logo-text" data-astro-cid-qmpwvs2w>${siteConfig.site.name}</span> </a> <!-- Navigation --> <nav class="nav-desktop" data-astro-cid-qmpwvs2w> ${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(["nav-link", { active: isActive(item.href, item.exact) }], "class:list")} data-astro-cid-qmpwvs2w> ${item.label} </a>`)} </nav> <!-- Right side --> <div class="header-actions" data-astro-cid-qmpwvs2w> <!-- Search --> <button type="button" class="search-btn"${addAttribute(t("nav.search"), "aria-label")} id="search-trigger" data-astro-cid-qmpwvs2w> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-qmpwvs2w> <circle cx="11" cy="11" r="8" data-astro-cid-qmpwvs2w></circle> <path d="M21 21l-4.35-4.35" data-astro-cid-qmpwvs2w></path> </svg> </button> <!-- Auth --> <div class="auth-section" data-astro-cid-qmpwvs2w> ${renderComponent($$result, "SignedOut", $$SignedOut, { "data-astro-cid-qmpwvs2w": true }, { "default": ($$result2) => renderTemplate` <a${addAttribute(`/${lang}/login`, "href")} class="btn-login" data-astro-cid-qmpwvs2w>${t("nav.login")}</a> ` })} ${renderComponent($$result, "SignedIn", $$SignedIn, { "data-astro-cid-qmpwvs2w": true }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "UserButton", UserButton, { "data-astro-cid-qmpwvs2w": true })} ` })} </div> ${renderComponent($$result, "LanguageSwitcher", $$LanguageSwitcher, { "currentLang": lang, "currentPath": currentPath, "data-astro-cid-qmpwvs2w": true })} <!-- Mobile menu button --> <button type="button" class="mobile-menu-btn" aria-label="Menu" id="mobile-menu-button" data-astro-cid-qmpwvs2w> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-qmpwvs2w> <path d="M4 6h16M4 12h16M4 18h16" data-astro-cid-qmpwvs2w></path> </svg> </button> </div> </div> <!-- Mobile Navigation --> <nav id="mobile-menu" class="nav-mobile hidden" data-astro-cid-qmpwvs2w> ${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(["nav-mobile-link", { active: isActive(item.href, item.exact) }], "class:list")} data-astro-cid-qmpwvs2w> ${item.label} </a>`)} </nav> </header>  ${renderScript($$result, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/common/Header.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/common/Header.astro", void 0);
const $$Astro$5 = createAstro("https://amazon-affiliates.vercel.app");
const $$AffiliateDisclosure = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$AffiliateDisclosure;
  const { lang, variant = "compact" } = Astro2.props;
  const disclosures = {
    es: {
      full: "Como participante del Programa de Afiliados de Amazon EU, obtenemos ingresos por las compras adscritas que cumplen los requisitos aplicables. Los precios y disponibilidad de los productos estan sujetos a cambios.",
      compact: "Este sitio participa en el Programa de Afiliados de Amazon EU.",
      footer: "Participante del Programa de Afiliados de Amazon EU"
    },
    en: {
      full: "As an Amazon Associate, we earn from qualifying purchases. Prices and availability are subject to change.",
      compact: "This site is a participant in the Amazon Associates Program.",
      footer: "Amazon Associates Program Participant"
    }
  };
  return renderTemplate`${variant === "full" && renderTemplate`${maybeRenderHead()}<div class="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6"><p class="text-sm text-amber-800"><span class="font-semibold">Disclosure: </span>${disclosures[lang][variant]}</p></div>`}${variant === "compact" && renderTemplate`<p class="text-sm text-gray-500 italic">${disclosures[lang][variant]}</p>`}${variant === "footer" && renderTemplate`<p class="text-xs text-gray-500">${disclosures[lang][variant]}</p>`}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/affiliate/AffiliateDisclosure.astro", void 0);
const $$Astro$4 = createAstro("https://amazon-affiliates.vercel.app");
const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$Footer;
  const { lang } = Astro2.props;
  const t = getTranslation(lang);
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const footerLinks = [
    { href: `/${lang}/about`, label: t("footer.about") },
    { href: `/${lang}/privacy-policy`, label: t("footer.privacy") },
    { href: `/${lang}/terms-of-service`, label: t("footer.terms") }
  ];
  const categories = [
    { href: `/${lang}/categories/electronics`, labelEs: "Electronica", labelEn: "Electronics" },
    { href: `/${lang}/categories/home-kitchen`, labelEs: "Hogar y Cocina", labelEn: "Home & Kitchen" },
    { href: `/${lang}/categories/gaming`, labelEs: "Gaming", labelEn: "Gaming" }
  ];
  return renderTemplate`${maybeRenderHead()}<footer class="footer" data-astro-cid-l3trhy4j> <div class="footer-inner" data-astro-cid-l3trhy4j> <!-- Main Footer Grid --> <div class="footer-grid" data-astro-cid-l3trhy4j> <!-- Brand Column --> <div class="footer-brand" data-astro-cid-l3trhy4j> <a${addAttribute(`/${lang}`, "href")} class="brand-link" data-astro-cid-l3trhy4j> <span class="brand-mark" data-astro-cid-l3trhy4j> <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-astro-cid-l3trhy4j> <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9" data-astro-cid-l3trhy4j></path> <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-l3trhy4j></path> <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-l3trhy4j></path> </svg> </span> <span class="brand-name" data-astro-cid-l3trhy4j>${siteConfig.site.name}</span> </a> <p class="brand-tagline" data-astro-cid-l3trhy4j> ${siteConfig.site.tagline[lang]} </p> </div> <!-- Quick Links --> <div class="footer-column" data-astro-cid-l3trhy4j> <h4 class="column-title" data-astro-cid-l3trhy4j> ${lang === "es" ? "Enlaces" : "Links"} </h4> <ul class="column-list" data-astro-cid-l3trhy4j> ${footerLinks.map((link) => renderTemplate`<li data-astro-cid-l3trhy4j> <a${addAttribute(link.href, "href")} class="column-link" data-astro-cid-l3trhy4j> ${link.label} </a> </li>`)} </ul> </div> <!-- Categories --> <div class="footer-column" data-astro-cid-l3trhy4j> <h4 class="column-title" data-astro-cid-l3trhy4j> ${lang === "es" ? "Categorias" : "Categories"} </h4> <ul class="column-list" data-astro-cid-l3trhy4j> ${categories.map((cat) => renderTemplate`<li data-astro-cid-l3trhy4j> <a${addAttribute(cat.href, "href")} class="column-link" data-astro-cid-l3trhy4j> ${lang === "es" ? cat.labelEs : cat.labelEn} </a> </li>`)} </ul> </div> </div> <!-- Affiliate Disclosure --> <div class="footer-disclosure" data-astro-cid-l3trhy4j> ${renderComponent($$result, "AffiliateDisclosure", $$AffiliateDisclosure, { "lang": lang, "variant": "footer", "data-astro-cid-l3trhy4j": true })} </div> <!-- Bottom Bar --> <div class="footer-bottom" data-astro-cid-l3trhy4j> <p class="copyright" data-astro-cid-l3trhy4j>
&copy; ${currentYear} ${siteConfig.site.name}. ${lang === "es" ? "Todos los derechos reservados." : "All rights reserved."} </p> <div class="footer-meta" data-astro-cid-l3trhy4j> <span class="meta-item" data-astro-cid-l3trhy4j>Amazon ${lang === "es" ? "Afiliado" : "Affiliate"}</span> <span class="meta-divider" data-astro-cid-l3trhy4j>·</span> <span class="meta-item" data-astro-cid-l3trhy4j>${lang === "es" ? "Hecho con cuidado" : "Made with care"}</span> </div> </div> </div> </footer> `;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/common/Footer.astro", void 0);
const $$Astro$3 = createAstro("https://amazon-affiliates.vercel.app");
const $$SearchModal = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$SearchModal;
  const { lang } = Astro2.props;
  const placeholderText = lang === "es" ? "Buscar productos..." : "Search products...";
  const noResultsText = lang === "es" ? "No se encontraron resultados" : "No results found";
  const searchingText = lang === "es" ? "Buscando..." : "Searching...";
  return renderTemplate`${maybeRenderHead()}<div id="search-modal" class="search-modal" role="dialog" aria-modal="true" aria-hidden="true" data-astro-cid-2eu6zh2g> <div class="search-backdrop" data-astro-cid-2eu6zh2g></div> <div class="search-container" data-astro-cid-2eu6zh2g> <div class="search-header" data-astro-cid-2eu6zh2g> <div class="search-input-wrapper" data-astro-cid-2eu6zh2g> <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-2eu6zh2g> <circle cx="11" cy="11" r="8" data-astro-cid-2eu6zh2g></circle> <path d="M21 21l-4.35-4.35" data-astro-cid-2eu6zh2g></path> </svg> <input type="text" id="search-input" class="search-input"${addAttribute(placeholderText, "placeholder")} autocomplete="off" autofocus data-astro-cid-2eu6zh2g> <button type="button" id="search-close" class="search-close" aria-label="Close" data-astro-cid-2eu6zh2g> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-2eu6zh2g> <path d="M18 6L6 18M6 6l12 12" data-astro-cid-2eu6zh2g></path> </svg> </button> </div> </div> <div id="search-results" class="search-results" data-astro-cid-2eu6zh2g> <div class="search-empty" id="search-empty" data-astro-cid-2eu6zh2g> <p data-astro-cid-2eu6zh2g>${lang === "es" ? "Escribe para buscar productos" : "Type to search products"}</p> </div> <div class="search-loading hidden" id="search-loading" data-astro-cid-2eu6zh2g> <div class="spinner" data-astro-cid-2eu6zh2g></div> <p data-astro-cid-2eu6zh2g>${searchingText}</p> </div> <div class="search-no-results hidden" id="search-no-results" data-astro-cid-2eu6zh2g> <p data-astro-cid-2eu6zh2g>${noResultsText}</p> </div> <div id="search-results-list" class="search-results-list" data-astro-cid-2eu6zh2g></div> </div> </div> </div>  ${renderScript($$result, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/search/SearchModal.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/search/SearchModal.astro", void 0);
var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(cooked.slice()) }));
var _a$1;
const $$Astro$2 = createAstro("https://amazon-affiliates.vercel.app");
const $$OrganizationSchema = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$OrganizationSchema;
  const { lang = "es" } = Astro2.props;
  const siteUrl = siteConfig.site.url;
  const siteName = siteConfig.site.name;
  const tagline = siteConfig.site.tagline[lang];
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    description: tagline,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [
      `https://twitter.com/${siteConfig.social.twitter.replace("@", "")}`,
      `https://facebook.com/${siteConfig.social.facebook}`
    ].filter(Boolean)
  };
  return renderTemplate(_a$1 || (_a$1 = __template$1(['<script type="application/ld+json">', "<\/script>"])), unescapeHTML(JSON.stringify(schema)));
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/seo/OrganizationSchema.astro", void 0);
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro$1 = createAstro("https://amazon-affiliates.vercel.app");
const $$WebSiteSchema = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$WebSiteSchema;
  const { lang = "es" } = Astro2.props;
  const siteUrl = siteConfig.site.url;
  const siteName = siteConfig.site.name;
  const tagline = siteConfig.site.tagline[lang];
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    description: tagline,
    url: siteUrl,
    inLanguage: lang === "es" ? "es-ES" : "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/${lang}/products?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
  return renderTemplate(_a || (_a = __template(['<script type="application/ld+json">', "<\/script>"])), unescapeHTML(JSON.stringify(schema)));
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/seo/WebSiteSchema.astro", void 0);
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$BaseLayout;
  const {
    title,
    description,
    lang,
    image = siteConfig.seo.defaultImage,
    noindex = false
  } = Astro2.props;
  const t = getTranslation(lang);
  const siteTitle = siteConfig.site.name;
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const metaDescription = description || t("meta.siteDescription");
  const canonicalUrl = new URL(Astro2.url.pathname, Astro2.site);
  return renderTemplate`<html${addAttribute(lang, "lang")}> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="generator"${addAttribute(Astro2.generator, "content")}><!-- SEO --><title>${fullTitle}</title><meta name="description"${addAttribute(metaDescription, "content")}><link rel="canonical"${addAttribute(canonicalUrl, "href")}>${noindex && renderTemplate`<meta name="robots" content="noindex, nofollow">`}<!-- Open Graph --><meta property="og:type" content="website"><meta property="og:url"${addAttribute(canonicalUrl, "content")}><meta property="og:title"${addAttribute(fullTitle, "content")}><meta property="og:description"${addAttribute(metaDescription, "content")}><meta property="og:image"${addAttribute(new URL(image, Astro2.site), "content")}><meta property="og:locale"${addAttribute(lang === "es" ? "es_ES" : "en_US", "content")}><!-- Twitter --><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"${addAttribute(fullTitle, "content")}><meta name="twitter:description"${addAttribute(metaDescription, "content")}><meta name="twitter:image"${addAttribute(new URL(image, Astro2.site), "content")}><!-- Alternate languages --><link rel="alternate" hreflang="es"${addAttribute(new URL(`/es${Astro2.url.pathname.replace(/^\/(es|en)/, "")}`, Astro2.site), "href")}><link rel="alternate" hreflang="en"${addAttribute(new URL(`/en${Astro2.url.pathname.replace(/^\/(es|en)/, "")}`, Astro2.site), "href")}><link rel="alternate" hreflang="x-default"${addAttribute(new URL("/es" + Astro2.url.pathname.replace(/^\/(es|en)/, ""), Astro2.site), "href")}><!-- Fonts: Fraunces (display) + DM Sans (body) --><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&display=swap" rel="stylesheet"><!-- Structured Data -->${renderComponent($$result, "OrganizationSchema", $$OrganizationSchema, { "lang": lang })}${renderComponent($$result, "WebSiteSchema", $$WebSiteSchema, { "lang": lang })}${renderHead()}</head> <body class="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col"> ${renderComponent($$result, "Header", $$Header, { "lang": lang, "currentPath": Astro2.url.pathname })} <main class="flex-grow"> ${renderSlot($$result, $$slots["default"])} </main> ${renderComponent($$result, "Footer", $$Footer, { "lang": lang })} <!-- Search Modal --> ${renderComponent($$result, "SearchModal", $$SearchModal, { "lang": lang })} </body></html>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/layouts/BaseLayout.astro", void 0);
export {
  $$BaseLayout as $,
  formatPrice as a,
  $$AffiliateDisclosure as b,
  formatDate as f,
  getTranslation as g
};
