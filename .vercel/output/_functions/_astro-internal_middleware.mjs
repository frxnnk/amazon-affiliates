import { c as createRouteMatcher, a as clerkMiddleware, b as clerkClient } from "./chunks/index_BFbHgZwU.mjs";
import "es-module-lexer";
import "./chunks/astro-designed-error-pages_C3J7TAqR.mjs";
import "piccolore";
import "./chunks/astro/server_NRwpav8g.mjs";
import "clsx";
import { s as sequence } from "./chunks/index_BjYPDATk.mjs";
const getAdminEmails = () => {
  const emails = "frxnco@protonmail.com,ferreirafranco98@gmail.com";
  return emails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
};
const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)"
]);
const isUserRoute = createRouteMatcher([
  "/:lang/dashboard(.*)",
  "/api/user(.*)"
]);
const isPublicAuthRoute = createRouteMatcher([
  "/admin/login(.*)",
  "/admin/sso-callback(.*)",
  "/admin/unauthorized(.*)",
  "/:lang/login(.*)"
]);
const onRequest$1 = clerkMiddleware(async (auth, context) => {
  const { userId, redirectToSignIn } = auth();
  if (isPublicAuthRoute(context.request)) {
    return;
  }
  if (isAdminRoute(context.request)) {
    const isApiRoute = context.request.url.includes("/api/");
    if (!userId) {
      if (isApiRoute) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      return redirectToSignIn();
    }
    try {
      const client = clerkClient(context);
      const user = await client.users.getUser(userId);
      const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || "";
      const adminEmails = getAdminEmails();
      if (!adminEmails.includes(userEmail)) {
        if (isApiRoute) {
          return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        return context.redirect("/admin/unauthorized");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      if (isApiRoute) {
        return new Response(JSON.stringify({ error: "Error checking permissions" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      return context.redirect("/admin/unauthorized");
    }
    return;
  }
  if (isUserRoute(context.request)) {
    if (!userId) {
      return redirectToSignIn();
    }
    return;
  }
});
const onRequest = sequence(
  onRequest$1
);
export {
  onRequest
};
