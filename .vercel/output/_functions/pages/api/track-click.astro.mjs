import { i as recordAffiliateClick } from "../../chunks/db_Bes6smIA.mjs";
import crypto from "crypto";
import { renderers } from "../../renderers.mjs";
const prerender = false;
function hashIp(ip) {
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
}
const POST = async ({ request, locals }) => {
  try {
    const data = await request.json();
    if (!data.productId) {
      return new Response(null, { status: 400 });
    }
    let userId;
    try {
      const auth = locals.auth?.();
      userId = auth?.userId;
    } catch {
    }
    const userAgent = request.headers.get("user-agent") || void 0;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
    const ipHash = ip ? hashIp(ip) : void 0;
    const sessionId = !userId && ip && userAgent ? hashIp(`${ip}-${userAgent}`).substring(0, 8) : void 0;
    await recordAffiliateClick(
      data.productId,
      userId,
      sessionId,
      ipHash,
      userAgent
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[Track Click Error]", error);
    return new Response(null, { status: 204 });
  }
};
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
