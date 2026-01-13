import { c as createComponent, a as renderComponent, b as renderTemplate, m as maybeRenderHead, e as addAttribute } from "../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$AdminLayout } from "../chunks/AdminLayout_CsZJh8mb.mjs";
import { g as getAllProducts } from "../chunks/db_Bes6smIA.mjs";
/* empty css                                 */
import { renderers } from "../renderers.mjs";
const prerender = false;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const allProducts = await getAllProducts();
  const stats = {
    total: allProducts.length,
    published: allProducts.filter((p) => p.status === "published").length,
    drafts: allProducts.filter((p) => p.status === "draft").length
  };
  const recentProducts = allProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": "Dashboard", "data-astro-cid-u2h3djql": true }, { "default": async ($$result2) => renderTemplate`  ${maybeRenderHead()}<div class="dashboard" data-astro-cid-u2h3djql> <!-- Stats --> <div class="stats" data-astro-cid-u2h3djql> <div class="stat" data-astro-cid-u2h3djql> <div class="stat-label" data-astro-cid-u2h3djql>Total Productos</div> <div class="stat-value" data-astro-cid-u2h3djql>${stats.total}</div> <div class="stat-meta" style="color: var(--text-secondary);" data-astro-cid-u2h3djql>En tu catalogo</div> </div> <div class="stat" data-astro-cid-u2h3djql> <div class="stat-label" data-astro-cid-u2h3djql>Publicados</div> <div class="stat-value" data-astro-cid-u2h3djql>${stats.published}</div> <div class="stat-meta" data-astro-cid-u2h3djql> <span class="admin-badge admin-badge-success" data-astro-cid-u2h3djql>Activos</span> </div> </div> <div class="stat" data-astro-cid-u2h3djql> <div class="stat-label" data-astro-cid-u2h3djql>Borradores</div> <div class="stat-value" data-astro-cid-u2h3djql>${stats.drafts}</div> <div class="stat-meta" data-astro-cid-u2h3djql> <span class="admin-badge admin-badge-warning" data-astro-cid-u2h3djql>Pendientes</span> </div> </div> </div> <!-- Quick Actions --> <div class="actions-section" data-astro-cid-u2h3djql> <h2 class="admin-section-title" data-astro-cid-u2h3djql>Acciones rapidas</h2> <div class="actions-grid" data-astro-cid-u2h3djql> <a href="/admin/products/import" class="action-card primary" data-astro-cid-u2h3djql> <div class="action-icon" data-astro-cid-u2h3djql> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-u2h3djql> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" data-astro-cid-u2h3djql></path> <polyline points="17 8 12 3 7 8" data-astro-cid-u2h3djql></polyline> <line x1="12" y1="3" x2="12" y2="15" data-astro-cid-u2h3djql></line> </svg> </div> <div class="action-content" data-astro-cid-u2h3djql> <div class="action-title" data-astro-cid-u2h3djql>Importar de Amazon</div> <div class="action-desc" data-astro-cid-u2h3djql>Pegar link y auto-generar</div> </div> </a> <a href="/admin/products/new" class="action-card" data-astro-cid-u2h3djql> <div class="action-icon" data-astro-cid-u2h3djql> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-u2h3djql> <line x1="12" y1="5" x2="12" y2="19" data-astro-cid-u2h3djql></line> <line x1="5" y1="12" x2="19" y2="12" data-astro-cid-u2h3djql></line> </svg> </div> <div class="action-content" data-astro-cid-u2h3djql> <div class="action-title" data-astro-cid-u2h3djql>Nuevo Producto</div> <div class="action-desc" data-astro-cid-u2h3djql>Crear manualmente</div> </div> </a> </div> </div> <!-- Recent Products --> <div class="recent-card" data-astro-cid-u2h3djql> <div class="recent-header" data-astro-cid-u2h3djql> <h3 class="recent-title" data-astro-cid-u2h3djql>Productos recientes</h3> ${recentProducts.length > 0 && renderTemplate`<a href="/admin/products" class="view-all" data-astro-cid-u2h3djql>
Ver todos
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-u2h3djql> <polyline points="9 18 15 12 9 6" data-astro-cid-u2h3djql></polyline> </svg> </a>`} </div> ${recentProducts.length > 0 ? renderTemplate`<div class="recent-list" data-astro-cid-u2h3djql> ${recentProducts.map((product) => renderTemplate`<div class="recent-item" data-astro-cid-u2h3djql> <div class="recent-info" data-astro-cid-u2h3djql> <div class="recent-name" data-astro-cid-u2h3djql>${product.title}</div> <div class="recent-meta" data-astro-cid-u2h3djql> <code data-astro-cid-u2h3djql>${product.asin}</code> <span data-astro-cid-u2h3djql>${product.brand}</span> </div> </div> <span${addAttribute(`status-dot ${product.status}`, "class")}${addAttribute(product.status === "published" ? "Publicado" : "Borrador", "title")} data-astro-cid-u2h3djql></span> </div>`)} </div>` : renderTemplate`<div class="empty" data-astro-cid-u2h3djql> <div class="empty-icon" data-astro-cid-u2h3djql> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-u2h3djql> <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" data-astro-cid-u2h3djql></path> <polyline points="3.27 6.96 12 12.01 20.73 6.96" data-astro-cid-u2h3djql></polyline> <line x1="12" y1="22.08" x2="12" y2="12" data-astro-cid-u2h3djql></line> </svg> </div> <h4 data-astro-cid-u2h3djql>No hay productos todavia</h4> <p data-astro-cid-u2h3djql>Importa tu primer producto desde Amazon</p> <a href="/admin/products/import" class="empty-btn" data-astro-cid-u2h3djql> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-u2h3djql> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" data-astro-cid-u2h3djql></path> <polyline points="17 8 12 3 7 8" data-astro-cid-u2h3djql></polyline> <line x1="12" y1="3" x2="12" y2="15" data-astro-cid-u2h3djql></line> </svg>
Importar producto
</a> </div>`} </div> </div> ` })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/index.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/index.astro";
const $$url = "/admin";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
