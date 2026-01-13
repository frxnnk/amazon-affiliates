import { f as failPayoutRequest } from "../../../../chunks/db_Bes6smIA.mjs";
import { i as isUserAdmin, u as unauthorizedResponse } from "../../../../chunks/auth_e0GtV7VA.mjs";
import { renderers } from "../../../../renderers.mjs";
const POST = async (context) => {
  const { request, locals } = context;
  try {
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const isAdmin = await isUserAdmin(auth.userId, context);
    if (!isAdmin) {
      return unauthorizedResponse("Admin access required");
    }
    const body = await request.json();
    const { payoutId, notes } = body;
    if (!payoutId || !notes) {
      return new Response(JSON.stringify({ error: "Payout ID and failure reason are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const payout = await failPayoutRequest(payoutId, auth.userId, notes);
    return new Response(JSON.stringify({ success: true, payout }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark payout as failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
