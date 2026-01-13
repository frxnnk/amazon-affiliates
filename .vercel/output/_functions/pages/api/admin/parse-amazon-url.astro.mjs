import { i as isValidAsin, g as getProductPrefillFromUrl } from "../../../chunks/amazon_WxRnAz-f.mjs";
import { renderers } from "../../../renderers.mjs";
const POST = async ({ request }) => {
  try {
    const { url, asin, affiliateTag } = await request.json();
    if (asin && isValidAsin(asin)) {
      const marketplace = "es";
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            asin: asin.toUpperCase(),
            marketplace,
            affiliateUrl: `https://www.amazon.${marketplace}/dp/${asin.toUpperCase()}${affiliateTag ? `?tag=${affiliateTag}` : ""}`,
            suggestedTitle: null,
            lang: "es"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!url) {
      return new Response(
        JSON.stringify({ error: "Se requiere una URL de Amazon o un ASIN" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const prefillData = getProductPrefillFromUrl(url, affiliateTag);
    if (!prefillData) {
      return new Response(
        JSON.stringify({
          error: "No se pudo extraer información de la URL. Asegúrate de que sea una URL válida de Amazon con un producto."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: prefillData
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Parse Amazon URL Error]", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la solicitud" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const prerender = false;
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
