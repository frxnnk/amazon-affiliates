import { r as rejectClaim } from "../../../../chunks/db_Bes6smIA.mjs";
import { renderers } from "../../../../renderers.mjs";
const POST = async ({ request, locals }) => {
  const auth = locals.auth();
  if (!auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { claimId, notes } = body;
    if (!claimId || !notes) {
      return new Response(JSON.stringify({ error: "Missing required fields. Rejection reason is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const claim = await rejectClaim(
      parseInt(claimId),
      auth.userId,
      notes
    );
    return new Response(JSON.stringify({ success: true, claim }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reject claim";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
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
