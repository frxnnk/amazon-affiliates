import { f as createAstro, c as createComponent, r as renderHead, h as renderSlot, d as renderScript, e as addAttribute, b as renderTemplate } from "./astro/server_NRwpav8g.mjs";
import "piccolore";
import "clsx";
/* empty css                         */
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$AdminLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AdminLayout;
  const { title } = Astro2.props;
  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/admin/products", label: "Productos", icon: "products" },
    { href: "/admin/products/import", label: "Importar", icon: "import" }
  ];
  const currentPath = Astro2.url.pathname;
  function isActive(item) {
    if (item.exact) return currentPath === item.href;
    return currentPath.startsWith(item.href) && item.href !== "/admin";
  }
  return renderTemplate`<html lang="es"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"><title>${title} | Admin</title><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#09090b"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">${renderHead()}</head> <body> <div class="app"> <!-- Mobile Header --> <header class="mobile-header"> <button class="menu-btn" id="menuBtn" aria-label="Abrir menu"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <line x1="3" y1="6" x2="21" y2="6"></line> <line x1="3" y1="12" x2="21" y2="12"></line> <line x1="3" y1="18" x2="21" y2="18"></line> </svg> </button> <div class="mobile-logo"> <span class="logo-icon">B</span> <span class="logo-name">BestDeals</span> </div> <div class="mobile-badge">DEV</div> </header> <!-- Sidebar Overlay --> <div class="sidebar-backdrop" id="backdrop"></div> <!-- Sidebar --> <aside class="sidebar" id="sidebar"> <div class="sidebar-header"> <a href="/admin" class="logo"> <span class="logo-icon">B</span> <div class="logo-text"> <span class="logo-name">BestDeals</span> <span class="logo-tag">Admin</span> </div> </a> <button class="close-btn" id="closeBtn" aria-label="Cerrar menu"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <line x1="18" y1="6" x2="6" y2="18"></line> <line x1="6" y1="6" x2="18" y2="18"></line> </svg> </button> </div> <nav class="sidebar-nav"> <span class="nav-label">Menu</span> ${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(["nav-link", { active: isActive(item) }], "class:list")}> <span class="nav-icon"> ${item.icon === "dashboard" && renderTemplate`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <rect x="3" y="3" width="7" height="9" rx="1"></rect> <rect x="14" y="3" width="7" height="5" rx="1"></rect> <rect x="14" y="12" width="7" height="9" rx="1"></rect> <rect x="3" y="16" width="7" height="5" rx="1"></rect> </svg>`} ${item.icon === "products" && renderTemplate`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path> <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline> <line x1="12" y1="22.08" x2="12" y2="12"></line> </svg>`} ${item.icon === "import" && renderTemplate`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path> <polyline points="17 8 12 3 7 8"></polyline> <line x1="12" y1="3" x2="12" y2="15"></line> </svg>`} </span> <span class="nav-text">${item.label}</span> </a>`)} </nav> <div class="sidebar-footer"> <a href="/" class="site-link"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path> <polyline points="15 3 21 3 21 9"></polyline> <line x1="10" y1="14" x2="21" y2="3"></line> </svg>
Ver sitio
</a> </div> </aside> <!-- Main Content --> <main class="main"> <div class="main-header"> <h1 class="page-title">${title}</h1> <span class="env-badge"> <span class="env-dot"></span>
Dev
</span> </div> <div class="main-content"> ${renderSlot($$result, $$slots["default"])} </div> </main> </div>  ${renderScript($$result, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/admin/AdminLayout.astro?astro&type=script&index=0&lang.ts")} </body> </html>`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/components/admin/AdminLayout.astro", void 0);
export {
  $$AdminLayout as $
};
