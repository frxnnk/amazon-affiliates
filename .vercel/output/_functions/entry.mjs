import { renderers } from "./renderers.mjs";
import { c as createExports, s as serverEntrypointModule } from "./chunks/_@astrojs-ssr-adapter_DtuljOx7.mjs";
import { manifest } from "./manifest_QGeMWMYg.mjs";
const serverIslandMap = /* @__PURE__ */ new Map();
;
const _page0 = () => import("./pages/_image.astro.mjs");
const _page1 = () => import("./pages/admin/login/sso-callback.astro.mjs");
const _page2 = () => import("./pages/admin/login.astro.mjs");
const _page3 = () => import("./pages/admin/products/import.astro.mjs");
const _page4 = () => import("./pages/admin/products/new.astro.mjs");
const _page5 = () => import("./pages/admin/products/_id_.astro.mjs");
const _page6 = () => import("./pages/admin/products.astro.mjs");
const _page7 = () => import("./pages/admin/tools/affiliate-link.astro.mjs");
const _page8 = () => import("./pages/admin/unauthorized.astro.mjs");
const _page9 = () => import("./pages/admin.astro.mjs");
const _page10 = () => import("./pages/api/admin/check-duplicate.astro.mjs");
const _page11 = () => import("./pages/api/admin/claims/approve.astro.mjs");
const _page12 = () => import("./pages/api/admin/claims/reject.astro.mjs");
const _page13 = () => import("./pages/api/admin/fetch-product-data.astro.mjs");
const _page14 = () => import("./pages/api/admin/lists/_id_.astro.mjs");
const _page15 = () => import("./pages/api/admin/lists.astro.mjs");
const _page16 = () => import("./pages/api/admin/parse-amazon-url.astro.mjs");
const _page17 = () => import("./pages/api/admin/payouts/complete.astro.mjs");
const _page18 = () => import("./pages/api/admin/payouts/fail.astro.mjs");
const _page19 = () => import("./pages/api/admin/payouts/process.astro.mjs");
const _page20 = () => import("./pages/api/admin/products/_id_.astro.mjs");
const _page21 = () => import("./pages/api/admin/products.astro.mjs");
const _page22 = () => import("./pages/api/admin/scrape-amazon.astro.mjs");
const _page23 = () => import("./pages/api/search/products.astro.mjs");
const _page24 = () => import("./pages/api/track-click.astro.mjs");
const _page25 = () => import("./pages/api/user/claims.astro.mjs");
const _page26 = () => import("./pages/api/user/payout.astro.mjs");
const _page27 = () => import("./pages/_lang_/about.astro.mjs");
const _page28 = () => import("./pages/_lang_/categories/_slug_.astro.mjs");
const _page29 = () => import("./pages/_lang_/categories.astro.mjs");
const _page30 = () => import("./pages/_lang_/login/sso-callback.astro.mjs");
const _page31 = () => import("./pages/_lang_/login.astro.mjs");
const _page32 = () => import("./pages/_lang_/privacy-policy.astro.mjs");
const _page33 = () => import("./pages/_lang_/products/_slug_.astro.mjs");
const _page34 = () => import("./pages/_lang_/products.astro.mjs");
const _page35 = () => import("./pages/_lang_/terms-of-service.astro.mjs");
const _page36 = () => import("./pages/_lang_.astro.mjs");
const _page37 = () => import("./pages/index.astro.mjs");
const pageMap = /* @__PURE__ */ new Map([
  ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
  ["src/pages/admin/login/sso-callback.astro", _page1],
  ["src/pages/admin/login.astro", _page2],
  ["src/pages/admin/products/import.astro", _page3],
  ["src/pages/admin/products/new.astro", _page4],
  ["src/pages/admin/products/[id].astro", _page5],
  ["src/pages/admin/products/index.astro", _page6],
  ["src/pages/admin/tools/affiliate-link.astro", _page7],
  ["src/pages/admin/unauthorized.astro", _page8],
  ["src/pages/admin/index.astro", _page9],
  ["src/pages/api/admin/check-duplicate.ts", _page10],
  ["src/pages/api/admin/claims/approve.ts", _page11],
  ["src/pages/api/admin/claims/reject.ts", _page12],
  ["src/pages/api/admin/fetch-product-data.ts", _page13],
  ["src/pages/api/admin/lists/[id].ts", _page14],
  ["src/pages/api/admin/lists/index.ts", _page15],
  ["src/pages/api/admin/parse-amazon-url.ts", _page16],
  ["src/pages/api/admin/payouts/complete.ts", _page17],
  ["src/pages/api/admin/payouts/fail.ts", _page18],
  ["src/pages/api/admin/payouts/process.ts", _page19],
  ["src/pages/api/admin/products/[id].ts", _page20],
  ["src/pages/api/admin/products/index.ts", _page21],
  ["src/pages/api/admin/scrape-amazon.ts", _page22],
  ["src/pages/api/search/products.ts", _page23],
  ["src/pages/api/track-click.ts", _page24],
  ["src/pages/api/user/claims.ts", _page25],
  ["src/pages/api/user/payout.ts", _page26],
  ["src/pages/[lang]/about.astro", _page27],
  ["src/pages/[lang]/categories/[slug].astro", _page28],
  ["src/pages/[lang]/categories/index.astro", _page29],
  ["src/pages/[lang]/login/sso-callback.astro", _page30],
  ["src/pages/[lang]/login.astro", _page31],
  ["src/pages/[lang]/privacy-policy.astro", _page32],
  ["src/pages/[lang]/products/[slug].astro", _page33],
  ["src/pages/[lang]/products/index.astro", _page34],
  ["src/pages/[lang]/terms-of-service.astro", _page35],
  ["src/pages/[lang]/index.astro", _page36],
  ["src/pages/index.astro", _page37]
]);
const _manifest = Object.assign(manifest, {
  pageMap,
  serverIslandMap,
  renderers,
  actions: () => import("./noop-entrypoint.mjs"),
  middleware: () => import("./_astro-internal_middleware.mjs")
});
const _args = {
  "middlewareSecret": "e643c1ba-59fe-4229-b67d-05a36b8e3616",
  "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = "start";
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;
export {
  __astrojsSsrVirtualEntry as default,
  pageMap
};
